import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert, Input, Select, Breadcrumbs, Loading } from '../components/common';

export default function StudentSettings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', grade: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    exam_reminders: true,
    assignment_reminders: true,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setProfile({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      grade: user.grade || '',
    });
    setNotifications({
      email_notifications: user.email_notifications !== false,
      exam_reminders: user.exam_reminders !== false,
      assignment_reminders: user.assignment_reminders !== false,
    });
    api.get('/grades').then(setGrades).catch(() => {});
    setLoading(false);
  }, [user, navigate]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.patch('/subscription/me', {
        name: profile.name,
        grade: profile.grade ? Number(profile.grade) : null,
      });
      login(localStorage.getItem('yusr_token'), updated);
      setSuccess('تم حفظ التعديلات بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    setPwError('');
    setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('كلمتا المرور غير متطابقتين');
      setPwSaving(false);
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setPwSaving(false);
      return;
    }
    try {
      await api.post('/subscription/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('تم تغيير كلمة المرور بنجاح');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      await api.patch('/subscription/me', notifications);
      setSuccess('تم حفظ تفضيلات الإشعارات');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleNotif = (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    api.patch('/subscription/me', { [key]: next[key] }).catch(() => {});
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

  if (!user || loading) return <Loading />;

  return (
    <div>
      <div className="bg-gradient-to-br from-slate-600 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">حسابي</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">⚙️ الإعدادات</h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">أدِر حسابك وتفضيلاتك الشخصية.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14" dir="rtl">
        <Breadcrumbs items={[{ label: 'الإعدادات' }]} />

        {error && <div className="mb-5"><Alert>{error}</Alert></div>}
        {success && <div className="mb-5"><Alert type="success">{success}</Alert></div>}

        {/* Profile Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center text-2xl font-black shadow-lg">
              {user.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">المعلومات الشخصية</h2>
              <p className="text-sm text-slate-500">حدّث بياناتك الشخصية</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="الاسم الكامل"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={profile.email}
                dir="ltr"
                readOnly
                className="bg-slate-50 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="رقم الهاتف"
                value={profile.phone}
                dir="ltr"
                readOnly
                className="bg-slate-50 cursor-not-allowed"
              />
              <Select
                label="الصف الدراسي"
                value={profile.grade}
                onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
              >
                <option value="">غير محدد</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </div>
            <button type="submit" disabled={saving} className="bg-gradient-to-l from-slate-600 to-slate-800 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-md shadow-slate-200 disabled:opacity-50">
              {saving ? 'جارٍ الحفظ...' : '💾 حفظ التعديلات'}
            </button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">🔒 تغيير كلمة المرور</h2>
          <p className="text-sm text-slate-500 mb-6">لحماية حسابك، اختر كلمة مرور قوية</p>
          {pwError && <div className="mb-4"><Alert>{pwError}</Alert></div>}
          {pwSuccess && <div className="mb-4"><Alert type="success">{pwSuccess}</Alert></div>}
          <form onSubmit={changePassword} className="space-y-5">
            <Input
              type="password"
              label="كلمة المرور الحالية"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                type="password"
                label="كلمة المرور الجديدة"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
              />
              <Input
                type="password"
                label="تأكيد كلمة المرور الجديدة"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={pwSaving} className="bg-gradient-to-l from-slate-600 to-slate-800 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-md shadow-slate-200 disabled:opacity-50">
              {pwSaving ? 'جارٍ التغيير...' : '🔐 تغيير كلمة المرور'}
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">🔔 تفضيلات الإشعارات</h2>
          <p className="text-sm text-slate-500 mb-6">اختر الإشعارات التي تريد تلقيها</p>
          <div className="space-y-4">
            {[
              { key: 'email_notifications', label: 'إشعارات البريد الإلكتروني', desc: 'تلقي تحديثات وتنبيهات عبر البريد' },
              { key: 'exam_reminders', label: 'تذكير الاختبارات', desc: 'تنبيه قبل موعد الاختبار بيوم' },
              { key: 'assignment_reminders', label: 'تذكير الواجبات', desc: 'تنبيه عند اقتراب موعد تسليم الواجب' },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={() => toggleNotif(item.key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-slate-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-full transition-transform" />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Theme Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">🎨 المظهر</h2>
          <p className="text-sm text-slate-500 mb-6">اختر المظهر المفضل لك</p>
          <div className="flex gap-4">
            {[
              { id: 'light', label: '☀️ الوضع الفاتح', desc: 'المظهر الافتراضي' },
              { id: 'dark', label: '🌙 الوضع الداكن', desc: 'قريباً إن شاء الله' },
            ].map((t) => (
              <button
                key={t.id}
                disabled={t.id === 'dark'}
                onClick={() => setTheme(t.id)}
                className={`flex-1 p-5 rounded-2xl border-2 text-right transition-all ${
                  theme === t.id
                    ? 'border-slate-600 bg-slate-50 shadow-md'
                    : t.id === 'dark'
                    ? 'border-slate-100 opacity-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <p className="font-extrabold text-slate-900 text-sm">{t.label}</p>
                <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">⚠️ الحساب</h2>
          <p className="text-sm text-slate-500 mb-6">إدارة حسابك وبياناتك</p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-right p-4 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-red-600 text-sm">حذف الحساب</p>
                <p className="text-xs text-red-400">حذف الحساب نهائياً (لا يمكن التراجع)</p>
              </div>
              <span className="text-red-400">←</span>
            </button>
          ) : (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
              <p className="text-red-700 font-bold text-sm">هل أنت متأكد من حذف حسابك؟ جميع بياناتك ستحذف نهائياً.</p>
              <div className="flex gap-2">
                <button onClick={deleteAccount} className="bg-red-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-red-700 transition">نعم، احذف الحساب</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="bg-slate-200 text-slate-700 font-bold px-6 py-2 rounded-xl hover:bg-slate-300 transition">إلغاء</button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="text-center">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="bg-gradient-to-l from-slate-600 to-slate-800 text-white font-extrabold px-10 py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : '💾 حفظ جميع التعديلات'}
          </button>
        </div>
      </div>
    </div>
  );
}
