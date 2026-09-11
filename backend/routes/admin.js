import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { adminLog } from '../lib/logger.js';

const router = Router();

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذه المنطقة مخصصة للمشرفين فقط' });
  }
  next();
});

// سجل أفعال الإدارة (تعديل/إضافة/حذف) — للتدقيق
router.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 400) {
      adminLog(`${req.method} ${req.path}`, req.user.id, req.user.name, { status: res.statusCode });
    }
  });
  next();
});

async function logAudit(userId, userName, userRole, action, entityType, entityId, oldValue, newValue, ip) {
  await db.prepare('INSERT INTO audit_log (user_id, user_name, user_role, action, entity_type, entity_id, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(userId, userName, userRole, action, entityType, entityId, oldValue, newValue, ip);
}

router.get('/stats', async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const stats = {
    users: (await db.prepare('SELECT COUNT(*) c FROM users').get()).c,
    students: (await db.prepare('SELECT COUNT(*) c FROM users WHERE role = ?').get('student')).c,
    teachers: (await db.prepare('SELECT COUNT(*) c FROM users WHERE role = ?').get('teacher')).c,
    lessons: (await db.prepare('SELECT COUNT(*) c FROM lessons').get()).c,
    questions: (await db.prepare('SELECT COUNT(*) c FROM questions').get()).c,
    exams: (await db.prepare('SELECT COUNT(*) c FROM exams').get()).c,
    resources: (await db.prepare('SELECT COUNT(*) c FROM resources').get()).c,
    examResults: (await db.prepare('SELECT COUNT(*) c FROM exam_results').get()).c,
    totalViews: (await db.prepare('SELECT COALESCE(SUM(views), 0) v FROM lessons').get()).v,
    messages: (await db.prepare('SELECT COUNT(*) c FROM contact_messages').get()).c,
    applications: (await db.prepare('SELECT COUNT(*) c FROM teacher_applications').get()).c,
    pendingApplications: (await db.prepare("SELECT COUNT(*) c FROM teacher_applications WHERE status = 'pending'").get()).c,
    subscriptions: (await db.prepare('SELECT COUNT(*) c FROM user_subjects').get()).c,
    groups: (await db.prepare('SELECT COUNT(*) c FROM groups').get()).c,
    avgExamScore: (await db.prepare('SELECT ROUND(COALESCE(AVG(score), 0)) v FROM exam_results').get()).v,
    payments: (await db.prepare("SELECT COUNT(*) c FROM payments WHERE status = 'paid'").get()).c,
    revenue: (await db.prepare("SELECT ROUND(COALESCE(SUM(amount), 0), 2) v FROM payments WHERE status = 'paid'").get()).v,
    activeSubscriptions: (await db.prepare("SELECT COUNT(*) as c FROM user_subjects WHERE status = 'active'").get()).c,
    totalRevenue: (await db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM payments WHERE status = 'paid'").get()).s,
    subscriberCount: (await db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM user_subjects WHERE status = 'active'").get()).c,
    activeStudents: (await db.prepare(`
      SELECT COUNT(DISTINCT user_id) c FROM (
        SELECT user_id FROM exam_results WHERE created_at >= ?
        UNION
        SELECT user_id FROM lesson_progress WHERE completed_at >= ?
      )
    `).get(sevenDaysAgo, sevenDaysAgo)).c,
    monthlyRevenue: (await db.prepare("SELECT ROUND(COALESCE(SUM(amount), 0), 2) v FROM payments WHERE status = 'paid' AND created_at >= ?").get(monthStart)).v,
    averagePerformance: (await db.prepare('SELECT ROUND(COALESCE(AVG(score), 0), 2) v FROM exam_results').get()).v,
    subjectPerformance: await db.prepare(`
      SELECT s.name as subject_name,
        ROUND(COALESCE(AVG(er.score), 0), 2) as avg_score,
        COUNT(DISTINCT er.user_id) as student_count
      FROM subjects s
      LEFT JOIN exams e ON e.subject_id = s.id
      LEFT JOIN exam_results er ON er.exam_id = e.id
      GROUP BY s.id
      ORDER BY avg_score DESC
    `).all(),
    dailySignups: await db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM users WHERE created_at >= ?
      GROUP BY date(created_at) ORDER BY day
    `).all(thirtyDaysAgo),
  };
  res.json(stats);
});

router.get('/subscriptions-by-subject', async (_req, res) => {
  const rows = await db.prepare(`
    SELECT s.name as label, s.icon, s.color, COUNT(us.id) as value
    FROM subjects s LEFT JOIN user_subjects us ON us.subject_id = s.id
    GROUP BY s.id ORDER BY value DESC
  `).all();
  res.json(rows);
});

router.get('/lessons-by-subject', async (_req, res) => {
  const rows = await db.prepare(`
    SELECT s.name as label, s.color, COUNT(l.id) as value
    FROM subjects s LEFT JOIN lessons l ON l.subject_id = s.id
    GROUP BY s.id ORDER BY value DESC
  `).all();
  res.json(rows);
});

router.get('/recent-users', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT id, name, email, phone, role, grade, points, created_at,
      (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM user_subjects us WHERE us.user_id = users.id AND us.status = 'active') THEN 'active'
        WHEN EXISTS(SELECT 1 FROM user_subjects us WHERE us.user_id = users.id) THEN 'inactive'
        ELSE 'none'
      END) as sub_status
    FROM users ORDER BY created_at DESC LIMIT 10
  `).all());
});

router.delete('/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك من هنا' });
  }
  await db.exec('BEGIN');
  try {
    // حذف كل البيانات المرتبطة بالمستخدم قبل حذفه (القواعد بلا CASCADE)
    await db.prepare('DELETE FROM lesson_progress WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM favorites WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM points_log WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM exam_results WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM user_subjects WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM payments WHERE user_id = ?').run(userId);
    const result = await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    await db.exec('COMMIT');
    if (result.changes === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json({ message: 'تم حذف المستخدم وكل بياناته' });
  } catch (err) {
    await db.exec('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'تعذر حذف المستخدم، حاول مرة أخرى' });
  }
});

// إنشاء مستخدم من الإدارة
router.post('/users', async (req, res) => {
  const { name, email, phone, password, role = 'student', grade } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'الاسم والإيميل وكلمة المرور مطلوبة' });
  }
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'الدور غير صحيح' });
  }
  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'الإيميل مستخدم بالفعل' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await db.prepare('INSERT INTO users (name, email, phone, password, role, grade) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email, phone || null, hash, role, grade || null);

  await logAudit(req.user.id, req.user.name, req.user.role, 'CREATE', 'user', result.lastInsertRowid, null, { name, email, role, grade }, req.ip);
  res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح', id: result.lastInsertRowid });
});

// تعديل مستخدم من الإدارة
router.patch('/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  const user = await db.prepare('SELECT id, name, email, role, grade FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const { name, email, phone, role, grade, password } = req.body;
  if (email && email !== user.email) {
    const exists = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
    if (exists) return res.status(409).json({ error: 'الإيميل مستخدم بالفعل' });
  }

  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
  if (role && ['student', 'teacher', 'admin'].includes(role)) { updates.push('role = ?'); params.push(role); }
  if (grade !== undefined) { updates.push('grade = ?'); params.push(grade || null); }
  if (password) { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }

  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد تعديلات' });

  params.push(userId);
  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  await logAudit(req.user.id, req.user.name, req.user.role, 'UPDATE', 'user', userId, user, { name, email, role, grade }, req.ip);
  res.json({ message: 'تم تعديل المستخدم بنجاح' });
});

router.get('/messages', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all());
});

router.delete('/messages/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM contact_messages WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'الرسالة غير موجودة' });
  res.json({ message: 'تم حذف الرسالة' });
});

router.get('/applications', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM teacher_applications ORDER BY created_at DESC').all());
});

router.patch('/applications/:id', async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'حالة غير صالحة' });
  }
  const result = await db.prepare('UPDATE teacher_applications SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'الطلب غير موجود' });
  res.json({ message: 'تم تحديث حالة الطلب' });
});

router.get('/groups', async (_req, res) => {
  res.json(await db.prepare('SELECT gr.*, g.name as grade_name FROM groups gr JOIN grades g ON g.id = gr.grade_id ORDER BY gr.grade_id').all());
});

router.post('/groups', async (req, res) => {
  const { grade_id, title, description, link } = req.body;
  if (!grade_id || !title || !link) return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول' });
  const result = await db.prepare('INSERT INTO groups (grade_id, title, description, link) VALUES (?, ?, ?, ?)')
    .run(Number(grade_id), title, description || '', link);
  res.status(201).json({ message: 'تمت إضافة الجروب', id: result.lastInsertRowid });
});

router.delete('/groups/:id', async (req, res) => {
  await db.prepare('DELETE FROM groups WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'تم حذف الجروب' });
});

router.get('/resources', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT r.*, s.name as subject_name, g.name as grade_name
    FROM resources r JOIN subjects s ON s.id = r.subject_id JOIN grades g ON g.id = r.grade_id
    ORDER BY r.created_at DESC
  `).all());
});

router.delete('/resources/:id', async (req, res) => {
  await db.prepare('DELETE FROM resources WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'تم حذف الملف' });
});

// إنشاء مورد في المكتبة
router.post('/resources', async (req, res) => {
  const { grade_id, subject_id, type, title, description, content, file_size } = req.body;
  if (!grade_id || !subject_id || !type || !title) {
    return res.status(400).json({ error: 'الصف والمادة والنوع والعنوان مطلوبة' });
  }
  if (!['summary', 'worksheet', 'review', 'book', 'video'].includes(type)) {
    return res.status(400).json({ error: 'نوع الملف غير صحيح' });
  }
  const result = await db.prepare('INSERT INTO resources (grade_id, subject_id, type, title, description, content, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(grade_id, subject_id, type, title, description || null, content || null, file_size || null);
  await logAudit(req.user.id, req.user.name, req.user.role, 'CREATE', 'resource', result.lastInsertRowid, null, { title, type }, req.ip);
  res.status(201).json({ message: 'تم إضافة المورد بنجاح', id: result.lastInsertRowid });
});

// إدارة الشارات
router.get('/badges', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM badges ORDER BY points_required ASC').all());
});

router.post('/badges', async (req, res) => {
  const { name, description, icon, points_required } = req.body;
  if (!name || !points_required) {
    return res.status(400).json({ error: 'الاسم ونقاط الإنجاز مطلوبة' });
  }
  const result = await db.prepare('INSERT INTO badges (name, description, icon, points_required) VALUES (?, ?, ?, ?)')
    .run(name, description || null, icon || '🏅', points_required);
  await logAudit(req.user.id, req.user.name, req.user.role, 'CREATE', 'badge', result.lastInsertRowid, null, { name, points_required }, req.ip);
  res.status(201).json({ message: 'تم إنشاء الشارة بنجاح', id: result.lastInsertRowid });
});

router.patch('/badges/:id', async (req, res) => {
  const badgeId = Number(req.params.id);
  const badge = await db.prepare('SELECT id, name FROM badges WHERE id = ?').get(badgeId);
  if (!badge) return res.status(404).json({ error: 'الشارة غير موجودة' });

  const { name, description, icon, points_required } = req.body;
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (icon) { updates.push('icon = ?'); params.push(icon); }
  if (points_required) { updates.push('points_required = ?'); params.push(points_required); }

  if (updates.length === 0) return res.status(400).json({ error: 'لا توجد تعديلات' });
  params.push(badgeId);
  await db.prepare(`UPDATE badges SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  await logAudit(req.user.id, req.user.name, req.user.role, 'UPDATE', 'badge', badgeId, badge, { name, points_required }, req.ip);
  res.json({ message: 'تم تعديل الشارة بنجاح' });
});

router.delete('/badges/:id', async (req, res) => {
  const badgeId = Number(req.params.id);
  await db.prepare('DELETE FROM badges WHERE id = ?').run(badgeId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'DELETE', 'badge', badgeId, null, null, req.ip);
  res.json({ message: 'تم حذف الشارة' });
});

router.get('/recent-results', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT er.*, u.name as user_name, e.title as exam_title
    FROM exam_results er JOIN users u ON u.id = er.user_id JOIN exams e ON e.id = er.exam_id
    ORDER BY er.created_at DESC LIMIT 8
  `).all());
});

router.get('/leaderboard', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT u.id, u.name, u.points FROM users u WHERE u.points > 0 ORDER BY u.points DESC LIMIT 10
  `).all());
});

// ---------- خطط الاشتراك (CRUD) ----------
router.get('/plans', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM plans ORDER BY section, id').all());
});

router.post('/plans', async (req, res) => {
  const { section, key, name, subjects, price, original_price, active, starts_at, ends_at } = req.body;
  if (!['junior', 'senior'].includes(section) || !key || !name) return res.status(400).json({ error: 'الرجاء إدخال القسم والمعرّف والاسم' });
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'سعر غير صالح' });
  const discount = original_price ? Math.round(((Number(original_price) - priceNum) / Number(original_price)) * 100) : 0;
  const result = await db.prepare(`
    INSERT INTO plans (section, key, name, subjects, price, original_price, discount_pct, active, starts_at, ends_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(section, key, name, subjects ? Number(subjects) : null, priceNum, original_price ? Number(original_price) : null, discount, active === undefined ? 1 : (active ? 1 : 0), starts_at || null, ends_at || null);
  res.status(201).json({ message: 'تمت إضافة الخطة', id: result.lastInsertRowid });
});

router.patch('/plans/:id', async (req, res) => {
  const plan = await db.prepare('SELECT * FROM plans WHERE id = ?').get(Number(req.params.id));
  if (!plan) return res.status(404).json({ error: 'الخطة غير موجودة' });
  const { name, subjects, price, original_price, active, starts_at, ends_at } = req.body;
  const priceNum = price !== undefined ? Number(price) : plan.price;
  if (!Number.isFinite(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'سعر غير صالح' });
  const originalNum = original_price !== undefined ? Number(original_price) : plan.original_price;
  const discount = originalNum ? Math.round(((originalNum - priceNum) / originalNum) * 100) : 0;
  await db.prepare(`
    UPDATE plans SET name = ?, subjects = ?, price = ?, original_price = ?, discount_pct = ?, active = ?,
      starts_at = ?, ends_at = ?
    WHERE id = ?
  `).run(
    name ?? plan.name,
    subjects !== undefined ? (subjects ? Number(subjects) : null) : plan.subjects,
    priceNum, originalNum, discount,
    active !== undefined ? (active ? 1 : 0) : plan.active,
    starts_at !== undefined ? starts_at : plan.starts_at,
    ends_at !== undefined ? ends_at : plan.ends_at,
    plan.id
  );
  res.json({ message: 'تم تحديث الخطة' });
});

router.delete('/plans/:id', async (req, res) => {
  await db.prepare('DELETE FROM plans WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'تم حذف الخطة' });
});

// ---------- العروض الترويجية (CRUD) ----------
router.get('/offers', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM offers ORDER BY id DESC').all());
});

router.post('/offers', async (req, res) => {
  const { title, description, badge, discount_text, starts_at, ends_at, active } = req.body;
  if (!title) return res.status(400).json({ error: 'الرجاء إدخال عنوان العرض' });
  const result = await db.prepare(`
    INSERT INTO offers (title, description, badge, discount_text, starts_at, ends_at, active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', badge || '', discount_text || '', starts_at || null, ends_at || null, active === undefined ? 1 : (active ? 1 : 0));
  res.status(201).json({ message: 'تمت إضافة العرض', id: result.lastInsertRowid });
});

router.patch('/offers/:id', async (req, res) => {
  const offer = await db.prepare('SELECT * FROM offers WHERE id = ?').get(Number(req.params.id));
  if (!offer) return res.status(404).json({ error: 'العرض غير موجود' });
  const { title, description, badge, discount_text, starts_at, ends_at, active } = req.body;
  await db.prepare(`
    UPDATE offers SET title = ?, description = ?, badge = ?, discount_text = ?, starts_at = ?, ends_at = ?, active = ?
    WHERE id = ?
  `).run(title ?? offer.title, description ?? offer.description, badge ?? offer.badge, discount_text ?? offer.discount_text,
    starts_at !== undefined ? starts_at : offer.starts_at,
    ends_at !== undefined ? ends_at : offer.ends_at,
    active !== undefined ? (active ? 1 : 0) : offer.active,
    offer.id);
  res.json({ message: 'تم تحديث العرض' });
});

router.delete('/offers/:id', async (req, res) => {
  await db.prepare('DELETE FROM offers WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'تم حذف العرض' });
});

// ---------- أنواع المواد (Variants) ----------
router.get('/variants', async (_req, res) => {
  res.json(await db.prepare('SELECT * FROM variants ORDER BY id').all());
});

router.post('/variants', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'الرجاء إدخال اسم النوع' });
  const result = await db.prepare('INSERT INTO variants (name, description) VALUES (?, ?)').run(name, description || '');
  res.status(201).json({ message: 'تمت إضافة النوع', id: result.lastInsertRowid });
});

// ---------- اشتراكات الطلاب (منح/إلغاء — لرفع الحماية عن طالب مميز) ----------
router.get('/subscriptions', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT us.id, us.user_id, us.subject_id, us.plan, us.expires_at, us.created_at,
      u.name as user_name, u.grade, s.name as subject_name
    FROM user_subjects us
    JOIN users u ON u.id = us.user_id
    JOIN subjects s ON s.id = us.subject_id
    ORDER BY us.created_at DESC
  `).all());
});

router.post('/subscriptions', async (req, res) => {
  const { user_id, subject_id, plan, expires_at } = req.body;
  if (!user_id || !subject_id) return res.status(400).json({ error: 'الرجاء اختيار الطالب والمادة' });
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(Number(user_id));
  const subject = await db.prepare('SELECT id FROM subjects WHERE id = ?').get(Number(subject_id));
  if (!user || !subject) return res.status(404).json({ error: 'الطالب أو المادة غير موجود' });
  const existing = await db.prepare('SELECT id FROM user_subjects WHERE user_id = ? AND subject_id = ?').get(Number(user_id), Number(subject_id));
  if (existing) {
    await db.prepare('UPDATE user_subjects SET plan = ?, expires_at = ? WHERE id = ?')
      .run(plan || 'هدية إدارية', expires_at || null, existing.id);
    return res.json({ message: 'تم تجديد الاشتراك للطالب' });
  }
  await db.prepare('INSERT INTO user_subjects (user_id, subject_id, plan, expires_at) VALUES (?, ?, ?, ?)')
    .run(Number(user_id), Number(subject_id), plan || 'هدية إدارية', expires_at || null);
  res.status(201).json({ message: 'تم منح المادة للطالب' });
});

router.delete('/subscriptions/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM user_subjects WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'الاشتراك غير موجود' });
  res.json({ message: 'تم إلغاء الاشتراك' });
});

// ---------- إدارة المحتوى: المواد ----------
router.get('/subjects', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT s.*, v.name as variant_name,
      (SELECT COUNT(*) FROM units u WHERE u.subject_id = s.id) as units_count,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id) as lessons_count
    FROM subjects s LEFT JOIN variants v ON v.id = s.variant_id ORDER BY s.id
  `).all());
});

router.post('/subjects', async (req, res) => {
  const { name, icon, color, slug, grade_from, grade_to, variant_id, price } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'الرجاء إدخال الاسم والمعرّف' });
  if (await db.prepare('SELECT id FROM subjects WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: 'المعرّف مستخدم مسبقاً' });
  }
  const result = await db.prepare(`
    INSERT INTO subjects (name, icon, color, slug, grade_from, grade_to, variant_id, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, icon || '📘', color || '#64748b', slug, Number(grade_from) || 8, Number(grade_to) || 12, variant_id ? Number(variant_id) : null, price !== undefined && price !== '' ? Number(price) : null);
  res.status(201).json({ message: 'تمت إضافة المادة', id: result.lastInsertRowid });
});

router.patch('/subjects/:id', async (req, res) => {
  const subject = await db.prepare('SELECT * FROM subjects WHERE id = ?').get(Number(req.params.id));
  if (!subject) return res.status(404).json({ error: 'المادة غير موجودة' });
  const { name, icon, color, slug, grade_from, grade_to, variant_id, price } = req.body;
  if (slug && slug !== subject.slug && await db.prepare('SELECT id FROM subjects WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: 'المعرّف مستخدم مسبقاً' });
  }
  await db.prepare(`UPDATE subjects SET name = ?, icon = ?, color = ?, slug = ?, grade_from = ?, grade_to = ?, variant_id = ?, price = ? WHERE id = ?`)
    .run(name ?? subject.name, icon ?? subject.icon, color ?? subject.color, slug ?? subject.slug,
      grade_from !== undefined ? Number(grade_from) : subject.grade_from,
      grade_to !== undefined ? Number(grade_to) : subject.grade_to,
      variant_id !== undefined ? (variant_id ? Number(variant_id) : null) : subject.variant_id,
      price !== undefined ? (price === '' || price === null ? null : Number(price)) : subject.price,
      subject.id);
  res.json({ message: 'تم تحديث المادة' });
});

router.delete('/subjects/:id', async (req, res) => {
  const id = Number(req.params.id);
  const used = (await db.prepare('SELECT (SELECT COUNT(*) FROM units WHERE subject_id = ?) + (SELECT COUNT(*) FROM lessons WHERE subject_id = ?) + (SELECT COUNT(*) FROM exams WHERE subject_id = ?) AS c').get(id, id, id)).c;
  if (used > 0) return res.status(400).json({ error: 'لا يمكن حذف المادة — تحتوي وحدات/دروس/اختبارات' });
  await db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  res.json({ message: 'تم حذف المادة' });
});

// ---------- إدارة المحتوى: الوحدات ----------
router.get('/units', async (req, res) => {
  const { subject_id, grade_id } = req.query;
  let sql = `
    SELECT u.*, s.name as subject_name, g.name as grade_name,
      (SELECT COUNT(*) FROM lessons l WHERE l.unit_id = u.id) as lessons_count
    FROM units u JOIN subjects s ON s.id = u.subject_id JOIN grades g ON g.id = u.grade_id
    WHERE 1=1
  `;
  const params = [];
  if (subject_id) { sql += ' AND u.subject_id = ?'; params.push(Number(subject_id)); }
  if (grade_id) { sql += ' AND u.grade_id = ?'; params.push(Number(grade_id)); }
  sql += ' ORDER BY u.subject_id, u.grade_id, u.id';
  res.json(await db.prepare(sql).all(...params));
});

router.post('/units', async (req, res) => {
  const { subject_id, grade_id, name } = req.body;
  if (!subject_id || !grade_id || !name) return res.status(400).json({ error: 'الرجاء إدخال المادة والصف والاسم' });
  const result = await db.prepare('INSERT INTO units (subject_id, grade_id, name) VALUES (?, ?, ?)')
    .run(Number(subject_id), Number(grade_id), name);
  res.status(201).json({ message: 'تمت إضافة الوحدة', id: result.lastInsertRowid });
});

router.patch('/units/:id', async (req, res) => {
  const unit = await db.prepare('SELECT * FROM units WHERE id = ?').get(Number(req.params.id));
  if (!unit) return res.status(404).json({ error: 'الوحدة غير موجودة' });
  const { subject_id, grade_id, name } = req.body;
  await db.prepare('UPDATE units SET subject_id = ?, grade_id = ?, name = ? WHERE id = ?')
    .run(subject_id !== undefined ? Number(subject_id) : unit.subject_id,
      grade_id !== undefined ? Number(grade_id) : unit.grade_id,
      name ?? unit.name, unit.id);
  res.json({ message: 'تم تحديث الوحدة' });
});

router.delete('/units/:id', async (req, res) => {
  const id = Number(req.params.id);
  const used = (await db.prepare('SELECT (SELECT COUNT(*) FROM lessons WHERE unit_id = ?) + (SELECT COUNT(*) FROM questions WHERE unit_id = ?) + (SELECT COUNT(*) FROM exams WHERE unit_id = ?) AS c').get(id, id, id)).c;
  if (used > 0) return res.status(400).json({ error: 'لا يمكن حذف الوحدة — تحتوي دروساً أو أسئلة أو اختبارات' });
  const result = await db.prepare('DELETE FROM units WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'الوحدة غير موجودة' });
  res.json({ message: 'تم حذف الوحدة' });
});

// ---------- إدارة المحتوى: الدروس ----------
router.get('/content-lessons', async (req, res) => {
  const { subject_id, grade_id, q } = req.query;
  let sql = `
    SELECT l.*, s.name as subject_name, g.name as grade_name, u.name as unit_name
    FROM lessons l
    JOIN subjects s ON s.id = l.subject_id JOIN grades g ON g.id = l.grade_id
    LEFT JOIN units u ON u.id = l.unit_id
    WHERE 1=1
  `;
  const params = [];
  if (subject_id) { sql += ' AND l.subject_id = ?'; params.push(Number(subject_id)); }
  if (grade_id) { sql += ' AND l.grade_id = ?'; params.push(Number(grade_id)); }
  if (q) { sql += ' AND l.title LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY l.id DESC LIMIT 100';
  res.json(await db.prepare(sql).all(...params));
});

router.post('/content-lessons', async (req, res) => {
  const { grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, video_url, pdf_url, is_sample, is_archive, objectives } = req.body;
  if (!grade_id || !subject_id || !title || !duration) return res.status(400).json({ error: 'الرجاء إدخال الصف والمادة والعنوان والمدة' });
  const result = await db.prepare(`
    INSERT INTO lessons (grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, video_url, pdf_url, is_sample, is_archive, objectives)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(Number(grade_id), Number(subject_id), unit_id ? Number(unit_id) : null, title, description || '', Number(duration),
    teacher_name || null, level || 'متوسط', video_url || null, pdf_url || null, is_sample ? 1 : 0, is_archive ? 1 : 0, objectives || null);
  res.status(201).json({ message: 'تمت إضافة الدرس', id: result.lastInsertRowid });
});

router.patch('/content-lessons/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  const { grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, video_url, pdf_url, views, is_sample, is_archive, objectives } = req.body;
  await db.prepare(`
    UPDATE lessons SET grade_id = ?, subject_id = ?, unit_id = ?, title = ?, description = ?, duration = ?,
      teacher_name = ?, level = ?, video_url = ?, pdf_url = ?, views = ?, is_sample = ?, is_archive = ?, objectives = ? WHERE id = ?
  `).run(
    grade_id !== undefined ? Number(grade_id) : lesson.grade_id,
    subject_id !== undefined ? Number(subject_id) : lesson.subject_id,
    unit_id !== undefined ? (unit_id ? Number(unit_id) : null) : lesson.unit_id,
    title ?? lesson.title, description ?? lesson.description,
    duration !== undefined ? Number(duration) : lesson.duration,
    teacher_name !== undefined ? teacher_name : lesson.teacher_name,
    level ?? lesson.level,
    video_url !== undefined ? video_url : lesson.video_url,
    pdf_url !== undefined ? pdf_url : lesson.pdf_url,
    views !== undefined ? Number(views) : lesson.views,
    is_sample !== undefined ? (is_sample ? 1 : 0) : lesson.is_sample,
    is_archive !== undefined ? (is_archive ? 1 : 0) : lesson.is_archive,
    objectives !== undefined ? objectives : lesson.objectives,
    id);
  res.json({ message: 'تم تحديث الدرس' });
});

router.delete('/content-lessons/:id', async (req, res) => {
  const id = Number(req.params.id);
  await db.exec('BEGIN');
  try {
    await db.prepare('DELETE FROM lesson_progress WHERE lesson_id = ?').run(id);
    await db.prepare('DELETE FROM favorites WHERE lesson_id = ?').run(id);
    const result = await db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
    await db.exec('COMMIT');
    if (result.changes === 0) return res.status(404).json({ error: 'الدرس غير موجود' });
    res.json({ message: 'تم حذف الدرس' });
  } catch (err) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: 'تعذر حذف الدرس' });
  }
});

// ---------- إدارة المحتوى: الأسئلة ----------
router.get('/content-questions', async (req, res) => {
  const { subject_id, grade_id, unit_id, q } = req.query;
  let sql = `
    SELECT q.*, s.name as subject_name, g.name as grade_name, u.name as unit_name, l.title as lesson_title
    FROM questions q
    JOIN subjects s ON s.id = q.subject_id JOIN grades g ON g.id = q.grade_id
    LEFT JOIN units u ON u.id = q.unit_id LEFT JOIN lessons l ON l.id = q.lesson_id
    WHERE 1=1
  `;
  const params = [];
  if (subject_id) { sql += ' AND q.subject_id = ?'; params.push(Number(subject_id)); }
  if (grade_id) { sql += ' AND q.grade_id = ?'; params.push(Number(grade_id)); }
  if (unit_id) { sql += ' AND q.unit_id = ?'; params.push(Number(unit_id)); }
  if (q) { sql += ' AND q.question LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY q.id DESC LIMIT 100';
  res.json(await db.prepare(sql).all(...params));
});

router.post('/content-questions', async (req, res) => {
  const { subject_id, grade_id, unit_id, lesson_id, question, options, correct_index, question_type, explanation, difficulty } = req.body;
  if (!subject_id || !grade_id || !question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'الرجاء إدخال المادة والصف والسؤال وخيارين على الأقل' });
  }
  const type = question_type || 'mcq';
  let correct;
  if (type === 'multi') {
    if (!Array.isArray(correct_index) || correct_index.length === 0) return res.status(400).json({ error: 'حدد الإجابات الصحيحة للاختيار المتعدد' });
    correct = JSON.stringify(correct_index.map(Number));
  } else {
    correct = Number(correct_index);
    if (!Number.isFinite(correct) || correct < 0 || correct >= options.length) return res.status(400).json({ error: 'رقم الإجابة الصحيحة غير صالح' });
  }
  const result = await db.prepare(`
    INSERT INTO questions (subject_id, grade_id, unit_id, lesson_id, question, options, correct_index, question_type, explanation, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(Number(subject_id), Number(grade_id), unit_id ? Number(unit_id) : null, lesson_id ? Number(lesson_id) : null,
    question, JSON.stringify(options), correct, type, explanation || '', difficulty || 'متوسط');
  res.status(201).json({ message: 'تمت إضافة السؤال', id: result.lastInsertRowid });
});

router.patch('/content-questions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const question = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!question) return res.status(404).json({ error: 'السؤال غير موجود' });
  const { subject_id, grade_id, unit_id, lesson_id, question: text, options, correct_index, question_type, explanation, difficulty } = req.body;
  const opts = Array.isArray(options) ? options : JSON.parse(question.options);
  const type = question_type || question.question_type;
  let correct = question.correct_index;
  if (correct_index !== undefined) {
    if (type === 'multi') correct = JSON.stringify((Array.isArray(correct_index) ? correct_index : [correct_index]).map(Number));
    else correct = Number(correct_index);
  }
  await db.prepare(`
    UPDATE questions SET subject_id = ?, grade_id = ?, unit_id = ?, lesson_id = ?, question = ?, options = ?,
      correct_index = ?, question_type = ?, explanation = ?, difficulty = ? WHERE id = ?
  `).run(
    subject_id !== undefined ? Number(subject_id) : question.subject_id,
    grade_id !== undefined ? Number(grade_id) : question.grade_id,
    unit_id !== undefined ? (unit_id ? Number(unit_id) : null) : question.unit_id,
    lesson_id !== undefined ? (lesson_id ? Number(lesson_id) : null) : question.lesson_id,
    text ?? question.question, JSON.stringify(opts), correct, type,
    explanation !== undefined ? explanation : question.explanation,
    difficulty ?? question.difficulty, id);
  res.json({ message: 'تم تحديث السؤال' });
});

router.delete('/content-questions/:id', async (req, res) => {
  const result = await db.prepare('DELETE FROM questions WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'السؤال غير موجود' });
  res.json({ message: 'تم حذف السؤال' });
});

// ---------- إدارة المحتوى: الاختبارات ----------
router.get('/content-exams', async (req, res) => {
  const { subject_id, grade_id } = req.query;
  let sql = `
    SELECT e.*, s.name as subject_name, g.name as grade_name, u.name as unit_name
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id JOIN grades g ON g.id = e.grade_id
    LEFT JOIN units u ON u.id = e.unit_id
    WHERE 1=1
  `;
  const params = [];
  if (subject_id) { sql += ' AND e.subject_id = ?'; params.push(Number(subject_id)); }
  if (grade_id) { sql += ' AND e.grade_id = ?'; params.push(Number(grade_id)); }
  sql += ' ORDER BY e.id DESC';
  res.json(await db.prepare(sql).all(...params));
});

router.post('/content-exams', async (req, res) => {
  const { grade_id, subject_id, unit_id, title, description, duration_minutes, question_count, exam_type, max_attempts, open_at, close_at, is_free, show_results, allow_review, points_reward } = req.body;
  if (!grade_id || !subject_id || !title || !duration_minutes || !question_count) {
    return res.status(400).json({ error: 'الرجاء إدخال الصف والمادة والعنوان والمدة وعدد الأسئلة' });
  }
  const result = await db.prepare(`
    INSERT INTO exams (grade_id, subject_id, unit_id, title, description, duration_minutes, question_count, exam_type, max_attempts, open_at, close_at, is_free, show_results, allow_review, created_by, points_reward)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(grade_id), Number(subject_id), unit_id ? Number(unit_id) : null,
    title, description || '', Number(duration_minutes), Number(question_count), exam_type || 'درس',
    max_attempts || 1, open_at || null, close_at || null,
    is_free ? 1 : 0, show_results !== false ? 1 : 0, allow_review !== false ? 1 : 0,
    req.user.id, points_reward || 20
  );
  res.status(201).json({ message: 'تمت إضافة الاختبار', id: result.lastInsertRowid });
});

router.patch('/content-exams/:id', async (req, res) => {
  const id = Number(req.params.id);
  const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  const { grade_id, subject_id, unit_id, title, description, duration_minutes, question_count, exam_type, max_attempts, open_at, close_at, is_free, show_results, allow_review, points_reward } = req.body;
  await db.prepare(`
    UPDATE exams SET grade_id = ?, subject_id = ?, unit_id = ?, title = ?, description = ?, duration_minutes = ?, question_count = ?, exam_type = ?, max_attempts = ?, open_at = ?, close_at = ?, is_free = ?, show_results = ?, allow_review = ?, points_reward = ? WHERE id = ?
  `).run(
    grade_id !== undefined ? Number(grade_id) : exam.grade_id,
    subject_id !== undefined ? Number(subject_id) : exam.subject_id,
    unit_id !== undefined ? (unit_id ? Number(unit_id) : null) : exam.unit_id,
    title ?? exam.title, description ?? exam.description,
    duration_minutes !== undefined ? Number(duration_minutes) : exam.duration_minutes,
    question_count !== undefined ? Number(question_count) : exam.question_count,
    exam_type ?? exam.exam_type,
    max_attempts !== undefined ? max_attempts : exam.max_attempts,
    open_at !== undefined ? open_at : exam.open_at,
    close_at !== undefined ? close_at : exam.close_at,
    is_free !== undefined ? (is_free ? 1 : 0) : exam.is_free,
    show_results !== undefined ? (show_results ? 1 : 0) : exam.show_results,
    allow_review !== undefined ? (allow_review ? 1 : 0) : exam.allow_review,
    points_reward !== undefined ? points_reward : exam.points_reward, id);
  res.json({ message: 'تم تحديث الاختبار' });
});

router.delete('/content-exams/:id', async (req, res) => {
  const id = Number(req.params.id);
  await db.exec('BEGIN');
  try {
    await db.prepare('DELETE FROM exam_results WHERE exam_id = ?').run(id);
    await db.prepare('DELETE FROM favorites WHERE exam_id = ?').run(id);
    const result = await db.prepare('DELETE FROM exams WHERE id = ?').run(id);
    await db.exec('COMMIT');
    if (result.changes === 0) return res.status(404).json({ error: 'الاختبار غير موجود' });
    res.json({ message: 'تم حذف الاختبار' });
  } catch (err) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: 'تعذر حذف الاختبار' });
  }
});

// ---------- إحصائيات الاختبار ----------
router.get('/exam-analytics/:examId', async (req, res) => {
  const examId = Number(req.params.examId);
  const exam = await db.prepare(`
    SELECT e.*, s.name as subject_name, g.name as grade_name 
    FROM exams e JOIN subjects s ON s.id = e.subject_id JOIN grades g ON g.id = e.grade_id
    WHERE e.id = ?
  `).get(examId);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });

  const results = await db.prepare(`
    SELECT er.*, u.name as user_name, u.email as user_email
    FROM exam_results er JOIN users u ON u.id = er.user_id
    WHERE er.exam_id = ? ORDER BY er.score DESC
  `).all(examId);

  const stats = {
    totalAttempts: results.length,
    uniqueStudents: new Set(results.map(r => r.user_id)).size,
    avgScore: results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    passRate: results.length ? Math.round(results.filter(r => r.score >= 50).length / results.length * 100) : 0,
    highestScore: results.length ? Math.max(...results.map(r => r.score)) : 0,
    lowestScore: results.length ? Math.min(...results.map(r => r.score)) : 0,
  };

  const perStudent = await db.prepare(`
    SELECT u.name, u.email, er.score, er.attempt_number, er.time_spent, er.created_at
    FROM exam_results er JOIN users u ON u.id = er.user_id
    WHERE er.exam_id = ? ORDER BY er.score DESC
  `).all(examId);

  res.json({ exam, stats, results: perStudent });
});

// ---------- إدارة الحصص المباشرة ----------
router.get('/content-live-sessions', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT ls.*, s.name as subject_name, g.name as grade_name
    FROM live_sessions ls JOIN subjects s ON s.id = ls.subject_id JOIN grades g ON g.id = ls.grade_id
    ORDER BY ls.id DESC
  `).all());
});

router.post('/content-live-sessions', async (req, res) => {
  const { title, description, grade_id, subject_id, scheduled_at, session_date, session_time, duration_minutes, is_subscribers_only, is_recorded, max_participants, teacher_name, meeting_url, video_url, status } = req.body;
  if (!grade_id || !subject_id || !title) return res.status(400).json({ error: 'الرجاء إدخال الصف والمادة والعنوان' });
  const result = await db.prepare(`
    INSERT INTO live_sessions (title, description, grade_id, subject_id, scheduled_at, session_date, session_time, duration_minutes, is_subscribers_only, is_recorded, max_participants, teacher_name, meeting_url, video_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', Number(grade_id), Number(subject_id),
    scheduled_at || null, session_date || null, session_time || null,
    duration_minutes || 60, is_subscribers_only ? 1 : 0, is_recorded ? 1 : 0, max_participants || 50,
    teacher_name || null, meeting_url || null, video_url || null, status || 'upcoming');
  res.status(201).json({ message: 'تمت إضافة الحصة المباشرة', id: result.lastInsertRowid });
});

router.patch('/content-live-sessions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const session = await db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
  if (!session) return res.status(404).json({ error: 'الحصة غير موجودة' });
  const { title, description, grade_id, subject_id, scheduled_at, session_date, session_time, duration_minutes, is_subscribers_only, is_recorded, max_participants, teacher_name, meeting_url, video_url, status } = req.body;
  await db.prepare(`UPDATE live_sessions SET title=?, description=?, grade_id=?, subject_id=?, scheduled_at=?, session_date=?, session_time=?, duration_minutes=?, is_subscribers_only=?, is_recorded=?, max_participants=?, teacher_name=?, meeting_url=?, video_url=?, status=? WHERE id=?`)
    .run(
      title ?? session.title, description ?? session.description,
      grade_id !== undefined ? Number(grade_id) : session.grade_id,
      subject_id !== undefined ? Number(subject_id) : session.subject_id,
      scheduled_at !== undefined ? scheduled_at : session.scheduled_at,
      session_date !== undefined ? session_date : session.session_date,
      session_time !== undefined ? session_time : session.session_time,
      duration_minutes !== undefined ? Number(duration_minutes) : session.duration_minutes,
      is_subscribers_only !== undefined ? (is_subscribers_only ? 1 : 0) : session.is_subscribers_only,
      is_recorded !== undefined ? (is_recorded ? 1 : 0) : session.is_recorded,
      max_participants !== undefined ? Number(max_participants) : session.max_participants,
      teacher_name !== undefined ? teacher_name : session.teacher_name,
      meeting_url !== undefined ? meeting_url : session.meeting_url,
      video_url !== undefined ? video_url : session.video_url,
      status ?? session.status, id);
  res.json({ message: 'تم تحديث الحصة' });
});

router.delete('/content-live-sessions/:id', async (req, res) => {
  const id = Number(req.params.id);
  await db.exec('BEGIN');
  try {
    await db.prepare('DELETE FROM session_participants WHERE session_id = ?').run(id);
    const result = await db.prepare('DELETE FROM live_sessions WHERE id = ?').run(id);
    await db.exec('COMMIT');
    if (result.changes === 0) return res.status(404).json({ error: 'الحصة غير موجودة' });
    res.json({ message: 'تم حذف الحصة' });
  } catch (err) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: 'تعذر حذف الحصة' });
  }
});

// ---------- أنواع المواد: تعديل وحذف محمي ----------
router.patch('/variants/:id', async (req, res) => {
  const variant = await db.prepare('SELECT * FROM variants WHERE id = ?').get(Number(req.params.id));
  if (!variant) return res.status(404).json({ error: 'النوع غير موجود' });
  const { name, description } = req.body;
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ error: 'الرجاء إدخال اسم النوع' });
  await db.prepare('UPDATE variants SET name = ?, description = ? WHERE id = ?')
    .run(name ?? variant.name, description !== undefined ? description : variant.description, variant.id);
  res.json({ message: 'تم تحديث النوع' });
});

router.delete('/variants/:id', async (req, res) => {
  const id = Number(req.params.id);
  const used = (await db.prepare('SELECT COUNT(*) c FROM subjects WHERE variant_id = ?').get(id)).c;
  if (used > 0) return res.status(400).json({ error: 'لا يمكن حذف النوع — مستخدم في مواد' });
  const result = await db.prepare('DELETE FROM variants WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'النوع غير موجود' });
  res.json({ message: 'تم حذف النوع' });
});

router.get('/payments', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT p.*, u.name as user_name, u.email
    FROM payments p JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC LIMIT 100
  `).all());
});

// ---------- قائمة المستخدمين الكاملة مع بحث ----------
router.get('/users', async (req, res) => {
  const { q, role } = req.query;
  let sql = `
    SELECT id, name, email, phone, role, grade, points, created_at,
      (SELECT COUNT(*) FROM user_subjects us WHERE us.user_id = users.id) as subjects_count,
      (SELECT CASE
        WHEN EXISTS(SELECT 1 FROM user_subjects us WHERE us.user_id = users.id AND us.status = 'active') THEN 'active'
        WHEN EXISTS(SELECT 1 FROM user_subjects us WHERE us.user_id = users.id) THEN 'inactive'
        ELSE 'none'
      END) as sub_status
    FROM users WHERE 1=1
  `;
  const params = [];
  if (q) { sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (role) { sql += ' AND role = ?'; params.push(role); }
  sql += ' ORDER BY id DESC LIMIT 200';
  res.json(await db.prepare(sql).all(...params));
});

// ---------- إدارة: إنشاء حساب معلم من طلب موفّق ----------
router.post('/teacher-applications/:id/approve', async (req, res) => {
  const app = await db.prepare('SELECT * FROM teacher_applications WHERE id = ?').get(Number(req.params.id));
  if (!app) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (app.status === 'approved') return res.json({ message: 'الطلب موفّق مسبقاً' });

  const existing = await db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(app.email, app.phone || '');
  if (existing) {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('teacher', existing.id);
    await db.prepare("UPDATE teacher_applications SET status = 'approved' WHERE id = ?").run(app.id);
    return res.json({ message: 'تم تحويل الحساب الموجود إلى معلم' });
  }

  const tempPassword = Math.random().toString(36).slice(2, 12);
  const hash = bcrypt.hashSync(tempPassword, 10);
  const result = await db.prepare('INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)')
    .run(app.name, app.email, app.phone || null, hash, 'teacher');
  await db.prepare("UPDATE teacher_applications SET status = 'approved' WHERE id = ?").run(app.id);
  res.json({ message: 'تم إنشاء حساب المعلم بنجاح — سلّم كلمة المرور المؤقتة للمعلم (سيُطالب بتغييرها فور أول استخدام عبر "نسيت كلمة المرور")', id: result.lastInsertRowid, temp_password: tempPassword });
});

// ---------- الإعدادات العامة (للمدير فقط) ----------
router.get('/settings', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'مخصص للمدير فقط' });
  const rows = await db.prepare('SELECT key, value FROM settings ORDER BY key').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.patch('/settings', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'مخصص للمدير فقط' });
  const { key, value } = req.body;
  if (!key || typeof key !== 'string' || !key.trim()) return res.status(400).json({ error: 'المفتاح مطلوب' });
  const safeKey = key.trim();
  const safeValue = value === null ? '' : String(value).trim();
  if (safeValue.length > 500) return res.status(400).json({ error: 'القيمة طويلة جداً' });
  await db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
    .run(safeKey, safeValue);
  res.json({ message: 'تم حفظ الإعداد' });
});

// ---------- التقارير ----------

router.get('/reports/students', async (req, res) => {
  const { from_date, to_date } = req.query;
  let sql = `
    SELECT u.id, u.name, u.email, u.grade, u.points,
      (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id) as lessons_completed,
      (SELECT ROUND(COALESCE(AVG(er.score), 0), 2) FROM exam_results er WHERE er.user_id = u.id) as avg_exam_score,
      (SELECT MAX(lp.completed_at) FROM lesson_progress lp WHERE lp.user_id = u.id) as last_active
    FROM users u WHERE u.role = 'student'
  `;
  const params = [];
  if (from_date) { sql += ' AND (SELECT MAX(lp.completed_at) FROM lesson_progress lp WHERE lp.user_id = u.id) >= ?'; params.push(from_date); }
  if (to_date) { sql += ' AND (SELECT MAX(lp.completed_at) FROM lesson_progress lp WHERE lp.user_id = u.id) <= ?'; params.push(to_date); }
  sql += ' ORDER BY u.id';
  res.json(await db.prepare(sql).all(...params));
});

router.get('/reports/teachers', async (req, res) => {
  const { from_date, to_date } = req.query;
  let sql = `
    SELECT u.id, u.name, u.email,
      (SELECT COUNT(*) FROM lessons l WHERE l.teacher_name = u.name) as lessons_created,
      (SELECT COUNT(*) FROM exams e WHERE e.created_by = u.id) as exams_created,
      (SELECT COUNT(DISTINCT us2.user_id) FROM user_subjects us2
        JOIN teacher_subjects ts ON ts.subject_id = us2.subject_id AND ts.teacher_id = u.id
      ) as students_taught,
      (SELECT ROUND(COALESCE(AVG(er2.score), 0), 2) FROM exam_results er2
        JOIN exams e2 ON e2.id = er2.exam_id WHERE e2.created_by = u.id
      ) as avg_student_score
    FROM users u WHERE u.role = 'teacher'
  `;
  const params = [];
  if (from_date) { sql += ' AND u.created_at >= ?'; params.push(from_date); }
  if (to_date) { sql += ' AND u.created_at <= ?'; params.push(to_date); }
  sql += ' ORDER BY u.id';
  res.json(await db.prepare(sql).all(...params));
});

router.get('/reports/subjects', async (req, res) => {
  const { from_date, to_date } = req.query;
  let sql = `
    SELECT s.id, s.name,
      (SELECT COUNT(DISTINCT us.user_id) FROM user_subjects us WHERE us.subject_id = s.id) as student_count,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id) as lesson_count,
      (SELECT COUNT(*) FROM exams e WHERE e.subject_id = s.id) as exam_count,
      (SELECT ROUND(COALESCE(AVG(er.score), 0), 2) FROM exam_results er
        JOIN exams e ON e.id = er.exam_id WHERE e.subject_id = s.id
      ) as avg_score
    FROM subjects s WHERE 1=1
  `;
  const params = [];
  if (from_date) { sql += ' AND s.id IN (SELECT subject_id FROM exams WHERE created_at >= ?)'; params.push(from_date); }
  if (to_date) { sql += ' AND s.id IN (SELECT subject_id FROM exams WHERE created_at <= ?)'; params.push(to_date); }
  sql += ' ORDER BY s.id';
  res.json(await db.prepare(sql).all(...params));
});

router.get('/reports/exams', async (req, res) => {
  const { from_date, to_date } = req.query;
  let sql = `
    SELECT e.id, e.title, s.name as subject_name,
      (SELECT COUNT(*) FROM exam_results er WHERE er.exam_id = e.id) as attempts,
      (SELECT ROUND(COALESCE(AVG(er.score), 0), 2) FROM exam_results er WHERE er.exam_id = e.id) as avg_score,
      (SELECT ROUND(COALESCE(SUM(CASE WHEN er.score >= 50 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0), 2) FROM exam_results er WHERE er.exam_id = e.id) as pass_rate,
      (SELECT MAX(er.score) FROM exam_results er WHERE er.exam_id = e.id) as highest,
      (SELECT MIN(er.score) FROM exam_results er WHERE er.exam_id = e.id) as lowest
    FROM exams e JOIN subjects s ON s.id = e.subject_id WHERE 1=1
  `;
  const params = [];
  if (from_date) { sql += ' AND e.created_at >= ?'; params.push(from_date); }
  if (to_date) { sql += ' AND e.created_at <= ?'; params.push(to_date); }
  sql += ' ORDER BY e.id DESC';
  res.json(await db.prepare(sql).all(...params));
});

router.get('/reports/revenue', async (req, res) => {
  const { from_date, to_date } = req.query;
  let wherePaid = "p.status = 'paid'";
  const params = [];
  if (from_date) { wherePaid += ' AND p.created_at >= ?'; params.push(from_date); }
  if (to_date) { wherePaid += ' AND p.created_at <= ?'; params.push(to_date); }

  const monthly = await db.prepare(`
    SELECT strftime('%Y-%m', p.created_at) as month, SUM(p.amount) as total
    FROM payments p WHERE ${wherePaid}
    GROUP BY month ORDER BY month DESC
  `).all(...params);

  const bySubject = await db.prepare(`
    SELECT s.name as subject_name, SUM(p.amount) as total
    FROM payments p
    JOIN subjects s ON s.id = CAST(json_each.value AS INTEGER)
    JOIN json_each(p.subject_ids) WHERE ${wherePaid}
    GROUP BY s.id ORDER BY total DESC
  `).all(...params);

  const total = (await db.prepare(`SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p WHERE ${wherePaid}`).get(...params)).total;

  res.json({ monthly, bySubject, total });
});

router.get('/reports/activity', async (req, res) => {
  const { from_date, to_date } = req.query;
  let sql = `
    SELECT date(started_at) as day,
      COUNT(DISTINCT user_id) as active_users
    FROM lesson_progress WHERE started_at IS NOT NULL
  `;
  const params = [];
  if (from_date) { sql += ' AND started_at >= ?'; params.push(from_date); }
  if (to_date) { sql += ' AND started_at <= ?'; params.push(to_date); }
  sql += ' GROUP BY date(started_at) ORDER BY day DESC';

  const dailyActivity = await db.prepare(sql).all(...params);

  let sqlSignups = `SELECT date(created_at) as day, COUNT(*) as count FROM users WHERE 1=1`;
  const paramsSignups = [];
  if (from_date) { sqlSignups += ' AND created_at >= ?'; paramsSignups.push(from_date); }
  if (to_date) { sqlSignups += ' AND created_at <= ?'; paramsSignups.push(to_date); }
  sqlSignups += ' GROUP BY date(created_at) ORDER BY day DESC';

  let sqlLessons = `SELECT date(completed_at) as day, COUNT(*) as count FROM lesson_progress WHERE completed_at IS NOT NULL`;
  const paramsLessons = [];
  if (from_date) { sqlLessons += ' AND completed_at >= ?'; paramsLessons.push(from_date); }
  if (to_date) { sqlLessons += ' AND completed_at <= ?'; paramsLessons.push(to_date); }
  sqlLessons += ' GROUP BY date(completed_at) ORDER BY day DESC';

  let sqlExams = `SELECT date(created_at) as day, COUNT(*) as count FROM exam_results WHERE 1=1`;
  const paramsExams = [];
  if (from_date) { sqlExams += ' AND created_at >= ?'; paramsExams.push(from_date); }
  if (to_date) { sqlExams += ' AND created_at <= ?'; paramsExams.push(to_date); }
  sqlExams += ' GROUP BY date(created_at) ORDER BY day DESC';

  res.json({
    dailyActiveUsers: dailyActivity,
    newSignups: await db.prepare(sqlSignups).all(...paramsSignups),
    lessonsCompleted: await db.prepare(sqlLessons).all(...paramsLessons),
    examsTaken: await db.prepare(sqlExams).all(...paramsExams),
  });
});

// ---------- سجل التدقيق ----------

router.get('/audit-log', async (req, res) => {
  const { page = 1, limit = 50, user_id, action, entity_type, from_date, to_date } = req.query;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as c FROM audit_log WHERE 1=1';
  const params = [];
  const countParams = [];
  if (user_id) { sql += ' AND user_id = ?'; countSql += ' AND user_id = ?'; params.push(Number(user_id)); countParams.push(Number(user_id)); }
  if (action) { sql += ' AND action = ?'; countSql += ' AND action = ?'; params.push(action); countParams.push(action); }
  if (entity_type) { sql += ' AND entity_type = ?'; countSql += ' AND entity_type = ?'; params.push(entity_type); countParams.push(entity_type); }
  if (from_date) { sql += ' AND created_at >= ?'; countSql += ' AND created_at >= ?'; params.push(from_date); countParams.push(from_date); }
  if (to_date) { sql += ' AND created_at <= ?'; countSql += ' AND created_at <= ?'; params.push(to_date); countParams.push(to_date); }
  const total = (await db.prepare(countSql).get(...countParams)).c;
  const offset = (Number(page) - 1) * Number(limit);
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);
  const rows = await db.prepare(sql).all(...params);
  res.json({ total, page: Number(page), limit: Number(limit), data: rows });
});

router.post('/audit-log', async (req, res) => {
  const { action, entity_type, entity_id, old_value, new_value, ip_address } = req.body;
  if (!action) return res.status(400).json({ error: 'الإجراء مطلوب' });
  await logAudit(req.user.id, req.user.name, req.user.role, action, entity_type || null, entity_id || null, old_value || null, new_value || null, ip_address || req.ip);
  res.status(201).json({ message: 'تم تسجيل الإجراء' });
});

// ---------- موافقة الدروس ----------

router.get('/pending-lessons', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT l.*, ls.status, ls.submitted_by, ls.reviewed_by, ls.submitted_at, ls.review_notes,
      s.name as subject_name, g.name as grade_name
    FROM lessons l
    JOIN lesson_status ls ON ls.lesson_id = l.id
    JOIN subjects s ON s.id = l.subject_id
    JOIN grades g ON g.id = l.grade_id
    WHERE ls.status = 'pending'
    ORDER BY ls.submitted_at DESC
  `).all());
});

router.patch('/lessons/:id/approve', async (req, res) => {
  const lessonId = Number(req.params.id);
  const ls = await db.prepare('SELECT * FROM lesson_status WHERE lesson_id = ?').get(lessonId);
  if (!ls) return res.status(404).json({ error: 'حالة الدرس غير موجودة' });
  if (ls.status === 'approved') return res.json({ message: 'تمت الموافقة مسبقاً' });
  await db.prepare("UPDATE lesson_status SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE lesson_id = ?")
    .run(req.user.id, lessonId);
  await db.prepare("UPDATE lessons SET status = 'published' WHERE id = ?").run(lessonId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'approve_lesson', 'lesson', lessonId, ls.status, 'approved', req.ip);
  res.json({ message: 'تمت الموافقة على الدرس' });
});

router.patch('/lessons/:id/reject', async (req, res) => {
  const lessonId = Number(req.params.id);
  const { review_notes } = req.body;
  const ls = await db.prepare('SELECT * FROM lesson_status WHERE lesson_id = ?').get(lessonId);
  if (!ls) return res.status(404).json({ error: 'حالة الدرس غير موجودة' });
  await db.prepare("UPDATE lesson_status SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ? WHERE lesson_id = ?")
    .run(req.user.id, review_notes || '', lessonId);
  await db.prepare("UPDATE lessons SET status = 'rejected' WHERE id = ?").run(lessonId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'reject_lesson', 'lesson', lessonId, ls.status, 'rejected', req.ip);
  res.json({ message: 'تم رفض الدرس' });
});

router.patch('/lessons/:id/publish', async (req, res) => {
  const lessonId = Number(req.params.id);
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  await db.prepare("UPDATE lessons SET status = 'published' WHERE id = ?").run(lessonId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'publish_lesson', 'lesson', lessonId, lesson.status, 'published', req.ip);
  res.json({ message: 'تم نشر الدرس' });
});

router.patch('/lessons/:id/unpublish', async (req, res) => {
  const lessonId = Number(req.params.id);
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  await db.prepare("UPDATE lessons SET status = 'draft' WHERE id = ?").run(lessonId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'unpublish_lesson', 'lesson', lessonId, lesson.status, 'draft', req.ip);
  res.json({ message: 'تم إخفاء الدرس' });
});

// ---------- موافقة الاختبارات ----------

router.get('/pending-exams', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT e.*, es.status, es.submitted_by, es.reviewed_by, es.submitted_at, es.review_notes,
      s.name as subject_name, g.name as grade_name
    FROM exams e
    JOIN exam_status es ON es.exam_id = e.id
    JOIN subjects s ON s.id = e.subject_id
    JOIN grades g ON g.id = e.grade_id
    WHERE es.status = 'pending'
    ORDER BY es.submitted_at DESC
  `).all());
});

router.patch('/exams/:id/approve', async (req, res) => {
  const examId = Number(req.params.id);
  const es = await db.prepare('SELECT * FROM exam_status WHERE exam_id = ?').get(examId);
  if (!es) return res.status(404).json({ error: 'حالة الاختبار غير موجودة' });
  if (es.status === 'approved') return res.json({ message: 'تمت الموافقة مسبقاً' });
  await db.prepare("UPDATE exam_status SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE exam_id = ?")
    .run(req.user.id, examId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'approve_exam', 'exam', examId, es.status, 'approved', req.ip);
  res.json({ message: 'تمت الموافقة على الاختبار' });
});

router.patch('/exams/:id/reject', async (req, res) => {
  const examId = Number(req.params.id);
  const { review_notes } = req.body;
  const es = await db.prepare('SELECT * FROM exam_status WHERE exam_id = ?').get(examId);
  if (!es) return res.status(404).json({ error: 'حالة الاختبار غير موجودة' });
  await db.prepare("UPDATE exam_status SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ? WHERE exam_id = ?")
    .run(req.user.id, review_notes || '', examId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'reject_exam', 'exam', examId, es.status, 'rejected', req.ip);
  res.json({ message: 'تم رفض الاختبار' });
});

router.patch('/exams/:id/publish', async (req, res) => {
  const examId = Number(req.params.id);
  const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  await logAudit(req.user.id, req.user.name, req.user.role, 'publish_exam', 'exam', examId, 'approved', 'published', req.ip);
  res.json({ message: 'تم نشر الاختبار' });
});

// ---------- إدارة المعلمين ----------

router.get('/teachers', async (_req, res) => {
  res.json(await db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
      GROUP_CONCAT(DISTINCT s.name) as subjects,
      (SELECT COUNT(*) FROM lessons l WHERE l.teacher_name = u.name) as lessons_count,
      (SELECT COUNT(*) FROM exams e WHERE e.created_by = u.id) as exams_count
    FROM users u
    LEFT JOIN teacher_subjects ts ON ts.teacher_id = u.id
    LEFT JOIN subjects s ON s.id = ts.subject_id
    WHERE u.role = 'teacher'
    GROUP BY u.id
    ORDER BY u.id
  `).all());
});

router.patch('/teachers/:id/subjects', async (req, res) => {
  const teacherId = Number(req.params.id);
  const { subject_ids } = req.body;
  if (!Array.isArray(subject_ids)) return res.status(400).json({ error: 'subject_ids يجب أن يكون مصفوفة' });
  const teacher = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'").get(teacherId);
  if (!teacher) return res.status(404).json({ error: 'المعلم غير موجود' });
  await db.exec('BEGIN');
  try {
    await db.prepare('DELETE FROM teacher_subjects WHERE teacher_id = ?').run(teacherId);
    const insert = db.prepare('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)');
    for (const sid of subject_ids) await insert.run(teacherId, Number(sid));
    await db.exec('COMMIT');
    await logAudit(req.user.id, req.user.name, req.user.role, 'assign_subjects', 'teacher', teacherId, null, JSON.stringify(subject_ids), req.ip);
    res.json({ message: 'تم تحديث المواد' });
  } catch (err) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: 'تعذر تحديث المواد' });
  }
});

router.patch('/teachers/:id/status', async (req, res) => {
  const teacherId = Number(req.params.id);
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'is_active مطلوب' });
  const teacher = await db.prepare("SELECT id, is_active FROM users WHERE id = ? AND role = 'teacher'").get(teacherId);
  if (!teacher) return res.status(404).json({ error: 'المعلم غير موجود' });
  await db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, teacherId);
  await logAudit(req.user.id, req.user.name, req.user.role, 'toggle_teacher', 'teacher', teacherId, String(teacher.is_active), String(is_active ? 1 : 0), req.ip);
  res.json({ message: is_active ? 'تم تفعيل المعلم' : 'تم تعطيل المعلم' });
});

// ---------- إشعارات حسب الفئة ----------

router.post('/notifications/send', async (req, res) => {
  const { title, body: notifBody, type = 'info', target = 'all', target_id } = req.body;
  if (!title || !notifBody) return res.status(400).json({ error: 'العنوان والنص مطلوبان' });
  let userIds = [];
  if (target === 'all') {
    userIds = (await db.prepare("SELECT id FROM users WHERE role = 'student'").all()).map(u => u.id);
  } else if (target === 'grade') {
    if (!target_id) return res.status(400).json({ error: 'target_id مطلوب للفئة grade' });
    userIds = (await db.prepare("SELECT id FROM users WHERE role = 'student' AND grade = ?").all(Number(target_id))).map(u => u.id);
  } else if (target === 'subject') {
    if (!target_id) return res.status(400).json({ error: 'target_id مطلوب للفئة subject' });
    userIds = (await db.prepare("SELECT DISTINCT user_id as id FROM user_subjects WHERE subject_id = ?").all(Number(target_id))).map(u => u.id);
  } else if (target === 'teacher') {
    if (!target_id) return res.status(400).json({ error: 'target_id مطلوب للفئة teacher' });
    userIds = [Number(target_id)];
  } else if (target === 'specific') {
    if (!target_id) return res.status(400).json({ error: 'target_id مطلوب للفئة specific' });
    userIds = [Number(target_id)];
  } else {
    return res.status(400).json({ error: 'target غير صالح' });
  }
  if (userIds.length === 0) return res.json({ message: 'لا يوجد مستخدمون مستهدفون', sent: 0 });
  const insert = db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(async () => { for (const uid of userIds) await insert.run(uid, title, notifBody, type); });
  await tx();
  await logAudit(req.user.id, req.user.name, req.user.role, 'send_notification', 'notification', null, null, JSON.stringify({ target, target_id, count: userIds.length }), req.ip);
  res.status(201).json({ message: 'تم إرسال الإشعار', sent: userIds.length });
});

export default router;
