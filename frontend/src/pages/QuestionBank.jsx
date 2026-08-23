import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, Alert, Select, LockedContent } from '../components/common';

const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const fmtAns = (ans) => Array.isArray(ans)
  ? ans.map((i) => letters[i]).join('، ')
  : (typeof ans === 'string' && !/^\d+$/.test(ans) ? ans : letters[ans] ?? '—');

const fmtCor = (r) => {
  if (r.question_type === 'multi') return JSON.parse(r.correct_index || '[]').map((i) => letters[i]).join('، ');
  return letters[r.correct_index] ?? r.correct_index;
};

const DIFFICULTY = [
  { value: '', label: 'كل المستويات', color: 'bg-slate-100 text-slate-600' },
  { value: 'مبتدئ', label: 'مبتدئ', color: 'bg-green-100 text-green-700' },
  { value: 'متوسط', label: 'متوسط', color: 'bg-amber-100 text-amber-700' },
  { value: 'متقدم', label: 'متقدم', color: 'bg-red-100 text-red-700' },
];

export default function QuestionBank() {
  const [params] = useSearchParams();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState(params.get('grade') ? Number(params.get('grade')) : '');
  const [subject, setSubject] = useState(params.get('subject') ? Number(params.get('subject')) : '');
  const [unit, setUnit] = useState('');
  const [lesson, setLesson] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);

  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedInfo, setLockedInfo] = useState(null);
  const [noResults, setNoResults] = useState(false);

  useEffect(() => {
    api.get('/grades').then(setGrades).catch(() => {});
    api.get('/subjects').then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!subject || !grade) { setUnits([]); return; }
    api.get(`/units?subject_id=${subject}&grade_id=${grade}`).then(setUnits).catch(() => setUnits([]));
    api.get(`/lessons?subject_id=${subject}&grade_id=${grade}`).then(setLessons).catch(() => setLessons([]));
  }, [subject, grade]);

  const start = async () => {
    if (!grade || !subject) { setError('اختر الصف والمادة أولاً'); return; }
    setError('');
    setNoResults(false);
    setLoading(true);
    setResult(null);
    setAnswers({});
    try {
      const q = new URLSearchParams({ grade_id: grade, subject_id: subject, limit: count });
      if (unit) q.set('unit_id', unit);
      if (lesson) q.set('lesson_id', lesson);
      if (difficulty) q.set('difficulty', difficulty);
      const res = await api.get(`/questions?${q}`);
      if (res.questions.length === 0) {
        setNoResults(true);
        setSession(null);
        setSession(null);
      } else {
        setSession(res.questions);
      }
    } catch (e) {
      if (e.data?.locked) { setLockedInfo(e.data); setSession(null); }
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/questions/verify', { answers: Object.entries(answers).map(([id, a]) => ({ id: Number(id), answer: a })) });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">بنك الأسئلة</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">درب نفسك على أسئلة المنهج</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">اختر صفّك ومادتك ووحدتك ومستوى الصعوبة، واحصل على أسئلة عشوائية مع تصحيح فوري وشرح الإجابات.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {lockedInfo && <LockedContent subjectName={lockedInfo.subject_name} icon="❓🔒" />}

        {!lockedInfo && !session ? (
          <>
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-3 flex-1 last:flex-none">
                  <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${step === s ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > s ? '✓' : s}
                  </span>
                  <span className={`font-bold text-sm hidden sm:block ${step === s ? 'text-violet-700' : 'text-slate-400'}`}>
                    {s === 1 ? 'الصف' : s === 2 ? 'المادة والوحدة' : 'الخيارات'}
                  </span>
                  {s < 3 && <div className={`flex-1 h-1 rounded-full mx-2 ${step > s ? 'bg-green-500' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>

            {error && <div className="mb-5"><Alert>{error}</Alert></div>}

            {noResults && (
              <div className="mb-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                  </div>
                  <h3 className="text-gray-500 text-lg font-bold mb-2">لا توجد أسئلة متاحة</h3>
                  <p className="text-gray-400 text-sm mb-4">أسئلة ستضاف قريباً</p>
                  <button onClick={() => setNoResults(false)} className="bg-violet-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">تعديل الفلاتر</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2">اختر صفّك</h2>
                  <p className="text-sm text-slate-500 mb-6">خطوة 1 من 3</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {grades.map((g) => (
                      <button key={g.id} onClick={() => { setGrade(g.id); setStep(2); }} className={`group p-6 rounded-3xl border-2 text-center transition-all ${grade === g.id ? 'border-violet-600 bg-violet-50' : 'border-slate-100 hover:border-violet-300 hover:bg-violet-50/40'}`}>
                        <div className="w-12 h-12 mx-auto rounded-2xl text-white text-xl font-black flex items-center justify-center mb-3" style={{ background: g.color }}>{g.id}</div>
                        <p className="font-extrabold text-slate-800">{g.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">اختر المادة والوحدة</h2>
                      <p className="text-sm text-slate-500">خطوة 2 من 3</p>
                    </div>
                    <button onClick={() => setStep(1)} className="text-violet-600 text-sm font-bold">← تغيير الصف</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {subjects.map((s) => (
                      <button key={s.id} onClick={() => { setSubject(s.id); setUnit(''); setLesson(''); }} className={`p-5 rounded-2xl border-2 flex items-center gap-3 transition-all ${subject === s.id ? 'border-violet-600 bg-violet-50' : 'border-slate-100 hover:border-violet-300 hover:bg-violet-50/40'}`}>
                        <span className="text-2xl">{s.icon}</span>
                        <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                      </button>
                    ))}
                  </div>
                  {subject && (
                    <>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">الوحدة (اختياري)</label>
                      <select value={unit} onChange={(e) => { setUnit(e.target.value); setLesson(''); }} className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                        <option value="">كل الوحدات</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 mt-5">الدرس (اختياري)</label>
                      <select value={lesson} onChange={(e) => setLesson(e.target.value)} className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-slate-200 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                        <option value="">كل الدروس</option>
                        {lessons.filter((l) => !unit || String(l.unit_id) === String(unit)).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                      <div className="mt-8">
                        <button onClick={() => setStep(3)} className="bg-violet-600 text-white font-extrabold px-10 py-4 rounded-2xl hover:bg-violet-700 transition-colors">التالي: اختر الخيارات ←</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">اضبط خيارات التدريب</h2>
                      <p className="text-sm text-slate-500">خطوة 3 من 3</p>
                    </div>
                    <button onClick={() => setStep(2)} className="text-violet-600 text-sm font-bold">← السابق</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">مستوى الصعوبة</label>
                      <div className="flex flex-wrap gap-2">
                        {DIFFICULTY.map((d) => (
                          <button key={d.value} onClick={() => setDifficulty(d.value)} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${difficulty === d.value ? 'bg-violet-600 text-white shadow-lg' : `border border-slate-200 ${d.color} hover:border-violet-400`}`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Select label="عدد الأسئلة" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                      {[5, 10, 15, 20].map((c) => <option key={c} value={c}>{c} أسئلة</option>)}
                    </Select>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-sm text-slate-600 leading-7">
                    📋 ستحصل على <b>{count}</b> سؤال عشوائي في {subjects.find((s) => s.id === subject)?.name} {unit ? `— وحدة ${units.find((u) => u.id === Number(unit))?.name}` : '(كل الوحدات)'}.
                    <br />🏅 التصحيح فوري مع شرح لكل إجابة.
                  </div>
                  <button onClick={start} disabled={loading} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50">
                    {loading ? 'جارٍ تجهيز الأسئلة...' : 'ابدأ التدريب الآن 🚀'}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : result ? (
          <div className="animate-fade-up">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center mb-8">
              <div className="text-7xl mb-4">{result.score / result.total >= 0.85 ? '🏆' : result.score / result.total >= 0.6 ? '🎉' : '💪'}</div>
              <h1 className="text-3xl font-black text-slate-900 mb-4">
                أجبتم على {result.score} من {result.total} بشكل صحيح
              </h1>
              <div className="flex justify-center items-center gap-6 my-6">
                <div className="relative w-36 h-36">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={result.score / result.total >= 0.6 ? '#7c3aed' : '#ef4444'} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(result.score / result.total) * 326.7} 326.7`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-900">{Math.round((result.score / result.total) * 100)}%</span>
                    <span className="text-xs text-slate-400">النتيجة</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => { setSession(null); setResult(null); setAnswers({}); setStep(1); }} className="bg-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors">تدريب جديد</button>
                <button onClick={() => { setSession(null); setResult(null); setAnswers({}); start(); }} className="bg-slate-100 text-slate-700 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors">إعادة بنفس الخيارات</button>
                <Link to="/exams" className="bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-amber-500 transition-colors">جرّب الاختبارات</Link>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h2 className="text-xl font-extrabold text-slate-900 mb-5">📋 مراجعة الإجابات</h2>
              <div className="space-y-6">
                {result.results.map((r, i) => (
                  <div key={i} className={`rounded-2xl border p-5 ${r.correct ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${r.correct ? 'bg-green-500' : 'bg-red-500'}`}>{r.correct ? '✓' : '✗'}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 mb-1">{i + 1}. {r.question}</p>
                        <p className="text-sm text-slate-500 mb-2">إجابتك: <b>{r.your_answer !== undefined ? fmtAns(r.your_answer) : 'لم تُجب'}</b> | الصحيحة: <b>{fmtCor(r)}</b></p>
                        {r.explanation && <p className="text-sm text-slate-600 bg-white rounded-xl p-3 border border-slate-100">💡 {r.explanation}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {error && <div className="mb-5"><Alert>{error}</Alert></div>}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6 sticky top-16 z-40">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">تدريب في {subjects.find((s) => s.id === subject)?.name}</h1>
                  <p className="text-sm text-slate-500">{grades.find((g) => g.id === grade)?.name}{unit ? ` • ${units.find((u) => u.id === Number(unit))?.name}` : ''}{difficulty ? ` • ${difficulty}` : ''}</p>
                </div>
                <span className="font-bold text-sm text-slate-600">✅ {answeredCount} / {session.length}</span>
              </div>
            </div>

            <div className="space-y-6 mb-6">
              {session.map((q, qi) => (
                <div key={q.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-violet-100 text-violet-700 font-bold text-sm px-4 py-1.5 rounded-full">سؤال {qi + 1}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${q.difficulty === 'مبتدئ' ? 'bg-green-100 text-green-700' : q.difficulty === 'متوسط' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{q.difficulty}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-5 leading-8">{q.question}</h3>
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
                        <button key={i} onClick={toggle} className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all ${selected ? 'border-violet-600 bg-violet-50' : 'border-slate-100 hover:border-violet-300 hover:bg-violet-50/40'}`}>
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{isMulti ? (selected ? '✓' : letters[i]) : letters[i]}</span>
                          <span className={`font-medium ${selected ? 'text-violet-900' : 'text-slate-700'}`}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={submit} disabled={loading} className="w-full bg-gradient-to-l from-green-600 to-emerald-600 text-white font-extrabold py-5 rounded-3xl hover:-translate-y-0.5 transition-all shadow-xl shadow-green-200 disabled:opacity-50 text-lg">
              {loading ? 'جارٍ التصحيح...' : `تصحيح إجاباتي (${answeredCount} / ${session.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
