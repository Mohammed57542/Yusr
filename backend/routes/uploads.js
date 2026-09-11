import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import db from '../db.js';
import { requireAuth, requireTeacher } from '../middleware/auth.js';
import { getStorage } from '../lib/storage.js';

const router = Router();

const MAX_SIZE = 100 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('نوع الملف غير مدعوم'));
};

const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter });

router.post('/', requireAuth, requireTeacher, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار ملف' });

  try {
    const ext = require('node:path').extname(req.file.originalname) || '';
    const key = `${req.user.id}/${crypto.randomBytes(16).toString('hex')}${ext}`;
    const store = getStorage();
    const result = await store.upload(key, req.file.buffer, req.file.mimetype);

    const purpose = req.body.purpose || 'attachment';
    const dbResult = await db.prepare(
      'INSERT INTO uploads (user_id, filename, original_name, mime_type, size, path, purpose) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      req.user.id,
      result.key,
      req.file.originalname,
      req.file.mimetype,
      result.size,
      result.key,
      purpose
    );

    const url = await store.getSignedUrl(result.key);

    res.status(201).json({
      id: dbResult.lastInsertRowid,
      filename: result.key,
      original_name: req.file.originalname,
      url,
      size: result.size,
      mime_type: req.file.mimetype,
      message: 'تم رفع الملف بنجاح'
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'خطأ في رفع الملف' });
  }
});

router.get('/', requireAuth, requireTeacher, async (req, res) => {
  const files = await db.prepare('SELECT * FROM uploads WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const store = getStorage();
  for (const file of files) {
    file.url = await store.getSignedUrl(file.path);
  }
  res.json(files);
});

router.get('/:id', requireAuth, async (req, res) => {
  const file = await db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'الملف غير موجود' });
  const store = getStorage();
  file.url = await store.getSignedUrl(file.path);
  res.json(file);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const file = await db.prepare('SELECT * FROM uploads WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'الملف غير موجود' });
  if (file.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح بحذف هذا الملف' });
  }
  const store = getStorage();
  await store.delete(file.path);
  await db.prepare('DELETE FROM uploads WHERE id = ?').run(req.params.id);
  res.json({ message: 'تم حذف الملف' });
});

// Link upload to a lesson (sets video_url or pdf_url on the lesson)
router.post('/:id/link-lesson', requireAuth, requireTeacher, async (req, res) => {
  const uploadId = Number(req.params.id);
  const { lesson_id, field } = req.body;
  if (!lesson_id || !field) return res.status(400).json({ error: 'lesson_id and field (video or pdf) are required' });
  if (!['video', 'pdf'].includes(field)) return res.status(400).json({ error: 'field must be "video" or "pdf"' });

  const file = await db.prepare('SELECT * FROM uploads WHERE id = ?').get(uploadId);
  if (!file) return res.status(404).json({ error: 'الملف غير موجود' });

  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(Number(lesson_id));
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });

  const store = getStorage();
  const url = await store.getSignedUrl(file.path);

  if (field === 'video') {
    await db.prepare('UPDATE lessons SET video_url = ? WHERE id = ?').run(url, Number(lesson_id));
  } else {
    await db.prepare('UPDATE lessons SET pdf_url = ? WHERE id = ?').run(url, Number(lesson_id));
  }

  res.json({ message: `تم ربط المفل بالدرس`, url, field });
});

export default router;