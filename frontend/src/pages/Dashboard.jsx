import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/common';

function ProgressBar({ pct, color = 'from-violet-500 to-purple-700' }) {
  return (
    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-l ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
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
    api.get('/dashboard').then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;
  if (loading) return <Loading label="جارٍ تحميل لوحة الطالب..." />;
  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-5xl mb-4">😔</p>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تعذر تحميل لوحة الطالب</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || 'حاول مرة أخرى بعد قليل'}</p>
          <button onClick={() => window.location.reload()} className="bg-violet-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const { overallPct, completedCount, totalLessons, subjectProgress, strongest, weakest, nextLesson, latestResults, upcomingSessions, points, mySubjects } = data;

  const greeting = new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مساء الخير' : 'مساء النور';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 text-white flex items-center justify-center text-2xl font-black shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{greeting}، {user.name.split(' ')[0]} 👋</h1>
            <p className="text-sm text-slate-500">{user.grade ? `الصف ${user.grade}` : 'حدّد صفّك من حسابك'} • {user.role === 'teacher' ? 'معلم' : 'طالب'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/my-results" className="bg-white border border-slate-200 text-slate-700 font-bold px-5 py-3 rounded-2xl text-sm hover:border-violet-300 transition-colors">📝 نتائجي</Link>
          <Link to="/profile" className="bg-violet-600 text-white font-bold px-5 py-3 rounded-2xl text-sm hover:bg-violet-700 transition-colors">⚙️ حسابي</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '🏅', value: points, label: 'نقاط يُسر' },
          { icon: '✅', value: `${completedCount}/${totalLessons}`, label: 'درس مكتمل' },
          { icon: '📊', value: `${overallPct}%`, label: 'إجمالي الإنجاز' },
          { icon: '📝', value: latestResults.length, label: 'آخر الاختبارات' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-2xl shrink-0">{s.icon}</div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Link to="/ambassador" className="flex items-center justify-between gap-4 bg-gradient-to-l from-violet-600 via-purple-700 to-fuchsia-700 text-white rounded-3xl p-6 mb-8 hover:-translate-y-0.5 hover:shadow-xl transition-all group">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="font-black text-lg">كن سفيراً ليُسر واكسب المكافآت</p>
            <p className="text-sm text-violet-200">شارك كودك مع أصدقائك واكسب 10٪ من كل اشتراك مؤهل.</p>
          </div>
        </div>
        <span className="shrink-0 bg-white text-violet-700 font-extrabold px-6 py-3 rounded-2xl group-hover:-translate-x-1 transition-transform">افتح لوحة السفراء ←</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">📈 تقدمك في المواد</h2>
            <Link to="/subjects" className="text-violet-600 text-sm font-bold">كل المواد ←</Link>
          </div>
          <div className="space-y-5">
            {subjectProgress.length === 0 ? (
              <p className="text-slate-400 text-sm">لا توجد مواد لصفك بعد.</p>
            ) : (
              subjectProgress.map((p) => (
                <div key={p.subject.id}>
                  <div className="flex items-center justify-between mb-2">
                    <Link to={`/subjects/${p.subject.id}`} className="font-bold text-slate-800 hover:text-violet-700 flex items-center gap-2">
                      <span>{p.subject.icon}</span> {p.subject.name}
                      {p.subject.subscribed && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">مشترك</span>}
                    </Link>
                    <span className="text-xs text-slate-500 font-bold">{p.completed}/{p.total} • {p.percentage}%</span>
                  </div>
                  <ProgressBar pct={p.percentage} />
                </div>
              ))
            )}
          </div>
          {strongest && weakest && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-xs text-green-700 font-bold mb-1">🏆 أقوى موادك</p>
                <p className="font-extrabold text-slate-800">{strongest.subject.icon} {strongest.subject.name} — {strongest.percentage}%</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-4">
                <p className="text-xs text-red-600 font-bold mb-1">📈 يحتاج تركيزاً</p>
                <p className="font-extrabold text-slate-800">{weakest.subject.icon} {weakest.subject.name} — {weakest.percentage}%</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {nextLesson ? (
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-3xl p-6 shadow-lg shadow-violet-200">
              <p className="text-xs font-bold text-violet-200 mb-2">▶ واصل التعلم</p>
              <h3 className="font-extrabold leading-6 mb-1">{nextLesson.title}</h3>
              <p className="text-xs text-violet-200 mb-4">{nextLesson.duration} دقيقة • {nextLesson.level}</p>
              <Link to={`/lessons/${nextLesson.id}`} className="block text-center bg-amber-400 text-slate-900 font-extrabold py-3 rounded-2xl hover:-translate-y-0.5 transition-all">شاهد الدرس التالي</Link>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-3xl p-6 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="font-extrabold mb-1">أكملت كل الدروس!</h3>
              <p className="text-sm text-emerald-100">رائع، الآن راجع واختبر نفسك.</p>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900">📅 الحصص القادمة</h3>
              <Link to="/live-sessions" className="text-violet-600 text-xs font-bold">الكل ←</Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-slate-400">لا توجد حصص قادمة.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                    <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-sm">{s.subject_icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-800 truncate">{s.title}</p>
                      <p className="text-xs text-slate-400" dir="ltr">{s.session_date?.slice(5)} • {s.session_time}</p>
                    </div>
                    <Link to="/live-sessions" className="text-violet-600 text-xs font-black shrink-0">انضم</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">📝 آخر نتائجك</h2>
            <Link to="/my-results" className="text-violet-600 text-sm font-bold">كل النتائج ←</Link>
          </div>
          {latestResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📝</p>
              <p className="text-sm text-slate-500 mb-4">لم تخض أي اختبار بعد</p>
              <Link to="/exams" className="inline-block bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-violet-700 transition-colors">ابدأ أول اختبار</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {latestResults.map((r) => (
                <div key={r.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50">
                  <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-sm">{r.subject_icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{r.title}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{r.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-black shrink-0 ${r.score >= 85 ? 'bg-green-100 text-green-700' : r.score >= 60 ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-600'}`}>{r.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">📚 موادك</h2>
            <Link to="/pricing" className="text-violet-600 text-sm font-bold">الاشتراكات ←</Link>
          </div>
          <div className="space-y-3">
            {mySubjects.map((s) => (
              <Link key={s.id} to={`/subjects/${s.id}`} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 hover:bg-violet-50 transition-colors">
                <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-sm">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.lesson_count} درس</p>
                </div>
                {s.subscribed ? (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black shrink-0">مشترك ✓</span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold shrink-0">مجاني</span>
                )}
              </Link>
            ))}
          </div>
          <Link to="/leaderboard" className="block mt-5 text-center bg-slate-100 text-slate-700 font-bold py-3 rounded-2xl text-sm hover:bg-slate-200 transition-colors">🏆 شاهد ترتيبك في نقاط يُسر</Link>
        </div>
      </div>
    </div>
  );
}
