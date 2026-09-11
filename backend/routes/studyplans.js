import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const plans = await db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    for (const plan of plans) {
      plan.items = await db.prepare(`
        SELECT spi.*, l.title AS lesson_title, e.title AS exam_title
        FROM study_plan_items spi
        LEFT JOIN lessons l ON spi.lesson_id = l.id
        LEFT JOIN exams e ON spi.exam_id = e.id
        WHERE spi.plan_id = ?
      `).all(plan.id);
    }
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch study plans' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, subject_id, target_date, items } = req.body;
    if (!title || !subject_id) return res.status(400).json({ error: 'title and subject_id are required' });

    const result = await db.prepare('INSERT INTO study_plans (user_id, title, description, subject_id, target_date) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, title, description || null, subject_id, target_date || null);
    const planId = result.lastInsertRowid;

    if (Array.isArray(items) && items.length > 0) {
      const insert = db.prepare('INSERT INTO study_plan_items (plan_id, lesson_id, exam_id, day_of_week, time_slot, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)');
      for (const item of items) {
        await insert.run(planId, item.lesson_id || null, item.exam_id || null, item.day_of_week || null, item.time_slot || null, item.duration_minutes || 30);
      }
    }

    const plan = await db.prepare('SELECT * FROM study_plans WHERE id = ?').get(planId);
    plan.items = await db.prepare('SELECT * FROM study_plan_items WHERE plan_id = ?').all(planId);
    res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create study plan' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const plan = await db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    plan.items = await db.prepare(`
      SELECT spi.*, l.title AS lesson_title, e.title AS exam_title
      FROM study_plan_items spi
      LEFT JOIN lessons l ON spi.lesson_id = l.id
      LEFT JOIN exams e ON spi.exam_id = e.id
      WHERE spi.plan_id = ?
    `).all(plan.id);
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch study plan' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const { title, description, subject_id, target_date, status } = req.body;
    await db.prepare('UPDATE study_plans SET title = ?, description = ?, subject_id = ?, target_date = ?, status = ? WHERE id = ?')
      .run(title || existing.title, description ?? existing.description, subject_id || existing.subject_id, target_date || existing.target_date, status || existing.status, req.params.id);

    const plan = await db.prepare('SELECT * FROM study_plans WHERE id = ?').get(req.params.id);
    plan.items = await db.prepare('SELECT * FROM study_plan_items WHERE plan_id = ?').all(plan.id);
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update study plan' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    await db.prepare('DELETE FROM study_plan_items WHERE plan_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM study_plans WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete study plan' });
  }
});

// Plan items
router.post('/:id/items', requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const { lesson_id, exam_id, day_of_week, time_slot, duration_minutes } = req.body;
    const result = await db.prepare('INSERT INTO study_plan_items (plan_id, lesson_id, exam_id, day_of_week, time_slot, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.id, lesson_id || null, exam_id || null, day_of_week || null, time_slot || null, duration_minutes || 30);

    const item = await db.prepare('SELECT * FROM study_plan_items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.patch('/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const { completed } = req.body;
    await db.prepare('UPDATE study_plan_items SET completed = ? WHERE id = ? AND plan_id = ?')
      .run(completed ? 1 : 0, req.params.itemId, req.params.id);

    const item = await db.prepare('SELECT * FROM study_plan_items WHERE id = ?').get(req.params.itemId);
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    await db.prepare('DELETE FROM study_plan_items WHERE id = ? AND plan_id = ?').run(req.params.itemId, req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Suggested plan
router.get('/suggest', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const gradeId = req.user.grade;

    const subscribedIds = (await db.prepare("SELECT subject_id FROM user_subjects WHERE user_id = ? AND status = 'active'")
      .all(userId)).map(r => r.subject_id);

    if (subscribedIds.length === 0) return res.json([]);

    const lessons = await db.prepare(`
      SELECT l.id, l.title, s.name as subject_name
      FROM lessons l JOIN subjects s ON s.id = l.subject_id
      WHERE l.grade_id = ? AND l.subject_id IN (${subscribedIds.map(() => '?').join(',')})
      AND l.status = 'published'
      ORDER BY l.order_index LIMIT 20
    `).all(gradeId || 8, ...subscribedIds);

    res.json(lessons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to suggest plan' });
  }
});

export default router;