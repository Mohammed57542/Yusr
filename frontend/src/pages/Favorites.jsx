import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Badge, Breadcrumbs } from '../components/common';

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get(`/users/${user.id}/favorites`).then(setLessons).finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const removeFavorite = async (lessonId) => {
    try {
      await api.post(`/lessons/${lessonId}/favorite`);
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;
  if (loading) return <Loading />;

  const subjects = [...new Set(lessons.map((l) => l.subject_name))];
  const filtered = subjectFilter === 'all' ? lessons : lessons.filter((l) => l.subject_name === subjectFilter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      <Breadcrumbs items={[{ label: 'الدروس المحفوظة' }]} />
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900">⭐ الدروس المحفوظة</h1>
          <p className="text-slate-500 mt-1">{lessons.length} درس محفوظ للوصول السريع.</p>
        </div>
        <Link to="/subjects" className="bg-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors text-sm">اكتشف المزيد</Link>
      </div>

      {lessons.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setSubjectFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${subjectFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
            الكل ({lessons.length})
          </button>
          {subjects.map((s) => (
            <button key={s} onClick={() => setSubjectFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${subjectFilter === s ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
          </div>
          <h3 className="text-gray-500 text-lg font-bold mb-2">لم تُضف أي مفضلات بعد</h3>
          <p className="text-gray-400 text-sm mb-4">أضف دروسك ومادتك المفضلة هنا</p>
          <Link to="/subjects" className="inline-block bg-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-teal-600 transition-colors">استكشف الدروس</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((l) => (
            <div key={l.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex items-start gap-4">
                <Link to={`/lessons/${l.id}`} className="flex-1 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${l.subject_color}1a` }}>{l.subject_icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <Badge>{l.subject_name}</Badge>
                      <span className="text-slate-400">{l.grade_name}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 leading-6 group-hover:text-violet-700 transition-colors">{l.title}</h3>
                    <p className="text-sm text-slate-500 mt-2">⏱ {l.duration} دقيقة • {l.level}</p>
                  </div>
                </Link>
                <button onClick={() => removeFavorite(l.id)} className="text-red-400 hover:text-red-600 transition-colors p-2" title="إزالة من المفضلة">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
