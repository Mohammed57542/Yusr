// ===== نظام تسجيل بسيط وآمن =====
// يسجل أخطاء الخادم وفشل الدخول وأفعال الإدارة في ملف logs/app.log
// لا يُسجل أبداً: كلمات المرور، بيانات البطاقات، أو الأسرار.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

fs.mkdirSync(LOG_DIR, { recursive: true });

function write(level, message, meta) {
  const time = new Date().toISOString();
  let line = `[${time}] ${level.toUpperCase()} ${message}`;
  if (meta !== undefined) {
    let str;
    try { str = JSON.stringify(meta); } catch { str = String(meta); }
    if (str && str.length < 2000) line += ` ${str}`;
  }
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
  if (level === 'error') console.error(line);
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

// سجل أفعال الإدارة في قاعدة البيانات (للمراجعة والتدقيق)
let db = null;
export function initAdminLog(database) { db = database; }

export function adminLog(action, adminId, adminName, details) {
  if (!db) return;
  try {
    db.prepare('INSERT INTO admin_logs (admin_id, admin_name, action, details) VALUES (?, ?, ?, ?)')
      .run(adminId ?? null, adminName ?? null, String(action).slice(0, 100), details ? JSON.stringify(details).slice(0, 2000) : null);
  } catch {}
}