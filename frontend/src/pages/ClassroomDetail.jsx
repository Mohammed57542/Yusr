import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Alert, Breadcrumbs } from '../components/common';

export default function ClassroomDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [announce, setAnnounce] = useState({ title: '', content: '', priority: 'normal' });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/classrooms/${id}`).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const postAnnouncement = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post(`/classrooms/${id}/announcements`, announce);
      const updated = await api.get(`/classrooms/${id}`);
      setData(updated);
      setAnnounce({ title: '', content: '', priority: 'normal' });
      setShowAnnounce(false);
      setSuccess('تم نشر الإعلان');
    } catch (e) { setError(e.message); }
  };

  if (loading) return <Loading label="جارٍ تحميل الفصل..." />;
  if (!data) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><p className="text-slate-500">الفصل غير موجود</p></div>;

  const tabs = [
    { id: 'overview', label: '📊 نظرة عامة' },
    { id: 'lessons', label: '📚 الدروس' },
    { id: 'students', label: '👥 الطلاب' },
    { id: 'announcements', label: '📢 الإعلانات' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <Breadcrumbs items={[{ label: 'الفصول', href: '/classrooms' }, { label: data.name }]} />

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      {success && <div className="mb-5"><div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 font-bold text-sm">{success}</div></div>}

      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 text-white rounded-3xl p-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">{data.subject_icon || '🏫'}</div>
          <div>
            <h1 className="text-3xl font-black">{data.name}</h1>
            <p className="text-teal-200">{data.subject_name} — {data.grade_name} — {data.semester} الفصل</p>
          </div>
        </div>
        <div className="flex gap-6 mt-6 text-sm">
          <span>👨‍🏫 {data.teacher_name}</span>
          <span>👥 {data.students?.length || 0} طالب</span>
          <span>📚 {data.lessons?.length || 0} درس</span>
          <span>📢 {data.announcements?.length || 0} إعلان</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${tab === t.id ? 'bg-teal-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-4xl font-black text-teal-600">{data.students?.length || 0}</p>
            <p className="text-sm text-slate-500 mt-1">الطلاب</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-4xl font-black text-cyan-600">{data.lessons?.length || 0}</p>
            <p className="text-sm text-slate-500 mt-1">الدروس</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-4xl font-black text-rose-600">{data.announcements?.length || 0}</p>
            <p className="text-sm text-slate-500 mt-1">الإعلانات</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <p className="text-4xl font-black text-emerald-600">{data.academic_year}</p>
            <p className="text-sm text-slate-500 mt-1">السنة الدراسية</p>
          </div>
        </div>
      )}

      {tab === 'lessons' && (
        <div className="space-y-3">
          {data.lessons?.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
              <p className="text-slate-400">لا توجد دروس مرفقة لهذا الفصل بعد.</p>
            </div>
          ) : data.lessons?.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black text-sm">{l.id}</span>
                <div>
                  <p className="font-bold text-slate-800">{l.title}</p>
                  <p className="text-xs text-slate-400">{l.level} • {l.duration} دقيقة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${l.approval_status === 'approved' ? 'bg-green-100 text-green-700' : l.approval_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {l.approval_status === 'approved' ? 'منشور' : l.approval_status === 'pending' ? 'بانتظار المراجعة' : 'مسودة'}
                </span>
                <Link to={`/lessons/${l.id}`} className="text-teal-600 font-bold text-xs hover:underline">فتح</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-right px-6 py-4">الطالب</th>
                <th className="text-right px-6 py-4">البريد</th>
                <th className="text-right px-6 py-4">تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody>
              {data.students?.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                  <td className="px-6 py-4 text-slate-500">{s.email}</td>
                  <td className="px-6 py-4 text-xs text-slate-400" dir="ltr">{new Date(s.enrolled_at).toLocaleDateString('ar-OM')}</td>
                </tr>
              ))}
              {data.students?.length === 0 && <tr><td colSpan="3" className="text-center py-8 text-slate-400">لا يوجد طلاب بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'announcements' && (
        <div className="space-y-4">
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <div className="flex justify-end">
              <button onClick={() => setShowAnnounce(!showAnnounce)} className="bg-teal-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">
                {showAnnounce ? 'إلغاء' : '📢 إعلان جديد'}
              </button>
            </div>
          )}

          {showAnnounce && (
            <form onSubmit={postAnnouncement} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <input value={announce.title} onChange={(e) => setAnnounce({ ...announce, title: e.target.value })} placeholder="عنوان الإعلان" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" required />
              <textarea value={announce.content} onChange={(e) => setAnnounce({ ...announce, content: e.target.value })} placeholder="محتوى الإعلان" rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" required />
              <select value={announce.priority} onChange={(e) => setAnnounce({ ...announce, priority: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="normal">عادي</option><option value="important">مهم</option><option value="urgent">عاجل</option>
              </select>
              <button type="submit" className="bg-teal-600 text-white font-extrabold px-8 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">نشر الإعلان</button>
            </form>
          )}

          {data.announcements?.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
              <p className="text-slate-400">لا توجد إعلانات بعد.</p>
            </div>
          ) : data.announcements?.map((a) => (
            <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${a.priority === 'urgent' ? 'border-red-300' : a.priority === 'important' ? 'border-amber-300' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-slate-900">{a.title}</h3>
                {a.priority === 'urgent' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">عاجل</span>}
                {a.priority === 'important' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">مهم</span>}
              </div>
              <p className="text-sm text-slate-600 mb-2">{a.content}</p>
              <p className="text-xs text-slate-400">{a.author_name} — {new Date(a.created_at).toLocaleString('ar-OM')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
