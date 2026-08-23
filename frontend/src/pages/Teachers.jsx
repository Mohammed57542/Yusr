import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SectionHeader, Alert, Input, EmptyState } from '../components/common';

const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-lime-500', 'bg-orange-500', 'bg-teal-500'];

const initialsOf = (name) => {
  const parts = name.replace('أ. ', '').split(' ');
  return parts.slice(0, 2).map((p) => p[0] || '').join('.');
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', years_experience: '', message: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teachers').then(setTeachers).catch(() => setTeachers([])).finally(() => setLoading(false));
  }, []);

  const subjectsList = [...new Set(teachers.map((t) => t.subjects || t.subject).filter(Boolean))];
  const filtered = filter === 'all' ? teachers : teachers.filter((t) => (t.subjects || t.subject) === filter);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      const res = await api.post('/auth/apply-teacher', form);
      setStatus(res.message);
      setForm({ name: '', email: '', phone: '', subject: '', years_experience: '', message: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">المعلمون</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">معلمون متميزون</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">معلمون يدرسون على المنصة ويقدّمون محتوى تعليمي متميزاً لطلاب المنهج العُماني.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        {teachers.length > 0 && (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                الكل ({teachers.length})
              </button>
              {subjectsList.map((s) => (
                <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === s ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                  {s}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {filtered.map((t, i) => (
                <div key={t.name || i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-16 h-16 rounded-3xl ${COLORS[i % COLORS.length]} flex items-center justify-center text-xl font-black text-white shadow-lg shrink-0`}>{t.initials || initialsOf(t.name)}</div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{t.name}</h3>
                      <p className="text-violet-600 font-bold text-sm">{t.subjects || t.subject}</p>
                      <p className="text-xs text-slate-400">📚 {t.lessons_count || 0} درس في المنصة</p>
                    </div>
                  </div>
                  <Link to={`/lessons?teacher=${encodeURIComponent(t.name)}`} className="block text-center bg-violet-50 text-violet-700 font-extrabold py-3 rounded-2xl hover:bg-violet-100 transition-colors text-sm">
                    📚 استكشف محتوى المعلم
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        {teachers.length === 0 && !loading && (
          <EmptyState icon="👨‍🏫" title="لا يوجد معلمون بعد" description="سيتم عرض المعلمين هنا عندما ينشرون محتوى على المنصة." />
        )}

        <div className="max-w-2xl mx-auto">
          <SectionHeader eyebrow="انضم إلى فريقنا" title="هل أنت معلم متميز؟" subtitle="قدم طلبك للانضمام إلى فريق معلمي يسر." center />
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            {error && <div className="mb-5"><Alert>{error}</Alert></div>}
            {status && <div className="mb-5"><Alert type="success">{status}</Alert></div>}
            <form onSubmit={submit} className="space-y-5">
              <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
                <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">المادة</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" required>
                    <option value="">اختر المادة</option>
                    <option>الرياضيات</option>
                    <option>الرياضيات المتقدمة</option>
                    <option>الرياضيات الأساسية</option>
                    <option>الفيزياء</option>
                    <option>الكيمياء</option>
                    <option>الأحياء</option>
                    <option>العلوم البيئية</option>
                    <option>اللغة الإنجليزية</option>
                    <option>اللغة العربية</option>
                  </select>
                </div>
                <Input label="سنوات الخبرة" type="number" min="1" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">رسالة قصيرة عنك</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="4" placeholder="أخبرنا عن خبرتك وإنجازاتك..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200">
                إرسال الطلب
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
