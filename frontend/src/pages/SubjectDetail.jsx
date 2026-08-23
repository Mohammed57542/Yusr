import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Loading, EmptyState, Badge, Alert, Breadcrumbs } from '../components/common';
import { useAuth } from '../context/AuthContext';

const SECTION_DEFS = [
  { id: 'lessons', icon: '🎬', title: 'الحصص المصورة', desc: 'شروحات مبسطة لكل درس في المادة' },
  { id: 'summaries', icon: '📄', title: 'الملخصات والملفات', desc: 'ملخصات وأوراق عمل ومراجعات PDF' },
  { id: 'bank', icon: '📝', title: 'بنك الأسئلة', desc: 'آلاف الأسئلة مصنفة حسب الوحدة' },
  { id: 'exams', icon: '📑', title: 'الاختبارات', desc: 'اختبارات دروس ووحدات ونهائية' },
  { id: 'reviews', icon: '📚', title: 'المراجعات', desc: 'مراجعات شاملة قبل الاختبارات' },
  { id: 'live', icon: '🎥', title: 'الحصص المباشرة', desc: 'حصص تفاعلية مع معلم المادة' },
  { id: 'discussions', icon: '💬', title: 'المناقشات', desc: 'اسأل وتناقش مع طلاب المادة' },
  { id: 'archive', icon: '🗂️', title: 'السنوات السابقة', desc: 'دروس ومراجعات السنوات الماضية' },
  { id: 'teacher', icon: '👨‍🏫', title: 'معلمو المادة', desc: 'استكشف محتوى معلم المادة' },
  { id: 'share', icon: '⭐', title: 'احفظ المادة', desc: 'تابع إنجازك ووفر وقتك' },
];

export default function SubjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('lessons');
  const [saved, setSaved] = useState(false);
  const [discussions, setDiscussions] = useState([]);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const grades = [];
  for (let g = 8; g <= 12; g++) grades.push({ id: g, name: `الصف ${g}` });

  const gradeId = Number(params.get('grade_id')) || user?.grade || 9;

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ grade_id: gradeId });
    if (user?.id) q.set('user_id', user.id);
    api.get(`/subjects/${id}/dashboard?${q}`).then((d) => {
      setData(d);
      setSaved((d.subject.favorited ?? false));
    }).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id, gradeId, user?.id]);

  useEffect(() => {
    if (tab !== 'discussions' || !data) return;
    api.get(`/discussions?subject_id=${id}`).then(setDiscussions).catch(() => {});
  }, [tab, id, data]);

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try {
      await api.post('/discussions', { subject_id: Number(id), message: msg });
      setMsg('');
      setDiscussions(await api.get(`/discussions?subject_id=${id}`));
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const changeGrade = (g) => {
    const next = new URLSearchParams(params);
    next.set('grade_id', g);
    setParams(next, { replace: true });
  };

  if (loading) return <Loading />;
  if (!data) return <EmptyState icon="❌" title="المادة غير موجودة" description="تأكد من الرابط وحاول مرة أخرى" />;

  const { subject, lessons, resources, exams, units, progress, archive } = data;
  const summaries = resources.filter((r) => r.type === 'ملخص');
  const others = resources.filter((r) => r.type !== 'ملخص');
  const subscribed = user ? (user.subscribed_subjects || []).includes(subject.id) : false;
  const liveLink = `/live-sessions?subject=${subject.id}`;
  const priceText = subject.price ? `${subject.price} ر.ع` : null;

  const scrollTo = (sec) => {
    setTab(sec);
    document.getElementById('subject-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const teachers = [...new Set(lessons.map((l) => l.teacher_name).filter(Boolean))];

  return (
    <div>
      <div className="text-white" style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}aa)` }}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Breadcrumbs items={[
            { label: 'المواد', href: '/subjects' },
            { label: subject.name }
          ]} />
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/25 flex items-center justify-center text-5xl shadow-xl">{subject.icon}</div>
            <div className="flex-1 min-w-[220px]">
              <h1 className="text-3xl md:text-4xl font-black mb-1">{subject.name}</h1>
              <p className="text-white/85 text-sm">المنهج العُماني • الصف ٨ حتى ١٢</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-white/90">الصف:</label>
              <select value={gradeId} onChange={(e) => changeGrade(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white font-bold focus:outline-none [&>option]:text-slate-900">
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {subscribed ? (
                <span className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-sm shadow-lg">✅ أنت مشترك</span>
              ) : (
                <Link to={`/pricing?subject=${subject.id}&grade=${gradeId}`} className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-900 font-extrabold text-sm shadow-lg hover:-translate-y-0.5 transition-all">{priceText ? `اشترك بالمادة — ${priceText}` : 'اشترك بالمادة'}</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {user && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div>
                <h3 className="font-extrabold text-slate-900">مستوى إنجازك في {subject.name}</h3>
                <p className="text-sm text-slate-500">أكملت {progress.completed} من {progress.total} درس في هذا الصف</p>
              </div>
              <span className="text-2xl font-black text-violet-700">{progress.percentage}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-violet-500 to-purple-700 transition-all duration-700" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>
        )}

        <div id="subject-sections" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 scroll-mt-24">
          {SECTION_DEFS.map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className={`group bg-white rounded-2xl border p-5 text-right transition-all ${tab === s.id ? 'border-violet-400 ring-2 ring-violet-200' : 'border-slate-100 hover:border-violet-200 hover:shadow-md'}`}>
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{s.icon}</div>
              <p className="font-extrabold text-slate-900 text-sm">{s.title}</p>
              <p className="text-xs text-slate-400 mt-1 leading-5">{s.desc}</p>
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {tab === 'lessons' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">🎬 الحصص المصورة</h2>
                  <p className="text-sm text-slate-500">{lessons.length} درس في {subject.name} — {grades.find((g) => g.id === gradeId)?.name}</p>
                </div>
                <Badge color="bg-violet-100 text-violet-700">{progress.percentage}% إنجاز</Badge>
              </div>
              {lessons.length === 0 ? (
                <p className="text-slate-400 text-sm">لا توجد دروس بعد.</p>
              ) : (
                <div className="space-y-3">
                  {lessons.map((l, i) => (
                    <Link key={l.id} to={`/lessons/${l.id}`} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all group">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${l.completed ? 'bg-green-100 text-green-600' : l.locked ? 'bg-slate-100 text-slate-500' : 'bg-violet-100 text-violet-700'} group-hover:scale-105 transition-transform`}>
                        {l.completed ? '✓' : l.locked ? '🔒' : `0${i + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 group-hover:text-violet-700 leading-6">{l.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {l.teacher_name && <>👨‍🏫 {l.teacher_name}</>}
                        </p>
                      </div>
                      <div className="text-left shrink-0 hidden sm:block">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${l.level === 'مبتدئ' ? 'bg-green-100 text-green-700' : l.level === 'متوسط' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{l.level}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">⏱ {l.duration} د</span>
                      {l.locked ? (
                        <Link to={`/pricing?subject=${subject.id}&grade=${gradeId}`} className="text-xs font-black text-amber-600 shrink-0">اشترك</Link>
                      ) : (
                        <span className="text-violet-600 group-hover:translate-x-[-4px] transition-transform shrink-0">▶</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'summaries' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">📄 الملخصات والملفات</h2>
                  <p className="text-sm text-slate-500">ملخصات وأوراق عمل ومراجعات لـ {subject.name}</p>
                </div>
                <Link to={`/library?subject=${subject.id}&grade=${gradeId}`} className="text-violet-600 font-bold text-sm">المكتبة الكاملة ←</Link>
              </div>
              {resources.length === 0 ? (
                <p className="text-slate-400 text-sm">لا توجد ملفات بعد.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map((r) => (
                    <Link key={r.id} to={`/library?file=${r.id}`} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl shrink-0">📕</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 leading-6 line-clamp-1">{r.title}</p>
                        <p className="text-xs text-slate-400">{r.type} • {r.file_size || 'PDF'}</p>
                      </div>
                      {r.locked ? (
                        <span className="text-xs font-black text-amber-600 shrink-0">🔒 اشترك</span>
                      ) : (
                        <span className="text-violet-600 shrink-0">📥</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-6 p-4 rounded-2xl bg-violet-50 border border-violet-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-violet-800">تريد المزيد من الملخصات والملفات؟</p>
                <Link to={`/library?subject=${subject.id}&grade=${gradeId}`} className="bg-violet-600 text-white text-sm font-extrabold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors">تصفح مكتبة يُسر</Link>
              </div>
            </section>
          )}

          {tab === 'bank' && (
            <section className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl p-9">
              <h2 className="text-2xl font-extrabold mb-2">📝 بنك أسئلة {subject.name}</h2>
              <p className="text-indigo-100 leading-7 mb-6 max-w-2xl">آلاف الأسئلة مصنفة حسب الوحدة ومستوى الصعوبة، مع تصحيح فوري وشرح للإجابات. درّب نفسك على أسئلة الاختبارات الحقيقية.</p>
              <div className="flex flex-wrap gap-3">
                <Link to={`/question-bank?subject=${subject.id}&grade=${gradeId}`} className="bg-amber-400 text-slate-900 font-extrabold px-7 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-xl shadow-amber-500/20">ابدأ التدريب الآن</Link>
                <Link to={`/exams?subject=${subject.id}&grade=${gradeId}`} className="bg-white/10 border border-white/25 font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 transition-all">أو جرّب الاختبارات</Link>
              </div>
            </section>
          )}

          {tab === 'exams' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">📑 اختبارات {subject.name}</h2>
                  <p className="text-sm text-slate-500">{exams.length} اختبار — دروس ووحدات ونهائية</p>
                </div>
                <Link to={`/exams?subject=${subject.id}&grade=${gradeId}`} className="text-violet-600 font-bold text-sm">جميع الاختبارات ←</Link>
              </div>
              {exams.length === 0 ? (
                <p className="text-slate-400 text-sm">لا توجد اختبارات بعد.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.slice(0, 4).map((e) => (
                    e.locked ? (
                      <Link key={e.id} to="/pricing" className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black shrink-0">🔒</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 leading-6 line-clamp-1">{e.title}</p>
                          <p className="text-xs text-slate-400">{e.exam_type} • {e.question_count} سؤال • {e.duration_minutes} دقيقة</p>
                        </div>
                        <span className="text-xs font-black text-amber-600 shrink-0">اشترك</span>
                      </Link>
                    ) : (
                      <Link key={e.id} to={`/exams/${e.id}/take`} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-black shrink-0">📝</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 leading-6 line-clamp-1">{e.title}</p>
                          <p className="text-xs text-slate-400">{e.exam_type} • {e.question_count} سؤال • {e.duration_minutes} دقيقة</p>
                        </div>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${e.exam_type === 'نهائي' ? 'bg-red-100 text-red-600' : e.exam_type === 'وحدة' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{e.exam_type}</span>
                      </Link>
                    )
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'reviews' && (
            <section className="bg-gradient-to-l from-pink-600 to-rose-600 text-white rounded-3xl p-9">
              <h2 className="text-2xl font-extrabold mb-2">📚 مراجعات {subject.name}</h2>
              <p className="text-rose-100 leading-7 mb-6 max-w-2xl">مراجعات شاملة وملخصة قبل الاختبارات، مع نماذج امتحانات سابقة وحلولها خطوة بخطوة.</p>
              <Link to={`/reviews?subject=${subject.id}`} className="inline-block bg-white text-rose-700 font-extrabold px-7 py-3.5 rounded-2xl hover:-translate-y-0.5 transition-all shadow-xl">تصفح المراجعات</Link>
            </section>
          )}

          {tab === 'live' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">🎥 الحصص المباشرة</h2>
                  <p className="text-sm text-slate-500">حصص تفاعلية مع معلمي {subject.name}</p>
                </div>
                <Link to={liveLink} className="text-violet-600 font-bold text-sm">جدول الحصص ←</Link>
              </div>
              <p className="text-slate-500 text-sm leading-7">تابع الحصص المباشرة القادمة، واطرح أسئلتك مباشرة، ولا تفوّت المراجعات المكثفة قبل الاختبارات.</p>
              <Link to={liveLink} className="inline-block mt-5 bg-violet-600 text-white font-extrabold px-7 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">شاهد الحصص المباشرة</Link>
            </section>
          )}

          {tab === 'teacher' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6">👨‍🏫 معلمو {subject.name}</h2>
              {teachers.length === 0 ? (
                <p className="text-slate-400 text-sm">لا توجد بيانات معلمين بعد.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.map((t) => (
                    <div key={t} className="flex items-center gap-4 p-5 rounded-2xl border border-slate-100">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-lg shrink-0" style={{ background: subject.color }}>{t.replace('أ. ', '').charAt(0)}</div>
                      <div className="flex-1">
                        <p className="font-extrabold text-slate-900">{t}</p>
                        <p className="text-sm text-slate-500">معلم {subject.name}</p>
                      </div>
                      <Link to={`/lessons?teacher=${encodeURIComponent(t)}`} className="text-violet-600 font-bold text-sm whitespace-nowrap">استكشف محتواه ←</Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'discussions' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">💬 مناقشات {subject.name}</h2>
                  <p className="text-sm text-slate-500">اسأل عن أي درس، وشارك الطلاب حلولهم وأفكارهم</p>
                </div>
              </div>

              {user ? (
                <form onSubmit={sendMsg} className="mb-6 p-4 rounded-2xl bg-violet-50 border border-violet-100">
                  <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder={`اكتب سؤالك أو مشاركتك عن ${subject.name}...`} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
                  <button type="submit" disabled={sending || !msg.trim()} className="mt-3 bg-violet-600 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors disabled:opacity-50">
                    {sending ? 'جارٍ الإرسال...' : 'أرسل المشاركة'}
                  </button>
                </form>
              ) : (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-amber-800 text-sm font-bold">سجّل دخولك لتشارك في مناقشات المادة</p>
                  <div className="flex justify-center gap-3 mt-2 text-sm">
                    <Link to={`/login?next=/subjects/${id}?tab=discussions`} className="text-amber-900 font-extrabold underline">تسجيل الدخول</Link>
                    <span className="text-amber-600">أو</span>
                    <Link to="/register" className="text-amber-900 font-extrabold underline">إنشاء حساب</Link>
                  </div>
                </div>
              )}

              {discussions.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">لا توجد مناقشات بعد — كن أول من يسأل! 💡</p>
              ) : (
                <div className="space-y-3">
                  {discussions.map((d) => (
                    <div key={d.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${d.user_role === 'teacher' ? 'bg-emerald-500' : d.user_role === 'admin' ? 'bg-red-500' : 'bg-violet-500'}`}>{d.user_name?.charAt(0) ?? '؟'}</span>
                        <span className="font-extrabold text-slate-800 text-sm">{d.user_name}</span>
                        {d.user_role === 'teacher' && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">معلم</span>}
                        {d.user_role === 'admin' && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">إدارة</span>}
                        <span className="text-[10px] text-slate-400 mr-auto">{new Date(d.created_at).toLocaleString('ar-EG')}</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-7 whitespace-pre-wrap">{d.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'archive' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">🗂️ السنوات السابقة</h2>
                  <p className="text-sm text-slate-500">دروس ومراجعات السنوات الماضية لـ {subject.name}</p>
                </div>
              </div>
              {archive.length === 0 ? (
                <p className="text-slate-400 text-sm">لا يوجد محتوى من السنوات السابقة بعد.</p>
              ) : (
                <div className="space-y-3">
                  {archive.map((l) => (
                    <Link key={l.id} to={`/lessons/${l.id}`} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">🗂️</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 group-hover:text-violet-700 leading-6">{l.title}</p>
                        {l.teacher_name && <p className="text-xs text-slate-400">👨‍🏫 {l.teacher_name} • ⏱ {l.duration} د</p>}
                      </div>
                      {l.locked ? (
                        <Link to={`/pricing?subject=${subject.id}&grade=${gradeId}`} className="text-xs font-black text-amber-600 shrink-0">اشترك</Link>
                      ) : (
                        <span className="text-violet-600 group-hover:translate-x-[-4px] transition-transform shrink-0">▶</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'share' && (
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4">⭐ احفظ المادة وتابع إنجازك</h2>
              <p className="text-slate-500 text-sm leading-7 mb-6 max-w-2xl">سجّل دخولك لتتبع تقدمك في دروس المادة، وحفظ الدروس المفضلة لديك، وجمع النقاط، وتلقي إشعارات بكل جديد في المادة.</p>
              {user ? (
                <div className="flex flex-wrap gap-3">
                  <Link to="/dashboard" className="bg-violet-600 text-white font-extrabold px-7 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">متابعة تقدمي</Link>
                  <Link to="/favorites" className="bg-slate-100 text-slate-700 font-bold px-7 py-3.5 rounded-2xl hover:bg-slate-200 transition-colors">الدروس المحفوظة</Link>
                </div>
              ) : (
                <Link to="/register" className="inline-block bg-violet-600 text-white font-extrabold px-7 py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">أنشئ حسابك مجاناً</Link>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
