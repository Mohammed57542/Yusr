import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ═══════════════════════════════════════════
// P10: AI Recommendation Engine
// ═══════════════════════════════════════════

// Get personalized recommendations
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const gradeId = req.user.grade;

  // 1. Weak subjects (low exam scores)
  const weakSubjects = await db.prepare(`
    SELECT s.id, s.name, s.icon, AVG(er.score) as avg_score
    FROM subjects s
    JOIN exams e ON e.subject_id = s.id
    JOIN exam_results er ON er.exam_id = e.id
    WHERE er.user_id = ?
    GROUP BY s.id
    HAVING avg_score < 70
    ORDER BY avg_score ASC
    LIMIT 3
  `).all(userId);

  // 2. Next lessons to continue (from subscribed subjects)
  const subscribedSubjectIds = (await db.prepare(
    'SELECT subject_id FROM user_subjects WHERE user_id = ? AND status = ?'
  ).all(userId, 'active')).map(r => r.subject_id);

  let nextLessons = [];
  if (subscribedSubjectIds.length > 0 && gradeId) {
    nextLessons = await db.prepare(`
      SELECT l.*, s.name as subject_name, s.icon as subject_icon,
        CASE WHEN lp.id IS NOT NULL THEN 1 ELSE 0 END as started
      FROM lessons l
      JOIN subjects s ON s.id = l.subject_id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
      WHERE l.grade_id = ? AND l.subject_id IN (${subscribedSubjectIds.map(() => '?').join(',')})
        AND l.status = 'published'
      ORDER BY started ASC, l.order_index ASC
      LIMIT 5
    `).all(userId, gradeId, ...subscribedSubjectIds);
  }

  // 3. Review weak questions (spaced repetition)
  const weakQuestions = await db.prepare(`
    SELECT mq.*, q.question, q.options, q.correct_index, q.explanation
    FROM mistakes_log mq
    JOIN questions q ON q.id = mq.question_id
    WHERE mq.user_id = ? AND mq.mastered = 0
      AND (mq.next_review IS NULL OR mq.next_review <= datetime('now'))
    ORDER BY mq.times_wrong DESC
    LIMIT 5
  `).all(userId);

  // 4. Upcoming exams
  const upcomingExams = await db.prepare(`
    SELECT e.*, s.name as subject_name, g.name as grade_name
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    JOIN grades g ON g.id = e.grade_id
    WHERE e.grade_id = ? AND (e.close_at IS NULL OR e.close_at > datetime('now'))
    ORDER BY e.created_at DESC LIMIT 3
  `).all(gradeId || 8);

  // 5. Recommended resources
  const resources = await db.prepare(`
    SELECT r.*, s.name as subject_name
    FROM resources r
    JOIN subjects s ON s.id = r.subject_id
    WHERE r.grade_id = ?
    ORDER BY r.views DESC LIMIT 3
  `).all(gradeId || 8);

  res.json({
    weakSubjects,
    nextLessons,
    weakQuestions,
    upcomingExams,
    resources,
    summary: {
      needsImprovement: weakSubjects.length,
      lessonsToContinue: nextLessons.filter(l => l.started).length,
      questionsToReview: weakQuestions.length,
    },
  });
});

// Mark question as reviewed (update spaced repetition)
router.post('/review-question', async (req, res) => {
  const { questionId, correct } = req.body;
  if (!questionId) return res.status(400).json({ error: 'questionId مطلوب' });

  const mistake = await db.prepare('SELECT * FROM mistakes_log WHERE user_id = ? AND question_id = ?')
    .get(req.user.id, questionId);

  if (!mistake) {
    if (correct) return res.json({ ok: true });
    await db.prepare('INSERT INTO mistakes_log (user_id, question_id, times_wrong, next_review) VALUES (?, ?, 1, datetime("now", "+1 day"))')
      .run(req.user.id, questionId);
  } else if (correct) {
    const newCorrect = mistake.times_correct + 1;
    const mastered = newCorrect >= 3 ? 1 : 0;
    const days = Math.min(Math.pow(2, newCorrect), 30);
    await db.prepare(`UPDATE mistakes_log SET times_correct = ?, mastered = ?, last_reviewed = datetime('now'), next_review = datetime('now', '+${days} days') WHERE id = ?`)
      .run(newCorrect, mastered, mistake.id);
  } else {
    await db.prepare("UPDATE mistakes_log SET times_wrong = times_wrong + 1, last_reviewed = datetime('now'), next_review = datetime('now', '+1 day') WHERE id = ?")
      .run(mistake.id);
  }

  res.json({ ok: true });
});

export default router;