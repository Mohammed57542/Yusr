import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const REWARD_RATE = 0.1;

function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `YUSR-${code}`;
}

function ensureUniqueCode() {
  let code = generateCode();
  let tries = 0;
  while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code) && tries < 20) {
    code = generateCode();
    tries++;
  }
  return code;
}

function ensureCode(user) {
  if (user.referral_code) return user.referral_code;
  const code = ensureUniqueCode();
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, user.id);
  return code;
}

function stats(userId) {
  const code = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId).referral_code;
  const total = db.prepare('SELECT COUNT(*) c FROM referrals WHERE ambassador_id = ?').get(userId).c;
  const qualified = db.prepare("SELECT COUNT(*) c FROM referrals WHERE ambassador_id = ? AND status = 'qualified'").get(userId).c;
  const reward = db.prepare('SELECT COALESCE(SUM(reward), 0) s FROM referrals WHERE ambassador_id = ?').get(userId).s;
  return { code, total, qualified, pending: total - qualified, reward };
}

router.get('/me', requireAuth, (req, res) => {
  const code = ensureCode(req.user);
  res.json({ ...stats(req.user.id), isAmbassador: true });
});

router.get('/referrals', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, u.name as student_name, u.grade as student_grade
    FROM referrals r JOIN users u ON u.id = r.referred_user_id
    WHERE r.ambassador_id = ? ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

router.post('/generate-code', requireAuth, (req, res) => {
  const code = ensureUniqueCode();
  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, req.user.id);
  res.json({ code });
});

router.get('/lookup', (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'أدخل كود السفير' });
  const user = db.prepare('SELECT id, name FROM users WHERE referral_code = ?').get(String(code).trim().toUpperCase());
  if (!user) return res.status(404).json({ error: 'كود السفير غير صحيح' });
  res.json({ valid: true, name: user.name });
});

export { REWARD_RATE };
export default router;
