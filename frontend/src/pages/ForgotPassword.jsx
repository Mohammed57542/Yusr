import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Alert, Input } from '../components/common';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/send-reset-code', { email });
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/send-reset-code', { email });
      setResendTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      navigate('/login');
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
            <div className="text-5xl mb-4">🔑</div>
            <h1 className="text-2xl font-black text-slate-900">استعادة كلمة المرور</h1>
            <p className="text-sm text-slate-500 mt-1">أدخل بريدك الإلكتروني وسنرسل لك رمزاً لإعادة التعيين.</p>
          </div>

          {error && <div className="mb-5"><Alert>{error}</Alert></div>}
          {step === 2 && (
            <div className="mb-5"><Alert type="info">✅ تم إرسال الرمز إلى {email}. تحقق من بريدك الإلكتروني وأدخل الرمز أدناه.</Alert></div>
          )}

          {step === 1 ? (
            <form onSubmit={sendCode} className="space-y-5">
              <Input label="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-teal-600 to-cyan-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-200 disabled:opacity-50">
                {loading ? 'جارٍ الإرسال...' : 'إرسال رمز إعادة التعيين'}
              </button>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-5">
              <Input label="رمز التحقق" value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))} placeholder="6 أرقام" dir="ltr" required />
              <Input label="كلمة المرور الجديدة" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8 أحرف على الأقل" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-teal-600 to-cyan-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-200 disabled:opacity-50">
                {loading ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
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
            تذكرت كلمة المرور؟ <Link to="/login" className="font-extrabold text-teal-600 hover:text-teal-800">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
