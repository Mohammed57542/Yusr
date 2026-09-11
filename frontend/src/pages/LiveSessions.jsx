import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, Breadcrumbs } from '../components/common';

function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ساعة و ${m} دقيقة`;
  if (h) return `${h} ساعة`;
  return `${m} دقيقة`;
}

function SessionCard({ session, index }) {
  return (
    <div
      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all animate-fade-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className="relative h-44 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${session.subject_color || '#0891b2'}, ${session.subject_color || '#0891b2'}99)` }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }}
        />
        {session.video_url ? (
          <Link to={`/lessons/${session.id || ''}`} className="relative w-16 h-16 rounded-full bg-white/25 border-2 border-white/50 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform">
            <svg className="w-7 h-7 mr-1 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </Link>
        ) : (
          <div className="relative w-16 h-16 rounded-full bg-white/25 border-2 border-white/50 backdrop-blur flex items-center justify-center">
            <span className="text-2xl">⏳</span>
          </div>
        )}
        <span className="absolute top-4 right-4 w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center text-xl">
          {session.subject_icon || '🎥'}
        </span>
        {session.duration_minutes > 0 && (
          <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-lg bg-black/50 text-white text-xs font-bold backdrop-blur">
            {formatDuration(session.duration_minutes)}
          </span>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>{session.subject_name} • {session.grade_name}</span>
        </div>

        <h3 className="font-extrabold text-slate-900 leading-6 mb-3">{session.title}</h3>

        <p className="text-sm text-slate-500 mb-4">👨‍🏫 {session.teacher_name}</p>

        {session.description && (
          <p className="text-xs text-slate-400 mb-4 line-clamp-2">{session.description}</p>
        )}

        {session.video_url ? (
          <Link
            to={`/lessons/${session.id || ''}`}
            className="block text-center bg-gradient-to-l from-teal-600 to-cyan-600 text-white font-extrabold py-3 rounded-xl hover:-translate-y-0.5 transition-all"
          >
            شاهد الحصة المسجلة
          </Link>
        ) : (
          <div className="text-center bg-slate-100 text-slate-400 font-bold py-3 rounded-xl cursor-default">
            سيكون متاحاً قريباً
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/subjects').catch(() => []),
      api.get('/grades').catch(() => []),
    ]).then(([sub, gr]) => {
      setSubjects(sub);
      setGrades(gr);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/live-sessions?status=recorded')
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (search && !s.title?.includes(search)) return false;
      if (subjectFilter && s.subject_id !== Number(subjectFilter)) return false;
      if (gradeFilter && s.grade_id !== Number(gradeFilter)) return false;
      return true;
    });
  }, [sessions, search, subjectFilter, gradeFilter]);

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-700 via-cyan-800 to-night text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Breadcrumbs items={[{ label: 'الدروس المسجلة' }]} />
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الدروس</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">الدروس المسجلة</h1>
          <p className="text-teal-200 text-lg max-w-2xl mx-auto">شاهد الدروس المسجلة في أي وقت — تعلّم بالسرعة التي تناسبك وكرّر الدرس ما شئت.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 بحث بالعنوان..."
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1 min-w-[200px]"
          />
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">جميع المواد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">جميع المراحل</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🎥"
            title="لا توجد دروس مسجلة بعد"
            description="ستُضاف الدروس المسجلة قريباً — تابعنا!"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((s, i) => (
              <SessionCard key={s.id} session={s} index={i} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="max-w-3xl mx-auto bg-gradient-to-l from-teal-600 to-cyan-600 text-white rounded-3xl p-8">
            <p className="font-extrabold text-xl mb-2">💬 لا تفوّت أي درس</p>
            <p className="text-cyan-100 text-sm mb-5">اشترك في جروب صفك لتتلقى تنبيهات عند إضافة دروس جديدة.</p>
            <Link
              to="/groups"
              className="inline-block bg-white text-teal-700 font-extrabold px-8 py-3 rounded-2xl hover:-translate-y-0.5 transition-all"
            >
              الجروبات المجانية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
