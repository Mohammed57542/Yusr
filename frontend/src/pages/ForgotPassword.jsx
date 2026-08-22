import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Alert, Input } from '../components/common';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone });
      setDevCode(res.dev_code || '');
      setStep(2);
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
      await api.post('/auth/forgot-password', { phone, otp, newPassword });
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
            <p className="text-sm text-slate-500 mt-1">أدخل رقم هاتفك المرتبط بحسابك وسنرسل لك رمزاً للتحقق.</p>
          </div>

          {error && <div className="mb-5"><Alert>{error}</Alert></div>}
          {devCode && step === 2 && (
            <div className="mb-5"><Alert type="info">✅ تم إرسال الرمز إلى {phone}. رمز التجربة: <b dir="ltr">{devCode}</b></Alert></div>
          )}

          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-5">
              <Input label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 8))} placeholder="91234567" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
                {loading ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-5">
              <Input label="رمز التحقق" value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 5))} placeholder="5 أرقام" dir="ltr" required />
              <Input label="كلمة المرور الجديدة" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
                {loading ? 'جارٍ الحفظ...' : 'تغيير كلمة المرور'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-700">← تغيير الرقم</button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            تذكرت كلمة المرور؟ <Link to="/login" className="font-extrabold text-violet-600 hover:text-violet-800">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
