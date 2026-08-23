import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── Helper: check and award badges ───
function checkAndAwardBadges(userId) {
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  const completedLessons = db.prepare('SELECT COUNT(*) c FROM lesson_progress WHERE user_id = ? AND completed_at IS NOT NULL').get(userId).c;
  const examCount = db.prepare('SELECT COUNT(*) c FROM exam_results WHERE user_id = ?').get(userId).c;
  const highScore = db.prepare('SELECT MAX(score) s FROM exam_results WHERE user_id = ?').get(userId).s || 0;

  const badgeChecks = [
    { id: 1, condition: completedLessons >= 1 },
    { id: 2, condition: examCount >= 1 },
    { id: 3, condition: highScore >= 90 },
    { id: 4, condition: completedLessons >= 10 },
    { id: 5, condition: completedLessons >= 50 },
    { id: 6, condition: user.points >= 500 },
    { id: 7, condition: user.points >= 1000 },
  ];

  for (const b of badgeChecks) {
    if (b.condition) {
      const existing = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, b.id);
      if (!existing) {
        db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, b.id);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  DISCUSSIONS
// ═══════════════════════════════════════════════════════════════

// GET /discussions/lesson/:lessonId
router.get('/discussions/lesson/:lessonId', (req, res) => {
  const { lessonId } = req.params;

  const rows = db.prepare(`
    SELECT d.*, u.name as user_name
    FROM discussions d
    JOIN users u ON u.id = d.user_id
    WHERE d.lesson_id = ?
    ORDER BY d.created_at ASC
  `).all(lessonId);

  const topLevel = rows.filter((r) => !r.parent_id);
  const replies = rows.filter((r) => r.parent_id);

  const nested = topLevel.map((t) => ({
    ...t,
    replies: replies.filter((r) => r.parent_id === t.id),
  }));

  res.json(nested);
});

// POST /discussions/lesson/:lessonId
router.post('/discussions/lesson/:lessonId', requireAuth, (req, res) => {
  const { lessonId } = req.params;
  const { content, parent_id } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'المحتوى مطلوب' });
  }

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) {
    return res.status(404).json({ error: 'الدرس غير موجود' });
  }

  const result = db.prepare(
    'INSERT INTO discussions (lesson_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)'
  ).run(lessonId, req.user.id, parent_id || null, content.trim());

  const discussion = db.prepare(`
    SELECT d.*, u.name as user_name
    FROM discussions d
    JOIN users u ON u.id = d.user_id
    WHERE d.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(discussion);
});

// DELETE /discussions/:id
router.delete('/discussions/:id', requireAuth, (req, res) => {
  const discussion = db.prepare('SELECT * FROM discussions WHERE id = ?').get(req.params.id);
  if (!discussion) {
    return res.status(404).json({ error: 'المناقشة غير موجودة' });
  }

  if (req.user.role !== 'admin' && discussion.user_id !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح لك بحذف هذه المناقشة' });
  }

  db.prepare('DELETE FROM discussions WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM discussions WHERE parent_id = ?').run(req.params.id);

  res.json({ message: 'تم الحذف بنجاح' });
});

// POST /discussions/:id/report
router.post('/discussions/:id/report', requireAuth, (req, res) => {
  const discussion = db.prepare('SELECT * FROM discussions WHERE id = ?').get(req.params.id);
  if (!discussion) {
    return res.status(404).json({ error: 'المناقشة غير موجودة' });
  }

  db.prepare('UPDATE discussions SET is_reported = 1 WHERE id = ?').run(req.params.id);

  res.json({ message: 'تم الإبلاغ بنجاح' });
});

// GET /discussions/reported
router.get('/discussions/reported', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بالوصول' });
  }

  const reported = db.prepare(`
    SELECT d.*, u.name as user_name, l.title as lesson_title
    FROM discussions d
    JOIN users u ON u.id = d.user_id
    JOIN lessons l ON l.id = d.lesson_id
    WHERE d.is_reported = 1
    ORDER BY d.created_at DESC
  `).all();

  res.json(reported);
});

// ═══════════════════════════════════════════════════════════════
//  GAMIFICATION
// ═══════════════════════════════════════════════════════════════

// GET /gamification/leaderboard
router.get('/gamification/leaderboard', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT u.id, u.name, u.points,
      COALESCE(
        (SELECT l.name FROM levels l WHERE l.points_required <= u.points ORDER BY l.points_required DESC LIMIT 1),
        'مبتدئ'
      ) as level
    FROM users u
    WHERE u.role = 'student'
    ORDER BY u.points DESC
    LIMIT 20
  `).all();

  res.json(leaderboard);
});

// GET /gamification/levels
router.get('/gamification/levels', (req, res) => {
  const levels = db.prepare('SELECT * FROM levels ORDER BY level ASC').all();
  res.json(levels);
});

// GET /gamification/badges
router.get('/gamification/badges', (req, res) => {
  const badges = db.prepare('SELECT * FROM badges ORDER BY id ASC').all();
  res.json(badges);
});

// GET /gamification/my-badges
router.get('/gamification/my-badges', requireAuth, (req, res) => {
  const badges = db.prepare(`
    SELECT b.*, ub.earned_at
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ?
    ORDER BY ub.earned_at DESC
  `).all(req.user.id);

  res.json(badges);
});

// GET /gamification/points-log
router.get('/gamification/points-log', requireAuth, (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM points_log
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json(logs);
});

// ═══════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

// GET /notifications/unread-count
router.get('/notifications/unread-count', requireAuth, (req, res) => {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
  ).get(req.user.id);

  res.json({ count: result.count });
});

// GET /notifications
router.get('/notifications', requireAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?'
  ).get(req.user.id).count;

  const unreadCount = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
  ).get(req.user.id).count;

  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  res.json({
    notifications,
    unread_count: unreadCount,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  });
});

// PATCH /notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(
    req.params.id,
    req.user.id,
  );

  if (!notif) {
    return res.status(404).json({ error: 'الإشعار غير موجود' });
  }

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);

  res.json({ message: 'تم وضع علامة مقروء' });
});

// PATCH /notifications/read-all
router.patch('/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);

  res.json({ message: 'تم وضع علامة مقروء على جميع الإشعارات' });
});

// DELETE /notifications/:id
router.delete('/notifications/:id', requireAuth, (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(
    req.params.id,
    req.user.id,
  );

  if (!notif) {
    return res.status(404).json({ error: 'الإشعار غير موجود' });
  }

  db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);

  res.json({ message: 'تم الحذف بنجاح' });
});

export default router;
