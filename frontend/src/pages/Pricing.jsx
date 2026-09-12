import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const SECTIONS = {
  junior: { grade: 9, label: 'الصفوف ٨-١٠', note: 'الصفوف الثامن، التاسع، العاشر' },
  senior: { grade: 11, label: 'الصفوف ١١-١٢', note: 'الصفوف الحادي عشر، الثاني عشر' },
};

const OFFER_META = [
  { id: 'single', icon: '📘', name: 'مادة واحدة', subjects: 1, desc: 'الحصص والملخصات والاختبارات والمراجعات لمادة واحدة.' },
  { id: 'triple', icon: '📚', name: '3 مواد', subjects: 3, desc: 'ثلاث مواد كاملة بسعر مخفض — الخيار الأفضل للتفوق.' },
  { id: 'all', icon: '🎓', name: 'جميع المواد', subjects: null, desc: 'جميع مواد صفك كاملة — وصول غير محدود لكل شيء.' },
];

export default function Pricing() {
  const [section, setSection] = useState('junior');
  const [subjects, setSubjects] = useState([]);
  const [offers, setOffers] = useState({});
  const [perSectionPrice, setPerSectionPrice] = useState({});

  useEffect(() => {
    api.get('/subjects').then(setSubjects).catch(() => {});
    const grade = 9;
    api.get(`/subscription/plans?grade=${grade}`).then((d) => {
      if (d.perSubject) setPerSectionPrice((prev) => ({ ...prev, junior: d.perSubject }));
      setOffers(d.offers || {});
    }).catch(() => {});
    api.get(`/subscription/plans?grade=11`).then((d) => {
      if (d.perSubject) setPerSectionPrice((prev) => ({ ...prev, senior: d.perSubject }));
    }).catch(() => {});
  }, []);

  const gradeRef = SECTIONS[section].grade;
  const sectionSubjects = subjects.filter((s) => (s.grade_from ?? 8) <= gradeRef && (s.grade_to ?? 12) >= gradeRef);

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-700 via-cyan-800 to-night text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الاشتراكات</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">اشترك بالمواد التي تحتاجها فقط</h1>
          <p className="text-teal-200 text-lg max-w-2xl mx-auto">عروض سنوية مخفضة حسب صفك الدراسي، أو اختر بحرية — كل مادة بسعرها.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          {Object.keys(SECTIONS).map((sid) => (
            <button key={sid} onClick={() => setSection(sid)} className={`px-6 py-4 rounded-2xl text-center transition-all border-2 ${section === sid ? 'bg-gradient-to-br from-teal-600 to-cyan-700 text-white border-teal-300 shadow-xl scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'}`}>
              <p className="font-black text-lg">{SECTIONS[sid].label}</p>
              <p className={`text-xs mt-0.5 ${section === sid ? 'text-teal-100' : 'text-slate-400'}`}>المادة {perSectionPrice[sid] ?? (sid === 'senior' ? 20 : 15)} ر.ع / فصل</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {OFFER_META.map((om) => {
            const offer = offers[om.id];
            return (
              <div key={om.id} className="relative text-right rounded-3xl p-7 bg-white border border-slate-200">
                {om.id === 'triple' && (
                  <span className="absolute -top-3 left-6 text-xs font-black px-4 py-1.5 rounded-full shadow-lg bg-amber-100 text-amber-700">الأكثر طلباً 🏆</span>
                )}
                {offer?.saving > 0 && (
                  <span className="absolute -top-3 right-6 bg-emerald-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg">وفّر {offer.saving} ريالات 🎉</span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{om.icon}</span>
                  <h2 className="text-2xl font-extrabold text-slate-900">{om.name}</h2>
                </div>
                <p className="text-sm leading-6 mb-4 min-h-[3rem] text-slate-500">{om.desc}</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-slate-900">{offer?.price ?? '—'}</span>
                  <div className="mb-1">
                    <span className="text-sm font-bold text-slate-500">ر.ع</span>
                    <p className="text-xs text-slate-400">فصل كامل</p>
                  </div>
                  {offer?.original && <span className="mb-1 text-sm line-through text-slate-400">{offer.original} ر.ع</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 max-w-5xl mx-auto mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-slate-900"> أسعار المواد ({SECTIONS[section].label})</h2>
            <span className="text-sm font-bold text-teal-600">{perSectionPrice[section] ?? 15} ر.ع للمادة • فصل كامل</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sectionSubjects.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-1">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-sm font-bold text-slate-700">{s.name}</span>
                <span className="text-xs font-black text-teal-600">{s.price ?? perSectionPrice[section] ?? 15} ر.ع</span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800 rounded-3xl p-10 text-center text-white shadow-2xl">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-3xl font-black mb-3">نظام الدفع قريباً إن شاء الله</h2>
            <p className="text-teal-100 text-lg mb-6 max-w-lg mx-auto leading-8">
              نعمل حالياً على تجهيز بوابة دفع آمنة وسهلة لتتمكن من الاشتراك بسرعة وراحة.
              <br />تابعنا للتحديثات القادمة!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="bg-white text-teal-700 font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg">العودة للرئيسية</Link>
              <Link to="/register" className="bg-white/15 border border-white/30 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/25 transition-all">إنشاء حساب مجاني</Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-8 grid grid-cols-3 gap-4">
          {[{ i: '🎬', t: 'حصص مصورة عالية الجودة' }, { i: '📝', t: 'بنك أسئلة ضخم' }, { i: '🔴', t: 'حصص مباشرة مع المعلمين' }].map((x) => (
            <div key={x.t} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <p className="text-2xl mb-2">{x.i}</p>
              <p className="text-xs font-bold text-slate-600">{x.t}</p>
            </div>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-12 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">📊 مقارنة العروض</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right py-3 px-4 font-extrabold text-slate-900">الميزة</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-600">مادة واحدة</th>
                  <th className="text-center py-3 px-4 font-bold text-teal-700">3 مواد 🏆</th>
                  <th className="text-center py-3 px-4 font-bold text-slate-600">جميع المواد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { feature: 'الحصص المصورة', single: true, triple: true, all: true },
                  { feature: 'الملخصات والكتب', single: true, triple: true, all: true },
                  { feature: 'بنك الأسئلة', single: true, triple: true, all: true },
                  { feature: 'الاختبارات التفاعلية', single: true, triple: true, all: true },
                  { feature: 'الحصص المباشرة', single: 'مادة واحدة', triple: '3 مواد', all: 'جميع المواد' },
                  { feature: 'المساعد الذكي AI', single: 'محدود', triple: 'متوسط', all: 'غير محدود' },
                  { feature: 'الشهادات والإشعارات', single: true, triple: true, all: true },
                ].map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">{row.feature}</td>
                    <td className="text-center py-3 px-4">{row.single === true ? <span className="text-green-500">✓</span> : <span className="text-slate-500">{row.single}</span>}</td>
                    <td className="text-center py-3 px-4 bg-teal-50/50">{row.triple === true ? <span className="text-green-500">✓</span> : <span className="text-teal-600 font-bold">{row.triple}</span>}</td>
                    <td className="text-center py-3 px-4">{row.all === true ? <span className="text-green-500">✓</span> : <span className="text-slate-500">{row.all}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-12 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">❓ الأسئلة الشائعة</h2>
          <div className="space-y-4">
            {[
              { q: 'متى سيتم تفعيل الدفع الإلكتروني؟', a: 'نعمل حالياً على تجهيز بوابة الدفع الآمنة.(Expected) قريباً إن شاء الله — تابعنا للتحديثات!' },
              { q: 'هل يمكنني الاستخدام بدون اشتراك؟', a: 'نعم! يمكنك تصفح المحتوى الأساسي. الاشتراك يفتح لك جميع الحصص والملخصات والاختبارات.' },
              { q: 'هل الاشتراك يشمل جميع الصفوف؟', a: 'لا، كل اشتراك مخصص للصف الدراسي الخاص بك. يمكنك اختيار صفوف 8-10 أو 11-12.' },
              { q: 'كيف أتواصل معكم؟', a: 'يمكنك التواصل معنا عبر صفحة الدعم أو واتساب وسنرد عليك في أقرب وقت.' },
            ].map((item, i) => (
              <details key={i} className="group rounded-2xl border border-slate-200 overflow-hidden">
                <summary className="px-6 py-4 cursor-pointer font-bold text-slate-800 hover:bg-teal-50 transition-colors list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-slate-600 leading-7">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
