import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Alert } from '../components/common';
import useSettings, { DEFAULT_INSTAGRAM } from '../hooks/useSettings';

const STEPS = [
  { icon: '🎁', title: 'احصل على كودك الخاص', desc: 'كل طالب له كود سفير خاص به يظهر تلقائياً في هذه الصفحة.' },
  { icon: '📣', title: 'شاركه مع أصدقائك', desc: 'أرسل الكود لأصدقائك وزملائك عبر واتساب أو انستغرام.' },
  { icon: '💰', title: 'اكسب المكافآت', desc: 'كل اشتراك مؤهل يكتمل بكودك يضيف مكافأة تلقائياً لحسابك.' },
];

export default function Ambassador() {
  const { user, loading: authLoading } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login?next=/ambassador'); return; }
    Promise.all([api.get('/ambassador/me'), api.get('/ambassador/referrals')])
      .then(([d, r]) => { setData(d); setReferrals(r); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (!user) return null;
  if (loading) return <Loading label="جارٍ تحميل لوحة السفراء..." />;
  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-5xl mb-4">😔</p>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تعذر تحميل لوحة السفراء</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || 'حاول مرة أخرى بعد قليل'}</p>
          <button onClick={() => window.location.reload()} className="bg-violet-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const shareText = encodeURIComponent(`مرحباً 👋 سجّل في منصة يُسر التعليمية عُماني، واستخدم كود السفير ${data.code} أثناء الاشتراك! 🎁`);
  const waLink = `https://wa.me/${(settings.whatsapp_number) || '96877353192'}?text=${shareText}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const stats = [
    { icon: '🔑', label: 'كودي', value: data.code },
    { icon: '👥', label: 'إجمالي الإحالات', value: data.total },
    { icon: '✅', label: 'اشتراكات مؤهلة', value: data.qualified },
    { icon: '💰', label: `المكافآت (ر.ع)`, value: data.reward },
  ];

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">برنامج سفراء يُسر</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">ذاكر واستفد… واكسب</h1>
          <p className="text-violet-100 text-lg max-w-2xl mx-auto">شارك كودك مع أصدقائك، واكسب مكافأة على كل اشتراك مؤهل يتم بكودك — وتابع كل شيء من لوحة تحكمك.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p dir="ltr" className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 md:p-10 mb-10">
          <h2 className="text-2xl font-black text-slate-900 mb-2">كود السفير الخاص بك</h2>
          <p className="text-slate-500 mb-6 text-sm">شارك هذا الكود، واكسب {`10٪`} من قيمة كل اشتراك مؤهل.</p>
          <div className="flex flex-col md:flex-row items-stretch gap-4">
            <div dir="ltr" className="flex-1 bg-gradient-to-l from-violet-50 to-purple-50 border-2 border-dashed border-violet-300 rounded-2xl flex items-center justify-center py-5 text-3xl font-black tracking-widest text-violet-700">{data.code}</div>
            <div className="flex flex-wrap gap-3">
              <button onClick={copy} className="bg-violet-600 text-white font-extrabold px-7 py-4 rounded-2xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200">
                {copied ? '✓ تم النسخ' : '📋 نسخ الكود'}
              </button>
              <a href={waLink} target="_blank" rel="noreferrer" className="bg-green-600 text-white font-extrabold px-7 py-4 rounded-2xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200">💬 شارك واتساب</a>
              <a href={(settings.instagram_url) || DEFAULT_INSTAGRAM} target="_blank" rel="noreferrer" className="bg-gradient-to-l from-pink-600 to-purple-600 text-white font-extrabold px-7 py-4 rounded-2xl hover:brightness-110 transition-colors shadow-lg shadow-pink-200">📸 شارك انستغرام</a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 relative overflow-hidden">
              <span className="absolute -top-4 -left-2 text-[7rem] font-black text-violet-50 select-none">{i + 1}</span>
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl mb-4 relative">{s.icon}</div>
              <h3 className="font-extrabold text-slate-900 mb-1 relative">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-6 relative">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-l from-violet-600 to-purple-700 text-white rounded-[2rem] p-8 mb-10">
          <h3 className="text-xl font-black mb-4">📜 قواعد المكافآت</h3>
          <ul className="space-y-2 text-sm leading-7 text-violet-100">
            <li>• تكسب {`10٪`} من قيمة الاشتراك المؤهل (مثال: مادة واحدة 20 ر.ع = مكافأة 2 ر.ع، و4 مواد 80 ر.ع = 8 ر.ع).</li>
            <li>• يُحتسب الاشتراك فقط عند إتمامه بنجاح باستخدام كودك.</li>
            <li>• لا يمكنك استخدام كودك الخاص.</li>
            <li>• تُحدَّث إحصائياتك تلقائياً في هذه اللوحة.</li>
          </ul>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-5">📋 سجل إحالاتك</h2>
        {referrals.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-extrabold text-slate-700 mb-1">لا توجد إحالات بعد</p>
            <p className="text-sm text-slate-500 mb-6">شارك كودك وابدأ بكسب المكافآت.</p>
            <Link to="/pricing" className="inline-block bg-violet-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">تصفح الاشتراكات</Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm">
                  <th className="px-6 py-4 font-bold">الطالب</th>
                  <th className="px-6 py-4 font-bold">الصف</th>
                  <th className="px-6 py-4 font-bold">قيمة الاشتراك</th>
                  <th className="px-6 py-4 font-bold">مكافأتك</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-violet-50/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{r.student_name}</td>
                    <td className="px-6 py-4 text-slate-500">الصف {r.student_grade || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{r.amount} ر.ع</td>
                    <td className="px-6 py-4 font-extrabold text-green-600">+{r.reward} ر.ع</td>
                    <td className="px-6 py-4"><span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">مؤهل ✓</span></td>
                    <td className="px-6 py-4 text-slate-400 text-sm" dir="ltr">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 text-center bg-slate-50 rounded-3xl p-8">
          <p className="font-extrabold text-slate-700 mb-1">جاهز تبدأ؟</p>
          <p className="text-sm text-slate-500 mb-5">ادعُ أصدقاءك الآن، وتابع مكافآتك من هذه اللوحة.</p>
          <Link to="/pricing" className="inline-block bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200">اشترك الآن</Link>
        </div>
      </div>
    </div>
  );
}
