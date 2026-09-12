import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading } from '../components/common';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '';
  try {
    const dt = new Date(`${dateStr}T${timeStr || '00:00:00'}`);
    return dt.toLocaleString('ar-EG', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return `${dateStr} ${timeStr || ''}`; }
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ساعة و ${m} دقيقة`;
  if (h) return `${h} ساعة`;
  return `${m} دقيقة`;
}

function CountdownTimer({ targetDate }) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    if (isNaN(target)) return;

    function tick() {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const blocks = [
    { value: remaining.days, label: 'يوم' },
    { value: remaining.hours, label: 'ساعة' },
    { value: remaining.minutes, label: 'دقيقة' },
    { value: remaining.seconds, label: 'ثانية' },
  ];

  return (
    <div className="flex items-center gap-3 justify-center">
      {blocks.map((b, i) => (
        <div key={b.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-teal-500/30">
              {String(b.value).padStart(2, '0')}
            </div>
            <span className="text-xs font-bold text-slate-500 mt-1">{b.label}</span>
          </div>
          {i < blocks.length - 1 && <span className="text-2xl font-black text-teal-400 self-start mt-3">:</span>}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center" dir="rtl">
      <div>
        <div className="text-8xl mb-4">📭</div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">الحصة غير موجودة</h1>
        <p className="text-slate-500 mb-8">عذراً، هذه الحصة غير موجودة أو تم حذفها.</p>
        <Link to="/live-sessions" className="inline-block bg-teal-600 text-white font-extrabold px-8 py-4 rounded-2xl hover:bg-teal-700 transition-colors">
          العودة للدروس المسجلة
        </Link>
      </div>
    </div>
  );
}

export default function LiveClassroom() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [inRoom, setInRoom] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/live-sessions/${id}`)
      .then(setSession)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await api.post(`/live-sessions/${id}/join`);
      setInRoom(true);
    } catch (err) {
      setJoinError(err?.response?.data?.detail || 'حدث خطأ أثناء الانضمام');
    } finally {
      setJoining(false);
    }
  }, [id]);

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    try {
      await api.post(`/live-sessions/${id}/leave`);
      setInRoom(false);
    } catch {
      // silent
    } finally {
      setLeaving(false);
    }
  }, [id]);

  if (loading) return <Loading />;
  if (error || !session) return <EmptyState />;

  const isLive = session.status === 'live';
  const isUpcoming = session.status === 'upcoming';
  const isRecorded = session.status === 'ended' || session.status === 'recorded';
  const showJitsi = isLive && session.meeting_id && inRoom;

  const scheduledTime = session.session_date
    ? `${session.session_date}T${session.session_time || '00:00:00'}`
    : null;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="bg-gradient-to-br from-teal-700 via-cyan-800 to-emerald-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link to="/live-sessions" className="inline-flex items-center gap-2 text-teal-200 hover:text-white text-sm font-bold mb-4 transition-colors">
            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            العودة للدروس
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{session.subject_icon || '📚'}</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight">{session.title}</h1>
              <p className="text-teal-200 text-sm font-bold mt-1">{session.subject_name} — {session.grade_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {session.teacher_name && <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs">👨‍🏫 {session.teacher_name}</span>}
            {session.duration_minutes && <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs">⏱️ {formatDuration(session.duration_minutes)}</span>}
            {session.session_date && <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs">📅 {formatDate(session.session_date)}</span>}

            {isLive && (
              <span className="px-3 py-1 rounded-full bg-red-500/80 border border-red-400/40 text-white font-bold text-xs animate-pulse">
                🔴 مباشرة
              </span>
            )}
            {isUpcoming && (
              <span className="px-3 py-1 rounded-full bg-amber-500/80 border border-amber-400/40 text-white font-bold text-xs">
                ⏳ قادمة
              </span>
            )}
            {isRecorded && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/80 border border-emerald-400/40 text-white font-bold text-xs">
                ✅ مسجلة
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Live Session with Jitsi */}
        {isLive && session.meeting_id && (
          <div className="mb-6 space-y-4">
            {!inRoom ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/30">
                  <span className="text-4xl">🔴</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">الحصة مباشرة الآن</h2>
                <p className="text-slate-500 mb-6 text-sm">انضم الآن للحصة المباشرة مع المعلم</p>

                {joinError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-bold">
                    {joinError}
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-extrabold px-10 py-4 rounded-2xl text-lg transition-all shadow-lg shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? (
                    <span className="flex items-center gap-2 justify-center">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      جاري الانضمام...
                    </span>
                  ) : 'انضم للحصة'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <iframe
                  src={`https://meet.jit.si/${session.meeting_id}`}
                  style={{ width: '100%', height: '500px', border: 0, borderRadius: '16px' }}
                  allow="camera;microphone;fullscreen;display-capture"
                  title={session.title}
                />
                <div className="p-4 flex justify-center">
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-extrabold px-8 py-3 rounded-2xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-50"
                  >
                    {leaving ? 'جاري المغادرة...' : 'غادر الحصة'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Session */}
        {isUpcoming && scheduledTime && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/30">
              <span className="text-4xl">⏳</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">الحصة القادمة</h2>
            <p className="text-slate-500 mb-2 text-sm">ستبدأ الحصة خلال:</p>
            <div className="mb-5">
              <CountdownTimer targetDate={scheduledTime} />
            </div>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
              <span className="text-lg">📅</span>
              <span className="font-bold text-teal-700 text-sm">{formatDateTime(session.session_date, session.session_time)}</span>
            </div>
          </div>
        )}

        {/* Recorded / Ended Session - Video Player */}
        {isRecorded && (
          <div className="mb-6">
            {session.video_url ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={session.video_url}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={session.title}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⏳</span>
                </div>
                <p className="text-lg font-extrabold text-slate-400 mb-2">الفيديو غير متاح بعد</p>
                <p className="text-slate-400 text-sm">سيتم رفع فيديو الحصة قريباً.</p>
              </div>
            )}
          </div>
        )}

        {session.description && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-extrabold text-slate-900 mb-3 text-sm">وصف الحصة</h3>
            <p className="text-sm text-slate-600 leading-7">{session.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
