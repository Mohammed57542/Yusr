import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState } from '../components/common';

const TYPES = ['درس', 'وحدة', 'نهائي'];

export default function Exams() {
  const [params, setParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const grade = params.get('grade') || '';
  const subject = params.get('subject') || '';
  const unit = params.get('unit') || '';
  const type = params.get('type') || '';

  useEffect(() => {
    api.get('/grades').then(setGrades).catch(() => {});
    api.get('/subjects').then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (grade) q.set('grade_id', grade);
    if (subject) q.set('subject_id', subject);
    if (unit) q.set('unit_id', unit);
    if (type) q.set('exam_type', type);
    api.get(`/exams?${q}`).then(setExams).finally(() => setLoading(false));
  }, [grade, subject, unit, type]);

  useEffect(() => {
    if (!subject || !grade) { setUnits([]); return; }
    api.get(`/units?subject_id=${subject}&grade_id=${grade}`).then(setUnits).catch(() => setUnits([]));
  }, [subject, grade]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'subject' || key === 'grade') next.delete('unit');
    setParams(next);
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الاختبارات</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">اختبر نفسك وقيّم مستواك</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">اختبارات دروس ووحدات ونهائية مع تصحيح فوري ونتيجة مباشرة وتحليل لأدائك.</p>
          <Link to="/question-bank" className="inline-block mt-6 bg-amber-400 text-slate-900 font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-xl shadow-amber-500/20">
            📝 أو تدرب في بنك الأسئلة
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <select value={grade} onChange={(e) => updateParam('grade', e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">كل الصفوف</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={subject} onChange={(e) => updateParam('subject', e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">كل المواد</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select value={type} onChange={(e) => updateParam('type', e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">كل الأنواع</option>
            {TYPES.map((t) => <option key={t} value={t}>{t === 'نهائي' ? '🏁 نهائي' : t === 'وحدة' ? '📦 وحدة' : '📘 درس'}</option>)}
          </select>
          <select value={unit} onChange={(e) => updateParam('unit', e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">كل الوحدات</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-50 text-violet-700 text-sm font-bold">
            📊 {exams.length} اختبار متاح
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : exams.length === 0 ? (
          <EmptyState icon="📝" title="لا توجد اختبارات مطابقة" description="غيّر الفلاتر أو جرّب مادة أخرى" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((e, i) => (
              <div key={e.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="p-6 border-b border-slate-100" style={{ background: `${e.grade_color}0d` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white shadow-sm">{e.subject_icon}</span>
                      <div>
                        <p className="font-bold text-sm">{e.subject_name}</p>
                        <p className="text-xs text-slate-400">{e.grade_name}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${e.exam_type === 'نهائي' ? 'bg-red-100 text-red-600' : e.exam_type === 'وحدة' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {e.exam_type === 'نهائي' ? '🏁 نهائي' : e.exam_type === 'وحدة' ? '📦 وحدة' : '📘 درس'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 leading-6">{e.title}</h3>
                </div>
                <div className="p-6">
                  {e.unit_name && <p className="text-xs text-violet-700 font-bold mb-3">الوحدة: {e.unit_name}</p>}
                  <p className="text-sm text-slate-500 leading-6 line-clamp-2 mb-4">{e.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-5">
                    <span>❓ {e.question_count} سؤال</span>
                    <span>⏱ {e.duration_minutes} دقيقة</span>
                    <span>💯 {e.question_count} درجة</span>
                  </div>
                  {e.locked ? (
                    <Link to="/pricing" className="block text-center bg-slate-100 text-slate-500 font-extrabold py-3 rounded-2xl hover:bg-slate-200 transition-colors">🔒 للمشتركين في {e.subject_name}</Link>
                  ) : (
                    <Link to={`/exams/${e.id}/take`} className="block text-center bg-violet-600 text-white font-extrabold py-3 rounded-2xl hover:bg-violet-700 transition-colors">
                      ابدأ الاختبار
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
