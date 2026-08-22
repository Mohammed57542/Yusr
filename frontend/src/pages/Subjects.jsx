import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, SectionHeader } from '../components/common';
import { useAuth } from '../context/AuthContext';

export default function Subjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [perSubject, setPerSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/subjects').then(setSubjects).finally(() => setLoading(false));
    api.get(`/subscription/plans?grade=${user?.grade ?? 9}`).then((d) => setPerSubject(d.perSubject)).catch(() => {});
  }, [user?.grade]);

  const gradeId = user?.grade || null;
  const visible = gradeId ? subjects.filter((s) => (s.grade_from ?? 8) <= gradeId && (s.grade_to ?? 12) >= gradeId) : subjects;
  const priceOf = (s) => s.price ?? perSubject;

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">المواد</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">{gradeId ? `مواد صفّك (${visible.length})` : '9 مواد — تغطية كاملة'}</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">حصص مصوّرة، ملخصات، بنك أسئلة، اختبارات، ومراجعات لكل مادة وكل صف من ٨ حتى ١٢.</p>
          {!gradeId && (
            <Link to="/grades" className="inline-block mt-6 bg-amber-400 text-slate-900 font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-xl shadow-amber-500/20">
              اختر صفّك أولاً
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        {loading ? (
          <Loading />
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900">{gradeId ? 'مواد متاحة في صفّك' : 'جميع المواد'}</h2>
              <span className="text-sm text-slate-500">{visible.length} مواد</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((s, i) => (
                <div key={s.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-7 animate-fade-up flex flex-col" style={{ animationDelay: `${i * 0.05}s` }}>
                  <Link to={`/subjects/${s.id}${gradeId ? `?grade_id=${gradeId}` : ''}`} className="flex-1">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm group-hover:scale-110 transition-transform" style={{ background: `${s.color}1a` }}>{s.icon}</div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors">{s.name}</h3>
                        <p className="text-xs text-slate-400">🎥 {s.lesson_count} درس متاح • الصفوف {(s.grade_from ?? 8)} - {(s.grade_to ?? 12)}</p>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-6 mb-4">شروحات مبسطة، ملخصات PDF، بنك أسئلة، اختبارات، ومراجعات.</p>
                    <span className="inline-flex items-center gap-1 text-violet-600 font-bold text-sm group-hover:gap-2 transition-all">
                      دخول المادة <span>←</span>
                    </span>
                  </Link>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {s.sample_count > 0 && (
                        <Link to={`/lessons?subject=${s.id}${gradeId ? `&grade_id=${gradeId}` : ''}`} className="text-xs font-black px-2.5 py-1.5 rounded-full bg-gold-100 text-gold-700 border border-gold-300 hover:bg-gold-200 transition-colors">🎁 عينة مجانية</Link>
                      )}
                      <span className="text-sm font-black text-slate-900">{priceOf(s) ? `${priceOf(s)} ر.ع` : '—'} <span className="text-[10px] font-bold text-slate-400">/ سنة</span></span>
                    </div>
                    <Link to={`/pricing?subject=${s.id}&grade=${gradeId ?? ''}`} className="bg-violet-600 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-colors">اشترك في المادة</Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16">
              <SectionHeader eyebrow="تساعدك في" title="لماذا تشترك في مادة؟" center />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
                {[
                  { icon: '🎬', t: 'كل حصص المادة مسجلة' },
                  { icon: '📄', t: 'ملخصات وأوراق عمل ومراجعات' },
                  { icon: '📝', t: 'بنك أسئلة كامل للمادة' },
                  { icon: '📑', t: 'اختبارات دروس ووحدات ونهائية' },
                ].map((x) => (
                  <div key={x.t} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
                    <div className="text-3xl mb-3">{x.icon}</div>
                    <p className="text-sm font-bold text-slate-700">{x.t}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mt-10">
                <Link to="/pricing" className="inline-block bg-violet-600 text-white font-extrabold px-10 py-4 rounded-2xl shadow-lg shadow-violet-200 hover:-translate-y-0.5 transition-all">
                  اطّلع على خطط الاشتراك
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
