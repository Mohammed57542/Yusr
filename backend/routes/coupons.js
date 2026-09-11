import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const coupons = await db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  res.json(coupons);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { code, discount_type, discount_value, min_amount, max_uses, expires_at, plan_ids } = req.body;
  if (!code || !discount_value) {
    return res.status(400).json({ error: 'الكود وقيمة الخصم مطلوبان' });
  }
  const safeCode = code.toUpperCase().trim();
  const exists = await db.prepare('SELECT id FROM coupons WHERE code = ?').get(safeCode);
  if (exists) return res.status(409).json({ error: 'هذا الكود موجود بالفعل' });

  const result = await db.prepare(
    'INSERT INTO coupons (code, discount_type, discount_value, min_amount, max_uses, expires_at, plan_ids) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(safeCode, discount_type || 'percentage', discount_value, min_amount || 0, max_uses || null, expires_at || null, plan_ids || null);
  res.status(201).json({ id: result.lastInsertRowid, message: 'تم إنشاء الكوبون بنجاح' });
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { discount_type, discount_value, min_amount, max_uses, expires_at, active, plan_ids } = req.body;
  const coupon = await db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  if (!coupon) return res.status(404).json({ error: 'الكوبون غير موجود' });

  await db.prepare(
    'UPDATE coupons SET discount_type = ?, discount_value = ?, min_amount = ?, max_uses = ?, expires_at = ?, active = ?, plan_ids = ? WHERE id = ?'
  ).run(
    discount_type ?? coupon.discount_type,
    discount_value ?? coupon.discount_value,
    min_amount ?? coupon.min_amount,
    max_uses ?? coupon.max_uses,
    expires_at ?? coupon.expires_at,
    active ?? coupon.active,
    plan_ids ?? coupon.plan_ids,
    id
  );
  res.json({ message: 'تم تحديث الكوبون' });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const coupon = await db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  if (!coupon) return res.status(404).json({ error: 'الكوبون غير موجود' });
  await db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
  res.json({ message: 'تم حذف الكوبون' });
});

router.post('/validate', requireAuth, async (req, res) => {
  const { code, plan_id } = req.body;
  if (!code) return res.status(400).json({ error: 'الكود مطلوب' });

  const coupon = await db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code.toUpperCase().trim());
  if (!coupon) return res.status(404).json({ error: 'الكوبون غير صالح أو منتهي' });

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ error: 'انتهت صلاحية هذا الكوبون' });
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return res.status(400).json({ error: 'تم استخدام هذا الكوبون بالفعل بالكامل' });
  }

  let discount = coupon.discount_value;
  if (coupon.discount_type === 'percentage') {
    discount = Math.min(discount, 100);
  }

  res.json({
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: discount,
    message: 'كوبون صالح'
  });
});

export default router;