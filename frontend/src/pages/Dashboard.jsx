import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Breadcrumbs, EmptyState } from '../components/common';

function ProgressBar({ pct, color = 'from-teal-500 to-cyan-600' }) {
  return (
    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-l ${color} transition-all duration-700`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function ScoreBadge({ score }) {
  let cls = 'bg-red-100 text-red-600';
  if (score >= 85) cls = 'bg-green-100 text-green-700';
  else if (score >= 60) cls = 'bg-teal-100 text-teal-700';
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-black shrink-0 ${cls}`}>
      {score}%
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir="rtl">
      <div className="animate-pulse space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
              <div className="h-6 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
            <div className="h-5 w-36 bg-slate-200 rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-48 bg-slate-100 rounded" />
                <div className="h-2.5 w-full bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 h-40" />
            <div className="bg-white rounded-3xl border border-slate-100 p-6 h-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
              <div className="h-5 w-32 bg-slate-200 rounded" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-14 bg-slate-50 rounded-2xl" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/student/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;
  if (loading) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20" dir="rtl">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-5xl mb-4">😔</p>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تعذر تحميل لوحة الطالب</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || 'حاول مرة أخرى بعد قليل'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-teal-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-teal-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const {
    completedLessons = 0,
    averageScore = 0,
    examCount = 0,
    points = 0,
    level = 'مبتدئ',
    nextLevelPoints = 100,
    currentLevelPoints = 0,
    subjectProgress = [],
    upcomingExams = [],
    upcomingSessions = [],
    recentResults = [],
    recommendations = [],
    achievements = [],
  } = data;

  const levelPct = nextLevelPoints > 0
    ? Math.round((currentLevelPoints / nextLevelPoints) * 100)
    : 0;

  const greeting = new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مساء الخير' : 'مساء النور';

  const stats = [
    { icon: '✅', value: completedLessons, label: 'الدروس المكتملة', bg: 'bg-teal-50', color: 'text-teal-600' },
    { icon: '📊', value: `${averageScore}%`, label: 'متوسط الدرجات', bg: 'bg-cyan-50', color: 'text-cyan-600' },
    { icon: '📝', value: examCount, label: 'عدد الاختبارات', bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { icon: '🏅', value: points, label: 'النقاط', bg: 'bg-amber-50', color: 'text-amber-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir="rtl">
      <Breadcrumbs items={[{ label: 'لوحة الطالب' }]} />

      {/* ── Welcome Header ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name?.charAt(0) || '?'
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                {greeting}، {user.name?.split(' ')[0]} 👋
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                  🎓 {level}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  🏅 {points} نقطة
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/my-results" className="bg-white border border-slate-200 text-slate-700 font-bold px-5 py-3 rounded-2xl text-sm hover:border-teal-300 transition-colors">
              📝 نتائجي
            </Link>
            <Link to="/profile" className="bg-teal-600 text-white font-bold px-5 py-3 rounded-2xl text-sm hover:bg-teal-700 transition-colors">
              ⚙️ حسابي
            </Link>
          </div>
        </div>

        {/* Level progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
            <span>التقدم للمستوى التالي</span>
            <span>{currentLevelPoints}/{nextLevelPoints} نقطة</span>
          </div>
          <ProgressBar pct={levelPct} />
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center text-2xl shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/subjects"
          className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-3xl p-6 shadow-lg shadow-teal-200 hover:-translate-y-0.5 transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">📚</div>
          <div>
            <h3 className="font-extrabold text-lg">متابعة التعلم</h3>
            <p className="text-teal-100 text-sm">استعرض دروسك ومواضيعك</p>
          </div>
        </Link>
        <Link
          to="/exams"
          className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl p-6 shadow-lg shadow-amber-200 hover:-translate-y-0.5 transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">📝</div>
          <div>
            <h3 className="font-extrabold text-lg">ابدأ اختباراً</h3>
            <p className="text-amber-100 text-sm">اختبر معلوماتك الآن</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ── Subject Progress ── */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">📈 التقدم في المواد</h2>
            <Link to="/subjects" className="text-teal-600 text-sm font-bold">كل المواد ←</Link>
          </div>
          {subjectProgress.length === 0 ? (
            <EmptyState icon="📭" title="لا توجد مواد مشتراكة" description="اشترك في مواد لتتبع تقدمك هنا" />
          ) : (
            <div className="space-y-5">
              {subjectProgress.map((p) => (
                <div key={p.subject?.id || p.id}>
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      to={`/subjects/${p.subject?.id || p.id}`}
                      className="font-bold text-slate-800 hover:text-teal-700 flex items-center gap-2"
                    >
                      <span>{p.subject?.icon || '📘'}</span>
                      <span>{p.subject?.name || p.name}</span>
                    </Link>
                    <span className="text-xs text-slate-500 font-bold">
                      {p.completed}/{p.total} • {p.percentage}%
                    </span>
                  </div>
                  <ProgressBar pct={p.percentage} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* ── Upcoming Exams (compact) ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm">📝 الاختبارات القادمة</h3>
              <Link to="/exams" className="text-teal-600 text-xs font-bold">الكل ←</Link>
            </div>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد اختبارات قادمة</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.slice(0, 3).map((ex) => (
                  <div key={ex.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                    <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                      {ex.subject_icon || '📝'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-800 truncate">{ex.title}</p>
                      <p className="text-xs text-slate-400">{ex.question_count} سؤال • {ex.duration_minutes} دقيقة</p>
                    </div>
                    <Link
                      to={`/exams/${ex.id}/take`}
                      className="bg-teal-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shrink-0 hover:bg-teal-700 transition-colors"
                    >
                      ابدأ
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Upcoming Sessions ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm">📅 الحصص القادمة</h3>
              <Link to="/live-sessions" className="text-teal-600 text-xs font-bold">الكل ←</Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد حصص قادمة</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                    <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                      {s.subject_icon || '📅'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-800 truncate">{s.title}</p>
                      <p className="text-xs text-slate-400">
                        {s.teacher_name && `${s.teacher_name} • `}
                        {s.session_date?.slice(5)} {s.session_time}
                      </p>
                    </div>
                    <Link
                      to="/live-sessions"
                      className="bg-teal-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shrink-0 hover:bg-teal-700 transition-colors"
                    >
                      انضم
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Results ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-slate-900">🏆 آخر النتائج</h2>
          <Link to="/my-results" className="text-teal-600 text-sm font-bold">كل النتائج ←</Link>
        </div>
        {recentResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm text-slate-500 mb-4">لم تخض أي اختبار بعد</p>
            <Link
              to="/exams"
              className="inline-block bg-teal-600 text-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-teal-700 transition-colors"
            >
              ابدأ أول اختبار
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentResults.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50">
                <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                  {r.subject_icon || '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{r.title}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{r.created_at?.slice(0, 10)}</p>
                </div>
                <ScoreBadge score={r.score} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ── Recommendations ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">💡 التوصيات</h2>
          </div>
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm text-slate-500">أحسنت! لا توجد توصيات حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 4).map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                  <span className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-lg shrink-0">
                    {rec.subject_icon || '📘'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-800 truncate">{rec.title}</p>
                    <p className="text-xs text-slate-400">{rec.subject_name || rec.subject}</p>
                  </div>
                  <Link
                    to={`/lessons/${rec.id}`}
                    className="bg-teal-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shrink-0 hover:bg-teal-700 transition-colors"
                  >
                    ابدأ الآن
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Achievements ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">🏅 الإنجازات</h2>
            {achievements.length > 0 && (
              <Link to="/achievements" className="text-teal-600 text-sm font-bold">عرض الكل ←</Link>
            )}
          </div>
          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm text-slate-500">ابدأ التعلم لتحصل على إنجازات</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 flex-wrap mb-4">
                {achievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-amber-50 min-w-[70px]"
                    title={a.description || a.title}
                  >
                    <span className="text-2xl">{a.icon || '🏅'}</span>
                    <span className="text-[10px] font-bold text-amber-700 text-center leading-tight">
                      {a.title}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/achievements"
                className="block text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-2xl text-sm hover:bg-slate-200 transition-colors"
              >
                عرض الكل 🏆
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
