import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Alert, EmptyState } from '../components/common';

const letters = ['أ', 'ب', 'ج', 'د'];

function StatCard({ icon, label, value, color = 'bg-teal-100 text-teal-700' }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-2xl shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contentTab, setContentTab] = useState('lessons');

  const [lessons, setLessons] = useState([]);
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [units, setUnits] = useState([]);

  const [lessonForm, setLessonForm] = useState({ title: '', description: '', subject_id: '', grade_id: '', unit_id: '', video_url: '', pdf_url: '', level: 'متوسط', duration: 30, is_free: false });
  const [editingLesson, setEditingLesson] = useState(null);
  const [showLessonForm, setShowLessonForm] = useState(false);

  const [examForm, setExamForm] = useState({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration_minutes: 30, question_count: 10, exam_type: 'درس', max_attempts: 1, open_at: '', close_at: '', is_free: false, show_results: true, allow_review: true, points_reward: 20 });
  const [editingExam, setEditingExam] = useState(null);
  const [showExamForm, setShowExamForm] = useState(false);

  const [questionForm, setQuestionForm] = useState({ subject_id: '', grade_id: '', unit_id: '', lesson_id: '', question: '', options: ['', '', '', ''], correct_index: 0, question_type: 'mcq', explanation: '', difficulty: 'متوسط' });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const [selectedExam, setSelectedExam] = useState('');
  const [examAnalytics, setExamAnalytics] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'teacher' && user.role !== 'admin') { navigate('/'); return; }
    api.get('/teacher/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    api.get('/grades').then(setGrades).catch(() => {});
    api.get('/admin/subjects').then(setSubjects).catch(() => {});
  }, [user, navigate]);

  const loadUnits = (sid, gid) => {
    if (!sid || !gid) return;
    api.get(`/admin/units`).then((all) => {
      setUnits(all.filter((u) => String(u.subject_id) === String(sid) && String(u.grade_id) === String(gid)));
    }).catch(() => {});
  };

  const loadLessons = () => {
    setError('');
    api.get('/teacher/lessons').then(setLessons).catch((e) => setError(e.message));
  };

  const loadExams = () => {
    setError('');
    api.get('/teacher/exams').then(setExams).catch((e) => setError(e.message));
  };

  const loadQuestions = () => {
    setError('');
    api.get('/teacher/questions').then(setQuestions).catch((e) => setError(e.message));
  };

  const saveLesson = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...lessonForm, subject_id: Number(lessonForm.subject_id), grade_id: Number(lessonForm.grade_id), unit_id: lessonForm.unit_id ? Number(lessonForm.unit_id) : '', duration: Number(lessonForm.duration) };
      if (editingLesson) await api.patch(`/teacher/lessons/${editingLesson.id}`, body);
      else await api.post('/teacher/lessons', body);
      setLessonForm({ title: '', description: '', subject_id: '', grade_id: '', unit_id: '', video_url: '', pdf_url: '', level: 'متوسط', duration: 30, is_free: false });
      setEditingLesson(null);
      setShowLessonForm(false);
      loadLessons();
    } catch (err) { setError(err.message); }
  };

  const editLesson = (l) => {
    setEditingLesson(l);
    setLessonForm({ title: l.title, description: l.description || '', subject_id: l.subject_id, grade_id: l.grade_id, unit_id: l.unit_id ?? '', video_url: l.video_url || '', pdf_url: l.pdf_url || '', level: l.level || 'متوسط', duration: l.duration || 30, is_free: !!l.is_free });
    setShowLessonForm(true);
    loadUnits(l.subject_id, l.grade_id);
  };

  const deleteLesson = async (id) => {
    if (!confirm('حذف هذا الدرس؟')) return;
    try { await api.del(`/teacher/lessons/${id}`); setLessons((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const submitLessonForReview = async (id) => {
    setError('');
    try {
      await api.patch(`/teacher/lessons/${id}`, { status: 'pending' });
      setLessons((p) => p.map((l) => l.id === id ? { ...l, status: 'pending' } : l));
    } catch (e) { setError(e.message); }
  };

  const saveExam = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...examForm, grade_id: Number(examForm.grade_id), subject_id: Number(examForm.subject_id), unit_id: examForm.unit_id ? Number(examForm.unit_id) : '', duration_minutes: Number(examForm.duration_minutes), question_count: Number(examForm.question_count), max_attempts: Number(examForm.max_attempts), open_at: examForm.open_at || null, close_at: examForm.close_at || null, is_free: examForm.is_free ? 1 : 0, show_results: examForm.show_results ? 1 : 0, allow_review: examForm.allow_review ? 1 : 0, points_reward: Number(examForm.points_reward) };
      if (editingExam) await api.patch(`/teacher/exams/${editingExam.id}`, body);
      else await api.post('/teacher/exams', body);
      setExamForm({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration_minutes: 30, question_count: 10, exam_type: 'درس', max_attempts: 1, open_at: '', close_at: '', is_free: false, show_results: true, allow_review: true, points_reward: 20 });
      setEditingExam(null);
      setShowExamForm(false);
      loadExams();
    } catch (err) { setError(err.message); }
  };

  const editExam = (x) => {
    setEditingExam(x);
    setExamForm({ subject_id: x.subject_id, grade_id: x.grade_id, unit_id: x.unit_id ?? '', title: x.title, description: x.description || '', duration_minutes: x.duration_minutes, question_count: x.question_count, exam_type: x.exam_type, max_attempts: x.max_attempts ?? 1, open_at: x.open_at ?? '', close_at: x.close_at ?? '', is_free: !!x.is_free, show_results: x.show_results !== 0, allow_review: x.allow_review !== 0, points_reward: x.points_reward ?? 20 });
    setShowExamForm(true);
    loadUnits(x.subject_id, x.grade_id);
  };

  const deleteExam = async (id) => {
    if (!confirm('حذف هذا الاختبار؟')) return;
    try { await api.del(`/teacher/exams/${id}`); setExams((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const opts = questionForm.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return setError('اكتب خيارين على الأقل');
      let correct = questionForm.correct_index;
      if (questionForm.question_type === 'multi' && Array.isArray(questionForm.correct_index)) {
        correct = questionForm.correct_index.filter((i) => i >= 0 && i < opts.length);
        if (correct.length === 0) return setError('حدد إجابة واحدة صحيحة على الأقل');
      } else if (questionForm.question_type !== 'multi') {
        correct = Number(questionForm.correct_index);
        if (!Number.isFinite(correct) || correct < 0 || correct >= opts.length) return setError('رقم الإجابة الصحيحة غير صالح');
      }
      const body = { ...questionForm, options: opts, correct_index: correct, grade_id: Number(questionForm.grade_id), subject_id: Number(questionForm.subject_id), unit_id: questionForm.unit_id ? Number(questionForm.unit_id) : '', lesson_id: questionForm.lesson_id ? Number(questionForm.lesson_id) : '' };
      if (editingQuestion) await api.patch(`/teacher/questions/${editingQuestion.id}`, body);
      else await api.post('/teacher/questions', body);
      setQuestionForm({ subject_id: '', grade_id: '', unit_id: '', lesson_id: '', question: '', options: ['', '', '', ''], correct_index: 0, question_type: 'mcq', explanation: '', difficulty: 'متوسط' });
      setEditingQuestion(null);
      setShowQuestionForm(false);
      loadQuestions();
    } catch (err) { setError(err.message); }
  };

  const editQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionForm({
      subject_id: q.subject_id, grade_id: q.grade_id, unit_id: q.unit_id ?? '', lesson_id: q.lesson_id ?? '',
      question: q.question, options: [...JSON.parse(q.options), ...Array(4).fill('')].slice(0, 4),
      correct_index: q.question_type === 'multi' ? JSON.parse(q.correct_index || '[]') : Number(q.correct_index),
      question_type: q.question_type, explanation: q.explanation ?? '', difficulty: q.difficulty,
    });
    setShowQuestionForm(true);
  };

  const deleteQuestion = async (id) => {
    if (!confirm('حذف هذا السؤال؟')) return;
    try { await api.del(`/teacher/questions/${id}`); setQuestions((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const loadExamAnalytics = async (examId) => {
    setError('');
    try {
      const analytics = await api.get(`/teacher/exam-analytics/${examId}`);
      setExamAnalytics(analytics);
    } catch (e) { setError(e.message); }
  };

  const setOpt = (i, val) => setQuestionForm({ ...questionForm, options: questionForm.options.map((o, x) => x === i ? val : o) });

  const multiToggle = (i) => {
    const arr = Array.isArray(questionForm.correct_index) ? questionForm.correct_index : [];
    setQuestionForm({ ...questionForm, correct_index: arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i] });
  };

  const openContentTab = (id) => {
    setContentTab(id);
    if (id === 'lessons') loadLessons();
    if (id === 'exams') loadExams();
    if (id === 'questions') loadQuestions();
  };

  if (!user) return null;
  if (loading) return <Loading label="جارٍ تحميل لوحة المعلم..." />;

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
          <p className="text-5xl mb-4">😔</p>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تعذر تحميل لوحة المعلم</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || 'حاول مرة أخرى بعد قليل'}</p>
          <button onClick={() => window.location.reload()} className="bg-teal-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-teal-700 transition-colors">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const {
    studentCount = 0,
    lessonCount = 0,
    examCount = 0,
    avgScore = 0,
    upcomingSessions = [],
    students = [],
    recentResults = [],
  } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">مرحباً، المعلم {user.name} 👋</h1>
            <p className="text-sm text-slate-500">لوحة تحكم المعلم</p>
          </div>
        </div>
      </div>

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon="👨‍🎓" label="الطلاب" value={studentCount} color="bg-teal-100 text-teal-700" />
        <StatCard icon="📚" label="الدروس" value={lessonCount} color="bg-cyan-100 text-cyan-700" />
        <StatCard icon="📝" label="الاختبارات" value={examCount} color="bg-blue-100 text-blue-700" />
        <StatCard icon="📊" label="متوسط الدرجات" value={`${avgScore}%`} color="bg-amber-100 text-amber-700" />
        <StatCard icon="📅" label="الحصص القادمة" value={upcomingSessions.length} color="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 mb-5">📅 الحصص القادمة</h2>
        {upcomingSessions.length === 0 ? (
          <EmptyState icon="📅" title="لا توجد حصص قادمة" description="ستظهر الحصص المجدولة هنا." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl bg-teal-50 border border-teal-100">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-xl shrink-0">📅</div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-800 truncate">{s.title}</p>
                  <p className="text-xs text-teal-600 font-bold">{s.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{s.session_date} • {s.session_time} • {s.duration} دقيقة</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-slate-900">📦 إدارة المحتوى</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {[{ id: 'lessons', label: '📚 الدروس' }, { id: 'exams', label: '📝 الاختبارات' }, { id: 'questions', label: '❓ بنك الأسئلة' }].map((t) => (
            <button key={t.id} onClick={() => openContentTab(t.id)} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${contentTab === t.id ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {contentTab === 'lessons' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { setShowLessonForm(!showLessonForm); setEditingLesson(null); setLessonForm({ title: '', description: '', subject_id: '', grade_id: '', unit_id: '', video_url: '', pdf_url: '', level: 'متوسط', duration: 30, is_free: false }); }} className="bg-teal-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">
                {showLessonForm ? 'إلغاء' : 'إنشاء درس جديد'}
              </button>
            </div>

            {showLessonForm && (
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">{editingLesson ? '✏️ تعديل الدرس' : '➕ إنشاء درس جديد'}</h3>
                <form onSubmit={saveLesson} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="عنوان الدرس" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm md:col-span-2" required />
                  <select value={lessonForm.subject_id} onChange={(e) => { setLessonForm({ ...lessonForm, subject_id: e.target.value, unit_id: '' }); loadUnits(e.target.value, lessonForm.grade_id); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                    <option value="">المادة</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={lessonForm.grade_id} onChange={(e) => { setLessonForm({ ...lessonForm, grade_id: e.target.value, unit_id: '' }); loadUnits(lessonForm.subject_id, e.target.value); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                    <option value="">الصف</option>
                    {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <textarea value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="الوصف" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-4" rows={2} />
                  <select value={lessonForm.unit_id} onChange={(e) => setLessonForm({ ...lessonForm, unit_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    <option value="">بدون وحدة</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="رابط الفيديو" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
                  <input value={lessonForm.pdf_url} onChange={(e) => setLessonForm({ ...lessonForm, pdf_url: e.target.value })} placeholder="رابط الملخص PDF" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
                  <select value={lessonForm.level} onChange={(e) => setLessonForm({ ...lessonForm, level: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    {['مبتدئ', 'متوسط', 'متقدم'].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} placeholder="المدة (دقيقة)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" required />
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={lessonForm.is_free} onChange={(e) => setLessonForm({ ...lessonForm, is_free: e.target.checked })} className="w-4 h-4 accent-teal-600" />
                    مجاني
                  </label>
                  <div className="flex gap-2 md:col-span-4">
                    <button type="submit" className="flex-1 bg-teal-600 text-white font-extrabold py-3 rounded-xl hover:bg-teal-700 transition-colors">{editingLesson ? 'حفظ التعديلات' : 'إنشاء الدرس'}</button>
                    {editingLesson && <button type="button" onClick={() => { setEditingLesson(null); setShowLessonForm(false); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">الدرس</th>
                    <th className="text-right px-6 py-4">المادة</th>
                    <th className="text-right px-6 py-4">الحالة</th>
                    <th className="text-right px-6 py-4">المدة</th>
                    <th className="text-right px-6 py-4">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800 max-w-[260px]">
                        <span className="line-clamp-1" title={l.title}>{l.title}</span>
                        <span className="text-xs text-slate-400 block">{l.subject_name} • {l.grade_name}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{l.subject_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                          l.status === 'published' ? 'bg-green-100 text-green-700' :
                          l.status === 'approved' ? 'bg-teal-100 text-teal-700' :
                          l.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {l.status === 'published' ? 'منشور' : l.status === 'approved' ? 'معتمد' : l.status === 'pending' ? 'قيد المراجعة' : 'مسودة'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{l.duration} د</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {(l.status === 'draft' || l.status === 'rejected') && (
                            <button onClick={() => submitLessonForReview(l.id)} className="bg-teal-50 text-teal-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-teal-100">إرسال للمراجعة</button>
                          )}
                          <button onClick={() => editLesson(l)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                          <button onClick={() => deleteLesson(l.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {lessons.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">لا توجد دروس بعد.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {contentTab === 'exams' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { setShowExamForm(!showExamForm); setEditingExam(null); setExamForm({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration_minutes: 30, question_count: 10, exam_type: 'درس', max_attempts: 1, open_at: '', close_at: '', is_free: false, show_results: true, allow_review: true, points_reward: 20 }); }} className="bg-teal-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">
                {showExamForm ? 'إلغاء' : 'إنشاء اختبار'}
              </button>
            </div>

            {showExamForm && (
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">{editingExam ? '✏️ تعديل الاختبار' : '➕ إنشاء اختبار جديد'}</h3>
                <form onSubmit={saveExam} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <select value={examForm.subject_id} onChange={(e) => { setExamForm({ ...examForm, subject_id: e.target.value, unit_id: '' }); loadUnits(e.target.value, examForm.grade_id); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                    <option value="">المادة</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={examForm.grade_id} onChange={(e) => { setExamForm({ ...examForm, grade_id: e.target.value, unit_id: '' }); loadUnits(examForm.subject_id, e.target.value); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                    <option value="">الصف</option>
                    {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="عنوان الاختبار" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm md:col-span-2" required />
                  <input value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} placeholder="الوصف" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-4" />
                  <select value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    {['درس', 'وحدة', 'نهائي'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={examForm.unit_id} onChange={(e) => setExamForm({ ...examForm, unit_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    <option value="">كل الوحدات</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input value={examForm.duration_minutes} onChange={(e) => setExamForm({ ...examForm, duration_minutes: e.target.value })} placeholder="المدة (دقيقة)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" required />
                  <input value={examForm.question_count} onChange={(e) => setExamForm({ ...examForm, question_count: e.target.value })} placeholder="عدد الأسئلة" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" required />
                  <input value={examForm.max_attempts} onChange={(e) => setExamForm({ ...examForm, max_attempts: e.target.value })} placeholder="المحاولات" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" />
                  <input value={examForm.points_reward} onChange={(e) => setExamForm({ ...examForm, points_reward: e.target.value })} placeholder="نقاط المكافأة" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="0" />
                  <input value={examForm.open_at} onChange={(e) => setExamForm({ ...examForm, open_at: e.target.value })} placeholder="يبدأ في" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="datetime-local" />
                  <input value={examForm.close_at} onChange={(e) => setExamForm({ ...examForm, close_at: e.target.value })} placeholder="ينتهي في" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="datetime-local" />
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={examForm.is_free} onChange={(e) => setExamForm({ ...examForm, is_free: e.target.checked })} className="w-4 h-4 accent-teal-600" />
                    مجاني
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={examForm.show_results} onChange={(e) => setExamForm({ ...examForm, show_results: e.target.checked })} className="w-4 h-4 accent-teal-600" />
                    إظهار النتائج
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={examForm.allow_review} onChange={(e) => setExamForm({ ...examForm, allow_review: e.target.checked })} className="w-4 h-4 accent-teal-600" />
                    مراجعة الإجابات
                  </label>
                  <div className="flex gap-2 md:col-span-4">
                    <button type="submit" className="flex-1 bg-teal-600 text-white font-extrabold py-3 rounded-xl hover:bg-teal-700 transition-colors">{editingExam ? 'حفظ التعديلات' : 'إنشاء الاختبار'}</button>
                    {editingExam && <button type="button" onClick={() => { setEditingExam(null); setShowExamForm(false); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">الاختبار</th>
                    <th className="text-right px-6 py-4">المادة</th>
                    <th className="text-right px-6 py-4">النوع</th>
                    <th className="text-right px-6 py-4">المدة</th>
                    <th className="text-right px-6 py-4">الأسئلة</th>
                    <th className="text-right px-6 py-4">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((x) => (
                    <tr key={x.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800">{x.title}</td>
                      <td className="px-6 py-4 text-slate-500">{x.subject_name}</td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-700">{x.exam_type}</span></td>
                      <td className="px-6 py-4 text-slate-600">{x.duration_minutes} د</td>
                      <td className="px-6 py-4 text-slate-600">{x.question_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => editExam(x)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                          <button onClick={() => deleteExam(x.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد اختبارات بعد.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {contentTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { setShowQuestionForm(!showQuestionForm); setEditingQuestion(null); setQuestionForm({ subject_id: '', grade_id: '', unit_id: '', lesson_id: '', question: '', options: ['', '', '', ''], correct_index: 0, question_type: 'mcq', explanation: '', difficulty: 'متوسط' }); }} className="bg-teal-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm">
                {showQuestionForm ? 'إلغاء' : 'إضافة سؤال'}
              </button>
            </div>

            {showQuestionForm && (
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">{editingQuestion ? '✏️ تعديل السؤال' : '➕ إضافة سؤال جديد'}</h3>
                <form onSubmit={saveQuestion} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <select value={questionForm.subject_id} onChange={(e) => { setQuestionForm({ ...questionForm, subject_id: e.target.value, unit_id: '', lesson_id: '' }); loadUnits(e.target.value, questionForm.grade_id); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                    <option value="">المادة</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={questionForm.grade_id} onChange={(e) => { setQuestionForm({ ...questionForm, grade_id: e.target.value, unit_id: '', lesson_id: '' }); loadUnits(questionForm.subject_id, e.target.value); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                    <option value="">الصف</option>
                    {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <select value={questionForm.question_type} onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value, options: e.target.value === 'tf' ? ['صح', 'خطأ', '', ''] : questionForm.options, correct_index: e.target.value === 'tf' ? 0 : questionForm.correct_index })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    <option value="mcq">اختيار من متعدد</option>
                    <option value="tf">صح / خطأ</option>
                    <option value="multi">إجابات متعددة</option>
                  </select>
                  <select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    {['مبتدئ', 'متوسط', 'متقدم'].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <textarea value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="نص السؤال" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm md:col-span-4" rows={2} required />
                  {questionForm.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {questionForm.question_type === 'multi' ? (
                        <button type="button" onClick={() => multiToggle(i)} className={`w-9 h-9 rounded-xl font-black text-sm shrink-0 ${(Array.isArray(questionForm.correct_index) && questionForm.correct_index.includes(i)) ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{(Array.isArray(questionForm.correct_index) && questionForm.correct_index.includes(i)) ? '✓' : `${i + 1}`}</button>
                      ) : (
                        <button type="button" onClick={() => setQuestionForm({ ...questionForm, correct_index: i })} className={`w-9 h-9 rounded-xl font-black text-sm shrink-0 ${Number(questionForm.correct_index) === i ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{letters[i]}</button>
                      )}
                      <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`الخيار ${i + 1}${questionForm.question_type === 'tf' && i < 2 ? (i === 0 ? '(صح)' : '(خطأ)') : ''}`} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm" required={i < 2} />
                    </div>
                  ))}
                  <input value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="الشرح بعد التصحيح" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-2" />
                  <select value={questionForm.unit_id} onChange={(e) => setQuestionForm({ ...questionForm, unit_id: e.target.value, lesson_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    <option value="">بدون وحدة</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <select value={questionForm.lesson_id} onChange={(e) => setQuestionForm({ ...questionForm, lesson_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                    <option value="">بدون درس</option>
                    {lessons.filter((l) => String(l.subject_id) === String(questionForm.subject_id)).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                  <div className="flex gap-2 md:col-span-4">
                    <button type="submit" className="flex-1 bg-teal-600 text-white font-extrabold py-3 rounded-xl hover:bg-teal-700 transition-colors">{editingQuestion ? 'حفظ التعديلات' : 'إضافة السؤال'}</button>
                    {editingQuestion && <button type="button" onClick={() => { setEditingQuestion(null); setShowQuestionForm(false); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">السؤال</th>
                    <th className="text-right px-6 py-4">المادة</th>
                    <th className="text-right px-6 py-4">النوع</th>
                    <th className="text-right px-6 py-4">المستوى</th>
                    <th className="text-right px-6 py-4">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800 max-w-[280px]">
                        <span className="line-clamp-2" title={q.question}>{q.question}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{q.subject_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${q.question_type === 'multi' ? 'bg-fuchsia-100 text-fuchsia-700' : q.question_type === 'tf' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {q.question_type === 'multi' ? 'إجابات متعددة' : q.question_type === 'tf' ? 'صح/خطأ' : 'اختيار'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{q.difficulty}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => editQuestion(q)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                          <button onClick={() => deleteQuestion(q.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">لا توجد أسئلة بعد.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 mb-5">📊 تحليلات الاختبارات</h2>
        {exams.length === 0 ? (
          <EmptyState icon="📊" title="لا توجد اختبارات" description="أنشئ اختبارات أولاً لعرض التحليلات." />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <select value={selectedExam} onChange={(e) => { setSelectedExam(e.target.value); setExamAnalytics(null); }} className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold flex-1 max-w-sm">
                <option value="">اختر اختباراً...</option>
                {exams.map((x) => <option key={x.id} value={x.id}>{x.title} — {x.subject_name}</option>)}
              </select>
              {selectedExam && (
                <button onClick={() => loadExamAnalytics(selectedExam)} className="bg-teal-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors text-sm shrink-0">عرض التحليلات</button>
              )}
            </div>

            {examAnalytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard icon="📈" label="متوسط الدرجات" value={`${examAnalytics.stats.avgScore}%`} color="bg-amber-100 text-amber-700" />
                  <StatCard icon="✅" label="نسبة النجاح" value={`${examAnalytics.stats.passRate}%`} color="bg-green-100 text-green-700" />
                  <StatCard icon="🏆" label="أعلى درجة" value={examAnalytics.stats.highestScore} color="bg-teal-100 text-teal-700" />
                  <StatCard icon="📉" label="أدنى درجة" value={examAnalytics.stats.lowestScore} color="bg-red-100 text-red-600" />
                  <StatCard icon="👥" label="طلاب فريدون" value={examAnalytics.stats.uniqueStudents} color="bg-blue-100 text-blue-700" />
                  <StatCard icon="📝" label="إجمالي المحاولات" value={examAnalytics.stats.totalAttempts} color="bg-violet-100 text-violet-700" />
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs">
                      <tr>
                        <th className="text-right px-6 py-4">الطالب</th>
                        <th className="text-right px-6 py-4">الدرجة</th>
                        <th className="text-right px-6 py-4">المحاولات</th>
                        <th className="text-right px-6 py-4">الوقت</th>
                        <th className="text-right px-6 py-4">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examAnalytics.results.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-black ${r.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.score}%</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{r.attempt_number}</td>
                          <td className="px-6 py-4 text-slate-600">{r.time_spent ? `${r.time_spent} ث` : '—'}</td>
                          <td className="px-6 py-4 text-xs text-slate-400" dir="ltr">{r.created_at}</td>
                        </tr>
                      ))}
                      {examAnalytics.results.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">لا توجد نتائج لهذا الاختبار.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 mb-5">👨‍🎓 متابعة الطلاب</h2>
        {students.length === 0 ? (
          <EmptyState icon="👨‍🎓" title="لا يوجد طلاب بعد" description="ستظهر بيانات تقدم الطلاب هنا." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-6 py-4">الطالب</th>
                  <th className="text-right px-6 py-4">الدروس المكتملة</th>
                  <th className="text-right px-6 py-4">متوسط الدرجات</th>
                  <th className="text-right px-6 py-4">آخر نشاط</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600">{s.completedLessons ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${(s.avgScore ?? 0) >= 85 ? 'bg-green-100 text-green-700' : (s.avgScore ?? 0) >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                        {s.avgScore != null ? `${s.avgScore}%` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400" dir="ltr">{s.lastActivity || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {recentResults.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">📊 آخر نتائج الطلاب</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right py-3 px-4 font-bold text-slate-600">الطالب</th>
                  <th className="text-right py-3 px-4 font-bold text-slate-600">الاختبار</th>
                  <th className="text-right py-3 px-4 font-bold text-slate-600">الدرجة</th>
                  <th className="text-right py-3 px-4 font-bold text-slate-600">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4 font-bold text-slate-800">{r.student_name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.exam_title}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-black ${
                        r.score >= 85 ? 'bg-green-100 text-green-700' :
                        r.score >= 60 ? 'bg-teal-100 text-teal-700' :
                        'bg-red-100 text-red-600'
                      }`}>{r.score}%</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${r.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                        {r.score >= 60 ? 'ناجح' : 'يحتاج تدريب'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
