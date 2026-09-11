import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = user?.role === 'teacher' || user?.role === 'admin'
      ? '/analytics/teacher/overview'
      : '/analytics/student/overview';
    api.get(endpoint)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">لا توجد بيانات</div>;

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-black text-slate-800 mb-8">
        {isTeacher ? '📊 إحصائيات المعلمين' : '📊 تحليل أداءي'}
      </h1>

      {!isTeacher ? (
        <>
          {/* Student Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon="📚" label="الدروس المكتملة" value={`${data.completedLessons}/${data.totalLessons}`} sub={`${data.completionRate}%`} color="bg-teal-50 text-teal-700" />
            <StatCard icon="📝" label="الاختبارات" value={data.totalExams} sub={`متوسط ${data.avgScore}%`} color="bg-amber-50 text-amber-700" />
            <StatCard icon="⭐" label="النقاط" value={data.totalPoints} color="bg-indigo-50 text-indigo-700" />
            <StatCard icon="🔥" label="أيام متتالية" value={data.streak} color="bg-red-50 text-red-700" />
          </div>

          {data.subjectPerformance?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="font-bold text-slate-800 mb-4">أداء المواد</h3>
              <div className="space-y-3">
                {data.subjectPerformance.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{s.icon}</span>
                    <span className="flex-1 font-medium text-slate-700">{s.name}</span>
                    <span className="text-sm text-slate-500">{s.exams_taken} اختبار</span>
                    <div className="w-32 bg-slate-100 rounded-full h-3">
                      <div className={`h-3 rounded-full ${s.avg_score >= 80 ? 'bg-green-500' : s.avg_score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, s.avg_score)}%` }} />
                    </div>
                    <span className="font-bold text-sm w-12 text-center">{Math.round(s.avg_score)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recentResults?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4">آخر النتائج</h3>
              <div className="space-y-2">
                {data.recentResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="font-medium text-slate-800">{r.exam_title}</span>
                      <span className="text-sm text-slate-500 mr-2">{r.subject_name}</span>
                    </div>
                    <span className={`font-bold ${r.score >= 80 ? 'text-green-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {r.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Teacher Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon="🎬" label="الدروس" value={data.lessonsCount} color="bg-teal-50 text-teal-700" />
            <StatCard icon="📝" label="الاختبارات" value={data.examsCount} color="bg-amber-50 text-amber-700" />
            <StatCard icon="👥" label="الطلاب" value={data.studentCount} color="bg-indigo-50 text-indigo-700" />
            <StatCard icon="📊" label="متوسط الدرجات" value={`${data.avgStudentScore}%`} color="bg-green-50 text-green-700" />
          </div>

          {data.topStudents?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="font-bold text-slate-800 mb-4">🏆 أفضل الطلاب</h3>
              <div className="space-y-2">
                {data.topStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                      <span className="font-medium text-slate-800">{s.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-teal-600">{Math.round(s.avg_score)}%</span>
                      <span className="text-xs text-slate-500 mr-2">{s.exams_taken} اختبار</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <Link to={isTeacher ? '/teacher/dashboard' : '/dashboard'} className="text-teal-600 font-bold hover:underline">← العودة للوحة التحكم</Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = 'bg-slate-50 text-slate-700' }) {
  return (
    <div className={`rounded-2xl p-5 ${color} shadow-sm`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-sm font-medium opacity-80">{label}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );
}
