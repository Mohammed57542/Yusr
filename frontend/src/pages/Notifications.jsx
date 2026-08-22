import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState } from '../components/common';

const ICONS = { session: '🔔', exam: '📝', resource: '📖', offer: '🎁', subscription: '✅', info: 'ℹ️' };

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get('/notifications').then(setNotifs).finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const readAll = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifs((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch {}
  };

  if (!user) return null;
  if (loading) return <Loading />;

  const unread = notifs.filter((n) => !n.read).length;

  const formatDate = (iso) => (iso ? String(iso).replace('T', ' ').slice(0, 16) : '');

  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">🔔 الإشعارات</h1>
          <p className="text-slate-500 mt-1">{unread > 0 ? `${unread} إشعارات غير مقروءة` : 'لا توجد إشعارات جديدة'}</p>
        </div>
        {unread > 0 && <button onClick={readAll} className="bg-violet-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">تحديد الكل كمقروء</button>}
      </div>

      {notifs.length === 0 ? (
        <EmptyState icon="🔔" title="لا توجد إشعارات" description="ستصلك تنبيهات الحصص والاختبارات والملفات الجديدة هنا" />
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <div key={n.id} className={`bg-white rounded-3xl border p-5 flex items-start gap-4 transition-all ${n.read ? 'border-slate-100 opacity-70' : 'border-violet-200 shadow-md'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${n.read ? 'bg-slate-100' : 'bg-violet-100'}`}>
                {ICONS[n.type] || 'ℹ️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900">{n.title}</h3>
                  {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0" />}
                </div>
                <p className="text-sm text-slate-500 leading-6 mt-1">{n.body}</p>
                <p className="text-xs text-slate-400 mt-2" dir="ltr">{formatDate(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/live-sessions" className="text-violet-600 font-bold text-sm">تفقّد الحصص القادمة ←</Link>
      </div>
    </div>
  );
}
