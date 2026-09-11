import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ─── List classrooms ───
router.get('/', async (req, res) => {
  const { subject_id, grade_id } = req.query;
  let q = `SELECT c.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name,
    u.name as teacher_name,
    (SELECT COUNT(*) FROM classroom_students WHERE classroom_id = c.id) as student_count
    FROM classrooms c
    JOIN subjects s ON s.id = c.subject_id
    JOIN grades g ON g.id = c.grade_id
    JOIN users u ON u.id = c.teacher_id`;
  const params = [];
  const conditions = [];

  if (req.user.role === 'student') {
    conditions.push('c.is_active = 1');
    conditions.push(`c.id IN (SELECT classroom_id FROM classroom_students WHERE user_id = ?)`);
    params.push(req.user.id);
  } else if (req.user.role === 'teacher') {
    conditions.push('c.teacher_id = ?');
    params.push(req.user.id);
  }

  if (subject_id) { conditions.push('c.subject_id = ?'); params.push(Number(subject_id)); }
  if (grade_id) { conditions.push('c.grade_id = ?'); params.push(Number(grade_id)); }
  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ' ORDER BY c.created_at DESC';

  res.json(await db.prepare(q).all(...params));
});

// ─── Get single classroom with details ───
router.get('/:id', async (req, res) => {
  const c = await db.prepare(`
    SELECT c.*, s.name as subject_name, g.name as grade_name, u.name as teacher_name
    FROM classrooms c
    JOIN subjects s ON s.id = c.subject_id
    JOIN grades g ON g.id = c.grade_id
    JOIN users u ON u.id = c.teacher_id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود' });

  const students = await db.prepare(`
    SELECT cs.enrolled_at, u.id, u.name, u.email, u.avatar
    FROM classroom_students cs
    JOIN users u ON u.id = cs.user_id
    WHERE cs.classroom_id = ?
    ORDER BY u.name
  `).all(req.params.id);

  const lessons = await db.prepare(`
    SELECT l.id, l.title, l.duration, l.level, l.status, ls.status as approval_status
    FROM lessons l
    LEFT JOIN lesson_status ls ON ls.lesson_id = l.id
    WHERE l.subject_id = ? AND l.grade_id = ?
    ORDER BY l.order_index, l.created_at
  `).all(c.subject_id, c.grade_id);

  const announcements = await db.prepare(`
    SELECT ca.*, u.name as author_name
    FROM class_announcements ca
    JOIN users u ON u.id = ca.created_by
    WHERE ca.classroom_id = ?
    ORDER BY ca.created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ ...c, students, lessons, announcements });
});

// ─── Teacher: Create classroom ───
router.post('/', async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  const { name, description, grade_id, subject_id, academic_year, semester } = req.body;
  if (!name || !grade_id || !subject_id) return res.status(400).json({ error: 'الرجاء إدخال اسم الفصل والصف والمادة' });

  const result = await db.prepare(`
    INSERT INTO classrooms (name, description, grade_id, subject_id, teacher_id, academic_year, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, description || '', Number(grade_id), Number(subject_id), req.user.id, academic_year || '2025-2026', semester || 'الأول');
  res.status(201).json({ message: 'تم إنشاء الفصل', id: result.lastInsertRowid });
});

// ─── Teacher: Update classroom ───
router.patch('/:id', async (req, res) => {
  const c = await db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود' });
  if (c.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });

  const { name, description, grade_id, subject_id, academic_year, semester, is_active } = req.body;
  await db.prepare(`UPDATE classrooms SET name = ?, description = ?, grade_id = ?, subject_id = ?, academic_year = ?, semester = ?, is_active = ? WHERE id = ?`)
    .run(name ?? c.name, description ?? c.description, grade_id !== undefined ? Number(grade_id) : c.grade_id,
      subject_id !== undefined ? Number(subject_id) : c.subject_id, academic_year ?? c.academic_year,
      semester ?? c.semester, is_active !== undefined ? (is_active ? 1 : 0) : c.is_active, req.params.id);
  res.json({ message: 'تم تحديث الفصل' });
});

// ─── Teacher: Delete classroom ───
router.delete('/:id', async (req, res) => {
  const c = await db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود' });
  if (c.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  await db.prepare('DELETE FROM classroom_students WHERE classroom_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM class_announcements WHERE classroom_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM classrooms WHERE id = ?').run(req.params.id);
  res.json({ message: 'تم حذف الفصل' });
});

// ─── Teacher: Add student to classroom ───
router.post('/:id/students', async (req, res) => {
  const c = await db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود' });
  if (c.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });

  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'حدد الطالب' });
  try {
    await db.prepare('INSERT INTO classroom_students (classroom_id, user_id) VALUES (?, ?)').run(req.params.id, Number(user_id));
    await db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)').run(Number(user_id), 'تمت إضافتك لفصل', `تمت إضافتك إلى فصل "${c.name}"`, 'info');
  } catch {
    return res.status(400).json({ error: 'الطالب مضاف بالفعل' });
  }
  res.json({ message: 'تمت إضافة الطالب' });
});

// ─── Teacher: Remove student from classroom ───
router.delete('/:id/students/:userId', async (req, res) => {
  const c = await db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود' });
  if (c.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  await db.prepare('DELETE FROM classroom_students WHERE classroom_id = ? AND user_id = ?').run(req.params.id, Number(req.params.userId));
  res.json({ message: 'تم إزالة الطالب' });
});

// ─── Teacher: Post announcement ───
router.post('/:id/announcements', async (req, res) => {
  const c = await db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود' });
  if (c.teacher_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });

  const { title, content, priority } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'أدخل العنوان والمحتوى' });

  const result = await db.prepare('INSERT INTO class_announcements (classroom_id, title, content, priority, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, title, content, priority || 'normal', req.user.id);

  const students = await db.prepare('SELECT user_id FROM classroom_students WHERE classroom_id = ?').all(req.params.id);
  const notifInsert = db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)');
  for (const s of students) {
    await notifInsert.run(s.user_id, `إعلان في فصل ${c.name}`, title, 'announcement');
  }

  res.status(201).json({ message: 'تم نشر الإعلان', id: result.lastInsertRowid });
});

// ─── Student: Join classroom by code ───
router.post('/join', async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'الطلاب فقط' });
  const { classroom_id } = req.body;
  if (!classroom_id) return res.status(400).json({ error: 'حدد الفصل' });
  const c = await db.prepare('SELECT * FROM classrooms WHERE id = ? AND is_active = 1').get(Number(classroom_id));
  if (!c) return res.status(404).json({ error: 'الفصل غير موجود أو غير نشط' });
  try {
    await db.prepare('INSERT INTO classroom_students (classroom_id, user_id) VALUES (?, ?)').run(Number(classroom_id), req.user.id);
    res.json({ message: 'تم الانضمام للفصل' });
  } catch {
    res.status(400).json({ error: 'أنت مضاف بالفعل' });
  }
});

export default router;