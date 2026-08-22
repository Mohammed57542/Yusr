import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input } from '../components/common';

const SECTIONS = {
  junior: { grade: 9, label: 'قسم ٨-١٠', note: 'الصفوف الثامن، التاسع، العاشر' },
  senior: { grade: 11, label: 'قسم ١١-١٢', note: 'الصفوف الحادي عشر، الثاني عشر' },
};

const OFFER_META = [
  { id: 'single', icon: '📘', name: 'مادة واحدة', subjects: 1, desc: 'الحصص والملخصات والاختبارات والمراجعات لمادة واحدة.' },
  { id: 'triple', icon: '📚', name: '3 مواد', subjects: 3, desc: 'ثلاث مواد كاملة بسعر مخفض — الخيار الأفضل للتفوق.' },
  { id: 'all', icon: '🎓', name: 'جميع المواد', subjects: null, desc: 'جميع مواد صفك كاملة — وصول غير محدود لكل شيء.' },
];

export default function Pricing() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [promos, setPromos] = useState([]);
  const [section, setSection] = useState('junior');
  const [offers, setOffers] = useState({});
  const [perSubject, setPerSubject] = useState(15);
  const [perSectionPrice, setPerSectionPrice] = useState({});
  const [mode, setMode] = useState('free');
  const [selected, setSelected] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [referralCode, setReferralCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/subjects').then((list) => {
      setSubjects(list);
      const preSubject = Number(searchParams.get('subject'));
      const preGrade = Number(searchParams.get('grade'));
      if (preSubject && list.some((s) => s.id === preSubject)) {
        if (preGrade) setSection(preGrade >= 11 ? 'senior' : 'junior');
        setSelected([preSubject]);
        setMode('free');
      }
    }).catch(() => {});
    api.get('/offers').then(setPromos).catch(() => {});
    if (user?.grade) setSection(user.grade >= 11 ? 'senior' : 'junior');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get(`/subscription/plans?grade=${SECTIONS[section].grade}`).then((d) => {
      if (d.perSubject) {
        setPerSubject(d.perSubject);
        setPerSectionPrice((prev) => ({ ...prev, [section]: d.perSubject }));
      }
      setOffers(d.offers || {});
      setMode('free');
      setSelected([]);
    }).catch(() => {});
  }, [section]);

  const sectionMeta = SECTIONS[section];
  const mySection = user?.grade ? (user.grade >= 11 ? 'senior' : 'junior') : null;
  const activeOffer = mode !== 'free' ? offers[mode] : null;
  const total = activeOffer ? activeOffer.price : selected.reduce((acc, id) => acc + (subjects.find((s) => s.id === id)?.price ?? perSubject), 0);
  const gradeRef = SECTIONS[section].grade;
  const sectionSubjects = subjects.filter((s) => (s.grade_from ?? 8) <= gradeRef && (s.grade_to ?? 12) >= gradeRef);

  const chooseOffer = (id) => {
    setMode(id);
    const n = id === 'all' ? sectionSubjects.length : OFFER_META.find((o) => o.id === id).subjects;
    if (n >= sectionSubjects.length) setSelected(sectionSubjects.map((s) => s.id));
    else setSelected(sectionSubjects.slice(0, n).map((s) => s.id));
    setError('');
  };

  const chooseFree = () => {
    setMode('free');
    setError('');
  };

  const toggleSubject = (id) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (activeOffer && next.length !== activeOffer.subjects) {
        setMode('free');
      }
      return next;
    });
  };

  const openPayment = () => {
    if (!user) { navigate('/login?next=/pricing'); return; }
    if (activeOffer && selected.length !== activeOffer.subjects) {
      setError(`عرض ${activeOffer.name} يشمل ${activeOffer.subjects === 1 ? 'مادة واحدة' : `${activeOffer.subjects} مواد`} بالضبط`);
      return;
    }
    if (!activeOffer && selected.length === 0) { setError('اختر مادة واحدة على الأقل'); return; }
    setError('');
    setShowPayment(true);
  };

  const pay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    try {
      await api.post('/subscription/subscribe', { plan: activeOffer ? mode : undefined, subject_ids: selected, referral_code: referralCode });
      const me = await api.get('/subscription/me');
      login(token, me);
      setShowPayment(false);
      setDone(true);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const planLabel = activeOffer ? activeOffer.name : (selected.length === 1 ? 'مادة واحدة' : `${selected.length} مواد`);

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-10 animate-fade-up">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">مبروك! تم تفعيل اشتراكك</h1>
          <p className="text-slate-500 mb-2">أنت الآن مشترك في: <b className="text-slate-800">{subjects.filter((s) => selected.includes(s.id)).map((s) => s.name).join('، ')}</b></p>
          <p className="text-sm text-slate-400 mb-8">{planLabel} • {sectionMeta.label} — أهلاً بك في يُسر!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/dashboard')} className="bg-violet-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">📊 ابدأ المذاكرة الآن</button>
            <Link to="/grades" className="bg-slate-100 text-slate-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-slate-200 transition-colors">استعرض الصفوف</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">الاشتراكات</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">اشترك بالمواد التي تحتاجها فقط</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">عروض سنوية مخفضة حسب قسمك الدراسي، أو اختر بحرية — كل مادة بسعرها.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-center">
            <p className="text-amber-800 font-bold">يجب تسجيل الدخول للاشتراك.</p>
            <div className="flex justify-center gap-3 mt-3">
              <Link to="/login?next=/pricing" className="text-amber-900 font-extrabold underline">تسجيل الدخول</Link>
              <span className="text-amber-600">أو</span>
              <Link to="/register" className="text-amber-900 font-extrabold underline">إنشاء حساب</Link>
            </div>
          </div>
        )}

        {promos.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 mb-8 -mx-4 px-4">
            {promos.map((p) => (
              <div key={p.id} className="min-w-[260px] shrink-0 bg-gradient-to-l from-fuchsia-600 via-violet-700 to-indigo-800 text-white rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black bg-white/20 border border-white/25 rounded-full px-3 py-1">{p.badge}</span>
                  <span className="text-[10px] font-bold text-violet-200">فترة محدودة</span>
                </div>
                <h3 className="font-extrabold text-lg leading-7 mb-1">{p.title}</h3>
                <p className="text-sm text-violet-200 leading-6">{p.description}</p>
                {p.discount_text && <p className="mt-2 inline-block text-xs font-black bg-amber-400 text-slate-900 rounded-full px-3 py-1">{p.discount_text}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          {Object.keys(SECTIONS).map((sid) => (
            <button key={sid} onClick={() => setSection(sid)} className={`px-6 py-4 rounded-2xl text-center transition-all border-2 ${section === sid ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white border-violet-300 shadow-xl scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300'}`}>
              <p className="font-black text-lg">{SECTIONS[sid].label}</p>
              <p className={`text-xs mt-0.5 ${section === sid ? 'text-violet-100' : 'text-slate-400'}`}>المادة {perSectionPrice[sid] ?? (sid === 'senior' ? 20 : 15)} ر.ع / سنة</p>
              {mySection === sid && <span className={`inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full ${section === sid ? 'bg-white/20' : 'bg-violet-100 text-violet-700'}`}>قسمك الدراسي ✓</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-6">
          {OFFER_META.map((om) => {
            const offer = offers[om.id];
            const active = mode === om.id;
            return (
              <button key={om.id} onClick={() => chooseOffer(om.id)} className={`relative text-right rounded-3xl p-7 transition-all ${active ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl ring-2 ring-violet-300 scale-[1.02]' : 'bg-white border border-slate-200 hover:border-violet-300'}`}>
                {om.id === 'triple' && (
                  <span className={`absolute -top-3 left-6 text-xs font-black px-4 py-1.5 rounded-full shadow-lg ${active ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-700'}`}>الأكثر طلباً 🏆</span>
                )}
                {offer?.saving > 0 && (
                  <span className="absolute -top-3 right-6 bg-emerald-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg">وفّر {offer.saving} ريالات 🎉</span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{om.icon}</span>
                  <h2 className={`text-2xl font-extrabold ${active ? 'text-white' : 'text-slate-900'}`}>{om.name}</h2>
                </div>
                <p className={`text-sm leading-6 mb-4 min-h-[3rem] ${active ? 'text-violet-100' : 'text-slate-500'}`}>{om.desc}</p>
                <div className="flex items-end gap-3">
                  <span className={`text-5xl font-black ${active ? 'text-white' : 'text-slate-900'}`}>{offer?.price ?? '—'}</span>
                  <div className="mb-1">
                    <span className={`text-sm font-bold ${active ? 'text-violet-200' : 'text-slate-500'}`}>ر.ع</span>
                    <p className={`text-xs ${active ? 'text-violet-200' : 'text-slate-400'}`}>سنة كاملة</p>
                  </div>
                  {offer?.original && <span className={`mb-1 text-sm line-through ${active ? 'text-violet-200' : 'text-slate-400'}`}>{offer.original} ر.ع</span>}
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={chooseFree} className={`block w-full max-w-5xl mx-auto mb-8 rounded-3xl p-6 transition-all text-right border-2 ${mode === 'free' ? 'border-fuchsia-500 bg-gradient-to-l from-violet-600 via-purple-700 to-fuchsia-700 text-white shadow-xl ring-2 ring-fuchsia-300' : 'bg-white border-slate-200 hover:border-violet-300 text-slate-800'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🖐️</span>
              <div>
                <p className={`font-black text-xl ${mode === 'free' ? 'text-white' : 'text-slate-900'}`}>أو اختر بحرية — كل مادة بسعرها</p>
                <p className={`text-sm ${mode === 'free' ? 'text-violet-200' : 'text-slate-500'}`}>سعر المادة الواحدة في {sectionMeta.label}: <b className={mode === 'free' ? 'text-white' : 'text-slate-800'}>{perSubject} ر.ع</b> — اختر أي عدد من المواد</p>
              </div>
            </div>
            <div className={`text-center rounded-2xl px-6 py-3 ${mode === 'free' ? 'bg-white/15 border border-white/25' : 'bg-slate-50 border border-slate-200'}`}>
              <p className={`text-xs ${mode === 'free' ? 'text-violet-100' : 'text-slate-400'}`}>الإجمالي ({selected.length})</p>
              <p className={`text-3xl font-black ${mode === 'free' ? 'text-white' : 'text-slate-900'}`}>{total} <span className="text-sm font-bold opacity-70">ر.ع</span></p>
            </div>
          </div>
        </button>

        {error && <div className="max-w-5xl mx-auto mb-5"><Alert>{error}</Alert></div>}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-slate-900">اختر موادك ({selected.length}{activeOffer ? `/${activeOffer.subjects}` : ''})</h2>
            <span className="text-sm font-bold text-violet-600">{activeOffer ? `عرض ${activeOffer.name}` : `${perSubject} ر.ع للمادة`} • {sectionMeta.label}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {sectionSubjects.map((s) => {
              const isOn = selected.includes(s.id);
              const disabled = activeOffer && !isOn && selected.length >= activeOffer.subjects;
              return (
                <button key={s.id} onClick={() => toggleSubject(s.id)} disabled={disabled} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${isOn ? 'border-violet-600 bg-violet-50' : disabled ? 'border-slate-100 opacity-40 cursor-not-allowed' : 'border-slate-100 hover:border-violet-300 hover:bg-violet-50/40'}`}>
                  <span className="text-2xl">{s.icon}</span>
                  <span className={`text-sm font-bold ${isOn ? 'text-violet-800' : 'text-slate-700'}`}>{s.name}</span>
                  <span className={`text-xs font-black ${isOn ? 'text-violet-600' : 'text-slate-400'}`}>{s.price ?? perSubject} ر.ع</span>
                  <span className={`w-6 h-6 mt-1 rounded-full border-2 flex items-center justify-center text-sm ${isOn ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300'}`}>{isOn ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-slate-500">الإجمالي للدفع ({planLabel}) — سنة كاملة</p>
              <p className="text-3xl font-black text-slate-900">{total} <span className="text-base font-bold text-slate-500">ر.ع</span></p>
            </div>
            <div className="text-left text-xs text-slate-400 space-y-1">
              <p>✅ الحصص المصورة والملفات</p>
              <p>✅ بنك الأسئلة والاختبارات</p>
              <p>✅ المراجعات والحصص المباشرة</p>
            </div>
          </div>

          <button onClick={openPayment} disabled={selected.length === 0} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed">
            الدفع والتفعيل الآن 💳
          </button>
          <p className="text-center text-xs text-slate-400 mt-4">الدفع آمن ومشفّر • دفع إلكتروني آمن 100%</p>
        </div>

        <div className="max-w-5xl mx-auto mt-12 grid grid-cols-3 gap-4">
          {[{ i: '✅', t: 'دفع آمن ومشفّر' }, { i: '💳', t: 'بطاقات الائتمان والخصم' }, { i: '🤝', t: 'دعم سريع على واتساب' }].map((x) => (
            <div key={x.t} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <p className="text-2xl mb-2">{x.i}</p>
              <p className="text-xs font-bold text-slate-600">{x.t}</p>
            </div>
          ))}
        </div>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-8 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-slate-900">💳 الدفع الآمن</h2>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-700 text-xl font-black">✕</button>
            </div>
            {error && <div className="mb-4"><Alert>{error}</Alert></div>}
            <div className="bg-violet-50 rounded-2xl p-5 mb-6">
              <p className="text-sm text-violet-700 font-bold">{planLabel} — {sectionMeta.label} • {subjects.filter((s) => selected.includes(s.id)).map((s) => s.name).join('، ')}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{total} ر.ع <span className="text-sm font-bold text-slate-400">/ سنة</span></p>
            </div>
            <form onSubmit={pay} className="space-y-4">
              <div>
                <Input label="كود السفير (اختياري)" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="مثال: YUSR-AHMED1" dir="ltr" />
                <p className="text-xs text-slate-400 mt-1.5">لديك كود؟ أدخله هنا ويدعم صديقك الذي دعاك 🎁</p>
              </div>
              <Input label="اسم صاحب البطاقة" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="الاسم كما يظهر على البطاقة" required />
              <Input label="رقم البطاقة" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d]/g, '').slice(0, 16) })} placeholder="0000 0000 0000 0000" dir="ltr" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="تاريخ الانتهاء" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.replace(/[^\d/]/g, '').slice(0, 5) })} placeholder="MM/YY" dir="ltr" required />
                <Input label="CVV" type="password" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} placeholder="•••" dir="ltr" required />
              </div>
              <button type="submit" disabled={processing} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
                {processing ? 'جارٍ معالجة الدفع...' : `تأكيد الدفع — ${total} ر.ع`}
              </button>
              <p className="text-center text-xs text-slate-400">هذه واجهة تجريبية، لن يتم خصم أي مبلغ فعلي.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
