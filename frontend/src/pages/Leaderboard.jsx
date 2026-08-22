import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, SectionHeader } from '../components/common';

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('allTime');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/leaderboard').then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  if (data && data.disabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <h2 className="text-2xl font-black text-slate-900 mb-2">لوحة الصدارة غير مفعلة حالياً</h2>
          <p className="text-slate-500 text-sm">تابع دروسك واجمع النقاط، وستعود الصدارة قريباً.</p>
        </div>
      </div>
    );
  }

  const rows = data ? (tab === 'weekly' ? data.weekly : data.allTime) : [];
  const maxPoints = rows.length ? rows[0].points : 0;

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-5xl mb-4">😔</p>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تعذر تحميل الترتيب</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || 'حاول مرة أخرى بعد قليل'}</p>
          <button onClick={() => window.location.reload()} className="bg-violet-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">نقاط يُسر</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">نظام النقاط والترتيب 🏆</h1>
          <p className="text-amber-100 text-lg max-w-2xl mx-auto">اجمع النقاط من المذاكرة وحل الاختبارات، وتنافس مع زملائك للوصول إلى قمة الترتيب الأسبوعي.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="flex justify-center gap-2 mb-10">
          <button onClick={() => setTab('allTime')} className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'allTime' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border border-slate-200 text-slate-600'}`}>
            🏆 الترتيب العام
          </button>
          <button onClick={() => setTab('weekly')} className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all ${tab === 'weekly' ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border border-slate-200 text-slate-600'}`}>
            🔥 هذا الأسبوع
          </button>
        </div>

        <div className="space-y-3 mb-12">
          {rows.length === 0 ? (
            <p className="text-center text-slate-400">لا توجد نتائج بعد — كن أول المتسابقين!</p>
          ) : (
            rows.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-4 rounded-3xl p-5 transition-all ${i === 0 ? 'bg-gradient-to-l from-gold-300 to-gold-500 text-night shadow-xl scale-[1.01]' : 'bg-white border border-slate-100 shadow-sm'}`}>
                <span className="text-3xl w-12 text-center shrink-0">{medals[i] || <span className="text-xl font-black text-slate-400">{i + 1}</span>}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-extrabold truncate ${i === 0 ? 'text-slate-900' : 'text-slate-800'}`}>{r.name}</p>
                  <p className={`text-xs ${i === 0 ? 'text-amber-800' : 'text-slate-400'}`}>{r.activities ? `${r.activities} نشاط هذا الأسبوع` : 'متعلم نشط'}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className={`h-2.5 w-24 sm:w-40 rounded-full overflow-hidden ${i === 0 ? 'bg-white/40' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full ${i === 0 ? 'bg-white' : 'bg-violet-500'}`} style={{ width: `${maxPoints ? (r.points / maxPoints) * 100 : 0}%` }} />
                  </div>
                  <span className={`font-black text-xl w-20 text-center ${i === 0 ? 'text-slate-900' : 'text-violet-700'}`} dir="ltr">{r.points} 🏅</span>
                </div>
              </div>
            ))
          )}
        </div>

        <SectionHeader eyebrow="كيف تجمع النقاط؟" title="طرق كسب النقاط" center />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '🎬', title: '+10 نقاط', desc: 'عند إكمال كل درس مصوّر' },
            { icon: '📝', title: '+20 نقطة', desc: 'عند حل كل اختبار' },
            { icon: '🏆', title: '+30 نقطة', desc: 'مكافأة إضافية عند تجاوز 80% في الاختبار' },
          ].map((x) => (
            <div key={x.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
              <div className="text-3xl mb-3">{x.icon}</div>
              <p className="font-extrabold text-amber-600 text-lg">{x.title}</p>
              <p className="text-sm text-slate-500">{x.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-l from-violet-600 to-purple-700 text-white rounded-[2rem] p-10 text-center">
          <h2 className="text-2xl font-black mb-2">أصحاب أعلى النقاط في نهاية الأسبوع يفوزون بجوائز 🎁</h2>
          <p className="text-violet-100 mb-6">اشترك في جروب صفك لمتابعة إعلان الفائزين كل أسبوع.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/groups" className="bg-amber-400 text-slate-900 font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all">الجروبات المجانية</Link>
            <Link to="/exams" className="bg-white/10 border border-white/25 font-bold px-8 py-3.5 rounded-2xl hover:bg-white/20 transition-all">ابدأ جمع النقاط</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
