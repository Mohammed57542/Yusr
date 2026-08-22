import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, SectionHeader } from '../components/common';

function downloadFile(resource) {
  const header = `${resource.title}\n\nالمادة: ${resource.subject_name} • الصف: ${resource.grade_name}\nالنوع: ${resource.type}\n\n`;
  const blob = new Blob([header + '\n' + (resource.content || '')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reviews() {
  const [params, setParams] = useSearchParams();
  const [reviews, setReviews] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const subject = params.get('subject') || '';

  useEffect(() => { api.get('/subjects').then(setSubjects).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ type: 'مراجعة' });
    if (subject) q.set('subject_id', subject);
    api.get(`/resources?${q}`).then(setReviews).finally(() => setLoading(false));
  }, [subject]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const steps = [
    { icon: '📚', title: 'راجع الملخص', desc: 'ابدأ بمراجعة ملخص المادة الشامل.' },
    { icon: '✏️', title: 'حل النماذج', desc: 'تدرب على نماذج امتحانات سابقة.' },
    { icon: '📝', title: 'اختبر نفسك', desc: 'قيّم مستواك في اختبار نهائي.' },
  ];

  return (
    <div>
      <div className="bg-gradient-to-br from-rose-600 via-pink-700 to-violet-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">المراجعات</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">راجع بذكاء قبل الاختبار</h1>
          <p className="text-pink-100 text-lg max-w-2xl mx-auto">مراجعات شاملة ونماذج امتحانات سابقة مع الحلول، لتكون جاهزاً تماماً في يوم الاختبار.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {steps.map((s, i) => (
            <div key={s.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 text-center relative">
              <span className="absolute top-4 right-6 text-5xl font-black text-slate-100">{i + 1}</span>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-100 flex items-center justify-center text-2xl mb-4 relative">{s.icon}</div>
              <h3 className="font-extrabold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <SectionHeader eyebrow="أحدث المراجعات" title="مراجعات ونماذج جاهزة" />
          <select value={subject} onChange={(e) => updateParam('subject', e.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-400">
            <option value="">جميع المواد</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <EmptyState icon="📚" title="لا توجد مراجعات بعد" description="ستُضاف المراجعات قريباً" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center text-2xl shrink-0">📚</div>
                  <div className="min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold mb-1">مراجعة</span>
                    <h3 className="font-extrabold text-slate-900 leading-6">{r.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-6 line-clamp-2 mb-4 flex-1">{r.description || 'مراجعة شاملة قبل الاختبار.'}</p>
                <p className="text-xs text-slate-400 mb-4">{r.subject_name} • {r.grade_name} • 👁️ {r.views}</p>
                <button onClick={() => downloadFile(r)} className="w-full bg-gradient-to-l from-rose-600 to-pink-600 text-white font-extrabold py-3 rounded-2xl hover:-translate-y-0.5 transition-all">
                  📥 تحميل المراجعة
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white rounded-[2rem] p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">المراجعات المباشرة في الحصص</h2>
          <p className="text-violet-200 max-w-2xl mx-auto mb-8 leading-7">لا تفوّت الحصص المباشرة لمراجعة أهم المواضيع قبل الاختبارات، واطرح أسئلتك مباشرة.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/live-sessions" className="bg-amber-400 text-slate-900 font-extrabold px-8 py-4 rounded-2xl hover:-translate-y-0.5 transition-all">جدول الحصص المباشرة</Link>
            <Link to="/exams" className="bg-white/10 border border-white/25 font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all">اختبر نفسك الآن</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
