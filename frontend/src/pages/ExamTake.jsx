import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, Alert, LockedContent } from '../components/common';

const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const fmtAns = (ans) => Array.isArray(ans)
  ? ans.map((i) => letters[i]).join('، ')
  : (typeof ans === 'string' && !/^\d+$/.test(ans) ? ans : letters[ans] ?? '—');

const fmtCor = (r) => {
  if (r.question_type === 'multi') return JSON.parse(r.correct_index || '[]').map((i) => letters[i]).join('، ');
  return letters[r.correct_index] ?? r.correct_index;
};

export default function ExamTake() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get(`/exams/${id}`).then((d) => {
      setData(d);
      setTimeLeft(d.exam.duration_minutes * 60);
    }).catch((e) => {
      if (e.data?.locked) setLockedInfo(e.data);
      else setData(null);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0 || result) return;
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, result]);

  useEffect(() => {
    if (timeLeft === 0 && data && !result) handleSubmit();
  }, [timeLeft]);

  if (loading) return <Loading />;
  if (lockedInfo) return <LockedContent subjectName={lockedInfo.subject_name} icon="📝🔒" />;
  if (!data) return <EmptyState icon="❌" title="الاختبار غير موجود" />;
  if (result) {
    const pct = result.score;
    const emoji = pct >= 85 ? '🏆' : pct >= 60 ? '🎉' : '💪';
    const qText = (id) => data.questions.find((q) => q.id === id)?.question || `سؤال رقم ${id}`;
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center mb-8 animate-fade-up">
          <div className="text-7xl mb-4">{emoji}</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">{pct >= 85 ? 'ممتاز! أداء رائع' : pct >= 60 ? 'أحسنت! نتيجة جيدة' : 'لا بأس، واصل التدريب'}</h1>
          <div className="flex justify-center items-center gap-6 my-6">
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={pct >= 60 ? '#7c3aed' : '#ef4444'} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 326.7} 326.7`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{pct}%</span>
                <span className="text-xs text-slate-400">النتيجة</span>
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="font-bold text-slate-700">✅ إجابات صحيحة: <span className="text-green-600">{result.correct}</span></p>
              <p className="font-bold text-slate-700">❌ إجابات خاطئة: <span className="text-red-600">{result.total - result.correct}</span></p>
              <p className="font-bold text-slate-700">📊 إجمالي الأسئلة: <span className="text-slate-900">{result.total}</span></p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/exams" className="bg-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors">المزيد من الاختبارات</Link>
            <button onClick={() => window.location.reload()} className="bg-slate-100 text-slate-700 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors">إعادة المحاولة</button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">📋 مراجعة الإجابات</h2>
          <div className="space-y-6">
            {result.detailed.map((r, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${r.correct ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${r.correct ? 'bg-green-500' : 'bg-red-500'}`}>
                    {r.correct ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 mb-1">{i + 1}. {qText(r.id)}</p>
                    <p className="text-sm text-slate-500 mb-2">إجابتك: <b>{r.your_answer !== undefined ? fmtAns(r.your_answer) : 'لم تُجب'}</b> | الصحيحة: <b>{fmtCor(r)}</b></p>
                    <p className="text-sm text-slate-600 bg-white rounded-xl p-3 border border-slate-100">💡 {r.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const q = data.questions[current];
  const answered = Object.keys(answers).length;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = { answers: Object.entries(answers).map(([qid, a]) => ({ id: Number(qid), answer: a })) };
      const res = await api.post(`/exams/${id}/submit`, payload);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-40">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{data.exam.title}</h1>
          <p className="text-sm text-slate-500">{data.exam.subject_name} • {data.exam.grade_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`font-black text-lg ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`} dir="ltr">⏱ {mm}:{ss}</span>
          <span className="text-sm font-bold text-slate-600">{answered} / {data.questions.length} تمت الإجابة</span>
        </div>
      </div>

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}

      <div className="bg-white rounded-full h-2 overflow-hidden mb-6 shadow-sm">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(answered / data.questions.length) * 100}%`,
            background: answered === data.questions.length ? '#10b981' : '#7c3aed'
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="bg-violet-100 text-violet-700 font-bold text-sm px-4 py-1.5 rounded-full">سؤال {current + 1} من {data.questions.length}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{q.difficulty}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-7 leading-9">{q.question}</h2>
            {q.question_type === 'multi' && <p className="text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 mb-4">☑️ اختر كل الإجابات الصحيحة</p>}
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const isMulti = q.question_type === 'multi';
                const selArr = answers[q.id] ?? [];
                const selected = isMulti ? selArr.includes(i) : answers[q.id] === i;
                const toggle = () => {
                  if (isMulti) {
                    setAnswers({ ...answers, [q.id]: selArr.includes(i) ? selArr.filter((x) => x !== i) : [...selArr, i] });
                  } else {
                    setAnswers({ ...answers, [q.id]: q.question_type === 'tf' ? opt : i });
                  }
                };
                return (
                  <button
                    key={i}
                    onClick={toggle}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all ${
                      selected ? 'border-violet-600 bg-violet-50' : 'border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50/50'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 transition-colors ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {isMulti ? (selected ? '✓' : letters[i]) : letters[i]}
                    </span>
                    <span className={`font-medium ${selected ? 'text-violet-900' : 'text-slate-700'}`}>{opt}</span>
                    {selected && <span className="mr-auto text-violet-600 font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="px-6 py-3 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              → السابق
            </button>
            {current < data.questions.length - 1 ? (
              <button onClick={() => setCurrent((c) => c + 1)} className="px-8 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors">
                التالي ←
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="px-8 py-3 rounded-xl bg-green-600 text-white font-extrabold hover:bg-green-700 transition-colors disabled:opacity-50">
                {submitting ? 'جارٍ التصحيح...' : 'إنهاء الاختبار وتسليم'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 h-fit sticky top-32">
          <h3 className="font-extrabold text-slate-900 mb-4 text-sm">خريطة الأسئلة</h3>
          <div className="grid grid-cols-5 gap-2">
            {data.questions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setCurrent(i)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                  answers[item.id] !== undefined ? 'bg-violet-600 text-white' : current === i ? 'bg-violet-100 text-violet-700 border-2 border-violet-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
