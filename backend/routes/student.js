import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────────────
//  GET /api/student/dashboard — لوحة تحكم الطالب الكاملة
// ──────────────────────────────────────────────
router.get('/dashboard', requireAuth, (req, res) => {
  const user = req.user;
  const grade = user.grade;

  // ── معلومات المستخدم ──
  const userInfo = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    grade: user.grade,
    points: user.points,
    role: user.role,
  };

  // ── المستوى الحالي والتالي ──
  const currentLevel = db.prepare(
    'SELECT * FROM levels WHERE points_required <= ? ORDER BY points_required DESC LIMIT 1'
  ).get(user.points) || { level: 1, name: 'مبتدئ', points_required: 0, icon: '🌱' };

  const nextLevel = db.prepare(
    'SELECT * FROM levels WHERE points_required > ? ORDER BY points_required ASC LIMIT 1'
  ).get(user.points) || null;

  // ── إجمالي الدروس المكتملة ──
  const completedLessons = db.prepare(
    "SELECT COUNT(*) c FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL"
  ).get(user.id).c;

  // ── إجمالي نتائج الاختبارات ──
  const totalExamResults = db.prepare(
    'SELECT COUNT(*) c FROM exam_results WHERE user_id = ?'
  ).get(user.id).c;

  // ── متوسط الدرجات على الاختبارات ──
  const avgRow = db.prepare(
    'SELECT AVG(score) avg_score FROM exam_results WHERE user_id = ?'
  ).get(user.id);
  const averageScore = avgRow.avg_score != null ? Math.round(avgRow.avg_score * 10) / 10 : 0;

  // ── آخر 5 نتائج اختبار ──
  const recentExamResults = db.prepare(`
    SELECT er.*, e.title, e.exam_type, s.name as subject_name, s.icon as subject_icon
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    JOIN subjects s ON s.id = e.subject_id
    WHERE er.user_id = ?
    ORDER BY er.created_at DESC LIMIT 5
  `).all(user.id);

  // ── آخر 5 نشاطات دروس ──
  const recentLessonActivity = db.prepare(`
    SELECT lp.*, l.title as lesson_title, l.duration,
      s.name as subject_name, s.icon as subject_icon, s.color as subject_color
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN subjects s ON s.id = l.subject_id
    WHERE lp.user_id = ?
    ORDER BY lp.completed_at DESC LIMIT 5
  `).all(user.id);

  // ── الاختبارات القادمة (لم يُجْزَ أو بقي له محاولات) ──
  const upcomingExams = db.prepare(`
    SELECT e.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name,
      (SELECT COUNT(*) FROM exam_results er WHERE er.user_id = ? AND er.exam_id = e.id) as attempts_used
    FROM exams e
    JOIN subjects s ON s.id = e.subject_id
    JOIN grades g ON g.id = e.grade_id
    WHERE e.grade_id = ?
    ORDER BY e.created_at DESC
  `).all(user.id, grade).filter((e) => e.attempts_used < e.max_attempts);

  // ── الحصص المباشرة القادمة لصف الطالب ──
  const upcomingSessions = db.prepare(`
    SELECT ls.*, s.name as subject_name, s.icon as subject_icon, g.name as grade_name
    FROM live_sessions ls
    JOIN subjects s ON s.id = ls.subject_id
    JOIN grades g ON g.id = ls.grade_id
    WHERE ls.grade_id = ? AND ls.status = 'upcoming'
      AND (ls.session_date IS NULL OR ls.session_date >= date('now'))
    ORDER BY ls.session_date, ls.session_time
  `).all(grade);

  // ── المواد المشترك بها مع نسبة التقدم ──
  const subscribedIds = db.prepare(
    'SELECT subject_id FROM user_subjects WHERE user_id = ?'
  ).all(user.id).map((r) => r.subject_id);

  const subscribedSubjects = subscribedIds.map((sid) => {
    const subject = db.prepare('SELECT id, name, icon, color, slug FROM subjects WHERE id = ?').get(sid);
    const lessons = db.prepare(
      'SELECT id FROM lessons WHERE subject_id = ? AND grade_id = ?'
    ).all(sid, grade);
    const completed = lessons.filter((l) =>
      db.prepare(
        'SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ? AND completed_at IS NOT NULL'
      ).get(user.id, l.id)
    ).length;
    const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    return {
      ...subject,
      total_lessons: lessons.length,
      completed_lessons: completed,
      progress_percentage: pct,
    };
  });

  // ── توصية: الدروس غير المكتملة من المواد المشترك بها ──
  const recommendations = [];
  for (const sid of subscribedIds) {
    const uncompleted = db.prepare(`
      SELECT l.*, s.name as subject_name, s.icon as subject_icon
      FROM lessons l
      JOIN subjects s ON s.id = l.subject_id
      WHERE l.subject_id = ? AND l.grade_id = ?
        AND l.id NOT IN (
          SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL
        )
      ORDER BY l.order_index, l.id
    `).all(sid, grade, user.id);
    recommendations.push(...uncompleted);
  }
  recommendations.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const topRecommendations = recommendations.slice(0, 5);

  // ── الشارات المكتسبة ──
  const badgesEarned = db.prepare(`
    SELECT ub.earned_at, b.name, b.description, b.icon
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ?
    ORDER BY ub.earned_at DESC
  `).all(user.id);

  res.json({
    user: userInfo,
    current_level: currentLevel,
    next_level: nextLevel,
    completed_lessons: completedLessons,
    total_exam_results: totalExamResults,
    average_score: averageScore,
    recent_exam_results: recentExamResults,
    recent_lesson_activity: recentLessonActivity,
    upcoming_exams: upcomingExams,
    upcoming_sessions: upcomingSessions,
    subscribed_subjects: subscribedSubjects,
    recommendations: topRecommendations,
    badges_earned: badgesEarned,
  });
});

// ──────────────────────────────────────────────
//  GET /api/student/progress — تقدم مفصل لكل مادة مشتركة
// ──────────────────────────────────────────────
router.get('/progress', requireAuth, (req, res) => {
  const user = req.user;
  const grade = user.grade;

  const subscribedIds = db.prepare(
    'SELECT subject_id FROM user_subjects WHERE user_id = ?'
  ).all(user.id).map((r) => r.subject_id);

  const progress = subscribedIds.map((sid) => {
    const subject = db.prepare('SELECT id, name, icon, color, slug FROM subjects WHERE id = ?').get(sid);
    const lessons = db.prepare(
      'SELECT id FROM lessons WHERE subject_id = ? AND grade_id = ?'
    ).all(sid, grade);
    const completed = lessons.filter((l) =>
      db.prepare(
        'SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ? AND completed_at IS NOT NULL'
      ).get(user.id, l.id)
    ).length;

    const avgRow = db.prepare(`
      SELECT AVG(er.score) avg_score
      FROM exam_results er JOIN exams e ON e.id = er.exam_id
      WHERE er.user_id = ? AND e.subject_id = ?
    `).get(user.id, sid);

    return {
      subject,
      total_lessons: lessons.length,
      completed_lessons: completed,
      percentage: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
      average_exam_score: avgRow.avg_score != null ? Math.round(avgRow.avg_score * 10) / 10 : null,
    };
  });

  res.json(progress);
});

// ──────────────────────────────────────────────
//  GET /api/student/recommendations — دروس موصى بها
// ──────────────────────────────────────────────
router.get('/recommendations', requireAuth, (req, res) => {
  const user = req.user;
  const grade = user.grade;

  const subscribedIds = db.prepare(
    'SELECT subject_id FROM user_subjects WHERE user_id = ?'
  ).all(user.id).map((r) => r.subject_id);

  const uncompleted = [];
  for (const sid of subscribedIds) {
    const lessons = db.prepare(`
      SELECT l.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color
      FROM lessons l
      JOIN subjects s ON s.id = l.subject_id
      WHERE l.subject_id = ? AND l.grade_id = ?
        AND l.id NOT IN (
          SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL
        )
      ORDER BY l.order_index, l.id
    `).all(sid, grade, user.id);
    uncompleted.push(...lessons);
  }

  uncompleted.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  res.json(uncompleted);
});

// ──────────────────────────────────────────────
//  GET /api/student/achievements — شارات ومستويات
// ──────────────────────────────────────────────
router.get('/achievements', requireAuth, (req, res) => {
  const user = req.user;

  const currentLevel = db.prepare(
    'SELECT * FROM levels WHERE points_required <= ? ORDER BY points_required DESC LIMIT 1'
  ).get(user.points) || { level: 1, name: 'مبتدئ', points_required: 0, icon: '🌱' };

  const nextLevel = db.prepare(
    'SELECT * FROM levels WHERE points_required > ? ORDER BY points_required ASC LIMIT 1'
  ).get(user.points) || null;

  const badgesEarned = db.prepare(`
    SELECT ub.earned_at, b.name, b.description, b.icon, b.points_required
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ?
    ORDER BY ub.earned_at DESC
  `).all(user.id);

  const allBadges = db.prepare('SELECT * FROM badges ORDER BY points_required, id').all();

  const badgesWithStatus = allBadges.map((b) => ({
    ...b,
    earned: badgesEarned.some((e) => e.badge_id === b.id || e.name === b.name),
    earned_at: (badgesEarned.find((e) => e.badge_id === b.id || e.name === b.name))?.earned_at || null,
  }));

  res.json({
    points: user.points,
    current_level: currentLevel,
    next_level: nextLevel,
    badges_earned: badgesEarned,
    all_badges: badgesWithStatus,
  });
});

// ──────────────────────────────────────────────
//  GET /api/student/activity — سجل النشاطات
// ──────────────────────────────────────────────
router.get('/activity', requireAuth, (req, res) => {
  const user = req.user;
  const activities = [];

  // ── إكمال الدروس ──
  const lessonCompletions = db.prepare(`
    SELECT lp.completed_at as date, l.title as detail, s.name as subject_name, s.icon as subject_icon,
      'lesson' as type
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN subjects s ON s.id = l.subject_id
    WHERE lp.user_id = ? AND lp.completed_at IS NOT NULL
  `).all(user.id);
  activities.push(...lessonCompletions);

  // ── نتائج الاختبارات ──
  const examActivities = db.prepare(`
    SELECT er.created_at as date,
      CONCAT(e.title, ' — ', er.score, '%') as detail,
      s.name as subject_name, s.icon as subject_icon,
      'exam' as type
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    JOIN subjects s ON s.id = e.subject_id
    WHERE er.user_id = ?
  `).all(user.id);
  activities.push(...examActivities);

  // ── الشارات المكتسبة ──
  const badgeActivities = db.prepare(`
    SELECT ub.earned_at as date, b.name as detail,
      b.icon as subject_icon, 'badge' as type
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ?
  `).all(user.id);
  activities.push(...badgeActivities);

  // ── النقاط المحصلة ──
  const pointActivities = db.prepare(`
    SELECT pl.created_at as date,
      CONCAT('+', pl.points, ' نقطة — ', pl.reason) as detail,
      'point' as type
    FROM points_log pl
    WHERE pl.user_id = ?
  `).all(user.id);
  activities.push(...pointActivities);

  // ترتيب حسب التاريخ الأحدث
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(activities);
});

export default router;
