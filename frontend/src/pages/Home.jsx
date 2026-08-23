import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { SectionHeader, Stat, Badge, difficultyColor, SkeletonCard, SkeletonHero } from '../components/common';

function Hero() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/grades').then(setGrades).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonHero />;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-violet-700 to-night text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full bg-amber-400 blur-3xl" />
      </div>
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      <div className="max-w-7xl mx-auto px-4 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center relative">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-6">
            🇴🇲 المنهج العُماني • الصف ٨ حتى ١٢
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6">
            تعلّم بطريقة أسهل
            <span className="block text-transparent bg-clip-text bg-gradient-to-l from-gold-200 to-gold-400">مع يُسر</span>
          </h1>
          <p className="text-lg text-violet-100 leading-relaxed mb-8 max-w-xl">
            منصة تعليمية لطلاب المدارس في سلطنة عُمان — تجمع الدروس والاختبارات والموارد والحصص ومتابعة التقدم في مكان واحد.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/grades" className="bg-gold-400 text-night font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-gold-500/25 hover:-translate-y-1 hover:shadow-gold-400/40 transition-all">
              ابدأ التعلم
            </Link>
            <Link to="/subjects" className="bg-white/10 border border-white/25 font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all backdrop-blur">
              استكشف المواد
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 mt-10">
            {grades.map((g) => (
              <Link key={g.id} to={`/grades/${g.id}`} className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors">
                {g.name.replace('الصف', 'صف')}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden lg:block animate-floaty">
          <div className="relative">
            <div className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gold-400 flex items-center justify-center text-xl">🎯</div>
                <div>
                  <p className="font-extrabold">5 خطوات للتفوق</p>
                  <p className="text-sm text-violet-200">من التسجيل إلى النتائج</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { n: '1', t: 'اختر صفّك', d: 'من الصف الثامن حتى الثاني عشر' },
                  { n: '2', t: 'اختر مادتك', d: 'تصفح المواد المتاحة لصفك' },
                  { n: '3', t: 'شاهد الدرس', d: 'دروس مسجلة بجودة عالية' },
                  { n: '4', t: 'اختبر نفسك', d: 'بنك أسئلة واختبارات فورية' },
                  { n: '5', t: 'تابع تقدمك', d: 'لوحات تحكم ونتائج لحظية' },
                ].map((s) => (
                  <div key={s.n} className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <span className="w-9 h-9 rounded-xl bg-amber-400 text-slate-900 font-black flex items-center justify-center shrink-0">{s.n}</span>
                    <div>
                      <p className="font-bold">{s.t}</p>
                      <p className="text-sm text-violet-200">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/stats').then(setStats).catch(() => {}); }, []);

  if (!stats) {
    return (
      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8 animate-pulse">
          {[1,2,3,4].map((i) => (
            <div key={i} className="text-center space-y-2">
              <div className="w-10 h-10 bg-slate-200 rounded-xl mx-auto" />
              <div className="h-8 bg-slate-200 rounded w-16 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-24 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const items = [
    { icon: '🏫', value: stats.grades, label: 'صفوف دراسية' },
    { icon: '📚', value: stats.subjects, label: 'مادة دراسية' },
    { icon: '🎥', value: stats.lessons, label: 'درس مصوّر' },
    { icon: '❓', value: stats.questions, label: 'سؤال في البنك' },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8">
        {items.map((s) => <Stat key={s.label} icon={s.icon} value={s.value} label={s.label} />)}
      </div>
    </section>
  );
}

function WhyYusr() {
  const reasons = [
    { icon: '🎬', title: 'دروس منظمة', desc: 'دروس مسجلة حسب الصف والمادة، توقف واستمر في أي وقت.', color: 'bg-violet-100' },
    { icon: '📝', title: 'اختبارات تفاعلية', desc: 'اختبارات فورية مع تصحيح تلقائي وشروحات للأسئلة.', color: 'bg-emerald-100' },
    { icon: '🎥', title: 'حصص مباشرة', desc: 'حصص تفاعلية مع المعلمين للإجابة عن أسئلتك.', color: 'bg-pink-100' },
    { icon: '📄', title: 'موارد ومراجعات', desc: 'ملخصات، أوراق عمل، ونماذج اختبارات جاهزة للتحميل.', color: 'bg-amber-100' },
    { icon: '📊', title: 'متابعة التقدم', desc: 'لوحات تحكم تتابع تقدمك في كل مادة.', color: 'bg-blue-100' },
    { icon: '🏅', title: 'نقاط وإنجازات', desc: 'اجمع النقاط من المذاكرة وتنافس مع زملائك.', color: 'bg-orange-100' },
    { icon: '🤖', title: 'مساعد ذكي', desc: 'اسأل المساعد الذكي أي سؤال دراسي واحصل على شرح فوري.', color: 'bg-cyan-100' },
  ];
  return (
    <section className="bg-white border-y border-slate-100 py-20">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader eyebrow="لماذا يُسر؟" title="كل ما تحتاجه للتفوق في مكان واحد" subtitle="أدوات متكاملة صممناها خصيصاً لطالب المنهج العُماني." center />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((f) => (
            <div key={f.title} className="rounded-3xl border border-slate-100 p-7 hover:shadow-lg hover:-translate-y-1 transition-all bg-slate-50/50">
              <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center text-2xl mb-5`}>{f.icon}</div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-7">{f.desc}</p>
            </div>
          ))}
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-7 flex flex-col justify-center">
            <h3 className="font-extrabold text-lg mb-2">جرب يُسر مجاناً</h3>
            <p className="text-violet-100 text-sm leading-7 mb-5">الموارد متاحة مجاناً. اشترك فقط عندما تكون جاهزاً.</p>
            <Link to="/register" className="inline-block text-center bg-amber-400 text-slate-900 font-extrabold px-6 py-3 rounded-xl hover:-translate-y-0.5 transition-all">إنشاء حساب مجاني</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    { icon: '🏫', title: 'اختر صفّك', desc: 'اختر صفك من الثامن حتى الثاني عشر', color: 'bg-blue-500' },
    { icon: '📚', title: 'اختر مادتك', desc: 'تصفح المواد المتاحة وابدأ بال学习', color: 'bg-violet-500' },
    { icon: '🎬', title: 'شاهد الدرس', desc: 'دروس مسجلة بجودة عالية', color: 'bg-pink-500' },
    { icon: '📝', title: 'اختبر فهمك', desc: ' حل الأسئلة والاختبارات', color: 'bg-emerald-500' },
    { icon: '📊', title: 'تابع تقدمك', desc: 'لوحات تحكم ونتائج لحظية', color: 'bg-amber-500' },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <SectionHeader eyebrow="كيف تعمل يُسر؟" title="ابدأ في 5 خطوات بسيطة" center />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
        <div className="hidden md:block absolute top-14 left-[10%] right-[10%] h-1 bg-gradient-to-l from-violet-200 via-purple-200 to-violet-200 rounded-full" />
        {steps.map((s, i) => (
          <div key={s.title} className="relative text-center bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${s.color} text-white flex items-center justify-center text-2xl mb-4 shadow-lg relative z-10`}>{s.icon}</div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black mb-1">الخطوة {i + 1}</span>
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">{s.title}</h3>
            <p className="text-xs text-slate-500 leading-5">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GradesSection({ grades }) {
  return (
    <section className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 py-20 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold mb-3">الصفوف الدراسية</span>
          <h2 className="text-3xl md:text-4xl font-extrabold">اختر صفّك وابدأ رحلة التفوق</h2>
          <p className="mt-3 text-violet-200 max-w-2xl mx-auto">محتوى مصمم بعناية لكل صف وفق المنهج العُماني من الثامن حتى الثاني عشر.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {grades.map((g, i) => (
            <Link key={g.id} to={`/grades/${g.id}`} className="group bg-white/10 border border-white/15 backdrop-blur rounded-3xl p-6 hover:bg-white/20 hover:-translate-y-1 transition-all text-center animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-4 shadow-lg" style={{ background: g.color }}>
                {g.id}
              </div>
              <h3 className="font-extrabold text-lg mb-1">{g.name}</h3>
              <p className="text-sm text-violet-200 leading-6 mb-4">{g.tagline}</p>
              <span className="inline-block text-amber-300 text-sm font-bold">البدء الآن ←</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LessonCard({ lesson, index = 0 }) {
  return (
    <Link to={`/lessons/${lesson.id}`} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden animate-fade-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="relative h-36" style={{ background: `linear-gradient(135deg, ${lesson.subject_color}, ${lesson.subject_color}99)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="absolute top-4 right-4 w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center text-xl">{lesson.subject_icon}</div>
        <div className="absolute bottom-4 right-4 text-white font-bold text-sm bg-black/25 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-1.5">🎥 {lesson.duration} دقيقة</div>
        {lesson.locked && (
          <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-black/35 backdrop-blur text-white text-xs font-black rounded-full px-4 py-1.5 border border-white/20">🔒 للمشتركين في {lesson.subject_name}</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Badge>{lesson.subject_name}</Badge>
          <span className="text-slate-400 font-medium">• {lesson.grade_name}</span>
        </div>
        <h3 className="font-extrabold text-slate-900 mb-1 group-hover:text-violet-700 transition-colors leading-7">{lesson.title}</h3>
        <p className="text-slate-500 text-sm leading-6 line-clamp-2">{lesson.description}</p>
        <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">👁️ {lesson.views.toLocaleString('ar-EG')} مشاهدة</span>
          <span className={`px-2 py-0.5 rounded-full font-bold ${difficultyColor(lesson.level)}`}>{lesson.level}</span>
        </div>
      </div>
    </Link>
  );
}

function LatestLessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/lessons').then((data) => setLessons(data.slice(0, 4))).finally(() => setLoading(false));
  }, []);
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <div className="flex items-end justify-between mb-10">
        <SectionHeader eyebrow="جديد الدروس" title="أحدث الدروس المسجلة" />
        <Link to="/subjects" className="text-violet-600 font-bold text-sm whitespace-nowrap">عرض جميع المواد ←</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4].map((i) => <SkeletonCard key={i} />)
        ) : lessons.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-slate-500 font-bold">سيتم إضافة الدروس قريباً</p>
          </div>
        ) : (
          lessons.map((l, i) => <LessonCard key={l.id} lesson={l} index={i} />)
        )}
      </div>
    </section>
  );
}

function LivePreview() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/live-sessions?status=upcoming').then(setSessions).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <section className="bg-white border-y border-slate-100 py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <SectionHeader eyebrow="الحصص المباشرة" title="تعلّم مع معلمك مباشرة" subtitle="انضم للحصص التفاعلية واحصل على إجابات فورية لأسئلتك." />
          <Link to="/live-sessions" className="text-violet-600 font-bold text-sm whitespace-nowrap">جميع الحصص ←</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl">
            <div className="text-5xl mb-4">🎥</div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">لا توجد حصص قادمة حاليًا</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">تابعنا للإشعار بالحصص المباشرة القادمة. يمكنك الآن استكشاف الدروس المسجلة.</p>
            <Link to="/lessons" className="inline-block bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-violet-700 transition-colors">استكشف الدروس</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sessions.slice(0, 4).map((s) => (
              <div key={s.id} className="bg-slate-50 rounded-3xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-white shadow-sm">{s.subject_icon}</span>
                  <div>
                    <p className="font-bold text-sm">{s.subject_name}</p>
                    <p className="text-xs text-slate-400">{s.grade_name}</p>
                  </div>
                </div>
                <h3 className="font-extrabold text-slate-900 mb-2 leading-6">{s.title}</h3>
                <p className="text-xs text-slate-500 mb-4">👨‍🏫 {s.teacher_name}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-bold" dir="ltr">📅 {s.session_date?.slice(5)}</span>
                  <span className="text-violet-700 font-black" dir="ltr">🕒 {s.session_time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SubjectsSection() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/subjects').then(setSubjects).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <SectionHeader eyebrow="المواد الدراسية" title="جميع المواد المتاحة" center />
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-3xl">
          <p className="text-3xl mb-2">📚</p>
          <p className="text-slate-500 font-bold">سيتم إضافة المواد قريباً</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <Link key={s.id} to={`/subjects/${s.id}`} className="group bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">{s.icon}</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 group-hover:text-violet-700">{s.name}</h3>
                  <p className="text-xs text-slate-400">{s.lesson_count} درس</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">صفوف {s.grade_from}-{s.grade_to}</span>
                {s.price > 0 && <span className="font-bold text-violet-600">{s.price} ر.ع</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function GroupsPreview() {
  const [groups, setGroups] = useState([]);
  useEffect(() => { api.get('/groups').then(setGroups).catch(() => {}); }, []);
  if (groups.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 pb-20">
      <div className="bg-gradient-to-l from-emerald-600 to-green-600 rounded-[2rem] text-white overflow-hidden">
        <div className="p-8 md:p-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold mb-4">مجاني ١٠٠٪</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">انضم لجروب صفك المجاني على واتساب</h2>
            <p className="text-green-100 leading-7 mb-8 max-w-lg">أسئلة يومية، مراجعات، تنبيهات بالحصص الجديدة، ومحتوى تعليمي مستمر — كل ذلك مجاناً.</p>
            <div className="flex flex-wrap gap-3">
              {groups.map((g) => (
                <a key={g.id} href={g.link} target="_blank" rel="noreferrer" className="bg-white text-emerald-700 font-extrabold px-5 py-3 rounded-2xl text-sm hover:-translate-y-0.5 transition-all shadow-lg">
                  💬 {g.title.replace('جروب ', '').replace(' المجاني', '')}
                </a>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="w-72 h-72 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-8xl animate-floaty">💬</div>
              <span className="absolute -top-2 -left-2 bg-amber-400 text-slate-900 rounded-2xl px-4 py-2 font-black text-sm shadow-xl animate-floaty" style={{ animationDelay: '1s' }}>مجاناً!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    Promise.all([
      api.get('/subscription/plans?grade=9'),
      api.get('/subscription/plans?grade=11'),
    ]).then(([junior, senior]) => {
      const p = [];
      if (junior?.perSubject) p.push({ label: 'قسم ٨-١٠', note: 'الصفوف ٨، ٩، ١٠', per: junior.perSubject, featured: false });
      if (senior?.perSubject) p.push({ label: 'قسم ١١-١٢', note: 'الصفوف ١١، ١٢', per: senior.perSubject, featured: true });
      setPlans(p);
    }).catch(() => {});
  }, []);

  if (plans.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pb-20">
      <SectionHeader eyebrow="الاشتراكات" title="اشترك بالمواد التي تحتاجها فقط" subtitle="اختر بحرية — كل مادة بسعرها حسب قسمك الدراسي." center />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((sec) => (
          <div key={sec.label} className={`rounded-3xl p-8 relative overflow-hidden ${sec.featured ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl' : 'bg-white border-2 border-violet-200 shadow-xl'}`}>
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />
            <span className={`relative inline-block px-3 py-1 rounded-full text-xs font-black mb-3 ${sec.featured ? 'bg-amber-400 text-slate-900' : 'bg-violet-100 text-violet-700'}`}>{sec.label}</span>
            <p className={`relative font-extrabold text-lg mb-5 ${sec.featured ? 'text-violet-100' : 'text-slate-500'}`}>{sec.note}</p>
            <div className="relative rounded-2xl px-5 py-6 bg-white/10 backdrop-blur text-center">
              <p className={`text-xs font-bold ${sec.featured ? 'text-violet-200' : 'text-slate-400'}`}>المادة الواحدة بسعر</p>
              <p className={`font-black text-4xl mt-1 ${sec.featured ? 'text-white' : 'text-slate-900'}`}>{sec.per} <span className="text-base font-bold opacity-70">ر.ع / سنة</span></p>
            </div>
            <Link to="/pricing" className={`relative block text-center mt-6 font-extrabold py-3.5 rounded-2xl transition-all ${sec.featured ? 'bg-amber-400 text-slate-900 hover:-translate-y-0.5' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>اشترك الآن</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExamsSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <SectionHeader eyebrow="الاختبارات" title="اختبر فهمك وتابع تطورك" center />
      <div className="bg-gradient-to-l from-violet-600 to-purple-700 rounded-[2rem] text-white p-10 md:p-14 text-center">
        <div className="text-5xl mb-4">📝</div>
        <h3 className="text-2xl md:text-3xl font-black mb-3">اختبارات تفاعلية مع تصحيح فوري</h3>
        <p className="text-violet-100 max-w-2xl mx-auto mb-8 leading-7">
          أداء الاختبار ← معرفة نتيجتك فوراً ← مراجعة أخطائك مع الشرح ← متابعة تطورك مع كل اختبار.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
          {[
            { icon: '✅', text: 'تصحيح تلقائي' },
            { icon: '💡', text: 'شروحات الأسئلة' },
            { icon: '📈', text: 'متابعة التقدم' },
            { icon: '🏆', text: 'نقاط تحفيزية' },
          ].map((item) => (
            <div key={item.text} className="bg-white/10 border border-white/20 rounded-2xl p-4">
              <span className="text-2xl block mb-1">{item.icon}</span>
              <span className="text-sm font-bold">{item.text}</span>
            </div>
          ))}
        </div>
        <Link to="/exams" className="inline-block bg-amber-400 text-slate-900 font-extrabold px-10 py-4 rounded-2xl text-lg hover:-translate-y-1 transition-all shadow-2xl shadow-amber-500/25">ابدأ اختبارك الأول</Link>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 rounded-[2rem] text-white px-8 py-16 md:px-16 text-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 right-10 w-72 h-72 rounded-full bg-amber-400 blur-3xl" />
          <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-black mb-4">ابدأ رحلتك التعليمية مع يُسر</h2>
          <p className="text-violet-100 text-lg mb-8 max-w-xl mx-auto">سجّل حسابك مجاناً واستكشف المحتوى التعليمي المتاح لصفك.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="inline-block bg-amber-400 text-slate-900 font-extrabold px-10 py-4 rounded-2xl text-lg hover:-translate-y-1 transition-all shadow-2xl shadow-amber-500/25">سجّل مجاناً</Link>
            <Link to="/subjects" className="inline-block bg-white/10 border border-white/25 font-bold px-10 py-4 rounded-2xl text-lg hover:bg-white/20 transition-all">استكشف المواد</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/grades').then(setGrades).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Hero />
      <Stats />
      <WhyYusr />
      <Steps />
      {loading ? (
        <section className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white/10 rounded-3xl p-6 animate-pulse">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 mx-auto mb-4" />
                  <div className="h-5 w-24 bg-white/20 mx-auto mb-2" />
                  <div className="h-3 w-32 bg-white/10 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <GradesSection grades={grades} />
      )}
      <LatestLessons />
      <LivePreview />
      <SubjectsSection />
      <GroupsPreview />
      <PricingTeaser />
      <ExamsSection />
      <CTABanner />
    </div>
  );
}
