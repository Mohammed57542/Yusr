import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/common';
import { useAuth } from '../context/AuthContext';

export default function GradeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/grades/${id}/subjects`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return <EmptyState icon="❌" title="الصف غير موجود" description="تأكد من الرابط وحاول مرة أخرى" />;

  return (
    <div>
      <div className="text-white" style={{ background: `linear-gradient(135deg, ${data.grade.color}, ${data.grade.color}bb)` }}>
        <div className="max-w-7xl mx-auto px-4 py-14">
          <Link to="/grades" className="text-white/80 hover:text-white text-sm mb-4 inline-block">→ جميع المراحل</Link>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center text-4xl font-black shadow-xl">{data.grade.id}</div>
            <div>
              <h1 className="text-4xl font-black mb-1">{data.grade.name}</h1>
              <p className="text-white/85">{data.grade.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900">مواد {data.grade.name}</h2>
          <span className="text-sm text-slate-500">{data.subjects.length} مواد متاحة</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.subjects.map((s, i) => (
            <Link key={s.id} to={`/subjects/${s.id}?grade_id=${data.grade.id}`} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-7 animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm" style={{ background: `${s.color}1a` }}>{s.icon}</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors">{s.name}</h3>
                  <p className="text-xs text-slate-400">🎥 {s.lesson_count} درس</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-6 mb-5 line-clamp-2">
                حصص مصوّرة وملخصات وملفات وبنك أسئلة واختبارات ومراجعات كاملة لمادة {s.name} في {data.grade.name}.
              </p>
              <span className="inline-flex items-center gap-1 text-violet-600 font-bold text-sm group-hover:gap-2 transition-all">
                دخول المادة <span>←</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-14 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: '🎥', title: 'حصص مباشرة', desc: 'تابع حصص صفك المباشرة القادمة', to: '/live-sessions', color: 'bg-pink-100' },
            { icon: '💬', title: 'جروب مجاني', desc: `جروب ${data.grade.name} على واتساب`, to: '/groups', color: 'bg-emerald-100' },
            { icon: '📝', title: 'الاختبارات', desc: 'اختبر نفسك وقيّم مستواك', to: '/exams', color: 'bg-violet-100' },
          ].map((c) => (
            <Link key={c.title} to={c.to} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className={`w-14 h-14 rounded-2xl ${c.color} flex items-center justify-center text-2xl shrink-0`}>{c.icon}</div>
              <div>
                <p className="font-extrabold text-slate-900">{c.title}</p>
                <p className="text-sm text-slate-500">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {user && Number(user.grade) === data.grade.id && (
          <Link to="/dashboard" className="mt-8 block text-center bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-violet-200 hover:-translate-y-0.5 transition-all">
            📊 متابعة تقدمي في هذا الصف
          </Link>
        )}
      </div>
    </div>
  );
}
