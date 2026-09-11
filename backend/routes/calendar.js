import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── Get user's calendar events ───
router.get('/', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const events = [];

    const subscribedSubjects = (await db.prepare(
      'SELECT subject_id FROM user_subjects WHERE user_id = ? AND status = ?'
    ).all(req.user.id, 'active')).map(r => r.subject_id);

    if (subscribedSubjects.length > 0) {
      const placeholders = subscribedSubjects.map(() => '?').join(',');

      const exams = await db.prepare(`
        SELECT e.id, e.title, e.description, e.open_at as event_date, e.close_at as event_end,
               'exam' as event_type, s.name as subject_name
        FROM exams e
        JOIN subjects s ON s.id = e.subject_id
        WHERE e.subject_id IN (${placeholders})
          AND ((e.open_at >= ? AND e.open_at < ?) OR (e.close_at >= ? AND e.close_at < ?))
      `).all(...subscribedSubjects, startDate, endDate, startDate, endDate);

      for (const e of exams) {
        events.push({
          id: `exam-${e.id}`,
          title: e.title,
          description: e.description,
          event_date: e.event_date,
          event_time: e.event_date ? e.event_date.split(' ')[1] || null : null,
          event_type: 'exam',
          subject_name: e.subject_name,
          reference_id: e.id,
        });
      }

      const assignments = await db.prepare(`
        SELECT a.id, a.title, a.description, a.due_date as event_date,
               'assignment' as event_type, s.name as subject_name
        FROM assignments a
        JOIN subjects s ON s.id = a.subject_id
        WHERE a.subject_id IN (${placeholders})
          AND a.status = 'published'
          AND a.due_date >= ? AND a.due_date < ?
      `).all(...subscribedSubjects, startDate, endDate);

      for (const a of assignments) {
        events.push({
          id: `assignment-${a.id}`,
          title: `واجب: ${a.title}`,
          description: a.description,
          event_date: a.event_date,
          event_time: null,
          event_type: 'assignment',
          subject_name: a.subject_name,
          reference_id: a.id,
        });
      }
    }

    const customEvents = await db.prepare(`
      SELECT id, title, description, event_date, event_time, event_type
      FROM calendar_events
      WHERE user_id = ? AND event_date >= ? AND event_date < ?
    `).all(req.user.id, startDate, endDate);

    for (const c of customEvents) {
      events.push({
        id: `custom-${c.id}`,
        title: c.title,
        description: c.description,
        event_date: c.event_date,
        event_time: c.event_time,
        event_type: c.event_type,
        reference_id: c.id,
      });
    }

    events.sort((a, b) => {
      const dateA = `${a.event_date} ${a.event_time || '00:00'}`;
      const dateB = `${b.event_date} ${b.event_time || '00:00'}`;
      return dateA.localeCompare(dateB);
    });

    res.json({ events, month, year });
  } catch (err) {
    console.error('Calendar fetch error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب أحداث التقويم' });
  }
});

// ─── Create custom event ───
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, event_date, event_time, event_type } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ error: 'الرجاء إدخال العنوان وتاريخ الحدث' });
    }

    const result = await db.prepare(`
      INSERT INTO calendar_events (user_id, title, description, event_date, event_time, event_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, title, description || '', event_date, event_time || null, event_type || 'custom');

    res.status(201).json({
      message: 'تمت إضافة الحدث',
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة الحدث' });
  }
});

// ─── Delete custom event ───
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const event = await db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
    if (!event) {
      return res.status(404).json({ error: 'الحدث غير موجود' });
    }
    if (event.user_id !== req.user.id) {
      return res.status(403).json({ error: 'غير مصرح بحذف هذا الحدث' });
    }

    await db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    res.json({ message: 'تم حذف الحدث' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الحدث' });
  }
});

// ─── Get upcoming reminders (next 24 hours) ───
router.get('/reminders', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');
    const in24hStr = in24h.toISOString().slice(0, 19).replace('T', ' ');
    const in1hStr = in1h.toISOString().slice(0, 19).replace('T', ' ');

    const reminders = [];

    const subscribedSubjects = (await db.prepare(
      'SELECT subject_id FROM user_subjects WHERE user_id = ? AND status = ?'
    ).all(req.user.id, 'active')).map(r => r.subject_id);

    if (subscribedSubjects.length > 0) {
      const placeholders = subscribedSubjects.map(() => '?').join(',');

      const tomorrowExams = await db.prepare(`
        SELECT e.id, e.title, e.open_at, e.close_at, s.name as subject_name
        FROM exams e
        JOIN subjects s ON s.id = e.subject_id
        WHERE e.subject_id IN (${placeholders})
          AND e.open_at >= ? AND e.open_at <= ?
      `).all(...subscribedSubjects, nowStr, in24hStr);

      for (const e of tomorrowExams) {
        reminders.push({
          type: 'exam',
          title: e.title,
          message: `اختبار ${e.subject_name} غداً`,
          datetime: e.open_at,
          reference_id: e.id,
        });
      }

      const upcomingSessions = await db.prepare(`
        SELECT ls.id, ls.title, ls.session_date, ls.session_time, ls.teacher_name, s.name as subject_name
        FROM live_sessions ls
        JOIN subjects s ON s.id = ls.subject_id
        WHERE ls.subject_id IN (${placeholders})
          AND ls.status = 'upcoming'
          AND (ls.session_date || ' ' || ls.session_time) >= ?
          AND (ls.session_date || ' ' || ls.session_time) <= ?
      `).all(...subscribedSubjects, nowStr, in1hStr);

      for (const s of upcomingSessions) {
        reminders.push({
          type: 'live_session',
          title: s.title,
          message: `حصة مباشرة مع ${s.teacher_name || ''} خلال ساعة`,
          datetime: `${s.session_date} ${s.session_time}`,
          reference_id: s.id,
        });
      }

      const dueAssignments = await db.prepare(`
        SELECT a.id, a.title, a.due_date, s.name as subject_name
        FROM assignments a
        JOIN subjects s ON s.id = a.subject_id
        WHERE a.subject_id IN (${placeholders})
          AND a.status = 'published'
          AND a.due_date >= ? AND a.due_date <= ?
      `).all(...subscribedSubjects, nowStr, in24hStr);

      for (const a of dueAssignments) {
        reminders.push({
          type: 'assignment',
          title: a.title,
          message: `واجب ${a.subject_name} due قريباً`,
          datetime: a.due_date,
          reference_id: a.id,
        });
      }
    }

    const customReminders = await db.prepare(`
      SELECT id, title, event_date, event_time, event_type
      FROM calendar_events
      WHERE user_id = ? AND reminder = 1
        AND (event_date || ' ' || COALESCE(event_time, '00:00')) >= ?
        AND (event_date || ' ' || COALESCE(event_time, '00:00')) <= ?
    `).all(req.user.id, nowStr, in24hStr);

    for (const c of customReminders) {
      reminders.push({
        type: c.event_type,
        title: c.title,
        message: 'تذكير بحدث في التقويم',
        datetime: `${c.event_date} ${c.event_time || ''}`,
        reference_id: c.id,
      });
    }

    reminders.sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''));

    res.json({ reminders });
  } catch (err) {
    console.error('Reminders fetch error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التذكيرات' });
  }
});

export default router;