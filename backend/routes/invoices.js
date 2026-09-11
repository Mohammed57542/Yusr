import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════
// P5: Advanced Invoice System
// ═══════════════════════════════════════════

async function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = (await db.prepare("SELECT COUNT(*) c FROM invoices WHERE invoice_number LIKE ?").get(`YUSR-${year}${month}-%`)).c + 1;
  return `YUSR-${year}${month}-${String(seq).padStart(4, '0')}`;
}

// Student: list my invoices
router.get('/', requireAuth, async (req, res) => {
  const invoices = await db.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(invoices);
});

// Student: get invoice detail
router.get('/:id', requireAuth, async (req, res) => {
  const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  invoice.items = invoice.items ? JSON.parse(invoice.items) : [];
  res.json(invoice);
});

// Admin: list all invoices with filters
router.get('/admin/all', requireAuth, requireAdmin, async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  let sql = 'SELECT i.*, u.name as user_name, u.email as user_email FROM invoices i JOIN users u ON u.id = i.user_id';
  const params = [];
  if (status) { sql += ' WHERE i.status = ?'; params.push(status); }
  sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  const invoices = await db.prepare(sql).all(...params);
  const total = (await db.prepare(`SELECT COUNT(*) c FROM invoices ${status ? 'WHERE status = ?' : ''}`).get(...(status ? [status] : []))).c;
  res.json({ invoices, total });
});

// Admin: create invoice
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { user_id, amount, currency, items, payment_id } = req.body;
  if (!user_id || !amount) return res.status(400).json({ error: 'user_id و amount مطلوبان' });

  const invoiceNumber = await generateInvoiceNumber();
  const result = await db.prepare(
    'INSERT INTO invoices (user_id, payment_id, invoice_number, amount, currency, items, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(user_id, payment_id || null, invoiceNumber, amount, currency || 'OMR', JSON.stringify(items || []), 'issued');

  // Create notification
  await db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .run(user_id, 'فاتورة جديدة', `تم إصدار فاتورة بقيمة ${amount} ${currency || 'OMR'}`, 'info');

  res.status(201).json({ id: result.lastInsertRowid, invoice_number: invoiceNumber });
});

// Admin: mark invoice as paid
router.patch('/:id/pay', requireAuth, requireAdmin, async (req, res) => {
  const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (invoice.status === 'paid') return res.json({ message: 'الفاتورة مدفوعة مسبقاً' });

  await db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ?").run(req.params.id);
  await db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)')
    .run(invoice.user_id, 'تم الدفع', `تم تأكيد دفع الفاتورة ${invoice.invoice_number}`, 'success');

  res.json({ message: 'تم تأكيد الدفع' });
});

export default router;