import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading } from '../components/common';

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(`${dateStr}T${timeStr || '00:00:00'}`);
    return d.toLocaleString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ساعة و ${m} دقيقة`;
  if (h) return `${h} ساعة`;
  return `${m} دقيقة`;
}

function useCountdown(targetDate, targetTime) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!targetDate || !targetTime) return null;
    const target = new Date(`${targetDate}T${targetTime}`).getTime();
    const diff = target - now;
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: diff };
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { hours, minutes, seconds, total: diff };
  }, [targetDate, targetTime, now]);
}

function CountdownDigit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
        <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[11px] font-bold text-teal-200 mt-2">{label}</span>
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
          العودة للحصص المباشرة
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
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/live-sessions/${id}`)
      .then(setSession)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const countdown = useCountdown(session?.session_date, session?.session_time);

  const sessionStatus = useMemo(() => {
    if (!session) return 'unknown';
    if (!session.session_date || !session.session_time) return 'unknown';
    const now = Date.now();
    const start = new Date(`${session.session_date}T${session.session_time}`).getTime();
    const durationMs = (session.duration || 60) * 60000;
    if (now < start) return 'upcoming';
    if (now >= start && now < start + durationMs) return 'live';
    return 'ended';
  }, [session]);

  if (loading) return <Loading />;
  if (error || !session) return <EmptyState />;

  return (
    <div className="min-h-screen" dir="rtl">
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setShowAlert(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">انضمام الحصة</h3>
            <p className="text-slate-500 text-sm mb-6">سيتم ربط هذا بنظام البث المباشر</p>
            <button onClick={() => setShowAlert(false)} className="bg-teal-600 text-white font-extrabold px-8 py-3 rounded-2xl hover:bg-teal-700 transition-colors">حسناً</button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-teal-700 via-cyan-800 to-emerald-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link to="/live-sessions" className="inline-flex items-center gap-2 text-teal-200 hover:text-white text-sm font-bold mb-6 transition-colors">
            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            العودة للحصص
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{session.subject_icon || '📚'}</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight">{session.title}</h1>
              <p className="text-teal-200 text-sm font-bold mt-1">{session.subject_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            {sessionStatus === 'live' && (
              <span className="px-4 py-1.5 rounded-full bg-red-500 text-white font-black text-sm flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> مباشر الآن
              </span>
            )}
            {sessionStatus === 'upcoming' && (
              <span className="px-4 py-1.5 rounded-full bg-blue-500 text-white font-black text-sm">قادم</span>
            )}
            {sessionStatus === 'ended' && (
              <span className="px-4 py-1.5 rounded-full bg-slate-500 text-white font-black text-sm">منتهية</span>
            )}
            {session.teacher_name && (
              <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm flex items-center gap-1.5">
                👨‍🏫 {session.teacher_name}
              </span>
            )}
            {session.duration && (
              <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm">
                ⏱️ {formatDuration(session.duration)}
              </span>
            )}
            {session.participants_count != null && (
              <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm">
                👥 {session.participants_count} مشارك
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
              {sessionStatus === 'upcoming' && countdown && (
                <div className="text-center">
                  <p className="text-lg font-extrabold text-slate-900 mb-2">الحصة لم تبدأ بعد</p>
                  <p className="text-sm text-slate-500 mb-8">تبدأ الحصة في {formatDateTime(session.session_date, session.session_time)}</p>
                  <div className="flex items-center justify-center gap-4">
                    <CountdownDigit value={countdown.hours} label="ساعة" />
                    <span className="text-3xl font-black text-teal-400 mt-[-20px]">:</span>
                    <CountdownDigit value={countdown.minutes} label="دقيقة" />
                    <span className="text-3xl font-black text-teal-400 mt-[-20px]">:</span>
                    <CountdownDigit value={countdown.seconds} label="ثانية" />
                  </div>
                  <button
                    onClick={() => setShowAlert(true)}
                    className="mt-10 bg-teal-600 text-white font-extrabold px-10 py-4 rounded-2xl text-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                  >
                    انضم للحصة
                  </button>
                </div>
              )}

              {sessionStatus === 'live' && (
                <div className="text-center">
                  <p className="text-lg font-extrabold text-emerald-600 mb-2">الحصة جارية الآن</p>
                  <div className="my-8">
                    <button
                      onClick={() => setShowAlert(true)}
                      className="w-28 h-28 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-teal-300 hover:scale-110 transition-transform mx-auto"
                    >
                      <svg className="w-12 h-12 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowAlert(true)}
                    className="bg-teal-600 text-white font-extrabold px-10 py-4 rounded-2xl text-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                  >
                    انضم للحصة
                  </button>
                </div>
              )}

              {sessionStatus === 'ended' && (
                <div className="text-center">
                  <p className="text-lg font-extrabold text-slate-400 mb-2">انتهت الحصة</p>
                  <div className="my-6">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                      <span className="text-3xl">✅</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-6">انتهت هذه الحصة. يمكنك مشاهدة التسجيل إن كان متاحاً.</p>
                  {session.video_url ? (
                    <a href={session.video_url} target="_blank" rel="noreferrer" className="inline-block bg-teal-600 text-white font-extrabold px-8 py-3 rounded-2xl hover:bg-teal-700 transition-colors">
                      شاهد التسجيل
                    </a>
                  ) : (
                    <div className="inline-block bg-slate-100 text-slate-400 font-bold px-8 py-3 rounded-2xl cursor-default">
                      لا يوجد تسجيل متاح
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-extrabold text-slate-900 mb-4">تفاصيل الحصة</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-base">📚</span>
                  <span className="font-bold">{session.subject_name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-base">👨‍🏫</span>
                  <span className="font-bold">{session.teacher_name}</span>
                </div>
                {session.session_date && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-base">📅</span>
                    <span className="font-bold">{formatDate(session.session_date)}</span>
                  </div>
                )}
                {session.session_time && (
                  <div className="flex items-center gap-2 text-slate-600" dir="ltr">
                    <span className="text-base">🕒</span>
                    <span className="font-bold">{session.session_time}</span>
                  </div>
                )}
                {session.duration && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-base">⏱️</span>
                    <span className="font-bold">{formatDuration(session.duration)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-extrabold text-slate-900 mb-3">💬 المحادثة</h3>
              <div className="bg-slate-50 rounded-2xl p-4 text-center">
                <p className="text-slate-400 text-sm font-bold">المحادثة ستكون متاحة خلال الحصة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
