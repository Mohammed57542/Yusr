import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { signToken, signRefreshToken, blockToken, requireAuth, JWT_SECRET } from '../middleware/auth.js';
import { sendEmail } from '../lib/email.js';
import { logger } from '../lib/logger.js';
import rateLimit from '../middleware/rateLimit.js';

const router = Router();

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

const authLimiter = rateLimit(60000, 10);
const codeLimiter = rateLimit(300000, 5);

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code) {
  return bcrypt.hashSync(String(code), 10);
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim().slice(0, 500);
}

async function storeEmailCode(email, code) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const hashedCode = hashCode(code);
  await db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
  await db.prepare('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)').run(email, hashedCode, expiresAt);
}

async function verifyEmailCode(email, code) {
  const rows = await db.prepare('SELECT * FROM email_verifications WHERE email = ? AND used = 0 AND expires_at > datetime(\'now\') ORDER BY id DESC').all(email);
  for (const row of rows) {
    if (bcrypt.compareSync(String(code), row.code)) {
      await db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(row.id);
      return true;
    }
  }
  return false;
}

router.post('/send-email-code', codeLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح' });
  }
  const safeEmail = email.toLowerCase().trim();
  const code = generateCode();
  await storeEmailCode(safeEmail, code);
  sendEmail(safeEmail, 'verification', code).catch(() => {});
  console.log(`[EMAIL-VERIFICATION] ${safeEmail} → code sent`);
  res.json({ message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' });
});

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
  }
  const ok = await verifyEmailCode(email.toLowerCase().trim(), code);
  if (!ok) {
    return res.status(400).json({ error: 'رمز التحقق منتهي أو غير صحيح' });
  }
  res.json({ verified: true });
});

router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password, grade, code, recaptchaToken } = req.body;
  if (!name || !email || !password || !code) {
    return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول المطلوبةรวมاً مع رمز التحقق' });
  }

  const captchaOk = await verifyRecaptcha(recaptchaToken);
  if (!captchaOk) {
    return res.status(400).json({ error: 'التحقق من الأمان فشل، حاول مرة أخرى' });
  }

  const safeName = sanitize(name);
  const safeEmail = sanitize(email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
    return res.status(400).json({ error: 'البريد الإلكتروني غير صحيح' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
  }

  const codeOk = await verifyEmailCode(safeEmail, code);
  if (!codeOk) {
    return res.status(400).json({ error: 'رمز التحقق منتهي أو غير صحيح' });
  }

  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(safeEmail);
  if (exists) return res.status(409).json({ error: 'البريد الإلكتروني مسجل بالفعل' });

  const hash = bcrypt.hashSync(password, 12);
  const result = await db.prepare('INSERT INTO users (name, email, password, role, grade, email_verified) VALUES (?, ?, ?, ?, ?, 1)')
    .run(safeName, safeEmail, hash, 'student', grade || null);
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  delete user.password;
  res.status(201).json({ token: signToken(user), refreshToken: signRefreshToken(user), user });
});

router.post('/login', authLimiter, async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(identifier.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    logger.warn('auth_login_failed', { identifier: String(identifier).slice(0, 60) });
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }
  if (user.is_active === 0) {
    return res.status(403).json({ error: 'حسابك معطّل، تواصل مع الإدارة' });
  }
  await db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  delete user.password;
  res.json({ token: signToken(user), refreshToken: signRefreshToken(user), user });
});

router.post('/send-reset-code', codeLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح' });
  }
  const safeEmail = email.toLowerCase().trim();
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(safeEmail);
  if (!user) {
    return res.json({ message: 'إذا كان البريد مسجلاً، ستتلقى رسالة إعادة التعيين' });
  }
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const hashedCode = hashCode(code);
  await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
  await db.prepare('INSERT INTO password_resets (user_id, code, expires_at) VALUES (?, ?, ?)').run(user.id, hashedCode, expiresAt);
  sendEmail(safeEmail, 'passwordReset', code).catch(() => {});
  console.log(`[PASSWORD-RESET] ${safeEmail} → code sent`);
  res.json({ message: 'تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  const safeEmail = email.toLowerCase().trim();
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(safeEmail);
  if (!user) return res.status(404).json({ error: 'لا يوجد حساب مرتبط بهذا البريد' });

  const rows = await db.prepare('SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > datetime(\'now\') ORDER BY id DESC').all(user.id);
  let matched = false;
  for (const row of rows) {
    if (bcrypt.compareSync(String(code), row.code)) {
      await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
      matched = true;
      break;
    }
  }
  if (!matched) return res.status(400).json({ error: 'رمز التحقق منتهي أو غير صحيح' });

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' });
  }

  await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), user.id);
  res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

router.post('/apply-teacher', async (req, res) => {
  const { name, email, subject, years_experience, message } = req.body;
  if (!name || !email || !subject || !years_experience) {
    return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول المطلوبة' });
  }
  await db.prepare('INSERT INTO teacher_applications (name, email, subject, years_experience, message) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, subject, Number(years_experience), message || '');
  res.status(201).json({ message: 'تم استلام طلبك، سيتواصل معك فريقنا قريباً' });
});

// ═══════════════════════════════════════════
// Token refresh — تجديد الجلسة
// ═══════════════════════════════════════════
router.post('/refresh', authLimiter, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken مطلوب' });

  if (blockToken(refreshToken)) {
    return res.status(401).json({ error: 'تم إلغاء هذا التوكن' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'توكن غير صالح' });
    }
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    if (user.is_active === 0) return res.status(403).json({ error: 'حسابك معطّل' });

    // Issue new pair (rotation)
    const newToken = signToken(user);
    const newRefresh = signRefreshToken(user);
    res.json({ token: newToken, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: 'توكن منتهي أو غير صالح' });
  }
});

// ═══════════════════════════════════════════
// Logout — إلغاء الجلسة
// ═══════════════════════════════════════════
router.post('/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    blockToken(header.slice(7));
  }
  const { refreshToken } = req.body;
  if (refreshToken) blockToken(refreshToken);
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول المطلوبة' });
  }
  await db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
    .run(name, email, subject || 'عام', message);
  res.status(201).json({ message: 'تم إرسال رسالتك بنجاح، سنرد عليك قريباً' });
});

export default router;
