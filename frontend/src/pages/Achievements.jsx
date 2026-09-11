import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Achievements() {
  const [badges, setBadges] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [levels, setLevels] = useState([]);
  const [pointsLog, setPointsLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/gamification/badges'),
      api.get('/gamification/my-badges'),
      api.get('/gamification/levels'),
      api.get('/gamification/points-log'),
    ]).then(([b, mb, l, p]) => {
      setBadges(b);
      setMyBadges(mb);
      setLevels(l);
      setPointsLog(p);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  const earnedIds = new Set(myBadges.map(b => b.id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">الإنجازات والشارات</h1>

      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4">شاراتي</h2>
        {myBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {myBadges.map(b => (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-cyan-100 text-center">
                <div className="text-3xl mb-2">{b.icon}</div>
                <div className="font-bold text-sm text-slate-800">{b.name}</div>
                <div className="text-xs text-slate-500 mt-1">{b.description}</div>
                <div className="text-xs text-cyan-600 mt-2">✓ تم كسبها</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">لم تُكسب أي شارات بعد. حل الاختبارات وأكمل الدروس لجمع الشارات!</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4">جميع الشارات</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {badges.map(b => (
            <div key={b.id} className={`rounded-xl p-4 text-center ${earnedIds.has(b.id) ? 'bg-white shadow-sm border border-cyan-100' : 'bg-slate-100 opacity-60'}`}>
              <div className="text-3xl mb-2">{b.icon}</div>
              <div className="font-bold text-sm text-slate-800">{b.name}</div>
              <div className="text-xs text-slate-500 mt-1">{b.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4">المستويات</h2>
        <div className="space-y-2">
          {levels.map(l => (
            <div key={l.id} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
              <span className="text-2xl">{l.icon}</span>
              <div className="flex-1">
                <span className="font-bold text-slate-800">{l.name}</span>
                <span className="text-sm text-slate-500 mr-2">— {l.points_required} نقطة</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-700 mb-4">سجل النقاط</h2>
        {pointsLog.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-right">السبب</th><th className="px-4 py-2 text-center">النقاط</th><th className="px-4 py-2 text-right">التاريخ</th></tr></thead>
              <tbody>
                {pointsLog.slice(0, 20).map(p => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">{p.reason}</td>
                    <td className="px-4 py-2 text-center font-bold text-cyan-600">+{p.points}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString('ar-OM')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">لا توجد نقاط مسجلة بعد.</p>
        )}
      </section>

      <Link to="/dashboard" className="inline-block bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition">العودة للوحة التحكم</Link>
    </div>
  );
}
