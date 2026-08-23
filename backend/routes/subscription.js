import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getPaymentProvider } from '../services/payments/provider.js';

const router = Router();

// أسعار افتراضية مبدئية تُستخدم فقط إذا لم توجد بيانات أسعار في قاعدة البيانات
// (تُدار الأسعار الفعلية من لوحة الإدارة — جدول plans)
const DEFAULT_PLANS = [
  { section: 'junior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 15, original_price: null },
  { section: 'junior', key: 'triple', name: '3 مواد', subjects: 3, price: 38, original_price: 45 },
  { section: 'junior', key: 'all', name: 'جميع المواد', subjects: null, price: 79, original_price: 90 },
  { section: 'senior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 20, original_price: null },
  { section: 'senior', key: 'triple', name: '3 مواد', subjects: 3, price: 52, original_price: 60 },
  { section: 'senior', key: 'all', name: 'جميع المواد', subjects: null, price: 149, original_price: 160 },
];

function activePlanRows(section) {
  const rows = db.prepare(`
    SELECT * FROM plans
    WHERE section = ? AND active = 1
      AND (starts_at IS NULL OR starts_at <= date('now'))
      AND (ends_at IS NULL OR ends_at >= date('now'))
    ORDER BY id
  `).all(section);
  if (rows.length) return rows;
  // fallback: بيانات مبدئية إن لم تُهيّأ الأسعار بعد
  return DEFAULT_PLANS.filter((p) => p.section === section);
}

function planOf(section, key) {
  const rows = activePlanRows(section);
  return rows.find((p) => p.key === key) || null;
}

function sectionOf(grade) {
  return grade && Number(grade) >= 11 ? 'senior' : 'junior';
}

// عدد المواد المتاحة في القسم
function sectionSubjectCount(section) {
  const grade = section === 'senior' ? 11 : 9;
  return db.prepare('SELECT COUNT(*) c FROM subjects WHERE grade_from <= ? AND grade_to >= ?')
    .get(grade, grade).c;
}

export function perSubjectPrice(grade) {
  const plan = planOf(sectionOf(grade), 'single');
  return plan ? Number(plan.price) : (sectionOf(grade) === 'senior' ? 20 : 15);
}

router.get('/plans', (req, res) => {
  const grade = Number(req.query.grade);
  const section = sectionOf(grade);
  const count = sectionSubjectCount(section);
  const offers = {};
  for (const p of activePlanRows(section)) {
    const n = p.subjects ?? count;
    const raw = n * perSubjectPrice(grade);
    offers[p.key] = {
      id: p.key,
      name: p.name,
      subjects: n,
      price: Number(p.price),
      original: p.original_price ? Number(p.original_price) : (Number(p.price) < raw ? raw : null),
      saving: p.original_price ? Number(p.original_price) - Number(p.price) : (Number(p.price) < raw ? raw - Number(p.price) : null),
    };
  }
  res.json({ section, label: section === 'senior' ? '١١-١٢' : '٨-١٠', perSubject: perSubjectPrice(grade), offers });
});

router.get('/my-subjects', requireAuth, (req, res) => {
  const subs = db.prepare(`
    SELECT us.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color
    FROM user_subjects us JOIN subjects s ON s.id = us.subject_id
    WHERE us.user_id = ? ORDER BY us.created_at DESC
  `).all(req.user.id);
  res.json(subs);
});

router.post('/subscribe', requireAuth, async (req, res) => {
  const { plan, subject_ids } = req.body;
  if (!Array.isArray(subject_ids) || subject_ids.length === 0) {
    return res.status(400).json({ error: 'اختر مادة واحدة على الأقل' });
  }
  const ids = [...new Set(subject_ids.map(Number))];
  for (const sid of ids) {
    const subject = db.prepare('SELECT id FROM subjects WHERE id = ?').get(sid);
    if (!subject) return res.status(400).json({ error: 'مادة غير موجودة' });
  }

  const section = sectionOf(req.user.grade);
  let price, planName;
  const dbPlan = plan ? planOf(section, plan) : null;
  if (plan && dbPlan) {
    const n = dbPlan.subjects ?? sectionSubjectCount(section);
    if (ids.length !== n) {
      return res.status(400).json({ error: `عرض ${dbPlan.name} يشمل ${n === 1 ? 'مادة واحدة' : `${n} مواد`} بالضبط (عدد مواد ${section === 'senior' ? '١١-١٢' : '٨-١٠'})` });
    }
    price = Number(dbPlan.price);
    planName = dbPlan.name;
  } else {
    price = ids.length * perSubjectPrice(req.user.grade);
    planName = ids.length === 1 ? 'مادة واحدة' : `${ids.length} مواد`;
  }

  const exp = new Date();
  exp.setMonth(exp.getMonth() + 12);
  const expStr = exp.toISOString().slice(0, 10);

  for (const sid of ids) {
    const existing = db.prepare('SELECT id FROM user_subjects WHERE user_id = ? AND subject_id = ?').get(req.user.id, sid);
    if (existing) {
      db.prepare('UPDATE user_subjects SET plan = ?, expires_at = ? WHERE id = ?').run(planName, expStr, existing.id);
    } else {
      db.prepare('INSERT INTO user_subjects (user_id, subject_id, plan, expires_at) VALUES (?, ?, ?, ?)')
        .run(req.user.id, sid, planName, expStr);
    }
  }

  db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .run(req.user.id, '✅ تم تفعيل اشتراكك', `تم تفعيل اشتراكك في ${planName} بنجاح (${price} ر.ع). أهلاً بك في يُسر!`, 'subscription');

  const provider = getPaymentProvider();
  const payment = await provider.createPayment({
    user: req.user,
    amount: price,
    currency: 'OMR',
    plan_key: plan ?? null,
    subject_ids: ids,
  });
  db.prepare(`
    INSERT INTO payments (user_id, amount, currency, provider, provider_ref, status, plan_key, subject_ids, paid_at)
    VALUES (?, ?, 'OMR', ?, ?, ?, ?, ?, datetime('now'))
  `).run(req.user.id, price, payment.provider, payment.provider_ref, payment.status, plan ?? null, JSON.stringify(ids));

  res.json({ message: `تم تفعيل ${planName} بنجاح!`, subjects: ids.length, price });
});

router.get('/me', requireAuth, (req, res) => {
  const subs = db.prepare('SELECT subject_id FROM user_subjects WHERE user_id = ?').all(req.user.id).map((r) => r.subject_id);
  res.json({ ...req.user, subscribed_subjects: subs });
});

router.patch('/me', requireAuth, (req, res) => {
  const { name, grade } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const newName = name || user.name;
  const newGrade = grade !== undefined ? grade : user.grade;
  db.prepare('UPDATE users SET name = ?, grade = ? WHERE id = ?').run(newName, newGrade, req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  delete updated.password;
  res.json(updated);
});

export default router;
