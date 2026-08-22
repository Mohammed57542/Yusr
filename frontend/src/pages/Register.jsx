import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input } from '../components/common';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', grade: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(form.phone)) { setError('أدخل رقم هاتف صحيح من 8 أرقام'); return; }
    setError('');
    setSendingOtp(true);
    try {
      const res = await api.post('/auth/send-otp', { phone: form.phone });
      setOtpSent(true);
      setDevCode(res.dev_code || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        grade: form.grade ? Number(form.grade) : null,
        otp: form.otp,
      });
      login(res.token, res.user);
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
            <img src="/logo.png" alt="يُسر" className="w-16 h-16 mx-auto rounded-3xl object-cover shadow-lg shadow-violet-200 mb-4" />
            <h1 className="text-2xl font-black text-slate-900">إنشاء حساب جديد</h1>
            <p className="text-sm text-slate-500 mt-1">ابدأ رحلتك مع يُسر مجاناً 🚀</p>
          </div>

          {error && <div className="mb-5"><Alert>{error}</Alert></div>}
          {otpSent && devCode && (
            <div className="mb-5"><Alert type="info">
              ✅ تم إرسال رمز التحقق إلى {form.phone}. <br />
              رمز التجربة (بيئة تجريبية): <b className="font-black" dir="ltr">{devCode}</b>
            </Alert></div>
          )}

          <form onSubmit={otpSent ? submit : sendOtp} className="space-y-5">
            {otpSent ? (
              <>
                <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: أحمد البلوشي" required />
                <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 8) })} placeholder="91234567" dir="ltr" required />
                <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" dir="ltr" required />
                <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="6 أحرف على الأقل" dir="ltr" required />
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">الصف الدراسي</label>
                  <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all">
                    <option value="">اختر صفك</option>
                    {[9, 10, 11, 12].map((g) => <option key={g} value={g}>الصف {g}</option>)}
                  </select>
                </div>
                <Input label="رمز التحقق" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/[^\d]/g, '').slice(0, 5) })} placeholder="5 أرقام" dir="ltr" required />
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
                  {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
                </button>
                <button type="button" onClick={() => setOtpSent(false)} className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-700">← العودة لتغيير الرقم</button>
              </>
            ) : (
              <>
                <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 8) })} placeholder="مثال: 91234567" dir="ltr" required />
                <p className="text-xs text-slate-400 -mt-2">سنتحقق من رقم هاتفك برمز عبر رسالة نصية.</p>
                <button type="submit" disabled={sendingOtp} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
                  {sendingOtp ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
                </button>
              </>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            لديك حساب؟ <Link to="/login" className="font-extrabold text-violet-600 hover:text-violet-800">سجّل الدخول</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
