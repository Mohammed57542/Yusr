import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState, Alert, Breadcrumbs } from '../components/common';

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/assignments').then(setAssignments).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const isOverdue = (d) => new Date(d) < new Date();
  const filtered = filter === 'all' ? assignments : filter === 'overdue' ? assignments.filter(a => isOverdue(a.due_date)) : assignments.filter(a => !isOverdue(a.due_date));

  if (loading) return <Loading label="جارٍ تحميل الواجبات..." />;

  return (
    <div>
      <div className="bg-gradient-to-br from-rose-600 via-pink-700 to-cyan-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Breadcrumbs items={[{ label: 'الواجبات' }]} />
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الواجبات</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">📋 الواجبات</h1>
          <p className="text-pink-200 text-lg max-w-2xl mx-auto">واجباتك المطلوبة وتسليمها ومتابعة درجاتك.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {error && <div className="mb-5"><Alert>{error}</Alert></div>}

        <div className="flex gap-3 mb-8">
          {[{ id: 'all', label: 'الكل' }, { id: 'pending', label: '📥 قادم' }, { id: 'overdue', label: '⚠️ منتهي' }].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${filter === f.id ? 'bg-rose-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="📋" title="لا توجد واجبات" description="ستظهر الواجبات هنا عندما ينشرها المعلم." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a) => (
              <div key={a.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700">{a.subject_name}</span>
                  <span className="text-xs text-slate-400">{a.grade_name}</span>
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 mb-2">{a.title}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{a.description || a.instructions || 'واجب جديد'}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span>📅 موعد التسليم: {new Date(a.due_date).toLocaleDateString('ar-OM')}</span>
                  <span>📊 {a.max_score} درجة</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">👨‍🏫 {a.teacher_name}</span>
                  <Link to={`/assignments/${a.id}`} className="bg-rose-600 text-white font-extrabold px-5 py-2 rounded-xl hover:bg-rose-700 transition-colors text-sm">
                    فتح الواجب
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
