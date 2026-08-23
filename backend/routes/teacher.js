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

router.get('/dashboard', (req, res) => {
  const teacherName = req.user.name;

  const subjects = db.prepare(`
    SELECT DISTINCT s.id, s.name, s.icon, s.color
    FROM subjects s
    INNER JOIN lessons l ON l.subject_id = s.id
    WHERE l.teacher_name = ?
  `).all(teacherName);

  const subjectIds = subjects.map((s) => s.id);

  const lessonsCount = db.prepare(
    `SELECT COUNT(*) c FROM lessons WHERE teacher_name = ?`
  ).get(teacherName).c;

  const lessonsNeedingAttention = db.prepare(`
    SELECT l.id, l.title, l.views, s.name as subject_name, s.icon
    FROM lessons l
    JOIN subjects s ON s.id = l.subject_id
    WHERE l.teacher_name = ? AND l.views < 5
    ORDER BY l.views ASC
    LIMIT 5
  `).all(teacherName);

  const examsCount = subjectIds.length > 0
    ? db.prepare(
        `SELECT COUNT(*) c FROM exams WHERE subject_id IN (${subjectIds.map(() => '?').join(',')})`
      ).get(...subjectIds).c
    : 0;

  const upcomingSessions = db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM live_sessions ls
    JOIN subjects s ON s.id = ls.subject_id
    LEFT JOIN grades g ON g.id = ls.grade_id
    WHERE ls.teacher_name = ? AND ls.status = 'upcoming'
    ORDER BY ls.session_date, ls.session_time
    LIMIT 5
  `).all(teacherName);

  let studentCount = 0;
  let avgScore = 0;
  let recentResults = [];

  if (subjectIds.length > 0) {
    studentCount = db.prepare(`
      SELECT COUNT(DISTINCT us.user_id) c
      FROM user_subjects us
      WHERE us.subject_id IN (${subjectIds.map(() => '?').join(',')})
    `).get(...subjectIds).c;

    const scoreData = db.prepare(`
      SELECT er.score
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})
    `).all(...subjectIds);
    if (scoreData.length > 0) {
      avgScore = Math.round(scoreData.reduce((s, r) => s + r.score, 0) / scoreData.length);
    }

    recentResults = db.prepare(`
      SELECT er.*, e.title as exam_title, u.name as student_name
      FROM exam_results er
      JOIN exams e ON e.id = er.exam_id
      JOIN users u ON u.id = er.user_id
      WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})
      ORDER BY er.created_at DESC
      LIMIT 10
    `).all(...subjectIds);
  }

  res.json({
    subjects,
    lessonsCount,
    lessonsNeedingAttention,
    examsCount,
    upcomingSessions,
    studentCount,
    avgScore,
    recentResults,
  });
});

router.get('/my-lessons', (req, res) => {
  const lessons = db.prepare(`
    SELECT l.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color,
           g.name as grade_name, u.name as unit_name
    FROM lessons l
    JOIN subjects s ON s.id = l.subject_id
    LEFT JOIN grades g ON g.id = l.grade_id
    LEFT JOIN units u ON u.id = l.unit_id
    WHERE l.teacher_name = ?
    ORDER BY l.created_at DESC
  `).all(req.user.name);
  res.json(lessons);
});

router.get('/my-exams', (req, res) => {
  const teacherName = req.user.name;
  const subjectIds = db.prepare(
    `SELECT DISTINCT subject_id FROM lessons WHERE teacher_name = ?`
  ).all(teacherName).map((r) => r.subject_id);

  if (subjectIds.length === 0) return res.json([]);

  const exams = db.prepare(`
    SELECT e.*, s.name as subject_name, s.icon as subject_icon,
           g.name as grade_name,
           (SELECT COUNT(*) FROM exam_results er WHERE er.exam_id = e.id) as result_count,
           (SELECT ROUND(AVG(score)) FROM exam_results er WHERE er.exam_id = e.id) as avg_score,
           (SELECT MAX(score) FROM exam_results er WHERE er.exam_id = e.id) as max_score,
           (SELECT MIN(score) FROM exam_results er WHERE er.exam_id = e.id) as min_score
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    LEFT JOIN grades g ON g.id = e.grade_id
    WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})
    ORDER BY e.created_at DESC
  `).all(...subjectIds);
  res.json(exams);
});

router.get('/my-sessions', (req, res) => {
  const sessions = db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM live_sessions ls
    JOIN subjects s ON s.id = ls.subject_id
    LEFT JOIN grades g ON g.id = ls.grade_id
    WHERE ls.teacher_name = ?
    ORDER BY ls.session_date DESC, ls.session_time DESC
  `).all(req.user.name);
  res.json(sessions);
});

router.get('/exam-analytics/:examId', (req, res) => {
  const exam = db.prepare(`
    SELECT e.*, s.name as subject_name
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    WHERE e.id = ?
  `).get(req.params.examId);

  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });

  const results = db.prepare(`
    SELECT er.*, u.name as student_name, u.email
    FROM exam_results er
    JOIN users u ON u.id = er.user_id
    WHERE er.exam_id = ?
    ORDER BY er.score DESC
  `).all(req.params.examId);

  const scores = results.map((r) => r.score);
  const analytics = {
    exam,
    totalStudents: results.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    passCount: scores.filter((s) => s >= 60).length,
    passRate: scores.length ? Math.round((scores.filter((s) => s >= 60).length / scores.length) * 100) : 0,
    results,
  };
  res.json(analytics);
});

export default router;
