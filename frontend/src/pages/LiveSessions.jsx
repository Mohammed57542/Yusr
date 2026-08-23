import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, SectionHeader, Breadcrumbs } from '../components/common';
import useSettings, { waLink } from '../hooks/useSettings';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

function dayNameOf(dateStr) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long' });
  } catch { return ''; }
}

function sessionStatus(s) {
  if (!s.session_date || !s.session_time) return 'unknown';
  const now = Date.now();
  const start = new Date(`${s.session_date}T${s.session_time}`).getTime();
  const durationMs = (s.duration || 60) * 60000;
  if (now < start) return 'upcoming';
  if (now >= start && now < start + durationMs) return 'live';
  return 'ended';
}

function StatusBadge({ status }) {
  const map = {
    live: { label: 'مباشر', cls: 'bg-green-100 text-green-700' },
    upcoming: { label: 'قادم', cls: 'bg-blue-100 text-blue-700' },
    ended: { label: 'منتهية', cls: 'bg-slate-100 text-slate-500' },
  };
  const { label, cls } = map[status] || { label: '', cls: '' };
  if (!label) return null;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
}

function WeekSchedule({ sessions, settings }) {
  const days = {};
  for (const d of WEEK_DAYS) days[d] = [];
  for (const s of sessions) {
    const dn = dayNameOf(s.session_date);
    if (days[dn]) days[dn].push(s);
  }
  const any = WEEK_DAYS.some((d) => days[d].length > 0);
  if (!any) return <EmptyState icon="📅" title="لا توجد حصص مجدولة هذا الأسبوع" description="ستُضاف الحصص الجديدة قريباً" />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {WEEK_DAYS.map((dn) => (
        <div key={dn} className={`rounded-3xl border p-5 ${days[dn].length ? 'bg-white border-slate-100 shadow-sm' : 'bg-white/40 border-dashed border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-extrabold ${days[dn].length ? 'text-violet-800' : 'text-slate-400'}`}>{dn}</h3>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${days[dn].length ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>{days[dn].length ? `${days[dn].length} حصص` : 'راحة'}</span>
          </div>
          {days[dn].length === 0 ? (
            <p className="text-xs text-slate-300 font-bold text-center py-3">لا حصص</p>
          ) : (
            <div className="space-y-3">
              {days[dn].sort((a, b) => (a.session_time || '').localeCompare(b.session_time || '')).map((s) => (
                <div key={s.id} className="p-3.5 rounded-2xl border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{s.subject_icon}</span>
                    <p className="font-bold text-slate-800 text-sm leading-5 flex-1 line-clamp-2">{s.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 mb-2" dir="ltr">🕒 {s.session_time || '—'} • {s.subject_name} • 👨‍🏫 {s.teacher_name}</p>
                  {s.meeting_url ? (
                    <a href={s.meeting_url} target="_blank" rel="noreferrer" className="block text-center bg-violet-600 text-white text-xs font-extrabold py-2 rounded-xl hover:bg-violet-700 transition-colors">انضم الآن</a>
                  ) : (
                    <a href={waLink(`أرغب في الانضمام إلى حصة: ${s.title}`, settings)} target="_blank" rel="noreferrer" className="block text-center bg-green-600 text-white text-xs font-extrabold py-2 rounded-xl hover:bg-green-700 transition-colors">أضفني للحصة</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LiveSessions() {
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const tab = params.get('status') === 'recorded' ? 'recorded' : params.get('status') === 'week' ? 'week' : 'upcoming';
  const subjectFilter = params.get('subject') || '';

  useEffect(() => { api.get('/subjects').then(setSubjects).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    api.get(`/live-sessions?status=${tab === 'recorded' ? 'recorded' : 'upcoming'}`).then(setSessions).finally(() => setLoading(false));
  }, [tab]);

  const filtered = subjectFilter ? sessions.filter((s) => s.subject_id === Number(subjectFilter)) : sessions;

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Breadcrumbs items={[{ label: 'الحصص المباشرة' }]} />
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الحصص</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">الحصص المباشرة والمسجلة</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">تعلّم مباشرة مع معلميك، واطرح أسئلتك، ولا تفوّت أي مراجعة.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex gap-2">
            <button onClick={() => setParams({ status: 'upcoming' })} className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'upcoming' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'}`}>
              📅 الحصص القادمة
            </button>
            <button onClick={() => setParams({ status: 'week' })} className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'week' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'}`}>
              🗓️ جدول الأسبوع
            </button>
            <button onClick={() => setParams({ status: 'recorded' })} className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'recorded' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'}`}>
              🎥 الحصص المسجلة
            </button>
          </div>
          <select value={subjectFilter} onChange={(e) => { const next = new URLSearchParams(params); if (e.target.value) next.set('subject', e.target.value); else next.delete('subject'); setParams(next); }} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">جميع المواد</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : tab === 'week' ? (
          <WeekSchedule sessions={filtered} settings={settings} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🎥" title="لا توجد حصص في هذا القسم" description="ستُضاف حصص جديدة قريباً" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((s, i) => (
              <div key={s.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="relative h-40 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${s.subject_color}, ${s.subject_color}99)` }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />
                  {tab === 'recorded' ? (
                    s.video_url ? (
                      <a href={s.video_url} target="_blank" rel="noreferrer" className="relative w-16 h-16 rounded-full bg-white/25 border-2 border-white/50 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 mr-1 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </a>
                    ) : (
                      <div className="relative w-16 h-16 rounded-full bg-white/25 border-2 border-white/50 backdrop-blur flex items-center justify-center">
                        <span className="text-2xl">⏳</span>
                      </div>
                    )
                  ) : (
                    <span className="relative px-4 py-2 rounded-full bg-red-500 text-white font-black text-sm flex items-center gap-2 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> مباشر
                    </span>
                  )}
                  <span className="absolute top-4 right-4 w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center text-xl">{s.subject_icon}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{s.subject_name} • {s.grade_name}</span>
                    <StatusBadge status={sessionStatus(s)} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 leading-6 mb-3">{s.title}</h3>
                  <p className="text-sm text-slate-500 mb-5">👨‍🏫 {s.teacher_name}</p>
                  <div className="bg-slate-50 rounded-2xl p-4 mb-5">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">📅 {tab === 'upcoming' ? formatDate(s.session_date) : 'مسجلة'}</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2 mt-1" dir="ltr">🕒 {tab === 'upcoming' ? `${s.session_time} مساءً` : 'ساعة +'}</p>
                  </div>
                  {tab === 'upcoming' ? (
                    <div className="flex gap-2">
                      <Link to={`/live/${s.id}`} className="flex-1 text-center bg-teal-600 text-white font-extrabold py-3 rounded-xl hover:bg-teal-700 transition-colors">انضم الآن</Link>
                      <Link to={`/lessons?subject=${s.subject_id}`} className="bg-slate-100 text-slate-600 font-bold px-4 py-3 rounded-xl hover:bg-slate-200 transition-colors">دروس المادة</Link>
                    </div>
                  ) : (
                    s.video_url ? (
                      <a href={s.video_url} target="_blank" rel="noreferrer" className="block text-center bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-3 rounded-xl hover:-translate-y-0.5 transition-all">شاهد الحصة المسجلة</a>
                    ) : (
                      <div className="text-center bg-slate-100 text-slate-400 font-bold py-3 rounded-xl cursor-default">قريباً</div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16">
          <SectionHeader eyebrow="تنبيهات" title="لا تفوّت أي حصة" center />
          <div className="max-w-3xl mx-auto bg-gradient-to-l from-emerald-600 to-green-600 text-white rounded-3xl p-8 text-center">
            <p className="font-extrabold text-xl mb-2">💬 اشترك في جروب صفك المجاني</p>
            <p className="text-green-100 text-sm mb-5">ستصلك تنبيهات كل حصة مباشرة جديدة وأي مراجعة قادمة.</p>
            <Link to="/groups" className="inline-block bg-white text-emerald-700 font-extrabold px-8 py-3 rounded-2xl hover:-translate-y-0.5 transition-all">الجروبات المجانية</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
