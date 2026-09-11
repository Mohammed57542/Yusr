import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذه المنطقة مخصصة للمعلمين فقط' });
  }
  next();
});

async function getTeacherSubjectIds(userId) {
  return (await db.prepare('SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?')
    .all(userId)).map(r => r.subject_id);
}

async function ownsSubject(userId, subjectId) {
  return !!(await db.prepare('SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?')
    .get(userId, Number(subjectId)));
}

// ─── Dashboard ───
router.get('/dashboard', async (req, res) => {
  const teacherName = req.user.name;
  const subjectIds = await getTeacherSubjectIds(req.user.id);

  const subjects = subjectIds.length > 0
    ? await db.prepare(`SELECT DISTINCT s.id, s.name, s.icon, s.color FROM subjects s WHERE s.id IN (${subjectIds.map(() => '?').join(',')})`).all(...subjectIds)
    : [];

  const lessonsCount = (await db.prepare('SELECT COUNT(*) c FROM lessons WHERE created_by = ?').get(req.user.id)).c;

  const lessonsNeedingAttention = await db.prepare(`
    SELECT l.id, l.title, l.views, s.name as subject_name, s.icon
    FROM lessons l JOIN subjects s ON s.id = l.subject_id
    WHERE l.created_by = ? AND l.views < 5
    ORDER BY l.views ASC LIMIT 5
  `).all(req.user.id);

  const examsCount = subjectIds.length > 0
    ? (await db.prepare(`SELECT COUNT(*) c FROM exams WHERE subject_id IN (${subjectIds.map(() => '?').join(',')})`).get(...subjectIds)).c
    : 0;

  const upcomingSessions = await db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM live_sessions ls
    JOIN subjects s ON s.id = ls.subject_id
    LEFT JOIN grades g ON g.id = ls.grade_id
    WHERE ls.created_by = ? AND ls.status = 'upcoming'
    ORDER BY ls.session_date, ls.session_time
    LIMIT 5
  `).all(req.user.id);

  let studentCount = 0;
  let avgScore = 0;
  let recentResults = [];

  if (subjectIds.length > 0) {
    studentCount = (await db.prepare(`
      SELECT COUNT(DISTINCT us.user_id) c
      FROM user_subjects us
      WHERE us.subject_id IN (${subjectIds.map(() => '?').join(',')})
    `).get(...subjectIds)).c;

    const scoreData = await db.prepare(`
      SELECT er.score FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})
    `).all(...subjectIds);
    if (scoreData.length > 0) {
      avgScore = Math.round(scoreData.reduce((s, r) => s + r.score, 0) / scoreData.length);
    }

    recentResults = await db.prepare(`
      SELECT er.*, e.title as exam_title, u.name as student_name
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      JOIN users u ON u.id = er.user_id
      WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})
      ORDER BY er.created_at DESC LIMIT 10
    `).all(...subjectIds);
  }

  const students = subjectIds.length > 0
    ? await db.prepare(`
        SELECT u.id, u.name, u.email,
          COUNT(DISTINCT er.exam_id) as exams_taken,
          CASE WHEN COUNT(er.score) > 0 THEN ROUND(AVG(er.score)) ELSE NULL END as avg_score,
          MAX(er.created_at) as last_activity
        FROM users u
        JOIN user_subjects us ON us.user_id = u.id AND us.subject_id IN (${subjectIds.map(() => '?').join(',')})
        LEFT JOIN exam_results er ON er.user_id = u.id
        WHERE u.role = 'student'
        GROUP BY u.id
        ORDER BY u.name
      `).all(...subjectIds)
    : [];

  res.json({
    subjects,
    lessonsCount,
    lessonCount: lessonsCount,
    lessonsNeedingAttention,
    examsCount,
    examCount: examsCount,
    upcomingSessions,
    studentCount,
    avgScore,
    recentResults,
    students: students.map(s => ({
      name: s.name,
      completedLessons: s.exams_taken,
      avgScore: s.avg_score,
      lastActivity: s.last_activity,
    })),
  });
});

// ─── Aliases for frontend ───
router.get('/lessons', async (req, res) => {
  const lessons = await db.prepare(`
    SELECT l.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color,
           g.name as grade_name, u.name as unit_name
    FROM lessons l
    JOIN subjects s ON s.id = l.subject_id
    LEFT JOIN grades g ON g.id = l.grade_id
    LEFT JOIN units u ON u.id = l.unit_id
    WHERE l.created_by = ? OR l.teacher_name = ?
    ORDER BY l.created_at DESC
  `).all(req.user.id, req.user.name);
  res.json(lessons);
});

router.get('/exams', async (req, res) => {
  const subjectIds = await getTeacherSubjectIds(req.user.id);
  if (subjectIds.length === 0) return res.json([]);
  const placeholders = subjectIds.map(() => '?').join(',');
  const exams = await db.prepare(`
    SELECT e.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name,
      (SELECT COUNT(*) FROM exam_results er WHERE er.exam_id = e.id) as result_count,
      (SELECT ROUND(AVG(score)) FROM exam_results er WHERE er.exam_id = e.id) as avg_score,
      (SELECT MAX(score) FROM exam_results er WHERE er.exam_id = e.id) as max_score,
      (SELECT MIN(score) FROM exam_results er WHERE er.exam_id = e.id) as min_score
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    LEFT JOIN grades g ON g.id = e.grade_id
    WHERE e.subject_id IN (${placeholders})
    ORDER BY e.created_at DESC
  `).all(...subjectIds);
  res.json(exams);
});

router.get('/questions', async (req, res) => {
  const subjectIds = await getTeacherSubjectIds(req.user.id);
  if (subjectIds.length === 0) return res.json([]);
  const placeholders = subjectIds.map(() => '?').join(',');
  const questions = await db.prepare(`
    SELECT q.*, s.name as subject_name, g.name as grade_name, u.name as unit_name, l.title as lesson_title
    FROM questions q
    JOIN subjects s ON s.id = q.subject_id
    JOIN grades g ON g.id = q.grade_id
    LEFT JOIN units u ON u.id = q.unit_id
    LEFT JOIN lessons l ON l.id = q.lesson_id
    WHERE q.subject_id IN (${placeholders})
    ORDER BY q.id DESC LIMIT 100
  `).all(...subjectIds);
  res.json(questions);
});

router.get('/sessions', async (req, res) => {
  const sessions = await db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM live_sessions ls
    JOIN subjects s ON s.id = ls.subject_id
    LEFT JOIN grades g ON g.id = ls.grade_id
    WHERE ls.created_by = ? OR ls.teacher_name = ?
    ORDER BY ls.session_date DESC, ls.session_time DESC
  `).all(req.user.id, req.user.name);
  res.json(sessions);
});

// ─── Lessons CRUD ───
router.post('/lessons', async (req, res) => {
  const { grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, video_url, pdf_url, is_free, objectives } = req.body;
  if (!grade_id || !subject_id || !title || !duration) return res.status(400).json({ error: 'الرجاء إدخال الصف والمادة والعنوان والمدة' });
  if (!await ownsSubject(req.user.id, subject_id)) return res.status(403).json({ error: 'أنت لا تدرس هذه المادة' });
  const result = await db.prepare(`
    INSERT INTO lessons (grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, video_url, pdf_url, created_by, status, is_free, objectives)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `).run(Number(grade_id), Number(subject_id), unit_id ? Number(unit_id) : null, title, description || '', Number(duration),
    teacher_name || req.user.name, level || 'متوسط', video_url || null, pdf_url || null, req.user.id, is_free ? 1 : 0, objectives || null);
  await db.prepare("INSERT INTO lesson_status (lesson_id, status, submitted_by, submitted_at) VALUES (?, 'pending', ?, datetime('now'))")
    .run(result.lastInsertRowid, req.user.id);
  res.status(201).json({ message: 'تمت إضافة الدرس — بانتظار موافقة الإدارة', id: result.lastInsertRowid });
});

router.patch('/lessons/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  if (lesson.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الدرس' });

  if (req.body.status === 'pending') {
    await db.prepare("UPDATE lesson_status SET status = 'pending', submitted_by = ?, submitted_at = datetime('now') WHERE lesson_id = ?")
      .run(req.user.id, id);
    return res.json({ message: 'تم الإرسال للمراجعة' });
  }
  const { grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, video_url, pdf_url, is_free, objectives } = req.body;
  await db.prepare(`
    UPDATE lessons SET grade_id = ?, subject_id = ?, unit_id = ?, title = ?, description = ?, duration = ?,
      teacher_name = ?, level = ?, video_url = ?, pdf_url = ?, is_free = ?, objectives = ? WHERE id = ?
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
    is_free !== undefined ? (is_free ? 1 : 0) : lesson.is_free,
    objectives !== undefined ? objectives : lesson.objectives,
    id);
  res.json({ message: 'تم تحديث الدرس' });
});

router.delete('/lessons/:id', async (req, res) => {
  const id = Number(req.params.id);
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  if (lesson.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الدرس' });
  await db.prepare('DELETE FROM lesson_status WHERE lesson_id = ?').run(id);
  await db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
  res.json({ message: 'تم حذف الدرس' });
});

// ─── Exams CRUD ───
router.post('/exams', async (req, res) => {
  const { grade_id, subject_id, unit_id, title, description, duration_minutes, question_count, exam_type, max_attempts, open_at, close_at, is_free, show_results, allow_review, points_reward } = req.body;
  if (!grade_id || !subject_id || !title || !duration_minutes || !question_count) {
    return res.status(400).json({ error: 'الرجاء إدخال الصف والمادة والعنوان والمدة وعدد الأسئلة' });
  }
  if (!await ownsSubject(req.user.id, subject_id)) return res.status(403).json({ error: 'أنت لا تدرس هذه المادة' });
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
  await db.prepare("INSERT INTO exam_status (exam_id, status, submitted_by, submitted_at) VALUES (?, 'pending', ?, datetime('now'))")
    .run(result.lastInsertRowid, req.user.id);
  res.status(201).json({ message: 'تمت إضافة الاختبار — بانتظار موافقة الإدارة', id: result.lastInsertRowid });
});

router.patch('/exams/:id', async (req, res) => {
  const id = Number(req.params.id);
  const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  if (exam.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الاختبار' });

  if (req.body.status === 'pending') {
    await db.prepare("UPDATE exam_status SET status = 'pending', submitted_by = ?, submitted_at = datetime('now') WHERE exam_id = ?")
      .run(req.user.id, id);
    return res.json({ message: 'تم الإرسال للمراجعة' });
  }

  const { grade_id, subject_id, unit_id, title, description, duration_minutes, question_count, exam_type, max_attempts, open_at, close_at, is_free, show_results, allow_review, points_reward } = req.body;
  await db.prepare(`
    UPDATE exams SET grade_id = ?, subject_id = ?, unit_id = ?, title = ?, description = ?, duration_minutes = ?,
      question_count = ?, exam_type = ?, max_attempts = ?, open_at = ?, close_at = ?,
      is_free = ?, show_results = ?, allow_review = ?, points_reward = ? WHERE id = ?
  `).run(
    grade_id !== undefined ? Number(grade_id) : exam.grade_id,
    subject_id !== undefined ? Number(subject_id) : exam.subject_id,
    unit_id !== undefined ? (unit_id ? Number(unit_id) : null) : exam.unit_id,
    title ?? exam.title, description ?? exam.description,
    duration_minutes !== undefined ? Number(duration_minutes) : exam.duration_minutes,
    question_count !== undefined ? Number(question_count) : exam.question_count,
    exam_type ?? exam.exam_type,
    max_attempts !== undefined ? Number(max_attempts) : exam.max_attempts,
    open_at !== undefined ? open_at : exam.open_at,
    close_at !== undefined ? close_at : exam.close_at,
    is_free !== undefined ? (is_free ? 1 : 0) : exam.is_free,
    show_results !== undefined ? (show_results ? 1 : 0) : exam.show_results,
    allow_review !== undefined ? (allow_review ? 1 : 0) : exam.allow_review,
    points_reward !== undefined ? Number(points_reward) : exam.points_reward, id);
  res.json({ message: 'تم تحديث الاختبار' });
});

router.delete('/exams/:id', async (req, res) => {
  const id = Number(req.params.id);
  const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(id);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  if (exam.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الاختبار' });
  await db.prepare('DELETE FROM exam_status WHERE exam_id = ?').run(id);
  await db.prepare('DELETE FROM exam_questions WHERE exam_id = ?').run(id);
  await db.prepare('DELETE FROM exam_results WHERE exam_id = ?').run(id);
  await db.prepare('DELETE FROM exams WHERE id = ?').run(id);
  res.json({ message: 'تم حذف الاختبار' });
});

// ─── Questions CRUD ───
router.post('/questions', async (req, res) => {
  const { subject_id, grade_id, unit_id, lesson_id, question, options, correct_index, question_type, explanation, difficulty } = req.body;
  if (!subject_id || !grade_id || !question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'الرجاء إدخال المادة والسؤال وخيارين على الأقل' });
  }
  if (!await ownsSubject(req.user.id, subject_id)) return res.status(403).json({ error: 'أنت لا تدرس هذه المادة' });
  const type = question_type || 'mcq';
  let correct;
  if (type === 'multi') {
    if (!Array.isArray(correct_index) || correct_index.length === 0) return res.status(400).json({ error: 'حدد الإجابات الصحيحة' });
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

router.patch('/questions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const q = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!q) return res.status(404).json({ error: 'السؤال غير موجود' });
  if (!await ownsSubject(req.user.id, q.subject_id) && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا السؤال' });

  const { subject_id, grade_id, unit_id, lesson_id, question, options, correct_index, question_type, explanation, difficulty } = req.body;
  const type = question_type || q.question_type;
  let correct = q.correct_index;
  if (options && correct_index !== undefined) {
    if (type === 'multi') {
      correct = JSON.stringify(Array.isArray(correct_index) ? correct_index.map(Number) : []);
    } else {
      correct = Number(correct_index);
    }
  }
  await db.prepare(`
    UPDATE questions SET subject_id = ?, grade_id = ?, unit_id = ?, lesson_id = ?, question = ?,
      options = ?, correct_index = ?, question_type = ?, explanation = ?, difficulty = ? WHERE id = ?
  `).run(
    subject_id !== undefined ? Number(subject_id) : q.subject_id,
    grade_id !== undefined ? Number(grade_id) : q.grade_id,
    unit_id !== undefined ? (unit_id ? Number(unit_id) : null) : q.unit_id,
    lesson_id !== undefined ? (lesson_id ? Number(lesson_id) : null) : q.lesson_id,
    question ?? q.question,
    options ? JSON.stringify(options) : q.options,
    correct, type,
    explanation !== undefined ? explanation : q.explanation,
    difficulty ?? q.difficulty, id);
  res.json({ message: 'تم تحديث السؤال' });
});

router.delete('/questions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const q = await db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!q) return res.status(404).json({ error: 'السؤال غير موجود' });
  if (!await ownsSubject(req.user.id, q.subject_id) && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا السؤال' });
  await db.prepare('DELETE FROM exam_questions WHERE question_id = ?').run(id);
  await db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  res.json({ message: 'تم حذف السؤال' });
});

// ─── Sessions CRUD ───
router.post('/sessions', async (req, res) => {
  const { title, description, grade_id, subject_id, session_date, session_time, duration_minutes, is_subscribers_only, is_recorded, max_participants, meeting_url } = req.body;
  if (!grade_id || !subject_id || !title) return res.status(400).json({ error: 'الرجاء إدخال الصف والمادة والعنوان' });
  if (!await ownsSubject(req.user.id, subject_id)) return res.status(403).json({ error: 'أنت لا تدرس هذه المادة' });
  const result = await db.prepare(`
    INSERT INTO live_sessions (title, description, grade_id, subject_id, session_date, session_time, duration_minutes, is_subscribers_only, is_recorded, max_participants, teacher_name, meeting_url, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')
  `).run(title, description || '', Number(grade_id), Number(subject_id),
    session_date || null, session_time || null, duration_minutes || 60,
    is_subscribers_only ? 1 : 0, is_recorded ? 1 : 0, max_participants || 50,
    req.user.name, meeting_url || null, req.user.id);
  res.status(201).json({ message: 'تمت إضافة الحصة المباشرة', id: result.lastInsertRowid });
});

router.patch('/sessions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const session = await db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
  if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  if (session.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذه الجلسة' });

  const { title, description, grade_id, subject_id, session_date, session_time, duration_minutes, is_subscribers_only, is_recorded, max_participants, meeting_url, status } = req.body;
  await db.prepare(`
    UPDATE live_sessions SET title = ?, description = ?, grade_id = ?, subject_id = ?, session_date = ?,
      session_time = ?, duration_minutes = ?, is_subscribers_only = ?, is_recorded = ?,
      max_participants = ?, meeting_url = ?, status = ? WHERE id = ?
  `).run(
    title ?? session.title, description ?? session.description,
    grade_id !== undefined ? Number(grade_id) : session.grade_id,
    subject_id !== undefined ? Number(subject_id) : session.subject_id,
    session_date !== undefined ? session_date : session.session_date,
    session_time !== undefined ? session_time : session.session_time,
    duration_minutes !== undefined ? Number(duration_minutes) : session.duration_minutes,
    is_subscribers_only !== undefined ? (is_subscribers_only ? 1 : 0) : session.is_subscribers_only,
    is_recorded !== undefined ? (is_recorded ? 1 : 0) : session.is_recorded,
    max_participants !== undefined ? Number(max_participants) : session.max_participants,
    meeting_url !== undefined ? meeting_url : session.meeting_url,
    status ?? session.status, id);
  res.json({ message: 'تم تحديث الجلسة' });
});

router.delete('/sessions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const session = await db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
  if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  if (session.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذه الجلسة' });
  await db.prepare('DELETE FROM session_attendance WHERE session_id = ?').run(id);
  await db.prepare('DELETE FROM live_sessions WHERE id = ?').run(id);
  res.json({ message: 'تم حذف الجلسة' });
});

// ─── Session Attendance ───
router.get('/sessions/:id/attendance', async (req, res) => {
  const id = Number(req.params.id);
  const session = await db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(id);
  if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  if (session.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذه الجلسة' });

  const attendance = await db.prepare(`
    SELECT sa.*, u.name as student_name, u.email
    FROM session_attendance sa
    JOIN users u ON u.id = sa.user_id
    WHERE sa.session_id = ?
    ORDER BY sa.joined_at
  `).all(id);
  res.json(attendance);
});

// ─── Exam Analytics ───
router.get('/exam-analytics/:examId', async (req, res) => {
  const exam = await db.prepare(`
    SELECT e.*, s.name as subject_name
    FROM exams e JOIN subjects s ON s.id = e.subject_id
    WHERE e.id = ?
  `).get(req.params.examId);

  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });

  const results = await db.prepare(`
    SELECT er.*, u.name as name, u.email
    FROM exam_results er
    JOIN users u ON u.id = er.user_id
    WHERE er.exam_id = ?
    ORDER BY er.score DESC
  `).all(req.params.examId);

  const scores = results.map((r) => r.score);
  const uniqueStudents = new Set(results.map(r => r.user_id)).size;

  res.json({
    exam,
    stats: {
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      passRate: scores.length ? Math.round((scores.filter((s) => s >= 60).length / scores.length) * 100) : 0,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      uniqueStudents,
      totalAttempts: results.length,
    },
    results,
  });
});

// ─── Exam-Question Linking ───
router.get('/exams/:examId/questions', async (req, res) => {
  const examId = Number(req.params.examId);
  const linked = await db.prepare(`
    SELECT q.*, eq.sort_order, s.name as subject_name
    FROM exam_questions eq
    JOIN questions q ON q.id = eq.question_id
    JOIN subjects s ON s.id = q.subject_id
    WHERE eq.exam_id = ?
    ORDER BY eq.sort_order
  `).all(examId);
  res.json(linked);
});

router.post('/exams/:examId/questions', async (req, res) => {
  const examId = Number(req.params.examId);
  const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  if (exam.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'أنت لا تملك هذا الاختبار' });

  const { question_ids } = req.body;
  if (!Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({ error: 'حدد الأسئلة المراد ربطها' });
  }

  await db.prepare('DELETE FROM exam_questions WHERE exam_id = ?').run(examId);
  const insert = db.prepare('INSERT INTO exam_questions (exam_id, question_id, sort_order) VALUES (?, ?, ?)');
  const insertMany = db.transaction((ids) => {
    ids.forEach((qid, i) => insert.run(examId, Number(qid), i + 1));
  });
  insertMany(question_ids);

  await db.prepare('UPDATE exams SET question_count = ? WHERE id = ?').run(question_ids.length, examId);
  res.json({ message: 'تم ربط الأسئلة بالاختبار' });
});

export default router;
