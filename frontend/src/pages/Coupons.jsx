import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs, Loading, EmptyState } from '../components/common';

function formatDate(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

export default function Coupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', min_amount: '', max_uses: '', expires_at: '' });
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.get('/coupons').then(setCoupons).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await api.post('/coupons', {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_amount: Number(form.min_amount) || 0,
        max_uses: Number(form.max_uses) || null,
        expires_at: form.expires_at || null,
      });
      setMsg('تم إنشاء الكوبون بنجاح');
      setCoupons([res, ...coupons]);
      setForm({ code: '', discount_type: 'percentage', discount_value: '', min_amount: '', max_uses: '', expires_at: '' });
      setShowForm(false);
    } catch (err) {
      setMsg(err?.response?.data?.error || 'حدث خطأ');
    }
  };

  const toggleActive = async (id, current) => {
    try {
      await api.put(`/coupons/${id}`, { active: current ? 0 : 1 });
      setCoupons(coupons.map(c => c.id === id ? { ...c, active: current ? 0 : 1 } : c));
    } catch {}
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons(coupons.filter(c => c.id !== id));
    } catch {}
  };

  if (user?.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-red-600">هذه الصفحة مخصصة لمديري المنصة فقط</p></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'لوحة الإدارة', to: '/admin' }, { label: 'الكوبونات' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">إدارة الكوبونات</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition">
          {showForm ? 'إلغاء' : '+ كوبون جديد'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كود الكوبون</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="مثال: RAMADAN2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع الخصم</label>
              <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500">
                <option value="percentage">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">قيمة الخصم</label>
              <input type="number" min="0" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الحد الأدنى للمبلغ</label>
              <input type="number" min="0" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">أقصى استخدامات</label>
              <input type="number" min="1" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500" placeholder="بلا حد" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الانتهاء</label>
              <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.includes('خطأ') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
          <button type="submit" className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition">حفظ</button>
        </form>
      )}

      {loading ? <Loading /> : coupons.length === 0 ? (
        <EmptyState icon="🏷️" message="لا توجد كوبونات بعد" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-right px-4 py-3 font-medium text-slate-600">الكود</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">النوع</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">القيمة</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">الاستخدامات</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">الانتهاء</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-teal-700">{c.code}</td>
                  <td className="px-4 py-3">{c.discount_type === 'percentage' ? 'نسبة %' : 'مبلغ ثابت'}</td>
                  <td className="px-4 py-3 font-semibold">{c.discount_value}{c.discount_type === 'percentage' ? '%' : ' ر.ع'}</td>
                  <td className="px-4 py-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3">{c.expires_at ? formatDate(c.expires_at) : 'بلا حد'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.active ? 'نشط' : 'معطّل'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => toggleActive(c.id, c.active)} className="text-xs text-slate-500 hover:text-teal-600">
                      {c.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button onClick={() => deleteCoupon(c.id)} className="text-xs text-slate-500 hover:text-red-600">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
