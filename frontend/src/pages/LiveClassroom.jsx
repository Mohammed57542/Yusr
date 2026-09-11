import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading } from '../components/common';

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

  useEffect(() => {
    setLoading(true);
    api.get(`/live-sessions/${id}`)
      .then(setSession)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (error || !session) return <EmptyState />;

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
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {session.video_url ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
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
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-lg font-extrabold text-slate-400 mb-2">الفيديو غير متاح بعد</p>
            <p className="text-slate-400 text-sm">سيتم رفع فيديو الحصة قريباً.</p>
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
