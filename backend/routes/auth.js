import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const router = Router();

const otpStore = new Map();

function generateOtp() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim().slice(0, 500);
}

router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'يرجى إدخال رقم الهاتف' });
  const code = generateOtp();
  otpStore.set(phone, { code, expires: Date.now() + 10 * 60 * 1000 });
  // في بيئة حقيقية: إرسال عبر مزود رسائل SMS
  console.log(`[OTP] هاتف ${phone} رمز التحقق: ${code}`);
  const isProd = process.env.NODE_ENV === 'production';
  res.json({ message: 'تم إرسال رمز التحقق', ...(isProd ? {} : { dev_code: code }) });
});

router.post('/verify-otp', (req, res) => {
  const { phone, code } = req.body;
  const entry = otpStore.get(phone);
  if (!entry || entry.expires < Date.now()) {
    return res.status(400).json({ error: 'الرمز منتهي أو غير صحيح، أعد المحاولة' });
  }
  if (entry.code !== code) return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
  otpStore.delete(phone);
  res.json({ verified: true });
});

router.post('/register', (req, res) => {
  const { name, phone, email, password, grade, otp } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول المطلوبة' });
  }
  const safeName = sanitize(name);
  const safeEmail = sanitize(email).toLowerCase();
  if (!/^\d{8}$/.test(String(phone))) {
    return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون 8 أرقام' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  const entry = otpStore.get(phone);
  if (!entry || entry.expires < Date.now()) {
    return res.status(400).json({ error: 'رمز التحقق منتهي أو غير صحيح، أعد إرساله' });
  }
  if (!otp || entry.code !== otp) {
    return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
  }
  otpStore.delete(phone);
  const exists = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(safeEmail, phone);
  if (exists) return res.status(409).json({ error: 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, phone, password, role, grade) VALUES (?, ?, ?, ?, ?, ?)')
    .run(safeName, safeEmail, phone, hash, 'student', grade || null);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  delete user.password;
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'الرجاء إدخال رقم الهاتف أو البريد وكلمة المرور' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier.toLowerCase(), identifier);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    logger.warn('auth_login_failed', { identifier: String(identifier).slice(0, 60) });
    return res.status(401).json({ error: 'البريد/الهاتف أو كلمة المرور غير صحيحة' });
  }
  delete user.password;
  res.json({ token: signToken(user), user });
});

router.post('/forgot-password', (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const entry = otpStore.get(phone);
  if (!entry || entry.expires < Date.now() || entry.code !== otp) {
    return res.status(400).json({ error: 'رمز التحقق منتهي أو غير صحيح' });
  }

  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (!user) return res.status(404).json({ error: 'لا يوجد حساب مرتبط بهذا الرقم' });
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  otpStore.delete(phone);
  res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

router.post('/apply-teacher', (req, res) => {
  const { name, phone, email, subject, years_experience, message } = req.body;
  if (!name || !phone || !email || !subject || !years_experience) {
    return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول المطلوبة' });
  }
  db.prepare('INSERT INTO teacher_applications (name, email, phone, subject, years_experience, message) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email, phone, subject, Number(years_experience), message || '');
  res.status(201).json({ message: 'تم استلام طلبك، سيتواصل معك فريقنا قريباً' });
});

router.post('/contact', (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'الرجاء إدخال جميع الحقول المطلوبة' });
  }
  db.prepare('INSERT INTO contact_messages (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)')
    .run(name, phone || null, email, subject || 'عام', message);
  res.status(201).json({ message: 'تم إرسال رسالتك بنجاح، سنرد عليك قريباً' });
});

export default router;
