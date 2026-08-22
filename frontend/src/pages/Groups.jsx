import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Loading } from '../components/common';
import useSettings, { waLink } from '../hooks/useSettings';

export default function Groups() {
  const settings = useSettings();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/groups').then(setGroups).finally(() => setLoading(false)); }, []);

  const benefits = [
    { icon: '❓', title: 'أسئلة يومية', desc: 'سؤال يومي في كل مادة مع الحل' },
    { icon: '📚', title: 'مراجعات مجانية', desc: 'مراجعات قبل الاختبارات' },
    { icon: '🔔', title: 'تنبيهات', desc: 'أول ما يُضاف محتوى جديد' },
    { icon: '🎁', title: 'عروض ومسابقات', desc: 'فرص لربح هدايا' },
  ];

  return (
    <div>
      <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">جروبات مجانية ١٠٠٪</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">جروبات الواتساب لكل صف</h1>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto">انضم لجروب صفك واحصل على أسئلة يومية ومراجعات ومحتوى مجاني مستمر — بدون أي مقابل.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
          {benefits.map((b) => (
            <div key={b.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl mb-4">{b.icon}</div>
              <p className="font-extrabold text-slate-900 mb-1">{b.title}</p>
              <p className="text-xs text-slate-500 leading-5">{b.desc}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((g, i) => (
              <div key={g.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-700 text-white flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-emerald-200">
                  <span className="text-4xl">💬</span>
                </div>
                <div className="flex-1 text-center md:text-right">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1">{g.title}</h3>
                  <p className="text-sm text-slate-500 leading-6 mb-2">{g.description}</p>
                  <p className="text-xs text-slate-400">{g.grade_name} • مجاني بالكامل</p>
                </div>
                <a href={g.link} target="_blank" rel="noreferrer" className="shrink-0 bg-green-600 text-white font-extrabold px-7 py-3.5 rounded-2xl hover:bg-green-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-green-200 whitespace-nowrap">
                  انضم الآن
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 bg-gradient-to-l from-violet-600 to-purple-700 text-white rounded-[2rem] p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">محتوى مجاني يوصلك كل يوم</h2>
          <p className="text-violet-100 max-w-2xl mx-auto mb-8 leading-7">بانضمامك للجروب ستصلك مراجعات يومية، وحصص مجانية دورية، وتنبيهات فورية بكل جديد في منصة يُسر.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={waLink('مرحباً، أرغب بالانضمام إلى جروب صفي', settings)} target="_blank" rel="noreferrer" className="bg-amber-400 text-slate-900 font-extrabold px-8 py-4 rounded-2xl hover:-translate-y-0.5 transition-all">تواصل معنا واتساب</a>
            <a href="https://chat.whatsapp.com/EVph3f87bHo3QZKiCy9yhI" target="_blank" rel="noreferrer" className="bg-white/10 border border-white/25 font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all">جروب الصف الثاني عشر</a>
          </div>
        </div>
      </div>
    </div>
  );
}
