import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, Badge, difficultyColor } from '../components/common';

export default function LessonsList() {
  const [params, setParams] = useSearchParams();
  const [lessons, setLessons] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const teacher = params.get('teacher') || '';
  const subject = params.get('subject') || '';

  useEffect(() => { api.get('/subjects').then(setSubjects).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (teacher) q.set('teacher', teacher);
    if (subject) q.set('subject_id', subject);
    api.get(`/lessons?${q}`).then(setLessons).finally(() => setLoading(false));
  }, [teacher, subject]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link to="/subjects" className="text-violet-600 text-sm hover:text-violet-800 mb-2 inline-block">→ المواد</Link>
        <h1 className="text-3xl font-black text-slate-900">
          {teacher ? `دروس ${teacher}` : subject ? 'دروس المادة' : 'جميع الدروس'}
        </h1>
        <p className="text-slate-500 mt-1">تصفح الدروس المصورة وابدأ التعلم فوراً.</p>
      </div>

      <select value={subject} onChange={(e) => { const next = new URLSearchParams(params); if (e.target.value) next.set('subject', e.target.value); else next.delete('subject'); setParams(next, { replace: true }); }} className="mb-8 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
        <option value="">جميع المواد</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
      </select>

      {loading ? (
        <Loading />
      ) : lessons.length === 0 ? (
        <EmptyState icon="🎬" title="لا توجد دروس مطابقة" description="جرّب مادة أخرى أو تصفح المواد من الأعلى" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((l, i) => (
            <Link key={l.id} to={`/lessons/${l.id}`} className="group bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="relative h-36" style={{ background: `linear-gradient(135deg, ${l.subject_color}, ${l.subject_color}99)` }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                <div className="absolute top-4 right-4 w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center text-xl">{l.subject_icon}</div>
                <div className="absolute bottom-4 right-4 text-white font-bold text-sm bg-black/25 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-1.5">🎥 {l.duration} دقيقة</div>
                {l.locked && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">🔒</span>
                    <span className="text-white text-xs font-black bg-black/30 rounded-full px-4 py-1.5">للمشتركين في {l.subject_name}</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <Badge>{l.subject_name}</Badge>
                  <span className="text-slate-400">{l.grade_name}</span>
                </div>
                <h3 className="font-extrabold text-slate-900 leading-7 mb-1 group-hover:text-violet-700 transition-colors">{l.title}</h3>
                {l.teacher_name && <p className="text-xs text-slate-400 mb-2">👨‍🏫 {l.teacher_name}</p>}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>👁️ {l.views.toLocaleString('ar-EG')} مشاهدة</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${difficultyColor(l.level)}`}>{l.level}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
