import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ═══════════════════════════════════════════
// P7: Notification Preferences + History
// ═══════════════════════════════════════════

// Get notifications with pagination
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const total = (await db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ?').get(req.user.id)).c;
  const unread = (await db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id)).c;
  const items = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(req.user.id, limit, offset);

  res.json({ items, total, unread, page, limit });
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Mark all as read
router.patch('/read-all', async (req, res) => {
  await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0')
    .run(req.user.id);
  res.json({ ok: true });
});

// Delete notification
router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Clear all
router.delete('/', async (req, res) => {
  await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

export default router;