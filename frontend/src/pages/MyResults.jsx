import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState } from '../components/common';

export default function MyResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get(`/users/${user.id}/results`).then(setResults).finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (!user) return null;
  if (loading) return <Loading />;

  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-black text-slate-900">نتائجي</h1>
        <Link to="/exams" className="bg-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors text-sm">اختبار جديد</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-black text-slate-900">{results.length}</p>
          <p className="text-sm text-slate-500">اختبار منجز</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-black text-violet-700">{avg}%</p>
          <p className="text-sm text-slate-500">متوسط النتائج</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-black text-green-600">{results.filter((r) => r.score >= 60).length}</p>
          <p className="text-sm text-slate-500">اختبار ناجح</p>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState icon="📝" title="لم تختبر بعد" description="ابدأ أول اختبار لك الآن وقيّم مستواك" />
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-wrap items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={r.score >= 60 ? '#7c3aed' : '#ef4444'} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(r.score / 100) * 263.9} 263.9`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-slate-900">{r.score}%</div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-900 mb-1">{r.title}</h3>
                <p className="text-sm text-slate-500">{r.subject_name}</p>
                <p className="text-xs text-slate-400 mt-1">⏱️ {r.duration_minutes} دقيقة</p>
              </div>
              <div className="text-left">
                <span className={`inline-block px-4 py-2 rounded-full text-sm font-black ${r.score >= 85 ? 'bg-green-100 text-green-700' : r.score >= 60 ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-600'}`}>
                  {r.score >= 85 ? 'ممتاز 🏆' : r.score >= 60 ? 'جيد ✓' : 'يحتاج تدريب'}
                </span>
                <p className="text-xs text-slate-400 mt-2" dir="ltr">{r.created_at?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
