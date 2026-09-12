import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import examRoutes from './routes/exams.js';
import aiRoutes from './routes/ai.js';
import subscriptionRoutes from './routes/subscription.js';
import adminRoutes from './routes/admin.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import assignmentsRoutes from './routes/assignments.js';
import classroomsRoutes from './routes/classrooms.js';
import socialRoutes from './routes/social.js';
import supportRoutes from './routes/support.js';
import studyPlansRoutes from './routes/studyplans.js';
import mistakesRoutes from './routes/mistakes.js';
import calendarRoutes from './routes/calendar.js';
import invoicesRoutes from './routes/invoices.js';
import couponsRoutes from './routes/coupons.js';
import uploadsRoutes from './routes/uploads.js';
import analyticsRoutes from './routes/analytics.js';
import notificationsRoutes from './routes/notifications.js';
import recommendationsRoutes from './routes/recommendations.js';
import ambassadorRoutes from './routes/ambassador.js';
import { verifySmtpConnection } from './lib/email.js';
import { logger, initAdminLog } from './lib/logger.js';
import { JWT_SECRET } from './middleware/auth.js';
import db from './db.js';

initAdminLog(db);

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

// Trust proxy (NGINX/Cloudflare) — ضروري لـ rate limiting و IP correctness
if (isProd) app.set('trust proxy', 1);

// HTTPS enforcement في الإنتاج
if (isProd) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security Headers مع CSP مُفعّل
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "http://localhost:*"],
      frameSrc: ["'self'", "https://www.google.com", "https://www.youtube.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:5000', 'http://localhost:5054'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('غير مصرح بهموم من CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// حماية من الطلبات المتكررة — حد عام لكل مسارات /api
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً — حاول بعد 15 دقيقة' },
});
app.use('/api', generalApiLimiter);

// حدود أكثر صرامة على auth و ai
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً — حاول بعد 15 دقيقة' },
});
app.use('/api/auth', authLimiter);
app.use('/api/ai', rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة جداً — حاول بعد دقيقة' } }));

// خدمة واجهة الإنتاج (frontend/dist) إن وُجدت
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

// Health Check مع فحص قاعدة البيانات
app.get('/api/health', (_req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as ok').get();
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    res.json({
      name: 'منصة يسر التعليمية - API',
      status: 'running',
      uptime: Math.round(uptime),
      memory: { rss: Math.round(mem.rss / 1024 / 1024), heap: Math.round(mem.heapUsed / 1024 / 1024) },
      db: dbCheck ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ name: 'منصة يسر التعليمية - API', status: 'unhealthy', db: 'error' });
  }
});

// ═══════════════════════════════════════════
// Mount Routes
// ═══════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', examRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/classrooms', classroomsRoutes);
app.use('/api', socialRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/study-plans', studyPlansRoutes);
app.use('/api/mistakes', mistakesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/ambassador', ambassadorRoutes); // بانتظار واجهة أمامية

// Uploads static serving — في الإنتاج تتطلب توكن
const uploadsAuth = isProd
  ? (req, res, next) => {
      const token = req.query.token || req.headers.authorization?.slice(7);
      if (!token) return res.status(401).json({ error: 'غير مصرح' });
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'توكن غير صالح' });
      }
      next();
    }
  : (_req, _res, next) => next();
app.use('/uploads', uploadsAuth, express.static(path.join(__dirname, 'data', 'uploads')));

app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));
app.use((err, _req, res, _next) => {
  logger.error('server_error', { message: err.message, path: _req.path, method: _req.method });
  res.status(500).json({ error: 'خطأ في الخادم، حاول مرة أخرى' });
});

// ═══════════════════════════════════════════
// Subscription Expiry Cron — يشغّل كل ساعة
// ═══════════════════════════════════════════
function expireSubscriptions() {
  try {
    const result = db.prepare(
      "UPDATE user_subjects SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < datetime('now')"
    ).run();
    if (result.changes > 0) {
      logger.info('subscriptions_expired', { count: result.changes });
    }
  } catch (err) {
    logger.error('subscription_expiry_error', { message: err.message });
  }
}

// ═══════════════════════════════════════════
// Cleanup Old Codes — يشغّل كل 6 ساعات
// ═══════════════════════════════════════════
function cleanupOldCodes() {
  try {
    db.prepare("DELETE FROM email_verifications WHERE expires_at < datetime('now', '-1 day')").run();
    db.prepare("DELETE FROM password_resets WHERE expires_at < datetime('now', '-1 day')").run();
  } catch (err) {
    logger.error('cleanup_error', { message: err.message });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  // شغّل الـ cron jobs
  setInterval(expireSubscriptions, 60 * 60 * 1000);
  setInterval(cleanupOldCodes, 6 * 60 * 60 * 1000);
  expireSubscriptions();

  app.listen(PORT, () => {
    console.log(`🚀 منصة يسر التعليمية تعمل على المنفذ ${PORT} [${isProd ? 'production' : 'development'}]`);
    // فحص اتصال SMTP
    verifySmtpConnection();
  });
}

export default app;
