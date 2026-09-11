import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input } from '../components/common';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', grade: '', code: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendCode = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('أدخل بريد إلكتروني صحيح');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await api.post('/auth/send-email-code', { email: form.email });
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const resendCode = async () => {
    if (resendTimer > 0) return;
    setSending(true);
    try {
      const res = await api.post('/auth/send-email-code', { email: form.email });
      setResendTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const verifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email: form.email, code: form.code });
      const res = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        grade: form.grade ? Number(form.grade) : null,
        code: form.code,
      });
      login(res.token, res.user, res.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 animate-fade-up">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="يُسر" className="w-16 h-16 mx-auto rounded-3xl object-cover shadow-lg shadow-teal-200 mb-4" />
            <h1 className="text-2xl font-black text-slate-900">إنشاء حساب جديد</h1>
            <p className="text-sm text-slate-500 mt-1">ابدأ رحلتك مع يُسر 🚀</p>
          </div>

          {error && <div className="mb-5"><Alert>{error}</Alert></div>}

          {step === 2 && (
            <div className="mb-5">
              <Alert type="info">✅ تم إرسال رمز التحقق إلى <b>{form.email}</b></Alert>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={sendCode} className="space-y-5">
              <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" dir="ltr" required />
              <p className="text-xs text-slate-400 -mt-2">سنرسل لك رمز تحقق من 6 أرقام إلى بريدك الإلكتروني.</p>
              <button type="submit" disabled={sending} className="w-full bg-gradient-to-l from-teal-600 to-cyan-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-200 disabled:opacity-50">
                {sending ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyAndRegister} className="space-y-5">
              <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: أحمد البلوشي" required />
              <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8 أحرف على الأقل" dir="ltr" required />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">الصف الدراسي</label>
                <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all">
                  <option value="">اختر صفك</option>
                  {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>الصف {g}</option>)}
                </select>
              </div>
              <Input label="رمز التحقق" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^\d]/g, '').slice(0, 6) })} placeholder="6 أرقام" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-teal-600 to-cyan-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-200 disabled:opacity-50">
                {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-sm font-bold text-slate-500 hover:text-slate-700">← تغيير البريد</button>
                <button type="button" onClick={resendCode} disabled={resendTimer > 0} className="text-sm font-bold text-teal-600 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed">
                  {resendTimer > 0 ? `إعادة الإرسال بعد ${resendTimer}s` : 'إعادة إرسال الرمز'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            لديك حساب؟ <Link to="/login" className="font-extrabold text-teal-600 hover:text-teal-800">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
