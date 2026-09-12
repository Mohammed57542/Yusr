import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input, Select, Breadcrumbs, Loading } from '../components/common';

const STATUS_MAP = {
  open: { label: 'مفتوحة', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-700' },
  waiting: { label: 'بانتظار الرد', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'تم الحل', color: 'bg-slate-100 text-slate-600' },
  closed: { label: 'مغلقة', color: 'bg-red-100 text-red-700' },
};

const CATEGORIES = [
  { value: 'general', label: 'استفسار عام' },
  { value: 'payment', label: 'مشكلة في الدفع' },
  { value: 'technical', label: 'مشكلة تقنية' },
  { value: 'account', label: 'الحساب' },
];

function formatDate(iso) {
  if (!iso) return '';
  return String(iso).replace('T', ' ').slice(0, 16);
}

export default function Support() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', category: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replySending, setReplySending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get('/support/')
      .then((r) => setTickets(r.tickets || r || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const createTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/support/', form);
      setTickets((prev) => [res.ticket || res, ...prev]);
      setForm({ subject: '', category: '', message: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setDetailLoading(true);
    setTicketDetail(null);
    try {
      const res = await api.get(`/support/${ticket.id}`);
      setTicketDetail(res.ticket || res);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setReplySending(true);
    try {
      await api.post(`/support/${selectedTicket.id}/messages`, { message: reply });
      const res = await api.get(`/support/${selectedTicket.id}`);
      setTicketDetail(res.ticket || res);
      setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? { ...t, status: 'waiting' } : t));
      setReply('');
    } catch (err) {
      setError(err.message);
    } finally {
      setReplySending(false);
    }
  };

  const goBack = () => {
    setSelectedTicket(null);
    setTicketDetail(null);
    setReply('');
  };

  if (!user) return null;
  if (loading) return <Loading />;

  if (selectedTicket) {
    const detail = ticketDetail || selectedTicket;
    const messages = detail.messages || [];
    return (
      <div className="max-w-3xl mx-auto px-4 py-14" dir="rtl">
        <Breadcrumbs items={[{ label: 'الدعم الفني', href: '/support' }, { label: detail.subject || 'تفاصيل التذكرة' }]} />

        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">→</button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900">{detail.subject}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_MAP[detail.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                {STATUS_MAP[detail.status]?.label || detail.status}
              </span>
              <span className="text-xs text-slate-400">#{detail.id}</span>
            </div>
          </div>
        </div>

        {detailLoading ? (
          <Loading />
        ) : (
          <div className="space-y-4 mb-6">
            {messages.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm text-slate-500">لا توجد رسائل بعد</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.sender === 'user' || msg.sender_type === 'user';
                return (
                  <div key={msg.id || i} className={`rounded-2xl p-5 ${isUser ? 'bg-teal-50 border border-teal-100 ml-12' : 'bg-white border border-slate-100 shadow-sm mr-12'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-800">{msg.sender_name || (isUser ? 'أنت' : 'فريق الدعم')}</span>
                      <span className="text-xs text-slate-400" dir="ltr">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-7 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {detail.status !== 'closed' && detail.status !== 'resolved' && (
          <form onSubmit={sendReply} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-extrabold text-slate-900 mb-3">💬 إضافة رد</h3>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows="3"
              required
              placeholder="اكتب ردك هنا..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-4"
            />
            <button type="submit" disabled={replySending || !reply.trim()} className="bg-gradient-to-l from-amber-500 to-orange-600 text-white font-extrabold px-6 py-3 rounded-2xl hover:-translate-y-0.5 transition-all shadow-md shadow-amber-200 disabled:opacity-50">
              {replySending ? 'جارٍ الإرسال...' : 'إرسال الرد'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">المساعدة والدعم</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">🎧 الدعم الفني</h1>
          <p className="text-amber-100 text-lg max-w-2xl mx-auto">فريقنا جاهز لمساعدتك — أرسل تذكرة وسنرد عليك في أقرب وقت.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14">
        {error && <div className="mb-5"><Alert>{error}</Alert></div>}

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900">تذاكري</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-l from-amber-500 to-orange-600 text-white font-extrabold px-6 py-3 rounded-2xl hover:-translate-y-0.5 transition-all shadow-md shadow-amber-200 text-sm"
          >
            {showForm ? 'إلغاء' : '＋ تذكرة جديدة'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-8">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">📝 إنشاء تذكرة جديدة</h3>
            <form onSubmit={createTicket} className="space-y-5">
              <Input
                label="الموضوع"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="مثال: مشكلة في الدفع"
                required
              />
              <Select
                label="التصنيف"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">اختر التصنيف</option>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">الرسالة</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows="5"
                  required
                  placeholder="اشرح مشكلتك بالتفصيل..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <button type="submit" disabled={submitting} className="bg-gradient-to-l from-amber-500 to-orange-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-md shadow-amber-200 disabled:opacity-50">
                {submitting ? 'جارٍ الإرسال...' : 'إرسال التذكرة'}
              </button>
            </form>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <p className="text-5xl mb-3">📭</p>
            <h3 className="font-bold text-slate-700 mb-1">لا توجد تذاكر</h3>
            <p className="text-slate-500 text-sm">لم تُرسل أي تذكرة دعم بعد. اضغط "تذكرة جديدة" للبدء.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openDetail(ticket)}
                className="w-full text-right bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl shrink-0">🎧</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-extrabold text-slate-900 truncate">{ticket.subject}</h3>
                    <span className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_MAP[ticket.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_MAP[ticket.status]?.label || ticket.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>#{ticket.id}</span>
                    <span dir="ltr">{formatDate(ticket.created_at)}</span>
                    {ticket.category && <span>{CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}</span>}
                  </div>
                </div>
                <span className="text-slate-300 shrink-0">←</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
