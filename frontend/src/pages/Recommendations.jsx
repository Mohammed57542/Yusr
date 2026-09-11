import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recommendations')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">لا توجد توصيات</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-black text-slate-800 mb-2">🎯 توصياتك التعليمية</h1>
      <p className="text-slate-500 mb-8">بناءً على أداءك وتقدمك</p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-red-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-red-600">{data.summary.needsImprovement}</div>
          <div className="text-sm text-red-500 font-medium">مواد تحتاج تحسين</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-amber-600">{data.summary.lessonsToContinue}</div>
          <div className="text-sm text-amber-500 font-medium">دروس معلقة</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-blue-600">{data.summary.questionsToReview}</div>
          <div className="text-sm text-blue-500 font-medium">أسئلة للمراجعة</div>
        </div>
      </div>

      {/* Weak Subjects */}
      {data.weakSubjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📉 مواد تحتاج مزيد اهتمام</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.weakSubjects.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-red-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="font-bold text-slate-800">{s.name}</span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-3 mb-2">
                  <div className="bg-red-500 h-3 rounded-full" style={{ width: `${s.avg_score}%` }} />
                </div>
                <span className="text-sm text-red-600 font-bold">متوسط {Math.round(s.avg_score)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Next Lessons */}
      {data.nextLessons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📚 الدروس التالية</h2>
          <div className="space-y-3">
            {data.nextLessons.map(l => (
              <Link
                key={l.id}
                to={`/lessons/${l.id}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md ${
                  l.started ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'
                }`}
              >
                <span className="text-2xl">{l.subject_icon}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{l.title}</h3>
                  <span className="text-sm text-slate-500">{l.subject_name}</span>
                </div>
                <span className={`text-sm font-bold ${l.started ? 'text-teal-600' : 'text-slate-400'}`}>
                  {l.started ? 'متابعة' : 'ابدأ'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Weak Questions */}
      {data.weakQuestions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">🔄 أسئلة للمراجعة</h2>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <p className="text-amber-700 font-medium mb-3">لديك {data.weakQuestions.length} أسئلة تحتاج مراجعة (间隔重复)</p>
            <Link to="/mistakes" className="inline-block bg-amber-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-600">
              راجع الآن ←
            </Link>
          </div>
        </section>
      )}

      {/* Upcoming Exams */}
      {data.upcomingExams.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📝 اختبارات قادمة</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.upcomingExams.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-2">{e.title}</h3>
                <div className="text-sm text-slate-500 space-y-1">
                  <div>📦 {e.subject_name}</div>
                  <div>⏱️ {e.duration_minutes} دقيقة</div>
                  <div>❓ {e.question_count} سؤال</div>
                </div>
                <Link to={`/exams/${e.id}`} className="mt-3 block text-center bg-teal-500 text-white font-bold py-2 rounded-xl hover:bg-teal-600 text-sm">
                  ابدأ الاختبار
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="text-center mt-6">
        <Link to="/dashboard" className="text-teal-600 font-bold hover:underline">← العودة للوحة التحكم</Link>
      </div>
    </div>
  );
}
