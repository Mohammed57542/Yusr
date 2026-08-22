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
      login(res.token, res.user);
      navigate(params.get('next') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (id, pwd) => {
    setForm({ identifier: id, password: pwd });
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 animate-fade-up">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="يُسر" className="w-16 h-16 mx-auto rounded-3xl object-cover shadow-lg shadow-violet-200 mb-4" />
            <h1 className="text-2xl font-black text-slate-900">تسجيل الدخول</h1>
            <p className="text-sm text-slate-500 mt-1">أهلاً بعودتك إلى يُسر 👋</p>
          </div>

          {error && <div className="mb-5"><Alert>{error}</Alert></div>}

          <form onSubmit={submit} className="space-y-5">
            <Input label="رقم الهاتف أو البريد الإلكتروني" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="91234567 أو student@yusr.edu.om" dir="ltr" required />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-700">كلمة المرور</label>
                <Link to="/forgot-password" className="text-xs font-bold text-violet-600 hover:text-violet-800">نسيت كلمة المرور؟</Link>
              </div>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" dir="ltr" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
              {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 mb-2 text-center">حسابات تجريبية للاستكشاف</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => quickFill('student@yusr.edu.om', 'password123')} className="text-right px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-300 transition-colors text-xs font-bold text-slate-700">
                🎓 طالب — <span dir="ltr">student@yusr.edu.om / password123</span>
              </button>
              <button onClick={() => quickFill('admin@yusr.edu.om', 'password123')} className="text-right px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-300 transition-colors text-xs font-bold text-slate-700">
                ⚙️ إدارة — <span dir="ltr">admin@yusr.edu.om / password123</span>
              </button>
              <button onClick={() => quickFill('teacher@yusr.edu.om', 'password123')} className="text-right px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-300 transition-colors text-xs font-bold text-slate-700">
                👨‍🏫 معلم — <span dir="ltr">teacher@yusr.edu.om / password123</span>
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            ليس لديك حساب؟ <Link to="/register" className="font-extrabold text-violet-600 hover:text-violet-800">أنشئ حسابك مجاناً</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
