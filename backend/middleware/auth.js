import jwt from 'jsonwebtoken';
import db from '../db.js';

const isProd = process.env.NODE_ENV === 'production';

function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isProd) throw new Error('JWT_SECRET غير مضبوط — لا يمكن تشغيل الخادم في بيئة الإنتاج بدونه');
  console.warn('[تحذير] JWT_SECRET غير مضبوط — أمان ضعيف في بيئة التطوير. اضبطه في ملف .env');
  return 'yusr-super-secret-key-change-in-production';
}

const JWT_SECRET = resolveSecret();

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح بالدخول، يرجى تسجيل الدخول' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    delete user.password;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' });
  }
}

// مصادقة اختيارية: تتيح معالجة الطلب بدون تسجيل دخول مع تعرف المستخدم إن كان مصادقًا
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  req.user = null;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (user) {
      delete user.password;
      req.user = user;
    }
  } catch { /* تجاهل */ }
  next();
}
