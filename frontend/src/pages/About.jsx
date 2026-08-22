import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function About() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/stats').then(setStats).catch(() => {}); }, []);

  const nums = stats ? [
    { v: stats.students.toLocaleString('ar-EG'), l: 'طالب متفوق' },
    { v: stats.lessons, l: 'درس مصوّر' },
    { v: stats.subjects, l: 'مادة دراسية' },
    { v: stats.grades, l: 'صفوف دراسية' },
  ] : [
    { v: '+12,000', l: 'طالب متفوق' },
    { v: '+100', l: 'درس مصوّر' },
    { v: '9', l: 'مواد دراسية' },
    { v: '5', l: 'صفوف دراسية' },
  ];

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">من نحن</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">يُسر — الطريق الأسهل للفهم والنجاح</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">منصة عُمانية هدفها مساعدة كل طالب على فهم دروسه ومذاكرتها بسهولة وبطريقة ممتعة.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-5">قصتنا</h2>
            <p className="text-slate-600 leading-8 mb-4">
              بدأت يُسر من فكرة بسيطة: لماذا يعاني الطالب من المذاكرة رغم توفر الإنترنت؟ الجواب كان ببساطة — لأن المحتوى المنتشر مشتت، غير منظم، ولا يتبع المنهج بشكل دقيق.
            </p>
            <p className="text-slate-600 leading-8 mb-4">
              فجمعنا نخبة من المعلمين المتخصصين في المنهج العُماني، وصممنا منصة واحدة تجمع: الحصص المصورة، الملخصات والملفات، بنك الأسئلة، الاختبارات، المراجعات، والحصص المباشرة — كلها منظمة حسب الصف والوحدة والدرس.
            </p>
            <p className="text-slate-600 leading-8">
              اليوم، يساعد يسر آلاف الطلاب في سلطنة عُمان على فهم دروسهم والتفوق في اختباراتهم.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            {[
              { icon: '🎯', value: 'الرسالة', desc: 'تعليم ميسّر ومنظم لكل طالب' },
              { icon: '👁️', value: 'الرؤية', desc: 'نخبة من طلاب عُمان يتعلمون بذكاء' },
              { icon: '🤝', value: 'قيمنا', desc: 'بساطة، جودة، ومتابعة مستمرة' },
              { icon: '🇴🇲', value: 'وطننا', desc: 'محتوى يعكس هويتنا العُمانية' },
            ].map((x) => (
              <div key={x.value} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
                <div className="text-3xl mb-3">{x.icon}</div>
                <p className="font-extrabold text-violet-700">{x.value}</p>
                <p className="text-sm text-slate-500 mt-1 leading-5">{x.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
          {nums.map((s) => (
            <div key={s.l} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 text-center">
              <p className="text-4xl font-black text-violet-700">{s.v}</p>
              <p className="text-sm text-slate-500 font-medium mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-l from-violet-600 to-purple-700 text-white rounded-[2rem] p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">انضم إلى رحلة التفوق مع يُسر</h2>
          <p className="text-violet-100 max-w-2xl mx-auto mb-8">ابدأ مجاناً الآن، واشترك فقط عندما تريد الوصول الكامل.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="bg-amber-400 text-slate-900 font-extrabold px-10 py-4 rounded-2xl hover:-translate-y-0.5 transition-all">ابدأ الآن</Link>
            <Link to="/pricing" className="bg-white/10 border border-white/25 font-bold px-10 py-4 rounded-2xl hover:bg-white/20 transition-all">الاشتراكات</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
