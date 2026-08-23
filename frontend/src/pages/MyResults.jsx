import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Breadcrumbs } from '../components/common';

export default function MyResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get(`/users/${user.id}/results`).then(setResults).finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (!user) return null;
  if (loading) return <Loading />;

  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const filtered = filter === 'all' ? results : filter === 'passed' ? results.filter((r) => r.score >= 60) : results.filter((r) => r.score < 60);
  const subjects = [...new Set(results.map((r) => r.subject_name))];
  const bestScore = results.length ? Math.max(...results.map((r) => r.score)) : 0;
  const worstScore = results.length ? Math.min(...results.map((r) => r.score)) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <Breadcrumbs items={[{ label: 'نتائجي' }]} />
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-black text-slate-900">📝 نتائجي</h1>
        <Link to="/exams" className="bg-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors text-sm">اختبار جديد</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-3xl font-black text-slate-900">{results.length}</p>
          <p className="text-sm text-slate-500">اختبار منجز</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-3xl font-black text-violet-700">{avg}%</p>
          <p className="text-sm text-slate-500">متوسط النتائج</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-3xl font-black text-green-600">{bestScore}%</p>
          <p className="text-sm text-slate-500">أعلى نتيجة</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">📈</div>
          <p className="text-3xl font-black text-amber-600">{results.filter((r) => r.score >= 60).length}</p>
          <p className="text-sm text-slate-500">اختبار ناجح</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'all', label: `الكل (${results.length})` },
          { id: 'passed', label: `ناجح (${results.filter((r) => r.score >= 60).length})` },
          { id: 'failed', label: `يحتاج تدريب (${results.filter((r) => r.score < 60).length})` },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === f.id ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
            {f.label}
          </button>
        ))}
        {subjects.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filter === s ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
          </div>
          <h3 className="text-gray-500 text-lg font-bold mb-2">لم تُحل أي اختبارات بعد</h3>
          <p className="text-gray-400 text-sm mb-4">ابدأ بحل اختبارات لترى نتائجك هنا</p>
          <Link to="/exams" className="inline-block bg-teal-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-teal-600 transition-colors">ابدأ اختباراً</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
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
