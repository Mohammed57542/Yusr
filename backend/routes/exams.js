import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireSubjectAccess, withLockFlag, canAccessSubject } from '../middleware/premium.js';

const router = Router();

router.get('/questions', optionalAuth, (req, res) => {
  const { grade_id, subject_id, unit_id, lesson_id, difficulty, limit = 10 } = req.query;
  let sql = `
    SELECT q.*, s.name as subject_name, g.name as grade_name, u.name as unit_name
    FROM questions q
    JOIN subjects s ON s.id = q.subject_id
    JOIN grades g ON g.id = q.grade_id
    LEFT JOIN units u ON u.id = q.unit_id
  `;
  const where = [];
  const params = [];
  if (grade_id) { where.push('q.grade_id = ?'); params.push(Number(grade_id)); }
  if (subject_id) { where.push('q.subject_id = ?'); params.push(Number(subject_id)); }
  if (unit_id) { where.push('q.unit_id = ?'); params.push(Number(unit_id)); }
  if (lesson_id) { where.push('q.lesson_id = ?'); params.push(Number(lesson_id)); }
  if (difficulty) { where.push('q.difficulty = ?'); params.push(difficulty); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(Math.min(Number(limit) || 10, 50));
  const rows = db.prepare(sql).all(...params);
  const safe = rows.map((r) => ({ ...r, correct_index: undefined, options: JSON.parse(r.options) }));
  const flagged = withLockFlag(safe, req.user);
  res.json({ questions: flagged, count: flagged.length });
});

router.post('/questions/verify', optionalAuth, (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'لا توجد إجابات للتصحيح' });
  }
  const subjectId = db.prepare('SELECT subject_id FROM questions WHERE id = ?').get(Number(answers[0].id))?.subject_id;
  if (!canAccessSubject(req.user ?? null, subjectId)) {
    const subject = db.prepare('SELECT name FROM subjects WHERE id = ?').get(subjectId);
    return res.status(403).json({ error: `المحتوى مميز — تحتاج اشتراكاً في مادة ${subject?.name ?? ''} للوصول إليه`, locked: true, subject_id: subjectId });
  }
  const results = [];
  let score = 0;

  const isCorrect = (q, answer) => {
    const opts = JSON.parse(q.options);
    if (q.question_type === 'multi') {
      const correctArr = Array.isArray(q.correct_index)
        ? q.correct_index
        : JSON.parse(q.correct_index || '[]');
      const given = Array.isArray(answer) ? answer : [];
      const norm = (arr) => [...new Set(arr.map(Number))].sort((a, b) => a - b).join(',');
      return norm(given) === norm(correctArr);
    }
    if (q.question_type === 'tf') {
      const ans = String(answer).trim();
      const target = String(opts[Number(q.correct_index)] ?? q.correct_index).trim();
      return ans === target || ans === String(q.correct_index);
    }
    return Number(answer) === Number(q.correct_index);
  };

  for (const a of answers) {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(Number(a.id));
    // تجاهل أي إجابة لسؤال من مادة مختلفة أو غير موجود
    if (!q || q.subject_id !== subjectId) continue;
    const correct = isCorrect(q, a.answer);
    if (correct) score++;
    results.push({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
      question_type: q.question_type,
      correct_index: q.correct_index,
      your_answer: a.answer,
      correct,
      explanation: q.explanation,
    });
  }
  res.json({ score, total: results.length, results });
});

router.get('/exams', optionalAuth, (req, res) => {
  const { grade_id, subject_id, unit_id, exam_type, difficulty } = req.query;
  let sql = `
    SELECT e.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name, g.color as grade_color, u.name as unit_name
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    JOIN grades g ON g.id = e.grade_id
    LEFT JOIN units u ON u.id = e.unit_id
  `;
  const where = [];
  const params = [];
  if (grade_id) { where.push('e.grade_id = ?'); params.push(Number(grade_id)); }
  if (subject_id) { where.push('e.subject_id = ?'); params.push(Number(subject_id)); }
  if (unit_id) { where.push('e.unit_id = ?'); params.push(Number(unit_id)); }
  if (exam_type) { where.push('e.exam_type = ?'); params.push(exam_type); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY e.created_at DESC';
  const exams = withLockFlag(db.prepare(sql).all(...params), req.user);

  if (req.user) {
    const enriched = exams.map((e) => {
      const attempts = db.prepare('SELECT COUNT(*) c FROM exam_results WHERE user_id = ? AND exam_id = ?').get(req.user.id, e.id).c;
      const bestScore = db.prepare('SELECT MAX(score) s FROM exam_results WHERE user_id = ? AND exam_id = ?').get(req.user.id, e.id).s;
      return { ...e, attempts_used: attempts, best_score: bestScore };
    });
    return res.json(enriched);
  }
  res.json(exams);
});

router.get('/exams/:id', optionalAuth, requireSubjectAccess((req) => {
  return db.prepare('SELECT subject_id FROM exams WHERE id = ?').get(Number(req.params.id))?.subject_id;
}), (req, res) => {
  const exam = db.prepare(`
    SELECT e.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name, g.color as grade_color, u.name as unit_name
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    JOIN grades g ON g.id = e.grade_id
    LEFT JOIN units u ON u.id = e.unit_id
    WHERE e.id = ?
  `).get(Number(req.params.id));
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });

  let questions;
  if (exam.unit_id) {
    questions = db.prepare(`
      SELECT q.id, q.question, q.options, q.difficulty, q.question_type FROM questions q
      WHERE q.grade_id = ? AND q.subject_id = ?
      ORDER BY (q.unit_id = ?) DESC, RANDOM() LIMIT ?
    `).all(exam.grade_id, exam.subject_id, exam.unit_id, exam.question_count);
  } else {
    questions = db.prepare(`
      SELECT q.id, q.question, q.options, q.difficulty, q.question_type FROM questions q
      WHERE q.grade_id = ? AND q.subject_id = ? ORDER BY RANDOM() LIMIT ?
    `).all(exam.grade_id, exam.subject_id, exam.question_count);
  }

  const safe = questions.map((q) => ({ ...q, options: JSON.parse(q.options) }));
  res.json({ exam, questions: safe });
});

router.post('/exams/:id/submit', optionalAuth, (req, res) => {
  const { answers, time_spent } = req.body;
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(Number(req.params.id));
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  if (!canAccessSubject(req.user ?? null, exam.subject_id)) {
    const subject = db.prepare('SELECT name FROM subjects WHERE id = ?').get(exam.subject_id);
    return res.status(403).json({ error: `المحتوى مميز — تحتاج اشتراكاً في مادة ${subject?.name ?? ''} للوصول إليه`, locked: true, subject_id: exam.subject_id });
  }

  if (req.user) {
    const attemptCount = db.prepare('SELECT COUNT(*) c FROM exam_results WHERE user_id = ? AND exam_id = ?').get(req.user.id, exam.id).c;
    if (attemptCount >= exam.max_attempts) {
      return res.status(403).json({ error: `لقد استنفدت جميع المحاولات المسموحة (${exam.max_attempts})` });
    }
    if (exam.open_at && new Date() < new Date(exam.open_at)) {
      return res.status(403).json({ error: 'لم يفتح الاختبار بعد' });
    }
    if (exam.close_at && new Date() > new Date(exam.close_at)) {
      return res.status(403).json({ error: 'انتهى وقت الاختبار' });
    }
  }

  const examQuestionIds = exam.unit_id
    ? db.prepare(`
        SELECT q.id FROM questions q
        WHERE q.grade_id = ? AND q.subject_id = ? ORDER BY (q.unit_id = ?) DESC, RANDOM() LIMIT ?
      `).all(exam.grade_id, exam.subject_id, exam.unit_id, exam.question_count).map((r) => r.id)
    : db.prepare(`
        SELECT q.id FROM questions q
        WHERE q.grade_id = ? AND q.subject_id = ? ORDER BY RANDOM() LIMIT ?
      `).all(exam.grade_id, exam.subject_id, exam.question_count).map((r) => r.id);
  const allowed = new Set(examQuestionIds);

  let score = 0;
  const detailed = [];

  const isCorrect = (q, answer) => {
    const opts = JSON.parse(q.options);
    if (q.question_type === 'multi') {
      const correctArr = JSON.parse(q.correct_index || '[]');
      const given = Array.isArray(answer) ? answer : [];
      const norm = (arr) => [...new Set(arr.map(Number))].sort((a, b) => a - b).join(',');
      return norm(given) === norm(correctArr);
    }
    if (q.question_type === 'tf') {
      const ans = String(answer).trim();
      const target = String(opts[Number(q.correct_index)] ?? q.correct_index).trim();
      return ans === target || ans === String(q.correct_index);
    }
    return Number(answer) === Number(q.correct_index);
  };

  for (const a of (answers || [])) {
    const qid = Number(a.id);
    if (!allowed.has(qid)) continue;
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(qid);
    if (!q) continue;
    const correct = isCorrect(q, a.answer);
    if (correct) score++;
    detailed.push({ id: q.id, question_type: q.question_type, correct, your_answer: a.answer, correct_index: q.correct_index, explanation: q.explanation });
  }
  const total = detailed.length;
  const percentage = total ? Math.round((score / total) * 100) : 0;

  let points = 0;
  let attempt_number = 1;
  if (req.user) {
    const attemptCount = db.prepare('SELECT COUNT(*) c FROM exam_results WHERE user_id = ? AND exam_id = ?').get(req.user.id, exam.id).c;
    attempt_number = attemptCount + 1;
    db.prepare('INSERT INTO exam_results (user_id, exam_id, score, total, answers, started_at, time_spent, attempt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.id, exam.id, percentage, total, JSON.stringify(detailed), new Date().toISOString(), time_spent || 0, attempt_number);
    if (attempt_number === 1) {
      points = (exam.points_reward || 20) + (percentage >= 80 ? 30 : 0);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, req.user.id);
      db.prepare('INSERT INTO points_log (user_id, points, reason) VALUES (?, ?, ?)').run(req.user.id, points, `حل اختبار: ${exam.title}`);
    }
  }
  res.json({
    score: percentage, correct: score, total, detailed,
    saved: !!req.user, points, attempt_number,
    show_results: exam.show_results,
    allow_review: exam.allow_review,
    max_attempts: exam.max_attempts,
    attempts_used: attempt_number,
  });
});

router.get('/users/:id/results', requireAuth, (req, res) => {
  if (req.user.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'لا يمكنك الاطلاع على نتائج مستخدم آخر' });
  }
  const results = db.prepare(`
    SELECT er.*, e.title, e.duration_minutes, s.name as subject_name, s.icon as subject_icon
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    JOIN subjects s ON s.id = e.subject_id
    WHERE er.user_id = ? ORDER BY er.created_at DESC
  `).all(Number(req.params.id));
  res.json(results);
});

export default router;
