import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, SectionHeader } from '../components/common';

export default function Grades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/grades').then(setGrades).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">المراحل الدراسية</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">اختر صفّك وابدأ رحلة التفوق</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">محتوى مصمم بعناية لكل صف من الثامن حتى الثاني عشر وفق المنهج العُماني.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        {loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {grades.map((g, i) => (
              <Link key={g.id} to={`/grades/${g.id}`} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-8 animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-5 shadow-lg" style={{ background: g.color }}>
                  {g.id}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-violet-700 transition-colors">{g.name}</h2>
                <p className="text-slate-500 text-sm leading-7 mb-4">{g.tagline}</p>
                <p className="text-slate-400 text-xs mb-6">🎥 {g.lesson_count} درس متاح</p>
                <span className="inline-flex items-center gap-1 text-violet-600 font-bold text-sm group-hover:gap-2 transition-all">
                  الدخول <span>←</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 max-w-3xl mx-auto">
          <SectionHeader eyebrow="لا تعرف من أين تبدأ؟" title="بالتوفيق!" subtitle="إذا كنت مقبلاً على صف جديد، اختر صفّك من الأعلى واستعرض موادّه وحصصه وملخصاته واختباراته — كل شيء جاهز لك." center />
          <div className="bg-gradient-to-l from-emerald-600 to-green-600 text-white rounded-3xl p-8 text-center">
            <p className="font-extrabold text-xl mb-2">أو انضم إلى جروب صفك المجاني</p>
            <p className="text-green-100 text-sm mb-5">أسئلة يومية ومراجعات مجانية مستمرة على واتساب.</p>
            <Link to="/groups" className="inline-block bg-white text-emerald-700 font-extrabold px-8 py-3 rounded-2xl hover:-translate-y-0.5 transition-all">الجروبات المجانية</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
