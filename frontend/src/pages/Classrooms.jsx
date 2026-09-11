import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState, Alert, Breadcrumbs } from '../components/common';

export default function Classrooms() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', grade_id: '', subject_id: '', academic_year: '2025-2026', semester: 'الأول' });

  useEffect(() => {
    api.get('/classrooms').then(setClassrooms).catch((e) => setError(e.message)).finally(() => setLoading(false));
    if (user?.role === 'teacher' || user?.role === 'admin') {
      api.get('/grades').then(setGrades).catch(() => {});
      api.get('/subjects').then(setSubjects).catch(() => {});
    }
  }, [user]);

  const createClassroom = async (e) => {
    e.preventDefault(); setError('');
    try {
      const res = await api.post('/classrooms', { ...form, grade_id: Number(form.grade_id), subject_id: Number(form.subject_id) });
      setClassrooms((p) => [{ ...form, id: res.id, student_count: 0, subject_name: subjects.find(s => s.id === Number(form.subject_id))?.name, grade_name: grades.find(g => g.id === Number(form.grade_id))?.name, teacher_name: user.name }, ...p]);
      setForm({ name: '', description: '', grade_id: '', subject_id: '', academic_year: '2025-2026', semester: 'الأول' });
      setShowForm(false);
    } catch (e) { setError(e.message); }
  };

  if (loading) return <Loading label="جارٍ تحميل الفصول..." />;

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-cyan-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Breadcrumbs items={[{ label: 'الفصول' }]} />
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الفصول الافتراضية</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">🏫 فصلي الدراسية</h1>
          <p className="text-teal-200 text-lg max-w-2xl mx-auto">تابع دروسك وواجباتك واختباراتك في فصلك.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {error && <div className="mb-5"><Alert>{error}</Alert></div>}

        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <div className="flex justify-end mb-6">
            <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">
              {showForm ? 'إلغاء' : 'إنشاء فصل جديد'}
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={createClassroom} className="bg-white rounded-3xl border border-slate-200 p-6 mb-8 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الفصل" className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold md:col-span-2" required />
              <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="السنة الدراسية" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <select value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">الصف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option>الأول</option><option>الثاني</option>
              </select>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف الفصل (اختياري)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-3" rows={2} />
            </div>
            <button type="submit" className="bg-teal-600 text-white font-extrabold px-8 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">إنشاء الفصل</button>
          </form>
        )}

        {classrooms.length === 0 ? (
          <EmptyState icon="🏫" title="لا توجد فصول" description={user?.role === 'student' ? 'انضم لفصل من المعلم.' : 'أنشئ فصلاً افتراضياً لتنظيم موادك.'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((c) => (
              <Link key={c.id} to={`/classrooms/${c.id}`} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-lg hover:border-teal-300 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-2xl font-black shrink-0">
                    {c.subject_icon || '🏫'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-500">{c.subject_name} — {c.grade_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>👨‍🏫 {c.teacher_name}</span>
                  <span>{c.semester} الفصل • {c.academic_year}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-teal-600">👥 {c.student_count || 0} طالب</span>
                  <span className="text-xs text-slate-400">{c.description || 'فصل دراسي'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
