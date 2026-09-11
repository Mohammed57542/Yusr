import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function Notifications() {
  const [data, setData] = useState({ items: [], total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/notifications')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setData(prev => ({
      ...prev,
      items: prev.items.map(n => n.id === id ? { ...n, read: 1 } : n),
      unread: Math.max(0, prev.unread - 1),
    }));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setData(prev => ({
      ...prev,
      items: prev.items.map(n => ({ ...n, read: 1 })),
      unread: 0,
    }));
  };

  const clearAll = async () => {
    if (!confirm('هل تريد مسح جميع الإشعارات؟')) return;
    await api.del('/notifications');
    setData({ items: [], total: 0, unread: 0 });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

  const typeIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '🔔';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-slate-800">🔔 الإشعارات</h1>
        <div className="flex gap-2">
          {data.unread > 0 && (
            <button onClick={markAllRead} className="text-sm text-teal-600 font-bold hover:underline">
              قراءة الكل ({data.unread})
            </button>
          )}
          {data.items.length > 0 && (
            <button onClick={clearAll} className="text-sm text-red-500 font-bold hover:underline">
              مسح الكل
            </button>
          )}
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔕</div>
          <p className="text-slate-500 font-medium">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                n.read
                  ? 'bg-white border-slate-200'
                  : 'bg-teal-50 border-teal-200 hover:bg-teal-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{typeIcon(n.type)}</span>
                <div className="flex-1">
                  <h3 className={`font-bold text-sm ${n.read ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{n.body}</p>
                  <span className="text-xs text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleDateString('ar-OM')}</span>
                </div>
                {!n.read && <div className="w-2.5 h-2.5 bg-teal-500 rounded-full mt-2" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
