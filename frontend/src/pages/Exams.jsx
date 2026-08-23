import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, Breadcrumbs } from '../components/common';

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
  const search = params.get('search') || '';

  const filteredExams = search ? exams.filter((e) => e.title.includes(search) || e.subject_name.includes(search) || e.description.includes(search)) : exams;

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
          <Breadcrumbs items={[{ label: 'الاختبارات' }]} />
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الاختبارات</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">اختبر نفسك وقيّم مستواك</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">اختبارات دروس ووحدات ونهائية مع تصحيح فوري ونتيجة مباشرة وتحليل لأدائك.</p>
          <Link to="/question-bank" className="inline-block mt-6 bg-amber-400 text-slate-900 font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-xl shadow-amber-500/20">
            📝 أو تدرب في بنك الأسئلة
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 ابحث في الاختبارات..."
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm font-bold"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 font-bold">📊 {filteredExams.length} اختبار متاح</span>
            {search && <button onClick={() => updateParam('search', '')} className="text-red-500 hover:text-red-600 font-bold">مسح البحث ✕</button>}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200" />
                    <div><div className="h-3 w-20 bg-slate-200 rounded mb-1" /><div className="h-2 w-14 bg-slate-100 rounded" /></div>
                  </div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                </div>
                <div className="p-6">
                  <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
                  <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded mb-4" />
                  <div className="flex justify-between mb-5">
                    <div className="h-2 w-12 bg-slate-100 rounded" />
                    <div className="h-2 w-16 bg-slate-100 rounded" />
                    <div className="h-2 w-10 bg-slate-100 rounded" />
                  </div>
                  <div className="h-10 bg-slate-200 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
            </div>
            <h3 className="text-gray-500 text-lg font-bold mb-2">لا توجد اختبارات متاحة حالياً</h3>
            <p className="text-gray-400 text-sm">اختبارات ستظهر قريباً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((e, i) => (
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
