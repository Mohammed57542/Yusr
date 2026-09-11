import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ═══════════════════════════════════════════
// P6: Performance Analytics Dashboard
// ═══════════════════════════════════════════

// Overall student performance
router.get('/student/overview', async (req, res) => {
  const userId = req.user.id;

  const totalLessons = (await db.prepare('SELECT COUNT(*) c FROM lesson_progress WHERE user_id = ?').get(userId)).c;
  const completedLessons = (await db.prepare('SELECT COUNT(*) c FROM lesson_progress WHERE user_id = ? AND watch_percent >= 80').get(userId)).c;
  const totalExams = (await db.prepare('SELECT COUNT(*) c FROM exam_results WHERE user_id = ?').get(userId)).c;
  const avgScore = (await db.prepare('SELECT AVG(score) avg FROM exam_results WHERE user_id = ?').get(userId)).avg || 0;
  const totalPoints = (await db.prepare('SELECT points FROM users WHERE id = ?').get(userId)).points || 0;
  const streak = await calculateStreak(userId);
  const weeklyActivity = await getWeeklyActivity(userId);
  const subjectPerformance = await getSubjectPerformance(userId);
  const recentResults = await db.prepare(`
    SELECT er.*, e.title as exam_title, s.name as subject_name
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    JOIN subjects s ON s.id = e.subject_id
    WHERE er.user_id = ?
    ORDER BY er.created_at DESC LIMIT 5
  `).all(userId);

  res.json({
    totalLessons,
    completedLessons,
    completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    totalExams,
    avgScore: Math.round(avgScore * 10) / 10,
    totalPoints,
    streak,
    weeklyActivity,
    subjectPerformance,
    recentResults,
  });
});

// Teacher analytics
router.get('/teacher/overview', async (req, res) => {
  const teacherId = req.user.id;
  const subjectIds = (await db.prepare('SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?').all(teacherId)).map(r => r.subject_id);

  const lessonsCount = (await db.prepare('SELECT COUNT(*) c FROM lessons WHERE created_by = ?').get(teacherId)).c;
  const examsCount = subjectIds.length > 0
    ? (await db.prepare(`SELECT COUNT(*) c FROM exams WHERE subject_id IN (${subjectIds.map(() => '?').join(',')})`).get(...subjectIds)).c
    : 0;

  const studentCount = subjectIds.length > 0
    ? (await db.prepare(`SELECT COUNT(DISTINCT us.user_id) c FROM user_subjects us WHERE us.subject_id IN (${subjectIds.map(() => '?').join(',')}) AND us.status = 'active'`).get(...subjectIds)).c
    : 0;

  const avgStudentScore = subjectIds.length > 0
    ? (await db.prepare(`SELECT AVG(er.score) avg FROM exam_results er JOIN exams e ON e.id = er.exam_id WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})`).get(...subjectIds)).avg || 0
    : 0;

  const topStudents = subjectIds.length > 0
    ? await db.prepare(`
      SELECT u.id, u.name, u.points, COUNT(DISTINCT er.id) exams_taken, AVG(er.score) avg_score
      FROM users u
      JOIN exam_results er ON er.user_id = u.id
      JOIN exams e ON e.id = er.exam_id
      WHERE e.subject_id IN (${subjectIds.map(() => '?').join(',')})
      GROUP BY u.id ORDER BY avg_score DESC LIMIT 10
    `).all(...subjectIds)
    : [];

  const recentSubmissions = await db.prepare(`
    SELECT asub.*, a.title as assignment_title, u.name as student_name
    FROM assignment_submissions asub
    JOIN assignments a ON a.id = asub.assignment_id
    JOIN users u ON u.id = asub.user_id
    WHERE a.created_by = ?
    ORDER BY asub.submitted_at DESC LIMIT 10
  `).all(teacherId);

  res.json({
    lessonsCount,
    examsCount,
    studentCount,
    avgStudentScore: Math.round(avgStudentScore * 10) / 10,
    topStudents,
    recentSubmissions,
  });
});

async function calculateStreak(userId) {
  const days = (await db.prepare(`
    SELECT DISTINCT date(completed_at) as day
    FROM lesson_progress WHERE user_id = ? AND watch_percent >= 80
    ORDER BY day DESC LIMIT 30
  `).all(userId)).map(r => r.day);

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let check = today;

  for (const day of days) {
    if (day === check) {
      streak++;
      const prev = new Date(check);
      prev.setDate(prev.getDate() - 1);
      check = prev.toISOString().split('T')[0];
    } else break;
  }
  return streak;
}

async function getWeeklyActivity(userId) {
  return await db.prepare(`
    SELECT date(completed_at) as day, COUNT(*) as lessons
    FROM lesson_progress
    WHERE user_id = ? AND watch_percent >= 80
      AND completed_at >= datetime('now', '-7 days')
    GROUP BY day ORDER BY day
  `).all(userId);
}

async function getSubjectPerformance(userId) {
  return await db.prepare(`
    SELECT s.name, s.icon, AVG(er.score) as avg_score, COUNT(er.id) as exams_taken
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    JOIN subjects s ON s.id = e.subject_id
    WHERE er.user_id = ?
    GROUP BY s.id
  `).all(userId);
}

export default router;