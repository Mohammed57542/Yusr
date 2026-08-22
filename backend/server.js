import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import ambassadorRoutes from './routes/ambassador.js';
import { logger, initAdminLog } from './lib/logger.js';
import db from './db.js';

initAdminLog(db);

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// حماية من الطلبات المتكررة (قوة تخمين كلمات المرور ورسائل OTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً — حاول بعد 15 دقيقة' },
});
app.use('/api/auth', authLimiter);
app.use('/api/ai', rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة جداً — حاول بعد دقيقة' } }));

// خدمة واجهة الإنتاج (frontend/dist) إن وُجدت — لتشغيل المنصة من خادم واحد
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.get('/api/health', (_req, res) => res.json({ name: 'منصة يسر التعليمية - API', status: 'running' }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', examRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/ambassador', ambassadorRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));
app.use((err, _req, res, _next) => {
  logger.error('server_error', { message: err.message, stack: err.stack && String(err.stack).split('\n')[1] });
  res.status(500).json({ error: 'خطأ في الخادم، حاول مرة أخرى' });
});

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  app.listen(PORT, () => {
    console.log(`🚀 منصة يسر التعليمية تعمل على المنفذ ${PORT}`);
  });
}

export default app;
