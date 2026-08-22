import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, Badge, difficultyColor, Alert, LockedContent } from '../components/common';
import { useAuth } from '../context/AuthContext';

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/;

export default function LessonDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [watch, setWatch] = useState({ started: false, last_position: 0, watch_percent: 0 });
  const [favorited, setFavorited] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(null);
  const [message, setMessage] = useState('');
  const videoRef = useRef(null);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    setLockedInfo(null);
    Promise.all([api.get(`/lessons/${id}`), api.get(`/lessons/${id}/related`)])
      .then(([l, r]) => { setLesson(l); setRelated(r); })
      .catch((e) => { if (e.data?.locked) setLockedInfo(e.data); else if (e.message.includes('غير موجود')) setLesson(null); })
      .finally(() => setLoading(false));
  }, [id]);

  const refreshUserState = async () => {
    if (!user) return;
    try {
      const p = await api.get(`/users/${user.id}/progress`);
      setCompleted(p.lesson_ids.includes(Number(id)));
      const detail = (p.details || []).find((d) => d.lesson_id === Number(id));
      if (detail) setWatch({ started: !!detail.started_at, last_position: detail.last_position || 0, watch_percent: detail.watch_percent || 0 });
      const fav = await api.get(`/users/${user.id}/favorites`);
      setFavorited(fav.some((f) => f.id === Number(id)));
    } catch {}
  };

  useEffect(() => { refreshUserState(); }, [id, user]);

  // حفظ تقدم المشاهدة على الخادم (كل 5 ثوانٍ)
  const saveWatch = useCallback(async (pos, pct, done) => {
    if (!user) return;
    const now = Date.now();
    if (!done && now - lastSaveRef.current < 5000) return;
    lastSaveRef.current = now;
    try {
      const res = await api.post(`/progress/${Number(id)}`, { position: pos, percent: pct, completed: done });
      setWatch((w) => ({ started: res.started || w.started, last_position: res.last_position ?? pos, watch_percent: res.watch_percent ?? pct }));
      if (res.completed && !completed) { setCompleted(true); if (res.points) { setEarnedPoints(res.points); setTimeout(() => setEarnedPoints(null), 4000); } }
    } catch {}
  }, [user, id, completed]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    const done = pct >= 90;
    if (done) { saveWatch(v.currentTime, pct, true); return; }
    saveWatch(v.currentTime, pct, false);
  };

  const ytId = lesson?.video_url?.match(YT_REGEX)?.[1];

  if (loading) return <Loading />;
  if (lockedInfo) return <LockedContent subjectName={lockedInfo.subject_name} />;
  if (!lesson) return <EmptyState icon="❌" title="الدرس غير موجود" description="تأكد من الرابط وحاول مرة أخرى" />;

  const subscribed = user ? (user.subscribed_subjects || []).includes(lesson.subject_id) : false;
  const locked = !subscribed;

  const toggleComplete = async () => {
    if (!user) { setMessage('سجّل دخولك أولاً لتتمكن من إكمال الدروس وجمع النقاط'); return; }
    try {
      const res = await api.post(`/progress/${lesson.id}`, { completed: true });
      setCompleted(res.completed);
      if (res.points) { setEarnedPoints(res.points); setTimeout(() => setEarnedPoints(null), 4000); }
    } catch (e) { setMessage(e.message); }
  };

  const toggleFavorite = async () => {
    if (!user) { setMessage('سجّل دخولك أولاً لحفظ الدروس'); return; }
    try {
      const res = await api.post(`/lessons/${lesson.id}/favorite`);
      setFavorited(res.favorited);
    } catch (e) { setMessage(e.message); }
  };

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <Link to={`/subjects/${lesson.subject_id}`} className="text-violet-600 text-sm hover:text-violet-800 mb-4 inline-block">→ مادة {lesson.subject_name}</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-6 bg-black" style={{ aspectRatio: '16/9' }}>
            {!locked ? (
              lesson.video_url ? (
                ytId ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&enablejsapi=1`}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full"
                    src={lesson.video_url}
                    poster={lesson.pdf_url || undefined}
                    controls
                    preload="metadata"
                    onTimeUpdate={onTimeUpdate}
                    onEnded={() => { const v = videoRef.current; if (v) saveWatch(v.duration, 100, true); }}
                    onLoadedMetadata={() => { if (watch.last_position > 5 && videoRef.current) videoRef.current.currentTime = watch.last_position; }}
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${lesson.subject_color}, ${lesson.subject_color}99)` }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                  <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 backdrop-blur flex items-center justify-center text-3xl mb-4">🎬</div>
                  <div className="bg-black/30 backdrop-blur rounded-full px-5 py-2 text-sm font-bold">{lesson.title} • {lesson.duration} دقيقة</div>
                  <p className="text-white/80 text-xs mt-3">سيُرفع فيديو هذا الدرس قريباً — تابع {lesson.teacher_name || 'معلمك'} من هنا</p>
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${lesson.subject_color}, ${lesson.subject_color}99)` }}>
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-2xl font-black mb-2">هذا الدرس للمشتركين في {lesson.subject_name} فقط</h3>
                <p className="text-violet-100 mb-6 max-w-md mx-auto text-center px-4">اشترك بالمادة الآن واحصل على الوصول الكامل لجميع الحصص والملخصات والاختبارات.</p>
                <Link to="/pricing" className="inline-block bg-amber-400 text-slate-900 font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all">اشترك الآن</Link>
              </div>
            )}
            {!locked && watch.started && !completed && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-xs font-bold text-white">
                تقدمك: {watch.watch_percent}% {watch.last_position > 5 && `• استُئنف من ${fmt(watch.last_position)}`}
              </div>
            )}
          </div>

          {message && <div className="mb-5"><Alert type="info">{message}</Alert></div>}
          {earnedPoints && <div className="mb-5"><Alert type="success">🎉 مبروك! أكملت الدرس وحصلت على {earnedPoints} نقطة</Alert></div>}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge>{lesson.subject_name}</Badge>
              <Badge color="bg-slate-100 text-slate-600">{lesson.grade_name}</Badge>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${difficultyColor(lesson.level)}`}>{lesson.level}</span>
              <span className="text-xs text-slate-400 mr-auto">👁️ {lesson.views.toLocaleString('ar-EG')} مشاهدة</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">{lesson.title}</h1>
            {lesson.teacher_name && (
              <p className="text-sm text-slate-500 mb-4">👨‍🏫 إعداد وتقديم: <b className="text-slate-700">{lesson.teacher_name}</b></p>
            )}
            <p className="text-slate-600 leading-8">{lesson.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={toggleComplete} className={`flex items-center justify-center gap-2 rounded-2xl py-4 font-extrabold transition-all ${completed ? 'bg-green-600 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
              {completed ? '✓ أكملت هذا الدرس' : 'أكملت الدرس (+10 نقاط)'}
            </button>
            <button onClick={toggleFavorite} className={`flex items-center justify-center gap-2 rounded-2xl py-4 font-extrabold border-2 transition-all ${favorited ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-slate-200 text-slate-700 hover:border-amber-300'}`}>
              {favorited ? '⭐ محفوظ' : '⭐ احفظ الدرس'}
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
            <h2 className="text-xl font-extrabold text-slate-900 mb-4">🎯 ماذا ستتعلم في هذا الدرس؟</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lesson.description.split('،').filter((x) => x.trim()).map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                  <span className="text-violet-600 mt-0.5">✓</span> {point.trim()}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sticky top-20">
            <h3 className="font-extrabold text-slate-900 mb-4">دروس ذات صلة</h3>
            {related.length === 0 ? <p className="text-sm text-slate-400">لا توجد دروس ذات صلة</p> : (
              <div className="space-y-3">
                {related.map((r) => (
                  <Link key={r.id} to={`/lessons/${r.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50 transition-colors group">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${r.subject_color}1a` }}>{r.subject_icon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-violet-700 leading-5 line-clamp-2">{r.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">👁️ {r.views.toLocaleString('ar-EG')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="border-t border-slate-100 mt-5 pt-5 space-y-2">
              <Link to={`/exams?subject=${lesson.subject_id}`} className="block w-full text-center bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors">📝 اختبر نفسك</Link>
              <Link to={`/question-bank?subject=${lesson.subject_id}`} className="block w-full text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">بنك الأسئلة</Link>
              <Link to="/ai-assistant" className="block w-full text-center bg-gradient-to-l from-emerald-500 to-green-600 text-white font-bold py-3 rounded-xl hover:brightness-110 transition-all">🤖 اسأل مساعد يُسر</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
