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

async function ensureUniqueCode() {
  let code = generateCode();
  let tries = 0;
  let exists = await db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code);
  while (exists && tries < 20) {
    code = generateCode();
    exists = await db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code);
    tries++;
  }
  return code;
}

async function ensureCode(user) {
  if (user.referral_code) return user.referral_code;
  const code = await ensureUniqueCode();
  await db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, user.id);
  return code;
}

async function stats(userId) {
  const user = await db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId);
  const code = user?.referral_code || '';
  const totalRow = await db.prepare('SELECT COUNT(*) c FROM referrals WHERE ambassador_id = ?').get(userId);
  const qualifiedRow = await db.prepare("SELECT COUNT(*) c FROM referrals WHERE ambassador_id = ? AND status = 'qualified'").get(userId);
  const rewardRow = await db.prepare('SELECT COALESCE(SUM(reward), 0) s FROM referrals WHERE ambassador_id = ?').get(userId);
  const total = totalRow?.c || 0;
  const qualified = qualifiedRow?.c || 0;
  const reward = rewardRow?.s || 0;
  return { code, total, qualified, pending: total - qualified, reward };
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const code = await ensureCode(req.user);
    const statsData = await stats(req.user.id);
    res.json({ ...statsData, isAmbassador: true });
  } catch (err) {
    console.error('Ambassador /me error:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات السفير' });
  }
});

router.get('/referrals', requireAuth, async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT r.*, u.name as student_name, u.grade as student_grade
      FROM referrals r JOIN users u ON u.id = r.referred_user_id
      WHERE r.ambassador_id = ? ORDER BY r.created_at DESC
    `).all(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error('Ambassador /referrals error:', err);
    res.status(500).json({ error: 'خطأ في جلب قائمة الإحالات' });
  }
});

router.post('/generate-code', requireAuth, async (req, res) => {
  try {
    const code = await ensureUniqueCode();
    await db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, req.user.id);
    res.json({ code });
  } catch (err) {
    console.error('Ambassador /generate-code error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء الكود' });
  }
});

router.get('/lookup', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'أدخل كود السفير' });
    const user = await db.prepare('SELECT id, name FROM users WHERE referral_code = ?').get(String(code).trim().toUpperCase());
    if (!user) return res.status(404).json({ error: 'كود السفير غير صحيح' });
    res.json({ valid: true, name: user.name });
  } catch (err) {
    console.error('Ambassador /lookup error:', err);
    res.status(500).json({ error: 'خطأ في البحث عن كود السفير' });
  }
});

export { REWARD_RATE };
export default router;
