import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input } from '../components/common';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.token, res.user, res.refreshToken);
      navigate(params.get('next') || '/dashboard');
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
            <h1 className="text-2xl font-black text-slate-900">تسجيل الدخول</h1>
            <p className="text-sm text-slate-500 mt-1">أهلاً بعودتك إلى يُسر 👋</p>
          </div>

          {error && <div className="mb-5"><Alert>{error}</Alert></div>}

          <form onSubmit={submit} className="space-y-5">
            <Input label="البريد الإلكتروني" type="email" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="you@example.com" dir="ltr" required />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700">كلمة المرور</label>
                <Link to="/forgot-password" className="text-xs font-bold text-teal-600 hover:text-teal-800">نسيت كلمة المرور؟</Link>
              </div>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" dir="ltr" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-teal-600 to-cyan-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-200 disabled:opacity-50">
              {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ليس لديك حساب؟ <Link to="/register" className="font-extrabold text-teal-600 hover:text-teal-800">أنشئ حسابك مجاناً</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
