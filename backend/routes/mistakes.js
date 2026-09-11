import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const rows = await db.prepare(`
      SELECT ml.id AS mistake_id, ml.question_id, ml.times_wrong, ml.times_correct,
              ml.mastered, ml.next_review, ml.created_at,
              q.question AS question_text, q.options, q.correct_index AS correct_answer, q.explanation, q.difficulty,
              s.id AS subject_id, s.name AS subject_name,
              u.name AS unit_name
       FROM mistakes_log ml
       JOIN questions q ON q.id = ml.question_id
       JOIN subjects s ON s.id = q.subject_id
       LEFT JOIN units u ON u.id = q.unit_id
       WHERE ml.user_id = ?
       ORDER BY s.name, ml.created_at DESC
    `).all(userId);

    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.subject_id]) {
        grouped[row.subject_id] = {
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          mistake_count: 0,
          questions: [],
        };
      }
      grouped[row.subject_id].mistake_count += 1;
      grouped[row.subject_id].questions.push({
        id: row.mistake_id,
        question_id: row.question_id,
        question_text: row.question_text,
        options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
        correct_answer: row.correct_answer,
        explanation: row.explanation,
        difficulty: row.difficulty,
        subject_name: row.subject_name,
        unit_name: row.unit_name,
        times_wrong: row.times_wrong,
        times_correct: row.times_correct,
        mastered: row.mastered,
        next_review: row.next_review,
      });
    }

    return res.json(Object.values(grouped));
  } catch (err) {
    console.error('GET /mistakes error:', err);
    return res.status(500).json({ error: 'Failed to fetch mistakes' });
  }
});

router.get('/practice', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const subjectId = req.query.subject_id || null;
    const count = Math.min(Math.max(parseInt(req.query.count, 10) || 10, 1), 50);

    let sql = `SELECT ml.id AS mistake_id, ml.question_id, ml.next_review,
                      q.question AS question_text, q.options, q.correct_index AS correct_answer, q.explanation, q.difficulty,
                      s.id AS subject_id, s.name AS subject_name,
                      u.name AS unit_name
               FROM mistakes_log ml
               JOIN questions q ON q.id = ml.question_id
               JOIN subjects s ON s.id = q.subject_id
               LEFT JOIN units u ON u.id = q.unit_id
               WHERE ml.user_id = ? AND ml.mastered = 0`;
    const params = [userId];

    if (subjectId) {
      sql += ` AND q.subject_id = ?`;
      params.push(subjectId);
    }

    sql += ` ORDER BY ml.next_review IS NULL DESC, ml.next_review ASC, RANDOM() LIMIT ?`;
    params.push(count);

    const rows = await db.prepare(sql).all(...params);

    const questions = rows.map((row) => ({
      mistake_id: row.mistake_id,
      question_id: row.question_id,
      question_text: row.question_text,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      correct_answer: row.correct_answer,
      explanation: row.explanation,
      difficulty: row.difficulty,
      subject_name: row.subject_name,
      unit_name: row.unit_name,
      next_review: row.next_review,
    }));

    return res.json(questions);
  } catch (err) {
    console.error('GET /mistakes/practice error:', err);
    return res.status(500).json({ error: 'Failed to fetch practice questions' });
  }
});

router.post('/:id/review', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const mistakeId = req.params.id;
    const { correct } = req.body;

    if (typeof correct !== 'boolean') {
      return res.status(400).json({ error: 'correct must be a boolean' });
    }

    const mistake = await db.prepare('SELECT id, times_correct, mastered FROM mistakes_log WHERE id = ? AND user_id = ?')
      .get(mistakeId, userId);

    if (!mistake) return res.status(404).json({ error: 'Mistake not found' });
    if (mistake.mastered) return res.status(400).json({ error: 'This question is already mastered' });

    if (correct) {
      const newTimesCorrect = mistake.times_correct + 1;
      let mastered = 0;
      let nextReview = null;

      switch (newTimesCorrect) {
        case 1: nextReview = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(); break;
        case 2: nextReview = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); break;
        case 3: nextReview = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); break;
        case 4: nextReview = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); break;
        default: mastered = 1; break;
      }

      await db.prepare('UPDATE mistakes_log SET times_correct = ?, mastered = ?, next_review = ? WHERE id = ? AND user_id = ?')
        .run(newTimesCorrect, mastered, nextReview, mistakeId, userId);

      return res.json({ id: Number(mistakeId), times_correct: newTimesCorrect, mastered: Boolean(mastered), next_review: nextReview });
    } else {
      await db.prepare('UPDATE mistakes_log SET times_wrong = times_wrong + 1 WHERE id = ? AND user_id = ?')
        .run(mistakeId, userId);
      return res.json({ id: Number(mistakeId), times_correct: mistake.times_correct, mastered: false, next_review: mistake.next_review });
    }
  } catch (err) {
    console.error('POST /mistakes/:id/review error:', err);
    return res.status(500).json({ error: 'Failed to review mistake' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.prepare('DELETE FROM mistakes_log WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    if (result.changes === 0) return res.status(404).json({ error: 'Mistake not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /mistakes/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete mistake' });
  }
});

export async function trackMistake(userId, questionId, examId) {
  const existing = await db.prepare('SELECT id FROM mistakes_log WHERE user_id = ? AND question_id = ?').get(userId, questionId);
  if (existing) {
    await db.prepare("UPDATE mistakes_log SET times_wrong = times_wrong + 1 WHERE id = ?").run(existing.id);
    return existing.id;
  }
  const result = await db.prepare("INSERT INTO mistakes_log (user_id, question_id, exam_id, times_wrong) VALUES (?, ?, ?, 1)").run(userId, questionId, examId);
  return result.lastInsertRowid;
}

export default router;