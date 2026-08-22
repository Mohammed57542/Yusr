import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState, Badge } from '../components/common';

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get(`/users/${user.id}/favorites`).then(setLessons).finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (!user) return null;
  if (loading) return <Loading />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900">⭐ الدروس المحفوظة</h1>
          <p className="text-slate-500 mt-1">دروسك المفضلة المحفوظة للوصول السريع.</p>
        </div>
        <Link to="/exams" className="bg-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors text-sm">اكتشف المزيد</Link>
      </div>

      {lessons.length === 0 ? (
        <EmptyState icon="⭐" title="لا توجد دروس محفوظة" description="احفظ الدروس المهمة لتعود إليها بسهولة" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {lessons.map((l) => (
            <Link key={l.id} to={`/lessons/${l.id}`} className="group bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${l.subject_color}1a` }}>{l.subject_icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <Badge>{l.subject_name}</Badge>
                  <span className="text-slate-400">{l.grade_name}</span>
                </div>
                <h3 className="font-extrabold text-slate-900 leading-6 group-hover:text-violet-700 transition-colors">{l.title}</h3>
                <p className="text-sm text-slate-500 mt-2">⏱ {l.duration} دقيقة • {l.level}</p>
              </div>
              <span className="text-amber-400 text-xl shrink-0">⭐</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
