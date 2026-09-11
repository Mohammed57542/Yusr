import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ─── Student: List available assignments ───
router.get('/', async (req, res) => {
  const { subject_id, grade_id, status } = req.query;
  let q = `SELECT a.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name,
    u.name as teacher_name,
    (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count
    FROM assignments a
    JOIN subjects s ON s.id = a.subject_id
    JOIN grades g ON g.id = a.grade_id
    JOIN users u ON u.id = a.created_by`;
  const params = [];
  const conditions = [];

  if (req.user.role === 'student') {
    conditions.push("a.status = 'published'");
    if (subject_id) { conditions.push('a.subject_id = ?'); params.push(Number(subject_id)); }
    if (grade_id) { conditions.push('a.grade_id = ?'); params.push(Number(grade_id)); }
  } else if (req.user.role === 'teacher') {
    conditions.push('a.created_by = ?');
    params.push(req.user.id);
    if (status) { conditions.push('a.status = ?'); params.push(status); }
  } else {
    if (status) { conditions.push('a.status = ?'); params.push(status); }
  }

  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ' ORDER BY a.created_at DESC';

  res.json(await db.prepare(q).all(...params));
});

// ─── Student: Get single assignment ───
router.get('/:id', async (req, res) => {
  const a = await db.prepare(`
    SELECT a.*, s.name as subject_name, g.name as grade_name, u.name as teacher_name
    FROM assignments a
    JOIN subjects s ON s.id = a.subject_id
    JOIN grades g ON g.id = a.grade_id
    JOIN users u ON u.id = a.created_by
    WHERE a.id = ?
  `).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'الواجب غير موجود' });
  res.json(a);
});

// ─── Teacher: Create assignment ───
router.post('/', async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  const { title, description, instructions, grade_id, subject_id, unit_id, lesson_id, due_date, max_score, allow_late, max_file_size_mb, allowed_extensions, status } = req.body;
  if (!title || !grade_id || !subject_id || !due_date) return res.status(400).json({ error: 'الرجاء إدخال العنوان والصف والمادة وموعد التسليم' });

  const result = await db.prepare(`
    INSERT INTO assignments (title, description, instructions, grade_id, subject_id, unit_id, lesson_id, due_date, max_score, allow_late, max_file_size_mb, allowed_extensions, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || '', instructions || '',
    Number(grade_id), Number(subject_id), unit_id ? Number(unit_id) : null, lesson_id ? Number(lesson_id) : null,
    due_date, max_score || 100, allow_late !== undefined ? (allow_late ? 1 : 0) : 1,
    max_file_size_mb || 10, allowed_extensions || '.pdf,.doc,.docx,.jpg,.png',
    req.user.id, status || 'published'
  );
  res.status(201).json({ message: 'تمت إضافة الواجب', id: result.lastInsertRowid });
});

// ─── Teacher: Update assignment ───
router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  const a = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'الواجب غير موجود' });
  if (a.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الواجب' });

  const { title, description, instructions, grade_id, subject_id, unit_id, lesson_id, due_date, max_score, allow_late, max_file_size_mb, allowed_extensions, status } = req.body;
  await db.prepare(`
    UPDATE assignments SET title = ?, description = ?, instructions = ?, grade_id = ?, subject_id = ?,
      unit_id = ?, lesson_id = ?, due_date = ?, max_score = ?, allow_late = ?, max_file_size_mb = ?,
      allowed_extensions = ?, status = ? WHERE id = ?
  `).run(
    title ?? a.title, description ?? a.description, instructions ?? a.instructions,
    grade_id !== undefined ? Number(grade_id) : a.grade_id,
    subject_id !== undefined ? Number(subject_id) : a.subject_id,
    unit_id !== undefined ? (unit_id ? Number(unit_id) : null) : a.unit_id,
    lesson_id !== undefined ? (lesson_id ? Number(lesson_id) : null) : a.lesson_id,
    due_date ?? a.due_date, max_score !== undefined ? Number(max_score) : a.max_score,
    allow_late !== undefined ? (allow_late ? 1 : 0) : a.allow_late,
    max_file_size_mb !== undefined ? Number(max_file_size_mb) : a.max_file_size_mb,
    allowed_extensions ?? a.allowed_extensions,
    status ?? a.status, req.params.id
  );
  res.json({ message: 'تم تحديث الواجب' });
});

// ─── Teacher: Delete assignment ───
router.delete('/:id', async (req, res) => {
  const a = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'الواجب غير موجود' });
  if (a.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الواجب' });
  await db.prepare('DELETE FROM assignment_submissions WHERE assignment_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
  res.json({ message: 'تم حذف الواجب' });
});

// ─── Student: Submit assignment ───
router.post('/:id/submit', async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'الطلاب فقط يمكنهم التسليم' });
  const a = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'الواجب غير موجود' });
  if (a.status !== 'published') return res.status(400).json({ error: 'الواجب غير منشور' });

  const now = new Date().toISOString();
  if (!a.allow_late && now > a.due_date) {
    return res.status(400).json({ error: 'انتهى موعد التسليم' });
  }

  const { file_url, file_name, note } = req.body;
  const existing = await db.prepare('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) {
    await db.prepare('UPDATE assignment_submissions SET file_url = ?, file_name = ?, note = ?, status = ?, submitted_at = datetime("now") WHERE id = ?')
      .run(file_url || null, file_name || null, note || null, now > a.due_date ? 'late' : 'submitted', existing.id);
    return res.json({ message: 'تم تحديث التسليم' });
  }

  await db.prepare('INSERT INTO assignment_submissions (assignment_id, user_id, file_url, file_name, note, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.id, req.user.id, file_url || null, file_name || null, note || null, now > a.due_date ? 'late' : 'submitted');
  res.status(201).json({ message: 'تم تسليم الواجب' });
});

// ─── Teacher: Get submissions for assignment ───
router.get('/:id/submissions', async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  const a = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'الواجب غير موجود' });
  if (a.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الواجب' });

  const submissions = await db.prepare(`
    SELECT asub.*, u.name as student_name, u.email as student_email
    FROM assignment_submissions asub
    JOIN users u ON u.id = asub.user_id
    WHERE asub.assignment_id = ?
    ORDER BY asub.submitted_at DESC
  `).all(req.params.id);
  res.json(submissions);
});

// ─── Teacher: Grade submission ───
router.patch('/submissions/:id/grade', async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
  const sub = await db.prepare('SELECT * FROM assignment_submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'التسليم غير موجود' });

  const { grade, feedback, status } = req.body;
  await db.prepare('UPDATE assignment_submissions SET grade = ?, feedback = ?, status = ?, graded_at = datetime("now"), graded_by = ? WHERE id = ?')
    .run(grade !== undefined ? Number(grade) : sub.grade, feedback ?? sub.feedback, status || 'graded', req.user.id, req.params.id);

  if (grade !== undefined) {
    const assignment = await db.prepare('SELECT * FROM assignments WHERE id = ?').get(sub.assignment_id);
    if (assignment) {
      await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(Math.round(Number(grade) / 10), sub.user_id);
      await db.prepare('INSERT INTO points_log (user_id, points, reason) VALUES (?, ?, ?)').run(sub.user_id, Math.round(Number(grade) / 10), `تصحيح واجب: ${assignment.title}`);
      await db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)').run(sub.user_id, 'تم تصحيح واجبك', `تم تصحيح واجب "${assignment.title}" — الدرجة: ${grade}`, 'grade');
    }
  }
  res.json({ message: 'تم التصحيح' });
});

// ─── Student: Get my submission ───
router.get('/:id/my-submission', async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'غير مصرح' });
  const sub = await db.prepare('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  res.json(sub || null);
});

export default router;