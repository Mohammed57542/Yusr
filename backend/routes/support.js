import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const VALID_CATEGORIES = ['general', 'payment', 'technical', 'account'];
const VALID_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

async function generateTicketNumber() {
  const row = await db.prepare('SELECT COUNT(*) AS count FROM tickets').get();
  const num = (row.count || 0) + 1;
  return `TKT-${String(num).padStart(4, '0')}`;
}

function isAdmin(user) {
  return user && user.role === 'admin';
}

// GET / - List user's tickets with messages count
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const totalRow = await db.prepare('SELECT COUNT(*) AS count FROM tickets WHERE user_id = ?').get(req.user.id);
    const total = totalRow.count || 0;

    const tickets = await db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) AS messages_count
      FROM tickets t
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// GET /admin/all - Admin only: list all tickets with filters
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, category } = req.query;

    let where = '1=1';
    const params = [];

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      where += ' AND t.status = ?';
      params.push(status);
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }
      where += ' AND t.category = ?';
      params.push(category);
    }

    const countRow = await db.prepare(`SELECT COUNT(*) AS count FROM tickets t WHERE ${where}`).get(...params);
    const total = countRow.count || 0;

    const tickets = await db.prepare(`
      SELECT t.*, (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) AS messages_count
      FROM tickets t
      WHERE ${where}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// GET /:id - Get single ticket with messages
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    if (!isAdmin(req.user) && ticket.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const messages = await db.prepare(`
      SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC
    `).all(req.params.id);

    res.json({ success: true, data: { ...ticket, messages } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

// POST / - Create new ticket
router.post('/', requireAuth, async (req, res) => {
  try {
    const { subject, category, message } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({ success: false, error: 'Subject, category, and message are required' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    const ticketNumber = await generateTicketNumber();

    const insertTicket = db.prepare(`
      INSERT INTO tickets (user_id, subject, category, status, created_at, updated_at)
      VALUES (?, ?, ?, 'open', datetime('now'), datetime('now'))
    `);

    const result = await insertTicket.run(req.user.id, subject, category);
    const ticketId = result.lastInsertRowid;

    await db.prepare(`
      INSERT INTO ticket_messages (ticket_id, user_id, message, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(ticketId, req.user.id, message);

    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

// POST /:id/messages - Add message to ticket
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    if (!isAdmin(req.user) && ticket.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await db.prepare(`
      INSERT INTO ticket_messages (ticket_id, user_id, message, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(req.params.id, req.user.id, message);

    await db.prepare("UPDATE tickets SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

    const messages = await db.prepare(`
      SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC
    `).all(req.params.id);

    res.status(201).json({ success: true, data: { ticket_id: Number(req.params.id), messages } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add message' });
  }
});

// PATCH /:id/status - Update ticket status (admin only)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    await db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);

    const updated = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

export default router;