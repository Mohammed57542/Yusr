import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Loading } from '../components/common';

const FALLBACK = [
  {
    badge: 'الأفضل 🏆',
    title: 'باقة الثلاث مواد بسعر مخفض',
    desc: 'بدلاً من الاشتراك في كل مادة على حدة. احصل على 3 مواد كاملة: الحصص والملخصات والاختبارات والمراجعات.',
    price: 'وفّر حتى 8 ريالات',
    cta: '/pricing',
    color: 'from-violet-600 to-purple-700',
  },
  {
    badge: 'لفترة محدودة ⏰',
    title: 'أول المشتركين في كل شهر يحصلون على هدية',
    desc: 'اشترك في أي خطة وادخل سحب الهدايا الشهرية + جروب مراجعة مكثف خاص بالمشتركين.',
    price: 'لا تفوّتها',
    cta: '/pricing',
    color: 'from-amber-500 to-orange-600',
  },
  {
    badge: 'مستمر 🎉',
    title: 'محتوى مجاني دائماً',
    desc: 'المراجعات، الجروبات، والحصص المفتوحة — كلها مجانية لأي طالب.',
    price: '0 ر.ع',
    cta: '/grades',
    color: 'from-emerald-500 to-green-600',
  },
];

function useCountdown() {
  const calc = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(23, 59, 59, 999);
    target.setDate(target.getDate() + (7 - target.getDay())); // نهاية الأسبوع
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  };
  const [t, setT] = useState(calc());
  useEffect(() => {
    const i = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(i);
  }, []);
  return t;
}

export default function Offers() {
  const { d, h, m, s } = useCountdown();
  const [promos, setPromos] = useState(null);

  useEffect(() => {
    api.get('/offers').then(setPromos).catch(() => setPromos(FALLBACK));
  }, []);

  const offers = promos === null ? [] : (promos.length ? promos.map((p) => ({
    badge: p.badge || 'عرض 🎁',
    title: p.title,
    desc: p.description || '',
    price: p.discount_text || 'عرض خاص',
    cta: '/pricing',
    color: 'from-violet-600 to-purple-700',
  })) : FALLBACK);

  return (
    <div>
      <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">عروض يُسر</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">عروض لفترة محدودة 🎁</h1>
          <p className="text-amber-100 text-lg max-w-2xl mx-auto">اغتنم العروض الحصرية قبل انتهاء الوقت، وابدأ رحلتك نحو التفوق بسعر مناسب.</p>
          <div className="flex justify-center gap-3 mt-10">
            {[d, h, m, s].map((v, i) => (
              <div key={i} className="bg-white/15 border border-white/20 backdrop-blur rounded-2xl w-20 py-4 text-center">
                <p className="text-3xl font-black" dir="ltr">{String(v).padStart(2, '0')}</p>
                <p className="text-xs text-amber-100 mt-1">{['يوم', 'ساعة', 'دقيقة', 'ثانية'][i]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-14">
        {promos === null && <Loading label="جارٍ تحميل العروض..." />}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {offers.map((o, i) => (
            <div key={o.title} className={`bg-gradient-to-br ${o.color} text-white rounded-3xl p-8 flex flex-col relative overflow-hidden hover:-translate-y-1 transition-all shadow-xl animate-fade-up`} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <span className="relative w-fit px-3 py-1.5 rounded-full bg-white/20 border border-white/25 text-xs font-black mb-5">{o.badge}</span>
              <h2 className="relative text-xl font-extrabold leading-7 mb-3 flex-1">{o.title}</h2>
              <p className="relative text-sm text-white/85 leading-7 mb-6">{o.desc}</p>
              <div className="relative mb-6">
                {o.original && <p className="text-sm text-white/60 line-through">{o.original}</p>}
                <p className="text-4xl font-black">{o.price}</p>
              </div>
              <Link to={o.cta} className="relative block text-center bg-white text-slate-900 font-extrabold py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all">احصل على العرض</Link>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white rounded-[2rem] p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">أكثر من مجرد عرض</h2>
          <p className="text-violet-200 max-w-2xl mx-auto mb-8 leading-7">عند الاشتراك تحصل على كل شيء: الحصص المصورة، الملخصات والملفات، بنك الأسئلة، الاختبارات، المراجعات، والحصص المباشرة — لمدة سنة كاملة.</p>
          <Link to="/pricing" className="inline-block bg-amber-400 text-slate-900 font-extrabold px-10 py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-2xl shadow-amber-500/25">اطّلع على خطط الاشتراك</Link>
        </div>
      </div>
    </div>
  );
}
