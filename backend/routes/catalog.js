import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireSubjectAccess, withLockFlag, isSampleLesson } from '../middleware/premium.js';
import { perSubjectPrice } from './subscription.js';

const router = Router();

router.get('/grades', async (_req, res) => {
  const grades = await db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM lessons l WHERE l.grade_id = g.id) as lesson_count
    FROM grades g ORDER BY g.id
  `).all();
  res.json(grades);
});

router.get('/subjects', async (_req, res) => {
  const subjects = await db.prepare(`
    SELECT s.*, v.name as variant_name,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id) as lesson_count,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id AND l.is_sample = 1) as sample_count
    FROM subjects s LEFT JOIN variants v ON v.id = s.variant_id
    ORDER BY s.id
  `).all();
  res.json(subjects);
});

router.get('/grades/:id/subjects', async (req, res) => {
  const grade = await db.prepare('SELECT * FROM grades WHERE id = ?').get(Number(req.params.id));
  if (!grade) return res.status(404).json({ error: 'الصف غير موجود' });

  const subjects = await db.prepare(`
    SELECT s.*, v.name as variant_name,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id AND l.grade_id = ?) as lesson_count,
      (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id AND l.grade_id = ? AND l.is_sample = 1) as sample_count
    FROM subjects s LEFT JOIN variants v ON v.id = s.variant_id
    WHERE s.id IN (SELECT DISTINCT subject_id FROM lessons WHERE grade_id = ?)
    ORDER BY s.id
  `).all(grade.id, grade.id, grade.id);
  res.json({ grade, subjects });
});

router.get('/units', async (req, res) => {
  const { subject_id, grade_id } = req.query;
  let sql = 'SELECT * FROM units WHERE 1=1';
  const params = [];
  if (subject_id) { sql += ' AND subject_id = ?'; params.push(Number(subject_id)); }
  if (grade_id) { sql += ' AND grade_id = ?'; params.push(Number(grade_id)); }
  sql += ' ORDER BY id';
  res.json(await db.prepare(sql).all(...params));
});

router.get('/lessons', optionalAuth, async (req, res) => {
  const { grade_id, subject_id, unit_id, teacher } = req.query;
  let sql = `
    SELECT l.*,
      CASE WHEN v.name IS NOT NULL AND v.name != 'عامة' THEN s.name || ' (' || v.name || ')' ELSE s.name END as subject_name,
      s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM lessons l
    JOIN subjects s ON s.id = l.subject_id
    JOIN grades g ON g.id = l.grade_id
    LEFT JOIN variants v ON v.id = s.variant_id
  `;
  const where = [];
  const params = [];
  if (grade_id) { where.push('l.grade_id = ?'); params.push(Number(grade_id)); }
  if (subject_id) { where.push('l.subject_id = ?'); params.push(Number(subject_id)); }
  if (unit_id) { where.push('l.unit_id = ?'); params.push(Number(unit_id)); }
  if (teacher) { where.push('l.teacher_name = ?'); params.push(teacher); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY l.views DESC, l.created_at DESC';
  res.json(await withLockFlag(await db.prepare(sql).all(...params), req.user));
});

router.get('/lessons/:id', optionalAuth, (req, res, next) => {
  if (!isSampleLesson(req.params.id)) {
    return requireSubjectAccess(async (r) => {
      const row = await db.prepare('SELECT subject_id FROM lessons WHERE id = ?').get(Number(r.params.id));
      return row?.subject_id;
    })(req, res, next);
  }
  next();
}, async (req, res) => {
  const lesson = await db.prepare(`
    SELECT l.*,
      CASE WHEN v.name IS NOT NULL AND v.name != 'عامة' THEN s.name || ' (' || v.name || ')' ELSE s.name END as subject_name,
      s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM lessons l
    JOIN subjects s ON s.id = l.subject_id
    LEFT JOIN variants v ON v.id = s.variant_id
    JOIN grades g ON g.id = l.grade_id
    WHERE l.id = ?
  `).get(Number(req.params.id));
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  await db.prepare('UPDATE lessons SET views = views + 1 WHERE id = ?').run(lesson.id);
  res.json(lesson);
});

router.get('/lessons/:id/related', async (req, res) => {
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(Number(req.params.id));
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  const related = await db.prepare(`
    SELECT l.*, s.name as subject_name, s.color as subject_color
    FROM lessons l JOIN subjects s ON s.id = l.subject_id
    WHERE l.subject_id = ? AND l.id != ? ORDER BY l.views DESC LIMIT 4
  `).all(lesson.subject_id, lesson.id);
  res.json(related);
});

// بيانات صفحة المادة الكاملة (الحصص + الملفات + الاختبارات + الوحدات)
router.get('/subjects/:id/dashboard', optionalAuth, async (req, res) => {
  const subject = await db.prepare('SELECT * FROM subjects WHERE id = ?').get(Number(req.params.id));
  if (!subject) return res.status(404).json({ error: 'المادة غير موجودة' });

  const { grade_id } = req.query;
  let lessons = [];
  let resources = [];
  let exams = [];
  let units = [];
  let archive = [];
  let progress = { completed: 0, total: 0, percentage: 0 };

  if (grade_id) {
    lessons = await db.prepare('SELECT * FROM lessons WHERE subject_id = ? AND grade_id = ? AND is_archive = 0 ORDER BY unit_id, id').all(subject.id, Number(grade_id));
    archive = await db.prepare('SELECT * FROM lessons WHERE subject_id = ? AND grade_id = ? AND is_archive = 1 ORDER BY id DESC').all(subject.id, Number(grade_id));
    resources = await db.prepare('SELECT * FROM resources WHERE subject_id = ? AND grade_id = ? ORDER BY created_at DESC').all(subject.id, Number(grade_id));
    exams = await db.prepare('SELECT * FROM exams WHERE subject_id = ? AND grade_id = ? ORDER BY created_at DESC').all(subject.id, Number(grade_id));
    units = await db.prepare('SELECT * FROM units WHERE subject_id = ? AND grade_id = ? ORDER BY id').all(subject.id, Number(grade_id));

    if (req.query.user_id) {
      if (!req.user || Number(req.query.user_id) !== req.user.id) {
        return res.status(403).json({ error: 'لا يمكنك الاطلاع على تقدم مستخدم آخر' });
      }
      const done = new Set((await db.prepare('SELECT lesson_id FROM lesson_progress WHERE user_id = ?').all(req.user.id)).map((r) => r.lesson_id));
      progress.total = lessons.length;
      progress.completed = lessons.filter((l) => done.has(l.id)).length;
      progress.percentage = lessons.length ? Math.round((progress.completed / lessons.length) * 100) : 0;
      lessons = lessons.map((l) => ({ ...l, completed: done.has(l.id) }));
    }
  } else {
    lessons = await db.prepare('SELECT * FROM lessons WHERE subject_id = ? AND is_archive = 0 ORDER BY grade_id, id').all(subject.id);
    archive = await db.prepare('SELECT * FROM lessons WHERE subject_id = ? AND is_archive = 1 ORDER BY id DESC').all(subject.id);
  }

  const subjectWithPrice = { ...subject, price: subject.price ?? perSubjectPrice(req.user?.grade ?? 9) };
res.json({ subject: subjectWithPrice, lessons: await withLockFlag(lessons, req.user), 
resources: await withLockFlag(resources, req.user), exams: await withLockFlag(exams, req.user), units, archive: 
await withLockFlag(archive, req.user), progress });
});

// ---------- البحث ----------
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json({ lessons: [], resources: [], exams: [], subjects: [], grades: [] });
  const term = `%${q.trim()}%`;

  const lessons = await db.prepare(`
    SELECT l.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM lessons l JOIN subjects s ON s.id = l.subject_id JOIN grades g ON g.id = l.grade_id
    WHERE l.title LIKE ? OR l.description LIKE ? ORDER BY l.views DESC LIMIT 6
  `).all(term, term);

  const resources = await db.prepare(`
    SELECT r.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM resources r JOIN subjects s ON s.id = r.subject_id JOIN grades g ON g.id = r.grade_id
    WHERE r.title LIKE ? OR r.description LIKE ? ORDER BY r.created_at DESC LIMIT 4
  `).all(term, term);

  const exams = await db.prepare(`
    SELECT e.*, s.name as subject_name, s.icon as subject_icon
    FROM exams e JOIN subjects s ON s.id = e.subject_id
    WHERE e.title LIKE ? ORDER BY e.created_at DESC LIMIT 4
  `).all(term);

  const subjects = await db.prepare('SELECT * FROM subjects WHERE name LIKE ? LIMIT 3').all(term);
  const grades = await db.prepare('SELECT * FROM grades WHERE name LIKE ? LIMIT 2').all(term);

  res.json({ lessons, resources, exams, subjects, grades });
});

// ---------- الملفات (المكتبة) ----------
router.get('/resources', optionalAuth, async (req, res) => {
  const { grade_id, subject_id, type, q } = req.query;
  let sql = `
    SELECT r.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM resources r JOIN subjects s ON s.id = r.subject_id JOIN grades g ON g.id = r.grade_id
  `;
  const where = [];
  const params = [];
  if (grade_id) { where.push('r.grade_id = ?'); params.push(Number(grade_id)); }
  if (subject_id) { where.push('r.subject_id = ?'); params.push(Number(subject_id)); }
  if (type) { where.push('r.type = ?'); params.push(type); }
  if (q) { where.push('(r.title LIKE ? OR r.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.created_at DESC';
  res.json(await withLockFlag(await db.prepare(sql).all(...params), req.user));
});

router.get('/resources/:id', optionalAuth, requireSubjectAccess(async (req) => {
  const row = await db.prepare('SELECT subject_id FROM resources WHERE id = ?').get(Number(req.params.id));
  return row?.subject_id;
}), async (req, res) => {
  const resource = await db.prepare(`
    SELECT r.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM resources r JOIN subjects s ON s.id = r.subject_id JOIN grades g ON g.id = r.grade_id
    WHERE r.id = ?
  `).get(Number(req.params.id));
  if (!resource) return res.status(404).json({ error: 'الملف غير موجود' });
  await db.prepare('UPDATE resources SET views = views + 1 WHERE id = ?').run(resource.id);
  res.json(resource);
});

// ---------- الإعدادات العامة (قيم عامة آمنة للواجهة) ----------
const PUBLIC_SETTINGS = ['whatsapp_number', 'whatsapp_channel', 'instagram_url', 'contact_email', 'contact_phone', 'leaderboard_enabled'];
router.get('/settings', async (_req, res) => {
  const rows = await db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const row of rows) if (PUBLIC_SETTINGS.includes(row.key)) out[row.key] = row.value;
  res.json(out);
});

// ---------- الحصص المباشرة ----------
router.get('/live-sessions', async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM live_sessions ls JOIN subjects s ON s.id = ls.subject_id JOIN grades g ON g.id = ls.grade_id
  `;
  const params = [];
  if (status) {
    const safeStatus = status === 'upcoming' ? 'upcoming' : 'recorded';
    sql += ' WHERE ls.status = ?';
    params.push(safeStatus);
  }
  sql += ' ORDER BY ls.session_date, ls.session_time';
  res.json(await db.prepare(sql).all(...params));
});

router.get('/live-sessions/:id', async (req, res) => {
  const session = await db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM live_sessions ls JOIN subjects s ON s.id = ls.subject_id JOIN grades g ON g.id = ls.grade_id
    WHERE ls.id = ?
  `).get(Number(req.params.id));
  if (!session) return res.status(404).json({ error: 'الحصة غير موجودة' });
  const participants = (await db.prepare('SELECT COUNT(*) c FROM session_attendance WHERE session_id = ?').get(session.id)).c;
  res.json({ ...session, participants_count: participants });
});

router.post('/live-sessions/:id/join', requireAuth, (req, res) => {
  res.status(400).json({ error: 'البث المباشر غير مدعوم حالياً. الدروس متاحة كتسجيلات مسجلة.' });
});

router.post('/live-sessions/:id/leave', requireAuth, (req, res) => {
  res.status(400).json({ error: 'البث المباشر غير مدعوم حالياً. الدروس متاحة كتسجيلات مسجلة.' });
});

router.get('/live-sessions/:id/attendance', requireAuth, (req, res) => {
  res.json([]);
});

// ---------- الجروبات المجانية ----------
router.get('/groups', async (_req, res) => {
  const groups = await db.prepare(`
    SELECT gr.*, g.name as grade_name
    FROM groups gr JOIN grades g ON g.id = gr.grade_id ORDER BY gr.grade_id
  `).all();
  res.json(groups);
});

// ---------- العروض الترويجية ----------
router.get('/offers', async (_req, res) => {
  const offers = await db.prepare(`
    SELECT * FROM offers
    WHERE active = 1
      AND (starts_at IS NULL OR starts_at <= date('now'))
      AND (ends_at IS NULL OR ends_at >= date('now'))
    ORDER BY id DESC
  `).all();
  res.json(offers);
});

// ---------- إحصاءات الموقع (بيانات حية للواجهة) ----------
router.get('/stats', async (_req, res) => {
  res.json({
    grades: (await db.prepare('SELECT COUNT(*) c FROM grades').get()).c,
    subjects: (await db.prepare('SELECT COUNT(*) c FROM subjects').get()).c,
    lessons: (await db.prepare('SELECT COUNT(*) c FROM lessons').get()).c,
    questions: (await db.prepare('SELECT COUNT(*) c FROM questions').get()).c,
    exams: (await db.prepare('SELECT COUNT(*) c FROM exams').get()).c,
    resources: (await db.prepare('SELECT COUNT(*) c FROM resources').get()).c,
    sessions: (await db.prepare('SELECT COUNT(*) c FROM live_sessions').get()).c,
    students: (await db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student'").get()).c,
    teachers: (await db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'teacher'").get()).c,
    views: (await db.prepare('SELECT COALESCE(SUM(views), 0) v FROM lessons').get()).v,
  });
});

// ---------- قائمة المعلمين (من بيانات الدروس الفعلية) ----------
router.get('/teachers', async (_req, res) => {
  const rows = await db.prepare(`
    SELECT l.teacher_name as name, COUNT(*) as lessons_count,
      (SELECT GROUP_CONCAT(DISTINCT s2.name) FROM lessons l2 JOIN subjects s2 ON s2.id = l2.subject_id WHERE l2.teacher_name = l.teacher_name) as subjects,
      (SELECT GROUP_CONCAT(DISTINCT s2.icon) FROM lessons l2 JOIN subjects s2 ON s2.id = l2.subject_id WHERE l2.teacher_name = l.teacher_name) as icons
    FROM lessons l
    WHERE l.teacher_name IS NOT NULL AND l.teacher_name != ''
    GROUP BY l.teacher_name ORDER BY lessons_count DESC
  `).all();
  res.json(rows);
});

// ---------- نقاط التحفيز ----------
router.get('/leaderboard', async (_req, res) => {
  const disabled = await db.prepare("SELECT value FROM settings WHERE key = 'leaderboard_enabled'").get();
  if (disabled && disabled.value === '0') {
    return res.json({ disabled: true, weekly: [], allTime: [] });
  }
  const weekly = await db.prepare(`
    SELECT u.id, u.name, SUM(p.points) as points, COUNT(*) as activities
    FROM points_log p JOIN users u ON u.id = p.user_id
    WHERE p.created_at >= datetime('now', '-7 days')
    GROUP BY u.id ORDER BY points DESC LIMIT 10
  `).all();
  const allTime = await db.prepare(`
    SELECT u.id, u.name, u.points FROM users u WHERE u.points > 0 ORDER BY u.points DESC LIMIT 10
  `).all();
  res.json({ weekly, allTime });
});

// حفظ نقاط تقدم المشاهدة: بدء / موضع / نسبة / إكمال
router.post('/progress/:lessonId', requireAuth, async (req, res) => {
  const lesson = await db.prepare('SELECT id FROM lessons WHERE id = ?').get(Number(req.params.lessonId));
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });

  const { position, percent, completed } = req.body || {};
  const pos = Number.isFinite(position) ? Math.max(0, Number(position)) : 0;
  const pct = Number.isFinite(percent) ? Math.min(100, Math.max(0, Number(percent))) : 0;
  const markDone = completed === true || pct >= 90;

  const existing = await db.prepare('SELECT id, completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson.id);
  let points = 0;
  if (existing) {
    if (markDone && !existing.completed_at) {
      await db.prepare('UPDATE lesson_progress SET completed_at = datetime(\'now\'), last_position = MAX(last_position, ?), watch_percent = MAX(watch_percent, ?) WHERE id = ?')
        .run(pos, pct, existing.id);
      await db.prepare('UPDATE users SET points = points + 10 WHERE id = ?').run(req.user.id);
      await db.prepare('INSERT INTO points_log (user_id, points, reason) VALUES (?, ?, ?)').run(req.user.id, 10, 'مشاهدة درس');
      points = 10;
    } else {
      await db.prepare('UPDATE lesson_progress SET last_position = MAX(last_position, ?), watch_percent = MAX(watch_percent, ?) WHERE id = ?')
        .run(pos, pct, existing.id);
    }
    const fresh = await db.prepare('SELECT started_at, completed_at, watch_percent, last_position FROM lesson_progress WHERE id = ?').get(existing.id);
    res.json({ started: !!fresh.started_at, completed: !!fresh.completed_at, watch_percent: fresh.watch_percent, last_position: fresh.last_position, points });
  } else {
    const sql = markDone
      ? `INSERT INTO lesson_progress (user_id, lesson_id, started_at, last_position, watch_percent, completed_at) VALUES (?, ?, datetime('now'), ?, ?, datetime('now'))`
      : `INSERT INTO lesson_progress (user_id, lesson_id, started_at, last_position, watch_percent, completed_at) VALUES (?, ?, datetime('now'), ?, ?, NULL)`;
    await db.prepare(sql).run(req.user.id, lesson.id, pos, pct);
    if (markDone) {
      await db.prepare('UPDATE users SET points = points + 10 WHERE id = ?').run(req.user.id);
      await db.prepare('INSERT INTO points_log (user_id, points, reason) VALUES (?, ?, ?)').run(req.user.id, 10, 'مشاهدة درس');
      points = 10;
    }
    res.json({ started: true, completed: markDone, watch_percent: pct, last_position: pos, points });
  }
});

router.get('/users/:id/progress', requireAuth, async (req, res) => {
  if (req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'لا يمكنك الاطلاع على تقدم مستخدم آخر' });
  }
  const rows = await db.prepare('SELECT lesson_id, started_at, last_position, watch_percent, completed_at FROM lesson_progress WHERE user_id = ?').all(req.user.id);
  res.json({ lesson_ids: rows.map((r) => r.lesson_id), count: rows.length, details: rows });
});

router.get('/users/:id/favorites', requireAuth, async (req, res) => {
  if (req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'لا يمكنك الاطلاع على مفضلات مستخدم آخر' });
  }
  const favorites = await db.prepare(`
    SELECT l.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color, g.name as grade_name
    FROM favorites f JOIN lessons l ON l.id = f.lesson_id
    JOIN subjects s ON s.id = l.subject_id JOIN grades g ON g.id = l.grade_id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `).all(Number(req.params.id));
  res.json(favorites);
});

router.post('/lessons/:id/favorite', requireAuth, async (req, res) => {
  const lesson = await db.prepare('SELECT id FROM lessons WHERE id = ?').get(Number(req.params.id));
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  const exists = await db.prepare('SELECT id FROM favorites WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lesson.id);
  if (exists) {
    await db.prepare('DELETE FROM favorites WHERE user_id = ? AND lesson_id = ?').run(req.user.id, lesson.id);
    res.json({ favorited: false });
  } else {
    await db.prepare('INSERT INTO favorites (user_id, lesson_id) VALUES (?, ?)').run(req.user.id, lesson.id);
    res.json({ favorited: true });
  }
});

// ---------- لوحة الطالب ----------
router.get('/dashboard', requireAuth, async (req, res) => {
  const user = req.user;
  const grade = user.grade;

  const allLessons = await db.prepare('SELECT * FROM lessons WHERE grade_id = ?').all(grade);
  const done = new Set((await db.prepare('SELECT lesson_id FROM lesson_progress WHERE user_id = ?').all(user.id)).map((r) => r.lesson_id));
  const completedCount = allLessons.filter((l) => done.has(l.id)).length;
  const overallPct = allLessons.length ? Math.round((completedCount / allLessons.length) * 100) : 0;

  // مواد الطالب (المشترك فيها أو كل مواد الصف)
  const subscribed = new Set((await db.prepare('SELECT subject_id FROM user_subjects WHERE user_id = ?').all(user.id)).map((r) => r.subject_id));
  const mySubjects = (await db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM lessons l WHERE l.subject_id = s.id AND l.grade_id = ?) as lesson_count
    FROM subjects s WHERE s.id IN (SELECT DISTINCT subject_id FROM lessons WHERE grade_id = ?) ORDER BY s.id
  `).all(grade, grade)).map((s) => ({ ...s, subscribed: subscribed.has(s.id) }));

  // تقدم كل مادة
  const subjectProgress = await Promise.all(mySubjects.map(async (s) => {
    const lessons = await db.prepare('SELECT id FROM lessons WHERE subject_id = ? AND grade_id = ?').all(s.id, grade);
    const completed = lessons.filter((l) => done.has(l.id)).length;
    return { subject: s, completed, total: lessons.length, percentage: lessons.length ? Math.round((completed / lessons.length) * 100) : 0 };
  }));

  // أقوى وأضعف مادة
  let strongest = null, weakest = null;
  const withPct = subjectProgress.filter((p) => p.total > 0);
  if (withPct.length) {
    strongest = withPct.reduce((a, b) => (b.percentage > a.percentage ? b : a));
    weakest = withPct.reduce((a, b) => (b.percentage < a.percentage ? b : a));
  }

  // الدرس التالي غير المكتمل
  const nextLesson = allLessons.find((l) => !done.has(l.id)) || null;

  // آخر النتائج
  const latestResults = await db.prepare(`
    SELECT er.*, e.title, e.duration_minutes, s.name as subject_name, s.icon as subject_icon
    FROM exam_results er JOIN exams e ON e.id = er.exam_id JOIN subjects s ON s.id = e.subject_id
    WHERE er.user_id = ? ORDER BY er.created_at DESC LIMIT 5
  `).all(user.id);

  // الحصص القادمة
  const upcomingSessions = await db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon
    FROM live_sessions ls JOIN subjects s ON s.id = ls.subject_id
    WHERE ls.status = 'upcoming' ORDER BY ls.session_date LIMIT 4
  `).all();

  res.json({ overallPct, completedCount, totalLessons: allLessons.length, mySubjects, subjectProgress, strongest, weakest, nextLesson, latestResults, upcomingSessions, points: user.points });
});

// ---------- مناقشات المواد (أسئلة ونقاشات مرتبطة بكل مادة) ----------
router.get('/discussions', optionalAuth, async (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'حدد المادة' });
  const rows = await db.prepare(`
    SELECT d.*, u.name as user_name, u.role as user_role
    FROM subject_discussions d JOIN users u ON u.id = d.user_id
    WHERE d.subject_id = ? ORDER BY d.id DESC LIMIT 100
  `).all(Number(subject_id));
  res.json(rows);
});

router.post('/discussions', requireAuth, async (req, res) => {
  const { subject_id, message } = req.body;
  const sid = Number(subject_id);
  if (!sid) return res.status(400).json({ error: 'حدد المادة' });
  const subject = await db.prepare('SELECT id FROM subjects WHERE id = ?').get(sid);
  if (!subject) return res.status(404).json({ error: 'المادة غير موجودة' });
  const msg = String(message || '').trim().slice(0, 1000);
  if (!msg) return res.status(400).json({ error: 'اكتب رسالتك أولاً' });
  const result = await db.prepare('INSERT INTO subject_discussions (subject_id, user_id, message) VALUES (?, ?, ?)')
    .run(sid, req.user.id, msg);
  res.status(201).json({ message: 'تمت إضافة مشاركتك', id: result.lastInsertRowid });
});

export default router;
