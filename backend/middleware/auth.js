import jwt from 'jsonwebtoken';
import db from '../db.js';

const isProd = process.env.NODE_ENV === 'production';

function resolveSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (isProd) throw new Error('JWT_SECRET غير مضبوط — لا يمكن تشغيل الخادم في بيئة الإنتاج بدونه');
    console.warn('[تحذير] JWT_SECRET غير مضبوط — أمان ضعيف في بيئة التطوير');
    return 'yusr-dev-only-not-for-production';
  }
  return secret;
}

const JWT_SECRET = resolveSecret();
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(user) {
  return jwt.sign({ id: user.id, role: user.role, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

const tokenBlocklist = new Set();

export function blockToken(token) {
  tokenBlocklist.add(token);
}

export function isTokenBlocked(token) {
  return tokenBlocklist.has(token);
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح بالدخول، يرجى تسجيل الدخول' });
  }
  const token = header.slice(7);
  if (isTokenBlocked(token)) {
    return res.status(401).json({ error: 'الجلسة已 أُلغيت، يرجى تسجيل الدخول مجدداً' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    if (user.is_active === 0) return res.status(403).json({ error: 'تم تعطيل هذا الحساب، يرجى التواصل مع الإدارة' });
    delete user.password;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' });
  }
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  req.user = null;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (user) {
      delete user.password;
      req.user = user;
    }
  } catch { /* تجاهل */ }
  next();
}

export function requireEmailVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح بالدخول' });
  if (req.user.role === 'admin') return next();
  if (req.user.email_verified === 1) return next();
  return res.status(403).json({ error: 'يجب التحقق من البريد الإلكتروني أولاً. تحقق من صندوق البريد الوارد.' });
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح بالدخول' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'هذه المسارة مخصصة لمديري المنصة فقط' });
  next();
}

export function requireTeacher(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح بالدخول' });
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذه المسارة مخصصة للمعلمين فقط' });
  }
  next();
}

export { JWT_SECRET };
