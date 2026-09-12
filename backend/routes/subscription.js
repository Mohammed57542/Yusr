import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getPaymentProvider } from '../services/payments/provider.js';
import { verifyWebhookSignature, getStatusFromWebhook } from '../services/payments/myfatoorah.js';

const router = Router();

const DEFAULT_PLANS = [
  { section: 'junior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 15, original_price: null },
  { section: 'junior', key: 'triple', name: '3 مواد', subjects: 3, price: 38, original_price: 45 },
  { section: 'junior', key: 'all', name: 'جميع المواد', subjects: null, price: 79, original_price: 90 },
  { section: 'senior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 20, original_price: null },
  { section: 'senior', key: 'triple', name: '3 مواد', subjects: 3, price: 52, original_price: 60 },
  { section: 'senior', key: 'all', name: 'جميع المواد', subjects: null, price: 149, original_price: 160 },
];

async function activePlanRows(section) {
  const rows = await db.prepare(`
    SELECT * FROM plans
    WHERE section = ? AND active = 1
      AND (starts_at IS NULL OR starts_at <= date('now'))
      AND (ends_at IS NULL OR ends_at >= date('now'))
    ORDER BY id
  `).all(section);
  if (rows.length) return rows;
  return DEFAULT_PLANS.filter((p) => p.section === section);
}

async function planOf(section, key) {
  const rows = await activePlanRows(section);
  return rows.find((p) => p.key === key) || null;
}

function sectionOf(grade) {
  return grade && Number(grade) >= 11 ? 'senior' : 'junior';
}

async function sectionSubjectCount(section) {
  const grade = section === 'senior' ? 11 : 9;
  return (await db.prepare('SELECT COUNT(*) c FROM subjects WHERE grade_from <= ? AND grade_to >= ?')
    .get(grade, grade)).c;
}

export async function perSubjectPrice(grade) {
  const plan = await planOf(sectionOf(grade), 'single');
  return plan ? Number(plan.price) : (sectionOf(grade) === 'senior' ? 20 : 15);
}

router.get('/plans', async (req, res) => {
  const grade = Number(req.query.grade);
  const section = sectionOf(grade);
  const count = await sectionSubjectCount(section);
  const offers = {};
  for (const p of await activePlanRows(section)) {
    const n = p.subjects ?? count;
    const raw = n * await perSubjectPrice(grade);
    offers[p.key] = {
      id: p.key,
      name: p.name,
      subjects: n,
      price: Number(p.price),
      original: p.original_price ? Number(p.original_price) : (Number(p.price) < raw ? raw : null),
      saving: p.original_price ? Number(p.original_price) - Number(p.price) : (Number(p.price) < raw ? raw - Number(p.price) : null),
    };
  }
  res.json({ section, label: section === 'senior' ? '١١-١٢' : '٨-١٠', perSubject: await perSubjectPrice(grade), offers });
});

router.get('/my-subjects', requireAuth, async (req, res) => {
  const subs = await db.prepare(`
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
    const subject = await db.prepare('SELECT id FROM subjects WHERE id = ?').get(sid);
    if (!subject) return res.status(400).json({ error: 'مادة غير موجودة' });
  }

  const section = sectionOf(req.user.grade);
  let price, planName;
  const dbPlan = plan ? await planOf(section, plan) : null;
  if (plan && dbPlan) {
    const n = dbPlan.subjects ?? await sectionSubjectCount(section);
    if (ids.length !== n) {
      return res.status(400).json({ error: `عرض ${dbPlan.name} يشمل ${n === 1 ? 'مادة واحدة' : `${n} مواد`} بالضبط` });
    }
    price = Number(dbPlan.price);
    planName = dbPlan.name;
  } else {
    price = ids.length * await perSubjectPrice(req.user.grade);
    planName = ids.length === 1 ? 'مادة واحدة' : `${ids.length} مواد`;
  }

  const provider = getPaymentProvider();
  const payment = await provider.createPayment({
    user: req.user,
    amount: price,
    currency: 'OMR',
    plan_key: plan ?? null,
    subject_ids: ids,
  });

  await db.prepare(`
    INSERT INTO payments (user_id, amount, currency, provider, provider_ref, status, plan_key, subject_ids)
    VALUES (?, ?, 'OMR', ?, ?, ?, ?, ?)
  `).run(req.user.id, price, payment.provider, payment.provider_ref, payment.status, plan ?? null, JSON.stringify(ids));

  if (payment.status === 'paid') {
    const exp = new Date();
    exp.setMonth(exp.getMonth() + 12);
    const expStr = exp.toISOString().slice(0, 10);
    for (const sid of ids) {
      const existing = await db.prepare('SELECT id FROM user_subjects WHERE user_id = ? AND subject_id = ?').get(req.user.id, sid);
      if (existing) {
        await db.prepare('UPDATE user_subjects SET plan = ?, expires_at = ? WHERE id = ?').run(planName, expStr, existing.id);
      } else {
        await db.prepare('INSERT INTO user_subjects (user_id, subject_id, plan, expires_at) VALUES (?, ?, ?, ?)')
          .run(req.user.id, sid, planName, expStr);
      }
    }
    await db.prepare("UPDATE payments SET paid_at = datetime('now') WHERE provider_ref = ?").run(payment.provider_ref);
    await db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
      .run(req.user.id, '✅ تم تفعيل اشتراكك', `تم تفعيل اشتراكك في ${planName} بنجاح (${price} ر.ع). أهلاً بك في يُسر!`, 'subscription');
  }

  res.json({
    message: payment.status === 'paid' ? `تم تفعيل ${planName} بنجاح!` : 'تم إنشاء طلب الدفع — أكمل الدفع لتفعيل الاشتراك',
    payment_status: payment.status,
    payment_url: payment.payment_url || null,
    provider_ref: payment.provider_ref,
    provider_invoice_id: payment.provider_invoice_id || null,
    subjects: ids.length,
    price,
  });
});

// ===== Payment callback (MyFatoorah redirects here after payment) =====
router.get('/payment/callback', async (req, res) => {
  const { paymentId, invoiceid, reference } = req.query;
  const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';

  try {
    const invoiceId = invoiceid || paymentId;
    if (!invoiceId) {
      return res.redirect(`${baseUrl}/payment/error?reason=no_invoice`);
    }

    const provider = getPaymentProvider();
    if (provider.getPaymentStatus) {
      const result = await provider.getPaymentStatus(invoiceId);
      if (result.status === 'paid') {
        const payRecord = await db.prepare('SELECT * FROM payments WHERE provider_ref = ? OR provider_invoice_id = ?')
          .get(reference || '', invoiceId);
        if (payRecord && payRecord.status !== 'paid') {
          await _activatePaidSubscription(payRecord);
        }
        return res.redirect(`${baseUrl}/payment/success?ref=${payRecord?.provider_ref || reference}`);
      }
    }
    return res.redirect(`${baseUrl}/payment/pending?ref=${reference || invoiceId}`);
  } catch (err) {
    return res.redirect(`${baseUrl}/payment/error?reason=verification_failed`);
  }
});

// ===== Payment status verification (frontend polls this) =====
router.get('/payment/status', requireAuth, async (req, res) => {
  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: 'ref مطلوب' });

  const payRecord = await db.prepare('SELECT * FROM payments WHERE provider_ref = ?').get(ref);
  if (!payRecord) return res.status(404).json({ error: 'الدفع غير موجود' });

  if (payRecord.status === 'paid') {
    return res.json({ payment_status: 'paid', amount: payRecord.amount });
  }

  // Check with provider
  if (payRecord.provider_invoice_id) {
    try {
      const provider = getPaymentProvider();
      const result = await provider.getPaymentStatus(payRecord.provider_invoice_id);
      if (result.status === 'paid' && payRecord.status !== 'paid') {
        await _activatePaidSubscription(payRecord);
        return res.json({ payment_status: 'paid', amount: payRecord.amount });
      }
    } catch {}
  }

  res.json({ payment_status: payRecord.status });
});

// ===== MyFatoorah Webhook =====
router.post('/webhook/myfatoorah', async (req, res) => {
  try {
    const signature = req.headers['myfatoorah-signature'] || '';
    const webhookSecret = process.env.MYFATOORAH_WEBHOOK_SECRET;

    // في الإنتاج: رفض الطلب إذا لم يتم ضبط السر
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[WEBHOOK] ⛔ MYFATOORAH_WEBHOOK_SECRET غير مضبوط — رفض الطلب في الإنتاج');
        return res.status(503).json({ error: 'Webhook not configured' });
      }
      console.warn('[WEBHOOK] ⚠️ MYFATOORAH_WEBHOOK_SECRET غير مضبوط — تجاوز التحقق (وضع التطوير فقط)');
    }

    if (webhookSecret) {
      if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }
      const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const paymentInfo = getStatusFromWebhook(req.body);
    if (paymentInfo.status === 'paid' && paymentInfo.reference) {
      const payRecord = await db.prepare('SELECT * FROM payments WHERE provider_ref = ?').get(paymentInfo.reference);
      if (!payRecord) {
        return res.status(200).json({ received: true, skipped: 'payment_not_found' });
      }
      if (payRecord.status === 'paid') {
        return res.status(200).json({ received: true, skipped: 'already_processed' });
      }

      const webhookAmount = Number(paymentInfo.amount);
      const dbAmount = Number(payRecord.amount);
      if (webhookAmount && dbAmount && webhookAmount !== dbAmount) {
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }

      await _activatePaidSubscription(payRecord);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function _activatePaidSubscription(payRecord) {
  const exp = new Date();
  exp.setMonth(exp.getMonth() + 12);
  const expStr = exp.toISOString().slice(0, 10);
  const ids = JSON.parse(payRecord.subject_ids || '[]');
  const planName = payRecord.plan_key || (ids.length === 1 ? 'مادة واحدة' : `${ids.length} مواد`);

  for (const sid of ids) {
    const existing = await db.prepare('SELECT id FROM user_subjects WHERE user_id = ? AND subject_id = ?').get(payRecord.user_id, sid);
    if (existing) {
      await db.prepare('UPDATE user_subjects SET plan = ?, expires_at = ?, status = ? WHERE id = ?').run(planName, expStr, 'active', existing.id);
    } else {
      await db.prepare('INSERT INTO user_subjects (user_id, subject_id, plan, expires_at, status) VALUES (?, ?, ?, ?, ?)')
        .run(payRecord.user_id, sid, planName, expStr, 'active');
    }
  }
  await db.prepare("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(payRecord.id);
  await db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .run(payRecord.user_id, '✅ تم تفعيل اشتراكك', `تم تفعيل اشتراكك بنجاح (${payRecord.amount} ر.ع). أهلاً بك في يُسر!`, 'subscription');
}

router.get('/me', requireAuth, async (req, res) => {
  const subs = (await db.prepare('SELECT subject_id FROM user_subjects WHERE user_id = ?').all(req.user.id)).map((r) => r.subject_id);
  res.json({ ...req.user, subscribed_subjects: subs });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, grade } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const newName = name || user.name;
  const newGrade = grade !== undefined ? grade : user.grade;
  await db.prepare('UPDATE users SET name = ?, grade = ? WHERE id = ?').run(newName, newGrade, req.user.id);
  const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  delete updated.password;
  res.json(updated);
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  const user = await db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

router.delete('/me', requireAuth, async (req, res) => {
  const userId = req.user.id;
  await db.exec('BEGIN');
  try {
    await db.prepare('DELETE FROM lesson_progress WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM favorites WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM points_log WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM exam_results WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM user_subjects WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM payments WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM user_badges WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM session_attendance WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM discussions WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    await db.exec('COMMIT');
    res.json({ message: 'تم حذف الحساب بنجاح' });
  } catch (err) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: 'تعذر حذف الحساب' });
  }
});

export default router;