import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input, Select, Breadcrumbs } from '../components/common';

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ name: '', grade: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setForm({ name: user.name || '', grade: user.grade || '' });
    api.get('/grades').then(setGrades).catch(() => {});
    api.get('/subscription/my-subjects').then(setSubs).catch(() => {});
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaved(false);
    setError('');
    try {
      const updated = await api.patch('/subscription/me', { name: form.name, grade: form.grade ? Number(form.grade) : null });
      login(localStorage.getItem('yusr_token'), updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    try {
      await api.post('/subscription/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('تم تغيير كلمة المرور بنجاح');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { setPwMsg(''); setShowPwChange(false); }, 2000);
    } catch (err) {
      setPwError(err.message);
    }
  };

  const deleteAccount = async () => {
    try {
      await api.del('/subscription/me');
      logout();
      navigate('/');
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <Breadcrumbs items={[{ label: 'الملف الشخصي' }]} />
      <div className="flex items-center gap-6 mb-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-800 text-white flex items-center justify-center text-3xl font-black shadow-lg">
          {user.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">{user.name}</h1>
          <p className="text-slate-500" dir="ltr">{user.email}</p>
          <p className="text-slate-400 text-sm" dir="ltr">📱 {user.phone || '—'}</p>
        </div>
      </div>

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      {saved && <div className="mb-5"><Alert type="success">تم حفظ التعديلات بنجاح ✓</Alert></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">🆔</div>
          <p className="text-xs text-slate-500">الدور</p>
          <p className="font-extrabold text-slate-900">{user.role === 'teacher' ? 'معلم' : user.role === 'admin' ? 'إدارة' : 'طالب'}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">🏅</div>
          <p className="text-xs text-slate-500">نقاط يُسر</p>
          <p className="font-extrabold text-amber-600">{user.points || 0}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">🎓</div>
          <p className="text-xs text-slate-500">الصف الدراسي</p>
          <p className="font-extrabold text-slate-900">{user.grade ? `الصف ${user.grade}` : 'غير محدد'}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl mb-2">📚</div>
          <p className="text-xs text-slate-500">مواد مشترك فيها</p>
          <p className="font-extrabold text-slate-900">{subs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-slate-900">📚 اشتراكاتي</h2>
          <Link to="/pricing" className="text-teal-600 font-bold text-sm">إدارة الاشتراك ←</Link>
        </div>
        {subs.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد مواد مشترك فيها بعد.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subs.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                {s.subject_icon} {s.subject_name} ✓
              </span>
            ))}
          </div>
        )}
      </div>

      {subs.length === 0 && (
        <div className="bg-gradient-to-l from-teal-600 to-cyan-700 text-white rounded-3xl p-8 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold mb-1">فعّل اشتراكك الآن</h3>
            <p className="text-teal-100 text-sm">احصل على جميع الحصص والملفات والاختبارات والمراجعات.</p>
          </div>
          <Link to="/pricing" className="bg-amber-400 text-slate-900 font-extrabold px-7 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all">الاشتراك الآن</Link>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <h2 className="text-xl font-extrabold text-slate-900 mb-6">بياناتي الشخصية</h2>
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="الصف الدراسي" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
            <option value="">غير محدد</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button type="submit" className="bg-teal-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-teal-700 transition-colors">حفظ التعديلات</button>
            <Link to="/dashboard" className="bg-slate-100 text-slate-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-slate-200 transition-colors">📊 لوحة الطالب</Link>
            <button type="button" onClick={() => { logout(); navigate('/'); }} className="bg-red-50 text-red-600 font-bold px-8 py-3.5 rounded-2xl hover:bg-red-100 transition-colors">
              تسجيل الخروج
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mt-6">
        <h2 className="text-xl font-extrabold text-slate-900 mb-6">🔔 تفضيلات الإشعارات</h2>
        <div className="space-y-4">
          {[
            { label: 'إشعارات الحصص المباشرة', desc: 'تنبيه عند بدء حصص مباشرة', checked: true },
            { label: 'إشعارات الاختبارات', desc: 'تنبيه عند اختبارات جديدة', checked: true },
            { label: 'إشعارات النقاط', desc: 'تنبيه عند حصولك على نقاط', checked: false },
            { label: 'نشرة البريد الإلكتروني', desc: 'أخبار ومحتوى تعليمي أسبوعياً', checked: false },
          ].map((item, i) => (
            <label key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 transition-colors cursor-pointer">
              <div>
                <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <div className="relative">
                <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-teal-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-full transition-transform" />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mt-6">
        <h2 className="text-xl font-extrabold text-slate-900 mb-6">🔒 الأمان</h2>
        <div className="space-y-3">
          <button onClick={() => setShowPwChange(!showPwChange)} className="w-full text-right p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 transition-colors flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800 text-sm">تغيير كلمة المرور</p>
              <p className="text-xs text-slate-500">آخر تغيير: غير معروف</p>
            </div>
            <span className="text-slate-400">←</span>
          </button>
          {showPwChange && (
            <form onSubmit={changePassword} className="p-4 rounded-2xl bg-slate-50 space-y-3">
              {pwMsg && <Alert type="success">{pwMsg}</Alert>}
              {pwError && <Alert>{pwError}</Alert>}
              <Input type="password" label="كلمة المرور الحالية" value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} required />
              <Input type="password" label="كلمة المرور الجديدة" value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} required />
              <Input type="password" label="تأكيد كلمة المرور الجديدة" value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})} required />
              <div className="flex gap-2">
                <button type="submit" className="bg-teal-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-teal-700 transition">حفظ</button>
                <button type="button" onClick={() => setShowPwChange(false)} className="bg-slate-200 text-slate-700 font-bold px-6 py-2 rounded-xl hover:bg-slate-300 transition">إلغاء</button>
              </div>
            </form>
          )}
          <button className="w-full text-right p-4 rounded-2xl bg-slate-50 transition-colors flex items-center justify-between opacity-60 cursor-not-allowed">
            <div>
              <p className="font-bold text-slate-800 text-sm">التحقق بخطوتين</p>
              <p className="text-xs text-slate-500">قريباً — حماية إضافية لحسابك</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">قريباً</span>
          </button>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-right p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-between">
              <div>
                <p className="font-bold text-red-600 text-sm">حذف الحساب</p>
                <p className="text-xs text-red-400">حذف الحساب نهائياً (لا يمكن التراجع)</p>
              </div>
              <span className="text-red-400">←</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
              <p className="text-red-700 font-bold text-sm">هل أنت متأكد من حذف حسابك؟ جميع بياناتك ستحذف نهائياً.</p>
              <div className="flex gap-2">
                <button onClick={deleteAccount} className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-red-700 transition">نعم، احذف الحساب</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="bg-slate-200 text-slate-700 font-bold px-6 py-2 rounded-xl hover:bg-slate-300 transition">إلغاء</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
