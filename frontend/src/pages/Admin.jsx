import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Alert } from '../components/common';

const letters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز'];

function StatCard({ icon, label, value, color = 'bg-violet-100 text-violet-700' }) {
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

function Bars({ rows, color }) {
  const max = rows.length ? Math.max(...rows.map((r) => r.value)) : 1;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-bold text-slate-700">{r.icon ? `${r.icon} ${r.label}` : r.label}</span>
            <span className="text-slate-500 font-bold">{r.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [subsBySubject, setSubsBySubject] = useState([]);
  const [lessonsBySubject, setLessonsBySubject] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [apps, setApps] = useState([]);
  const [groups, setGroups] = useState([]);
  const [resources, setResources] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newGroup, setNewGroup] = useState({ grade_id: '', title: '', description: '', link: '' });
const [plans, setPlans] = useState([]);
  const [offers, setOffers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [settings, setSettings] = useState(null);
  const [planForm, setPlanForm] = useState({ section: 'junior', key: '', name: '', subjects: '', price: '', original_price: '', active: 1 });
  const [editingPlan, setEditingPlan] = useState(null);
  const [offerForm, setOfferForm] = useState({ title: '', description: '', badge: '', discount_text: '', starts_at: '', ends_at: '', active: 1 });
  const [editingOffer, setEditingOffer] = useState(null);

  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);

  const [subjectForm, setSubjectForm] = useState({ name: '', icon: '📘', color: '#3b82f6', slug: '', grade_from: 8, grade_to: 12, variant_id: '', price: '' });
  const [editingSubject, setEditingSubject] = useState(null);
  const [unitForm, setUnitForm] = useState({ subject_id: '', grade_id: '', name: '' });
  const [lessonForm, setLessonForm] = useState({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration: 30, teacher_name: '', level: 'متوسط', video_url: '', pdf_url: '', is_archive: false });
  const [editingLesson, setEditingLesson] = useState(null);
  const [questionForm, setQuestionForm] = useState({ subject_id: '', grade_id: '', unit_id: '', lesson_id: '', question: '', options: ['', '', '', ''], correct_index: 0, question_type: 'mcq', explanation: '', difficulty: 'متوسط' });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [examForm, setExamForm] = useState({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration_minutes: 30, question_count: 10, exam_type: 'درس', max_attempts: 1, open_at: '', close_at: '', is_free: false, show_results: true, allow_review: true, points_reward: 20 });
  const [editingExam, setEditingExam] = useState(null);
  const [examAnalytics, setExamAnalytics] = useState(null);
  const [liveForm, setLiveForm] = useState({ subject_id: '', grade_id: '', title: '', teacher_name: '', session_date: '', session_time: '', status: 'upcoming', meeting_url: '', video_url: '' });
  const [editingLive, setEditingLive] = useState(null);
  const [newVariant, setNewVariant] = useState({ name: '', description: '' });
  const [editingVariant, setEditingVariant] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [userRole, setUserRole] = useState('');
  const [usersPage, setUsersPage] = useState('recent');

  const [reportTab, setReportTab] = useState('students');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportData, setReportData] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('');
  const [auditTotal, setAuditTotal] = useState(0);
  const [pendingLessons, setPendingLessons] = useState([]);
  const [pendingExams, setPendingExams] = useState([]);
  const [teacherList, setTeacherList] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [editingTeacherSubjects, setEditingTeacherSubjects] = useState(null);

  const canAdmin = user && (user.role === 'admin' || user.role === 'teacher');
  const canManagePricing = user && user.role === 'admin';

  useEffect(() => {
    if (!canAdmin) { navigate('/'); return; }
    api.get('/grades').then(setGrades).catch(() => {});
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/subscriptions-by-subject'),
      api.get('/admin/lessons-by-subject'),
      api.get('/admin/recent-users'),
      api.get('/admin/messages'),
      api.get('/admin/applications'),
      api.get('/admin/groups'),
      api.get('/admin/resources'),
      api.get('/admin/recent-results'),
    ]).then(([s, ss, ls, us, ms, as, gs, rs, res]) => {
      setStats(s); setSubsBySubject(ss); setLessonsBySubject(ls); setUsers(us); setMessages(ms); setApps(as); setGroups(gs); setResources(rs); setResults(res);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [canAdmin]);

  const loadSubjects = () => {
    setError('');
    Promise.all([api.get('/admin/subjects'), api.get('/admin/variants')])
      .then(([s, v]) => { setSubjects(s); setVariants(v); }).catch((e) => setError(e.message));
  };

  const loadUnits = () => {
    setError('');
    api.get('/admin/units').then(setUnits).catch((e) => setError(e.message));
  };

  const loadLessons = () => {
    setError('');
    api.get('/admin/content-lessons').then(setLessons).catch((e) => setError(e.message));
  };

  const loadQuestions = () => {
    setError('');
    api.get('/admin/content-questions').then(setQuestions).catch((e) => setError(e.message));
  };

  const loadExams = () => {
    setError('');
    api.get('/admin/content-exams').then(setExams).catch((e) => setError(e.message));
  };

  const loadLive = () => {
    setError('');
    api.get('/admin/content-live-sessions').then(setLiveSessions).catch((e) => setError(e.message));
  };

  const loadUsers = async () => {
    setError('');
    try {
      if (usersPage === 'search') {
        const q = new URLSearchParams();
        if (userQuery) q.set('q', userQuery);
        if (userRole) q.set('role', userRole);
        setUsers(await api.get(`/admin/users?${q}`));
      } else {
        setUsers(await api.get('/admin/recent-users'));
      }
    } catch (e) { setError(e.message); }
  };

  const loadPricing = () => {
    setError('');
    Promise.all([api.get('/admin/plans'), api.get('/admin/offers'), api.get('/admin/variants')])
      .then(([p, o, v]) => { setPlans(p); setOffers(o); setVariants(v); })
      .catch((e) => setError(e.message));
  };

  const loadSettings = async () => {
    setError('');
    try { setSettings(await api.get('/admin/settings')); } catch (e) { setError(e.message); }
  };

  const loadReport = async (type) => {
    setError('');
    try {
      const params = new URLSearchParams();
      if (reportFrom) params.set('from_date', reportFrom);
      if (reportTo) params.set('to_date', reportTo);
      const q = params.toString();
      setReportData(await api.get(`/admin/reports/${type}${q ? '?' + q : ''}`));
    } catch (e) { setError(e.message); }
  };

  const loadAuditLog = async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(auditPage), limit: '20' });
      if (auditAction) params.set('action', auditAction);
      const data = await api.get(`/admin/audit-log?${params}`);
      setAuditLog(data.logs || data);
      setAuditTotal(data.total || 0);
    } catch (e) { setError(e.message); }
  };

  const loadPendingContent = async () => {
    setError('');
    try {
      const [pl, pe] = await Promise.all([
        api.get('/admin/lessons?status=pending'),
        api.get('/admin/exams?status=pending'),
      ]);
      setPendingLessons(pl);
      setPendingExams(pe);
    } catch (e) { setError(e.message); }
  };

  const approveLesson = async (id) => {
    setError('');
    try { await api.patch(`/admin/lessons/${id}/approve`); setPendingLessons((p) => p.filter((l) => l.id !== id)); } catch (e) { setError(e.message); }
  };

  const rejectLesson = async (id) => {
    const notes = prompt('سبب الرفض:');
    if (notes === null) return;
    setError('');
    try { await api.patch(`/admin/lessons/${id}/approve`, { review_notes: notes }); setPendingLessons((p) => p.filter((l) => l.id !== id)); } catch (e) { setError(e.message); }
  };

  const approveExam = async (id) => {
    setError('');
    try { await api.patch(`/admin/exams/${id}/approve`); setPendingExams((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const rejectExam = async (id) => {
    const notes = prompt('سبب الرفض:');
    if (notes === null) return;
    setError('');
    try { await api.patch(`/admin/exams/${id}/approve`, { review_notes: notes }); setPendingExams((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const loadTeachers = async () => {
    setError('');
    try {
      const [t, s] = await Promise.all([api.get('/admin/teachers'), api.get('/admin/subjects')]);
      setTeacherList(t);
      setAllSubjects(s);
    } catch (e) { setError(e.message); }
  };

  const toggleTeacherSubject = async (teacherId, subjectId) => {
    setError('');
    try { await api.post(`/admin/teachers/${teacherId}/subjects`, { subject_id: subjectId }); loadTeachers(); } catch (e) { setError(e.message); }
  };

  const toggleTeacher = async (teacherId, enabled) => {
    setError('');
    try { await api.patch(`/admin/teachers/${teacherId}`, { enabled: enabled ? 1 : 0 }); loadTeachers(); } catch (e) { setError(e.message); }
  };

  const downloadCSV = (data, filename) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveSetting = async (key, value) => {
    setError('');
    try {
      await api.patch('/admin/settings', { key, value });
      setSettings((p) => ({ ...p, [key]: value }));
    } catch (e) { setError(e.message); }
  };

  const savePlan = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...planForm, subjects: planForm.subjects === '' || planForm.subjects === null ? null : Number(planForm.subjects), price: Number(planForm.price), original_price: planForm.original_price === '' ? null : Number(planForm.original_price), active: planForm.active ? 1 : 0 };
      if (editingPlan) await api.patch(`/admin/plans/${editingPlan.id}`, body);
      else await api.post('/admin/plans', body);
      setPlanForm({ section: 'junior', key: '', name: '', subjects: '', price: '', original_price: '', active: 1 });
      setEditingPlan(null);
      loadPricing();
    } catch (err) { setError(err.message); }
  };

  const editPlan = (p) => {
    setEditingPlan(p);
    setPlanForm({ section: p.section, key: p.key, name: p.name, subjects: p.subjects ?? '', price: p.price, original_price: p.original_price ?? '', active: p.active });
  };

  const deletePlan = async (id) => {
    if (!confirm('حذف هذه الخطة؟')) return;
    try { await api.del(`/admin/plans/${id}`); setPlans((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveOffer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...offerForm, active: offerForm.active ? 1 : 0 };
      if (editingOffer) await api.patch(`/admin/offers/${editingOffer.id}`, body);
      else await api.post('/admin/offers', body);
      setOfferForm({ title: '', description: '', badge: '', discount_text: '', starts_at: '', ends_at: '', active: 1 });
      setEditingOffer(null);
      loadPricing();
    } catch (err) { setError(err.message); }
  };

  const editOffer = (o) => {
    setEditingOffer(o);
    setOfferForm({ title: o.title, description: o.description, badge: o.badge, discount_text: o.discount_text, starts_at: o.starts_at || '', ends_at: o.ends_at || '', active: o.active });
  };

  const deleteOffer = async (id) => {
    if (!confirm('حذف هذا العرض؟')) return;
    try { await api.del(`/admin/offers/${id}`); setOffers((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const patchApp = async (id, status) => {
    try { await api.patch(`/admin/applications/${id}`, { status }); setApps((p) => p.map((a) => a.id === id ? { ...a, status } : a)); } catch (e) { setError(e.message); }
  };

  const deleteMessage = async (id) => {
    if (!confirm('حذف هذه الرسالة؟')) return;
    await api.del(`/admin/messages/${id}`);
    setMessages((p) => p.filter((m) => m.id !== id));
  };

  const addGroup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/groups', { ...newGroup, grade_id: Number(newGroup.grade_id) });
      const gs = await api.get('/admin/groups');
      setGroups(gs);
      setNewGroup({ grade_id: '', title: '', description: '', link: '' });
    } catch (err) { setError(err.message); }
  };

  const deleteGroup = async (id) => {
    if (!confirm('حذف هذا الجروب؟')) return;
    try { await api.del(`/admin/groups/${id}`); setGroups((p) => p.filter((g) => g.id !== id)); } catch (e) { setError(e.message); }
  };

  const deleteResource = async (id) => {
    if (!confirm('حذف هذا الملف؟')) return;
    try { await api.del(`/admin/resources/${id}`); setResources((p) => p.filter((r) => r.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveSubject = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingSubject) await api.patch(`/admin/subjects/${editingSubject.id}`, subjectForm);
      else await api.post('/admin/subjects', subjectForm);
      setSubjectForm({ name: '', icon: '📘', color: '#3b82f6', slug: '', grade_from: 8, grade_to: 12, variant_id: '', price: '' });
      setEditingSubject(null);
      loadSubjects();
    } catch (err) { setError(err.message); }
  };

  const editSubject = (s) => {
    setEditingSubject(s);
    setSubjectForm({ name: s.name, icon: s.icon, color: s.color, slug: s.slug, grade_from: s.grade_from, grade_to: s.grade_to, variant_id: s.variant_id ?? '', price: s.price ?? '' });
  };

  const deleteSubject = async (id) => {
    if (!confirm('حذف هذه المادة؟')) return;
    try { await api.del(`/admin/subjects/${id}`); setSubjects((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveUnit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/units', { ...unitForm, subject_id: Number(unitForm.subject_id), grade_id: Number(unitForm.grade_id) });
      setUnitForm({ subject_id: '', grade_id: '', name: '' });
      loadUnits();
    } catch (err) { setError(err.message); }
  };

  const deleteUnit = async (id) => {
    if (!confirm('حذف هذه الوحدة؟')) return;
    try { await api.del(`/admin/units/${id}`); setUnits((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveLesson = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...lessonForm, grade_id: Number(lessonForm.grade_id), subject_id: Number(lessonForm.subject_id), unit_id: lessonForm.unit_id ? Number(lessonForm.unit_id) : '', duration: Number(lessonForm.duration) };
      if (editingLesson) await api.patch(`/admin/content-lessons/${editingLesson.id}`, body);
      else await api.post('/admin/content-lessons', body);
      setLessonForm({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration: 30, teacher_name: '', level: 'متوسط', video_url: '', pdf_url: '', is_archive: false });
      setEditingLesson(null);
      loadLessons();
    } catch (err) { setError(err.message); }
  };

  const editLesson = (l) => {
    setEditingLesson(l);
    setLessonForm({ subject_id: l.subject_id, grade_id: l.grade_id, unit_id: l.unit_id ?? '', title: l.title, description: l.description, duration: l.duration, teacher_name: l.teacher_name ?? '', level: l.level, video_url: l.video_url ?? '', pdf_url: l.pdf_url ?? '', is_archive: !!l.is_archive });
  };

  const deleteLesson = async (id) => {
    if (!confirm('حذف هذا الدرس؟')) return;
    try { await api.del(`/admin/content-lessons/${id}`); setLessons((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const setOpt = (i, val) => setQuestionForm({ ...questionForm, options: questionForm.options.map((o, x) => x === i ? val : o) });

  const saveQuestion = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const opts = questionForm.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return setError('اكتب خيارين على الأقل (أسئلة صح/خطأ: "صح","خطأ")');
      let correct = questionForm.correct_index;
      if (questionForm.question_type === 'multi' && Array.isArray(questionForm.correct_index)) {
        correct = questionForm.correct_index.filter((i) => i >= 0 && i < opts.length);
        if (correct.length === 0) return setError('حدد إجابة واحدة صحيحة على الأقل');
      } else if (questionForm.question_type !== 'multi') {
        correct = Number(questionForm.correct_index);
        if (!Number.isFinite(correct) || correct < 0 || correct >= opts.length) return setError('رقم الإجابة الصحيحة غير صالح');
      }
      const body = { ...questionForm, options: opts, correct_index: correct, grade_id: Number(questionForm.grade_id), subject_id: Number(questionForm.subject_id), unit_id: questionForm.unit_id ? Number(questionForm.unit_id) : '', lesson_id: questionForm.lesson_id ? Number(questionForm.lesson_id) : '' };
      if (editingQuestion) await api.patch(`/admin/content-questions/${editingQuestion.id}`, body);
      else await api.post('/admin/content-questions', body);
      setQuestionForm({ subject_id: '', grade_id: '', unit_id: '', lesson_id: '', question: '', options: ['', '', '', ''], correct_index: 0, question_type: 'mcq', explanation: '', difficulty: 'متوسط' });
      setEditingQuestion(null);
      loadQuestions();
    } catch (err) { setError(err.message); }
  };

  const multiToggle = (i) => {
    const arr = Array.isArray(questionForm.correct_index) ? questionForm.correct_index : [];
    setQuestionForm({ ...questionForm, correct_index: arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i] });
  };

  const editQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionForm({
      subject_id: q.subject_id, grade_id: q.grade_id, unit_id: q.unit_id ?? '', lesson_id: q.lesson_id ?? '',
      question: q.question, options: [...JSON.parse(q.options), ...Array(6).fill('')].slice(0, 6),
      correct_index: q.question_type === 'multi' ? JSON.parse(q.correct_index || '[]') : Number(q.correct_index),
      question_type: q.question_type, explanation: q.explanation ?? '', difficulty: q.difficulty,
    });
  };

  const deleteQuestion = async (id) => {
    if (!confirm('حذف هذا السؤال؟')) return;
    try { await api.del(`/admin/content-questions/${id}`); setQuestions((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveExam = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...examForm, grade_id: Number(examForm.grade_id), subject_id: Number(examForm.subject_id), unit_id: examForm.unit_id ? Number(examForm.unit_id) : '', duration_minutes: Number(examForm.duration_minutes), question_count: Number(examForm.question_count), max_attempts: Number(examForm.max_attempts), open_at: examForm.open_at || null, close_at: examForm.close_at || null, is_free: examForm.is_free ? 1 : 0, show_results: examForm.show_results ? 1 : 0, allow_review: examForm.allow_review ? 1 : 0, points_reward: Number(examForm.points_reward) };
      if (editingExam) await api.patch(`/admin/content-exams/${editingExam.id}`, body);
      else await api.post('/admin/content-exams', body);
      setExamForm({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration_minutes: 30, question_count: 10, exam_type: 'درس', max_attempts: 1, open_at: '', close_at: '', is_free: false, show_results: true, allow_review: true, points_reward: 20 });
      setEditingExam(null);
      loadExams();
    } catch (err) { setError(err.message); }
  };

  const editExam = (x) => {
    setEditingExam(x);
    setExamForm({ subject_id: x.subject_id, grade_id: x.grade_id, unit_id: x.unit_id ?? '', title: x.title, description: x.description, duration_minutes: x.duration_minutes, question_count: x.question_count, exam_type: x.exam_type, max_attempts: x.max_attempts ?? 1, open_at: x.open_at ?? '', close_at: x.close_at ?? '', is_free: !!x.is_free, show_results: x.show_results !== 0, allow_review: x.allow_review !== 0, points_reward: x.points_reward ?? 20 });
  };

  const deleteExam = async (id) => {
    if (!confirm('حذف هذا الاختبار؟')) return;
    try { await api.del(`/admin/content-exams/${id}`); setExams((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const loadExamAnalytics = async (examId) => {
    setError('');
    try {
      const data = await api.get(`/admin/exam-analytics/${examId}`);
      setExamAnalytics(data);
    } catch (e) { setError(e.message); }
  };

  const saveLive = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...liveForm, grade_id: Number(liveForm.grade_id), subject_id: Number(liveForm.subject_id) };
      if (editingLive) await api.patch(`/admin/content-live-sessions/${editingLive.id}`, body);
      else await api.post('/admin/content-live-sessions', body);
      setLiveForm({ subject_id: '', grade_id: '', title: '', teacher_name: '', session_date: '', session_time: '', status: 'upcoming', meeting_url: '', video_url: '' });
      setEditingLive(null);
      loadLive();
    } catch (err) { setError(err.message); }
  };

  const editLive = (l) => {
    setEditingLive(l);
    setLiveForm({ subject_id: l.subject_id, grade_id: l.grade_id, title: l.title, teacher_name: l.teacher_name ?? '', session_date: l.session_date ?? '', session_time: l.session_time ?? '', status: l.status, meeting_url: l.meeting_url ?? '', video_url: l.video_url ?? '' });
  };

  const deleteLive = async (id) => {
    if (!confirm('حذف هذه الحصة؟')) return;
    try { await api.del(`/admin/content-live-sessions/${id}`); setLiveSessions((p) => p.filter((x) => x.id !== id)); } catch (e) { setError(e.message); }
  };

  const saveVariant = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingVariant) await api.patch(`/admin/variants/${editingVariant.id}`, newVariant);
      else await api.post('/admin/variants', newVariant);
      setNewVariant({ name: '', description: '' });
      setEditingVariant(null);
      loadPricing();
    } catch (err) { setError(err.message); }
  };

  const approveApp = async (a) => {
    if (!confirm(`إنشاء/ترقية حساب معلم لـ ${a.name}؟`)) return;
    setError('');
    try {
      const res = await api.post(`/admin/teacher-applications/${a.id}/approve`, {});
      alert(res.temp_password ? `تم إنشاء الحساب.\nكلمة المرور المؤقتة: ${res.temp_password}\nيجب أن يغيّرها المعلم من صفحة "نسيت كلمة المرور".` : res.message);
      setApps((p) => p.map((x) => x.id === a.id ? { ...x, status: 'approved' } : x));
    } catch (err) { setError(err.message); }
  };

  const openTab = (id) => {
    setTab(id);
    if (id === 'pricing') loadPricing();
    if (id === 'subjects') loadSubjects();
    if (id === 'units') loadUnits();
    if (id === 'lessons') loadLessons();
    if (id === 'questions') loadQuestions();
    if (id === 'exams') loadExams();
    if (id === 'live') loadLive();
    if (id === 'users') loadUsers();
    if (id === 'settings') loadSettings();
    if (id === 'reports') loadReport(reportTab);
    if (id === 'audit') loadAuditLog();
    if (id === 'lessons') loadPendingContent();
    if (id === 'teachers') loadTeachers();
  };

  if (!canAdmin) return null;
  if (loading) return <Loading label="جارٍ تحميل لوحة الإدارة..." />;

  const tabs = [
    { id: 'overview', label: '📊 نظرة عامة' },
    { id: 'users', label: '👥 المستخدمون' },
    { id: 'subjects', label: '📚 المواد والوحدات' },
    { id: 'lessons', label: '🎬 الدروس' },
    { id: 'questions', label: '❓ الأسئلة' },
    { id: 'exams', label: '📝 الاختبارات' },
    { id: 'live', label: '🔴 الحصص المباشرة' },
    { id: 'applications', label: '👨‍🏫 طلبات المعلمين' },
    { id: 'groups', label: '💬 الجروبات' },
    { id: 'resources', label: '📄 الملفات' },
    { id: 'results', label: '📊 النتائج' },
    { id: 'messages', label: '✉️ الرسائل' },
    { id: 'reports', label: '📊 التقارير' },
    { id: 'audit', label: '📋 سجل العمليات' },
    { id: 'teachers', label: '👨‍🏫 المعلمون' },
];
  if (canManagePricing) tabs.push({ id: 'pricing', label: '💰 الأسعار والعروض' });
  if (user.role === 'admin') tabs.push({ id: 'settings', label: '⚙️ الإعدادات' });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">⚙️ لوحة الإدارة</h1>
          <p className="text-slate-500">مرحباً، {user.name}</p>
        </div>
        <span className="px-4 py-2 rounded-full bg-violet-100 text-violet-700 font-bold text-sm">دور: {user.role === 'admin' ? 'إدارة' : 'معلم'}</span>
      </div>

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => openTab(t.id)} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="👥" label="مستخدم" value={stats.users} />
            <StatCard icon="🎓" label="طالب" value={stats.students} color="bg-blue-100 text-blue-700" />
            <StatCard icon="👨‍🏫" label="معلم" value={stats.teachers} color="bg-emerald-100 text-emerald-700" />
            <StatCard icon="📚" label="اشتراك" value={stats.subscriptions} color="bg-amber-100 text-amber-700" />
            <StatCard icon="💳" label="دفعة مدفوعة" value={stats.payments} color="bg-teal-100 text-teal-700" />
            <StatCard icon="💰" label="الإيراد (ر.ع)" value={stats.revenue} color="bg-green-100 text-green-700" />
            <StatCard icon="🎬" label="درس" value={stats.lessons} />
            <StatCard icon="❓" label="سؤال" value={stats.questions} color="bg-blue-100 text-blue-700" />
            <StatCard icon="📝" label="اختبار" value={stats.exams} color="bg-emerald-100 text-emerald-700" />
            <StatCard icon="📄" label="ملف" value={stats.resources} color="bg-amber-100 text-amber-700" />
            <StatCard icon="📊" label="نتيجة اختبار" value={stats.examResults} />
            <StatCard icon="👁️" label="مشاهدة" value={stats.totalViews} color="bg-blue-100 text-blue-700" />
            <StatCard icon="✉️" label="رسالة" value={stats.messages} color="bg-emerald-100 text-emerald-700" />
            <StatCard icon="⏳" label="طلبات معلقة" value={stats.pendingApplications} color="bg-red-100 text-red-700" />
            <StatCard icon="📗" label="الاشتراكات النشطة" value={stats.activeSubscriptions} color="bg-emerald-100 text-emerald-700" />
            <StatCard icon="💰" label="الإيرادات" value={`${Number(stats.totalRevenue).toFixed(3)} ر.ع`} color="bg-amber-100 text-amber-700" />
            <StatCard icon="👥" label="المشتركين" value={stats.subscriberCount} color="bg-purple-100 text-purple-700" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h3 className="text-lg font-extrabold text-slate-900 mb-5">📚 الاشتراكات حسب المادة</h3>
              <Bars rows={subsBySubject} color="bg-gradient-to-l from-violet-500 to-purple-700" />
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
              <h3 className="text-lg font-extrabold text-slate-900 mb-5">🎬 الدروس حسب المادة</h3>
              <Bars rows={lessonsBySubject} color="bg-gradient-to-l from-blue-500 to-cyan-600" />
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">📈 متوسط نتائج الاختبارات</h3>
            <p className="text-5xl font-black text-violet-700">{stats.avgExamScore}%</p>
            <p className="text-sm text-slate-500 mt-1">متوسط أداء الطلاب في جميع الاختبارات</p>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
            <select value={usersPage} onChange={(e) => { setUsersPage(e.target.value); }} className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm">
              <option value="recent">أحدث المستخدمين</option>
              <option value="search">بحث في كل المستخدمين</option>
            </select>
            {usersPage === 'search' && (
              <>
                <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="اسم / بريد / هاتف" className="flex-1 min-w-[180px] px-4 py-3 rounded-xl border border-slate-200 text-sm" />
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                  <option value="">كل الأدوار</option>
                  <option value="student">طالب</option>
                  <option value="teacher">معلم</option>
                  <option value="admin">إدارة</option>
                </select>
              </>
            )}
            <button onClick={loadUsers} className="bg-violet-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors">عرض</button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-6 py-4">الاسم</th>
                  <th className="text-right px-6 py-4">البريد / الهاتف</th>
                  <th className="text-right px-6 py-4">الدور</th>
                  <th className="text-right px-6 py-4">الصف</th>
                  <th className="text-right px-6 py-4">النقاط</th>
                  <th className="text-right px-6 py-4">المواد</th>
                  <th className="text-right px-6 py-4">الاشتراك</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-bold text-slate-800">{u.name}</td>
                    <td className="px-6 py-4 text-slate-500" dir="ltr">{u.email} • {u.phone || '—'}</td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-black ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'teacher' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                    <td className="px-6 py-4 text-slate-600">{u.grade ? `الصف ${u.grade}` : '—'}</td>
                    <td className="px-6 py-4 font-black text-amber-600">{u.points}</td>
                    <td className="px-6 py-4 text-slate-600">{u.subjects_count ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${u.sub_status === 'active' ? 'bg-emerald-100 text-emerald-700' : u.sub_status === 'inactive' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.sub_status === 'active' ? 'نشط' : u.sub_status === 'inactive' ? 'منتهي' : 'بدون'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-4">
          {messages.length === 0 ? <p className="text-slate-400 text-center py-10">لا توجد رسائل.</p> : messages.map((m) => (
            <div key={m.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-extrabold text-slate-900">{m.name} <span className="text-xs text-slate-400 font-normal">— {m.subject}</span></p>
                  <p className="text-xs text-slate-400" dir="ltr">{m.email} • {m.phone || '—'}</p>
                </div>
                <button onClick={() => deleteMessage(m.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">حذف</button>
              </div>
              <p className="text-slate-600 text-sm leading-7">{m.message}</p>
              <p className="text-xs text-slate-400 mt-3" dir="ltr">{m.created_at}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'applications' && (
        <div className="space-y-4">
          {apps.length === 0 ? <p className="text-slate-400 text-center py-10">لا توجد طلبات.</p> : apps.map((a) => (
            <div key={a.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-extrabold text-slate-900">{a.name} — <span className="text-violet-600">{a.subject}</span></p>
                  <p className="text-xs text-slate-400" dir="ltr">{a.email} • {a.phone || '—'} • {a.years_experience} سنة خبرة</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                  {a.status === 'pending' && (
                    <>
                      <button onClick={() => approveApp(a)} className="bg-green-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-green-700">موافقة + إنشاء حساب</button>
                      <button onClick={() => patchApp(a.id, 'rejected')} className="bg-red-100 text-red-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-red-200">رفض</button>
                    </>
                  )}
                </div>
              </div>
              {a.message && <p className="text-slate-600 text-sm leading-7">{a.message}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'groups' && (
        <div className="space-y-6">
          <form onSubmit={addGroup} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <h3 className="text-lg font-extrabold text-slate-900 md:col-span-2">➕ إضافة جروب جديد</h3>
            <select value={newGroup.grade_id} onChange={(e) => setNewGroup({ ...newGroup, grade_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required>
              <option value="">اختر الصف</option>
              {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>الصف {g}</option>)}
            </select>
            <input value={newGroup.title} onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })} placeholder="اسم الجروب" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
            <input value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="الوصف" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
            <input value={newGroup.link} onChange={(e) => setNewGroup({ ...newGroup, link: e.target.value })} placeholder="رابط واتساب" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" required />
            <button type="submit" className="bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">إضافة</button>
          </form>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold text-slate-800">{g.title}</p>
                  <p className="text-xs text-slate-400">{g.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={g.link} target="_blank" rel="noreferrer" className="bg-green-600 text-white text-xs font-black px-4 py-2 rounded-xl">فتح</a>
                  <button onClick={() => deleteGroup(g.id)} className="bg-red-50 text-red-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-red-100">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div className="space-y-3">
          {resources.length === 0 ? <p className="text-slate-400 text-center py-10">لا توجد ملفات.</p> : resources.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold text-slate-800">📄 {r.title}</p>
                <p className="text-xs text-slate-400">{r.type} • {r.subject_name} • {r.grade_name} • 👁️ {r.views}</p>
              </div>
              <button onClick={() => deleteResource(r.id)} className="bg-red-50 text-red-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-red-100 shrink-0">حذف</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-3">
          {results.length === 0 ? <p className="text-slate-400 text-center py-10">لا توجد نتائج.</p> : results.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold text-slate-800">{r.user_name} — <span className="text-violet-600">{r.exam_title}</span></p>
                <p className="text-xs text-slate-400" dir="ltr">{r.created_at}</p>
              </div>
              <span className={`px-4 py-2 rounded-full font-black shrink-0 ${r.score >= 85 ? 'bg-green-100 text-green-700' : r.score >= 60 ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-600'}`}>{r.score}%</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'subjects' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">{editingSubject ? `✏️ تعديل: ${editingSubject.name}` : '➕ إضافة مادة'}</h3>
            <p className="text-xs text-slate-400 mb-5">أنواع المواد (عامة/متقدمة/أساسية) تُدار من تبويب "الأسعار والعروض".</p>
            <form onSubmit={saveSubject} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="اسم المادة" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
              <input value={subjectForm.slug} onChange={(e) => setSubjectForm({ ...subjectForm, slug: e.target.value })} placeholder="المعرّف (math_advanced)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" required />
              <input value={subjectForm.icon} onChange={(e) => setSubjectForm({ ...subjectForm, icon: e.target.value })} placeholder="أيقونة 📘" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} placeholder="#3b82f6" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
<input value={subjectForm.price} onChange={(e) => setSubjectForm({ ...subjectForm, price: e.target.value })} placeholder="سعر المادة (ر.ع/سنة) — اتركه فارغاً للافتراضي" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="0" step="0.5" />
              <select value={subjectForm.grade_from} onChange={(e) => setSubjectForm({ ...subjectForm, grade_from: Number(e.target.value) })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>من الصف {g}</option>)}
              </select>
              <select value={subjectForm.grade_to} onChange={(e) => setSubjectForm({ ...subjectForm, grade_to: Number(e.target.value) })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>إلى الصف {g}</option>)}
              </select>
              <select value={subjectForm.variant_id} onChange={(e) => setSubjectForm({ ...subjectForm, variant_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="">بدون نوع</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingSubject ? 'حفظ' : 'إضافة'}</button>
                {editingSubject && <button type="button" onClick={() => { setEditingSubject(null); setSubjectForm({ name: '', icon: '📘', color: '#3b82f6', slug: '', grade_from: 8, grade_to: 12, variant_id: '', price: '' }); }} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((s) => (
              <div key={s.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-extrabold text-slate-900">{s.icon} {s.name}{s.variant_name && s.variant_name !== 'عامة' ? ` (${s.variant_name})` : ''}</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editSubject(s)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                    <button onClick={() => deleteSubject(s.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">الصفوف {s.grade_from}-{s.grade_to} • {s.units_count} وحدة • {s.lessons_count} درس • <span dir="ltr">{s.slug}</span></p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">➕ إضافة وحدة</h3>
            <p className="text-xs text-slate-400 mb-5">كل مادة × صف لها 3 وحدات (أو أكثر).</p>
            <form onSubmit={saveUnit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select value={unitForm.subject_id} onChange={(e) => setUnitForm({ ...unitForm, subject_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.variant_name && s.variant_name !== 'عامة' ? ` (${s.variant_name})` : ''}</option>)}
              </select>
              <select value={unitForm.grade_id} onChange={(e) => setUnitForm({ ...unitForm, grade_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">الصف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="اسم الوحدة (الوحدة الأولى)" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
              <button type="submit" className="bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">إضافة</button>
            </form>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between border border-slate-100 rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.subject_name} • {u.grade_name} • {u.lessons_count} دروس</p>
                  </div>
                  <button onClick={() => deleteUnit(u.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100 shrink-0">حذف</button>
                </div>
              ))}
              {units.length === 0 && <p className="text-slate-400 text-sm col-span-3">لا توجد وحدات.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'lessons' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">{editingLesson ? `✏️ تعديل الدرس: ${editingLesson.title}` : '➕ إضافة درس'}</h3>
            <form onSubmit={saveLesson} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select value={lessonForm.subject_id} onChange={(e) => setLessonForm({ ...lessonForm, subject_id: e.target.value, unit_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.variant_name && s.variant_name !== 'عامة' ? ` (${s.variant_name})` : ''}</option>)}
              </select>
              <select value={lessonForm.grade_id} onChange={(e) => setLessonForm({ ...lessonForm, grade_id: e.target.value, unit_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">الصف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={lessonForm.unit_id} onChange={(e) => setLessonForm({ ...lessonForm, unit_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="">بدون وحدة</option>
                {units.filter((u) => String(u.subject_id) === String(lessonForm.subject_id) && String(u.grade_id) === String(lessonForm.grade_id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="عنوان الدرس" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
              <input value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="الوصف" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-3" />
              <input value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} placeholder="المدة (دقيقة)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" required />
              <input value={lessonForm.teacher_name} onChange={(e) => setLessonForm({ ...lessonForm, teacher_name: e.target.value })} placeholder="المعلم (أ. محمد البلوشي)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <select value={lessonForm.level} onChange={(e) => setLessonForm({ ...lessonForm, level: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                {['مبتدئ', 'متوسط', 'متقدم'].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="رابط الفيديو (يوتيوب أو mp4)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-2" dir="ltr" />
              <input value={lessonForm.pdf_url} onChange={(e) => setLessonForm({ ...lessonForm, pdf_url: e.target.value })} placeholder="رابط الملخص PDF" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-2" dir="ltr" />
<label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
  <input type="checkbox" checked={lessonForm.is_archive} onChange={(e) => setLessonForm({ ...lessonForm, is_archive: e.target.checked })} className="w-4 h-4 accent-violet-600" />
  🗂️ من السنوات السابقة (يظهر في تبويب السنوات السابقة)
</label>
              <div className="flex gap-2 md:col-span-4">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingLesson ? 'حفظ' : 'إضافة'}</button>
                {editingLesson && <button type="button" onClick={() => { setEditingLesson(null); setLessonForm({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration: 30, teacher_name: '', level: 'متوسط', video_url: '', pdf_url: '', is_archive: false }); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-6 py-4">الدرس</th>
                  <th className="text-right px-6 py-4">المادة / الصف</th>
                  <th className="text-right px-6 py-4">المدة</th>
                  <th className="text-right px-6 py-4">المستوى</th>
                  <th className="text-right px-6 py-4">فيديو</th>
                  <th className="text-right px-6 py-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-bold text-slate-800 max-w-[260px]"><span className="line-clamp-1" title={l.title}>{l.title}</span><span className="text-xs text-slate-400 block">{l.unit_name ?? '—'}</span></td>
                    <td className="px-6 py-4 text-slate-500">{l.subject_name} • {l.grade_name}</td>
                    <td className="px-6 py-4 text-slate-600">{l.duration} د</td>
                    <td className="px-6 py-4">{l.level}</td>
                    <td className="px-6 py-4">{l.video_url ? '🎥' : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => editLesson(l)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                        <button onClick={() => deleteLesson(l.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lessons.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد دروس.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">📋 محتوى ينتظر المراجعة</h3>
            {pendingLessons.length === 0 && pendingExams.length === 0 && <p className="text-slate-400 text-sm">لا يوجد محتوى معلق.</p>}
            {pendingLessons.length > 0 && (
              <div className="mb-6">
                <h4 className="font-extrabold text-slate-800 mb-3">دروس تنتظر المراجعة ({pendingLessons.length})</h4>
                <div className="space-y-2">
                  {pendingLessons.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-2xl px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{l.title}</p>
                        <p className="text-xs text-slate-400">{l.subject_name} • {l.grade_name} • {l.teacher_name || '—'}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => approveLesson(l.id)} className="bg-green-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-green-700">موافقة</button>
                        <button onClick={() => rejectLesson(l.id)} className="bg-red-50 text-red-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-red-100">رفض</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingExams.length > 0 && (
              <div>
                <h4 className="font-extrabold text-slate-800 mb-3">اختبارات تنتظر المراجعة ({pendingExams.length})</h4>
                <div className="space-y-2">
                  {pendingExams.map((x) => (
                    <div key={x.id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-2xl px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{x.title}</p>
                        <p className="text-xs text-slate-400">{x.subject_name} • {x.grade_name}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => approveExam(x.id)} className="bg-green-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-green-700">موافقة</button>
                        <button onClick={() => rejectExam(x.id)} className="bg-red-50 text-red-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-red-100">رفض</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">{editingQuestion ? `✏️ تعديل السؤال #${editingQuestion.id}` : '➕ إضافة سؤال'}</h3>
            <form onSubmit={saveQuestion} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select value={questionForm.subject_id} onChange={(e) => setQuestionForm({ ...questionForm, subject_id: e.target.value, unit_id: '', lesson_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.variant_name && s.variant_name !== 'عامة' ? ` (${s.variant_name})` : ''}</option>)}
              </select>
              <select value={questionForm.grade_id} onChange={(e) => setQuestionForm({ ...questionForm, grade_id: e.target.value, unit_id: '', lesson_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">الصف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={questionForm.question_type} onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value, options: e.target.value === 'tf' ? ['صح', 'خطأ', '', ''] : questionForm.options, correct_index: e.target.value === 'tf' ? 0 : questionForm.correct_index })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="mcq">اختيار من متعدد (mcq)</option>
                <option value="tf">صح / خطأ</option>
                <option value="multi">إجابات متعددة (multi)</option>
              </select>
              <select value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                {['مبتدئ', 'متوسط', 'متقدم'].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <textarea value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="نص السؤال" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm md:col-span-4" rows={2} required />
              {questionForm.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  {questionForm.question_type === 'multi' ? (
                    <button type="button" onClick={() => multiToggle(i)} className={`w-9 h-9 rounded-xl font-black text-sm shrink-0 ${(Array.isArray(questionForm.correct_index) && questionForm.correct_index.includes(i)) ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{(Array.isArray(questionForm.correct_index) && questionForm.correct_index.includes(i)) ? '✓' : `${i + 1}`}</button>
                  ) : (
                    <button type="button" onClick={() => setQuestionForm({ ...questionForm, correct_index: i })} className={`w-9 h-9 rounded-xl font-black text-sm shrink-0 ${Number(questionForm.correct_index) === i ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{letters[i]}</button>
                  )}
                  <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`الخيار ${i + 1}${questionForm.question_type === 'tf' && i < 2 ? (i === 0 ? '(صح)' : '(خطأ)') : ''}`} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm" required={i < 2} />
                </div>
              ))}
              {questionForm.question_type === 'multi' && <p className="text-xs text-slate-400 md:col-span-4">اضغط على الرقم (✓) لتحديد كل إجابة صحيحة.</p>}
              <input value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="الشرح بعد التصحيح" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-2" />
              <select value={questionForm.unit_id} onChange={(e) => setQuestionForm({ ...questionForm, unit_id: e.target.value, lesson_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="">بدون وحدة</option>
                {units.filter((u) => String(u.subject_id) === String(questionForm.subject_id) && String(u.grade_id) === String(questionForm.grade_id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={questionForm.lesson_id} onChange={(e) => setQuestionForm({ ...questionForm, lesson_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="">بدون درس</option>
                {lessons.filter((l) => String(l.subject_id) === String(questionForm.subject_id) && String(l.grade_id) === String(questionForm.grade_id)).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
              <div className="flex gap-2 md:col-span-4">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingQuestion ? 'حفظ' : 'إضافة'}</button>
                {editingQuestion && <button type="button" onClick={() => { setEditingQuestion(null); setQuestionForm({ subject_id: '', grade_id: '', unit_id: '', lesson_id: '', question: '', options: ['', '', '', ''], correct_index: 0, question_type: 'mcq', explanation: '', difficulty: 'متوسط' }); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-6 py-4">السؤال</th>
                  <th className="text-right px-6 py-4">النوع</th>
                  <th className="text-right px-6 py-4">المادة / الصف</th>
                  <th className="text-right px-6 py-4">الوحدة / الدرس</th>
                  <th className="text-right px-6 py-4">المستوى</th>
                  <th className="text-right px-6 py-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-bold text-slate-800 max-w-[280px]"><span className="line-clamp-2" title={q.question}>{q.question}</span></td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-black ${q.question_type === 'multi' ? 'bg-fuchsia-100 text-fuchsia-700' : q.question_type === 'tf' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{q.question_type === 'multi' ? 'إجابات متعددة' : q.question_type === 'tf' ? 'صح/خطأ' : 'اختيار'}</span></td>
                    <td className="px-6 py-4 text-slate-500">{q.subject_name} • {q.grade_name}</td>
                    <td className="px-6 py-4 text-slate-500">{q.unit_name ?? '—'}{q.lesson_title ? ` / ${q.lesson_title}` : ''}</td>
                    <td className="px-6 py-4 text-slate-600">{q.difficulty}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => editQuestion(q)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                        <button onClick={() => deleteQuestion(q.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد أسئلة.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'exams' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">{editingExam ? `✏️ تعديل الاختبار: ${editingExam.title}` : '➕ إضافة اختبار'}</h3>
            <form onSubmit={saveExam} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select value={examForm.subject_id} onChange={(e) => setExamForm({ ...examForm, subject_id: e.target.value, unit_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.variant_name && s.variant_name !== 'عامة' ? ` (${s.variant_name})` : ''}</option>)}
              </select>
              <select value={examForm.grade_id} onChange={(e) => setExamForm({ ...examForm, grade_id: e.target.value, unit_id: '' })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">الصف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                {['درس', 'وحدة', 'نهائي'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={examForm.unit_id} onChange={(e) => setExamForm({ ...examForm, unit_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="">كل الوحدات</option>
                {units.filter((u) => String(u.subject_id) === String(examForm.subject_id) && String(u.grade_id) === String(examForm.grade_id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} placeholder="عنوان الاختبار" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm md:col-span-2" required />
              <input value={examForm.duration_minutes} onChange={(e) => setExamForm({ ...examForm, duration_minutes: e.target.value })} placeholder="المدة (دقيقة)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" required />
              <input value={examForm.question_count} onChange={(e) => setExamForm({ ...examForm, question_count: e.target.value })} placeholder="عدد الأسئلة" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" required />
              <input value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} placeholder="الوصف" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-4" />
              <input value={examForm.max_attempts} onChange={(e) => setExamForm({ ...examForm, max_attempts: e.target.value })} placeholder="المحاولات المتاحة" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" max="10" />
              <input value={examForm.open_at} onChange={(e) => setExamForm({ ...examForm, open_at: e.target.value })} placeholder="يبدأ في" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="datetime-local" />
              <input value={examForm.close_at} onChange={(e) => setExamForm({ ...examForm, close_at: e.target.value })} placeholder="ينتهي في" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="datetime-local" />
              <input value={examForm.points_reward} onChange={(e) => setExamForm({ ...examForm, points_reward: e.target.value })} placeholder="نقاط المكافأة" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="0" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={examForm.is_free} onChange={(e) => setExamForm({ ...examForm, is_free: e.target.checked })} className="w-4 h-4 accent-violet-600" />
                مجاني
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={examForm.show_results} onChange={(e) => setExamForm({ ...examForm, show_results: e.target.checked })} className="w-4 h-4 accent-violet-600" />
                إظهار النتائج فوراً
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={examForm.allow_review} onChange={(e) => setExamForm({ ...examForm, allow_review: e.target.checked })} className="w-4 h-4 accent-violet-600" />
                السماح بمراجعة الإجابات
              </label>
              <div className="flex gap-2 md:col-span-4">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingExam ? 'حفظ' : 'إضافة'}</button>
                {editingExam && <button type="button" onClick={() => { setEditingExam(null); setExamForm({ subject_id: '', grade_id: '', unit_id: '', title: '', description: '', duration_minutes: 30, question_count: 10, exam_type: 'درس', max_attempts: 1, open_at: '', close_at: '', is_free: false, show_results: true, allow_review: true, points_reward: 20 }); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-6 py-4">الاختبار</th>
                  <th className="text-right px-6 py-4">المادة / الصف</th>
                  <th className="text-right px-6 py-4">النوع</th>
                  <th className="text-right px-6 py-4">المدة</th>
                  <th className="text-right px-6 py-4">الأسئلة</th>
                  <th className="text-right px-6 py-4">المحاولات</th>
                  <th className="text-right px-6 py-4">مجاني</th>
                  <th className="text-right px-6 py-4">إظهار النتائج</th>
                  <th className="text-right px-6 py-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((x) => (
                  <tr key={x.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-bold text-slate-800">{x.title}<span className="text-xs text-slate-400 block">{x.unit_name ?? 'كل الوحدات'}</span></td>
                    <td className="px-6 py-4 text-slate-500">{x.subject_name} • {x.grade_name}</td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-black bg-violet-100 text-violet-700">{x.exam_type}</span></td>
                    <td className="px-6 py-4 text-slate-600">{x.duration_minutes} د</td>
                    <td className="px-6 py-4 text-slate-600">{x.question_count}</td>
                    <td className="px-6 py-4 text-slate-600">{x.max_attempts}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-black ${x.is_free ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{x.is_free ? 'نعم' : 'لا'}</span></td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-black ${x.show_results ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{x.show_results ? 'نعم' : 'لا'}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => loadExamAnalytics(x.id)} className="bg-blue-50 text-blue-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-blue-100">إحصائيات</button>
                        <button onClick={() => editExam(x)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                        <button onClick={() => deleteExam(x.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && <tr><td colSpan="9" className="text-center py-8 text-slate-400">لا توجد اختبارات.</td></tr>}
              </tbody>
            </table>
          </div>

          {examAnalytics && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">📊 إحصائيات: {examAnalytics.exam.title}</h3>
                  <p className="text-xs text-slate-400">{examAnalytics.exam.subject_name} • {examAnalytics.exam.grade_name}</p>
                </div>
                <button onClick={() => setExamAnalytics(null)} className="bg-slate-100 text-slate-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-200">إغلاق</button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon="📝" label="إجمالي المحاولات" value={examAnalytics.stats.totalAttempts} color="bg-blue-100 text-blue-700" />
                <StatCard icon="👥" label="طلاب فريدون" value={examAnalytics.stats.uniqueStudents} color="bg-violet-100 text-violet-700" />
                <StatCard icon="📈" label="متوسط الدرجات" value={`${examAnalytics.stats.avgScore}%`} color="bg-amber-100 text-amber-700" />
                <StatCard icon="✅" label="نسبة النجاح" value={`${examAnalytics.stats.passRate}%`} color="bg-green-100 text-green-700" />
                <StatCard icon="🏆" label="أعلى درجة" value={examAnalytics.stats.highestScore} color="bg-emerald-100 text-emerald-700" />
                <StatCard icon="📉" label="أدنى درجة" value={examAnalytics.stats.lowestScore} color="bg-red-100 text-red-600" />
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="text-right px-6 py-4">الطالب</th>
                      <th className="text-right px-6 py-4">البريد</th>
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
                        <td className="px-6 py-4 text-slate-500" dir="ltr">{r.email}</td>
                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-black ${r.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.score}%</span></td>
                        <td className="px-6 py-4 text-slate-600">{r.attempt_number}</td>
                        <td className="px-6 py-4 text-slate-600">{r.time_spent ? `${r.time_spent} ث` : '—'}</td>
                        <td className="px-6 py-4 text-xs text-slate-400" dir="ltr">{r.created_at}</td>
                      </tr>
                    ))}
                    {examAnalytics.results.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد نتائج لهذا الاختبار.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'live' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">{editingLive ? `✏️ تعديل: ${editingLive.title}` : '➕ إضافة حصة مباشرة'}</h3>
            <form onSubmit={saveLive} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select value={liveForm.subject_id} onChange={(e) => setLiveForm({ ...liveForm, subject_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.variant_name && s.variant_name !== 'عامة' ? ` (${s.variant_name})` : ''}</option>)}
              </select>
              <select value={liveForm.grade_id} onChange={(e) => setLiveForm({ ...liveForm, grade_id: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm" required>
                <option value="">الصف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input value={liveForm.title} onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })} placeholder="عنوان الحصة" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm md:col-span-2" required />
              <input value={liveForm.teacher_name} onChange={(e) => setLiveForm({ ...liveForm, teacher_name: e.target.value })} placeholder="اسم المعلم" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input value={liveForm.session_date} onChange={(e) => setLiveForm({ ...liveForm, session_date: e.target.value })} placeholder="التاريخ (YYYY-MM-DD)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
              <input value={liveForm.session_time} onChange={(e) => setLiveForm({ ...liveForm, session_time: e.target.value })} placeholder="الوقت (19:00)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
              <select value={liveForm.status} onChange={(e) => setLiveForm({ ...liveForm, status: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 text-sm">
                {['upcoming', 'live', 'ended'].map((s) => <option key={s} value={s}>{s === 'upcoming' ? 'قادمة' : s === 'live' ? 'مباشرة الآن' : 'منتهية'}</option>)}
              </select>
              <input value={liveForm.meeting_url} onChange={(e) => setLiveForm({ ...liveForm, meeting_url: e.target.value })} placeholder="رابط الحصة (Zoom/Teams)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-3" dir="ltr" />
              <div className="flex gap-2 md:col-span-4">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingLive ? 'حفظ' : 'إضافة'}</button>
                {editingLive && <button type="button" onClick={() => { setEditingLive(null); setLiveForm({ subject_id: '', grade_id: '', title: '', teacher_name: '', session_date: '', session_time: '', status: 'upcoming', meeting_url: '', video_url: '' }); }} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {liveSessions.length === 0 ? <p className="text-slate-400 text-center py-8">لا توجد حصص مباشرة.</p> : liveSessions.map((l) => (
              <div key={l.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold text-slate-800">{l.title} <span className={`mr-1 text-[10px] font-black px-2 py-0.5 rounded-full ${l.status === 'live' ? 'bg-red-100 text-red-600' : l.status === 'ended' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>{l.status === 'live' ? 'مباشرة الآن' : l.status === 'ended' ? 'منتهية' : 'قادمة'}</span></p>
                  <p className="text-xs text-slate-400">{l.subject_name} • {l.grade_name} • {l.teacher_name || '—'}{l.session_date ? ` • ${l.session_date} ${l.session_time || ''}` : ''}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(l.video_url || l.meeting_url) && <a href={l.video_url || l.meeting_url} target="_blank" rel="noreferrer" className="bg-green-600 text-white text-xs font-black px-4 py-2 rounded-xl">{l.video_url ? 'مشاهدة التسجيل' : 'فتح الرابط'}</a>}
                  <button onClick={() => editLive(l)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-2 rounded-xl hover:bg-slate-200">تعديل</button>
                  <button onClick={() => deleteLive(l.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-2 rounded-xl hover:bg-red-100">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">{editingPlan ? `✏️ تعديل الخطة: ${planForm.name}` : '➕ إضافة خطة اشتراك'}</h3>
            <p className="text-xs text-slate-400 mb-5">تُعرض الخطط حسب القسم (٨-١٠ / ١١-١٢). "جميع المواد" = اترك حقل المواد فارغاً.</p>
            <form onSubmit={savePlan} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select value={planForm.section} onChange={(e) => setPlanForm({ ...planForm, section: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required>
                <option value="junior">قسم ٨-١٠</option>
                <option value="senior">قسم ١١-١٢</option>
              </select>
              <input value={planForm.key} onChange={(e) => setPlanForm({ ...planForm, key: e.target.value })} placeholder="المعرّف (single/triple/all)" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" dir="ltr" required />
              <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="اسم الخطة" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
              <input value={planForm.subjects} onChange={(e) => setPlanForm({ ...planForm, subjects: e.target.value })} placeholder="عدد المواد (فارغ = الكل)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" />
              <input value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="السعر (ر.ع)" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" type="number" min="1" step="0.5" required />
              <input value={planForm.original_price} onChange={(e) => setPlanForm({ ...planForm, original_price: e.target.value })} placeholder="السعر قبل الخصم (اختياري)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" type="number" min="1" step="0.5" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600 px-2">
                <input type="checkbox" checked={!!planForm.active} onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked ? 1 : 0 })} className="w-4 h-4 accent-violet-600" />
                مفعّلة
              </label>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingPlan ? 'حفظ' : 'إضافة'}</button>
                {editingPlan && <button type="button" onClick={() => { setEditingPlan(null); setPlanForm({ section: 'junior', key: '', name: '', subjects: '', price: '', original_price: '', active: 1 }); }} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div key={p.id} className={`bg-white rounded-3xl border p-5 shadow-sm ${p.active ? 'border-slate-100' : 'border-red-200 opacity-70'}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-extrabold text-slate-900">{p.name} <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.section === 'senior' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'}`}>{p.section === 'senior' ? '١١-١٢' : '٨-١٠'}</span></p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => editPlan(p)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                    <button onClick={() => deletePlan(p.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                  </div>
                </div>
                <p className="text-2xl font-black text-violet-700">{p.price} <span className="text-xs text-slate-400 font-bold">ر.ع / سنة</span>{p.original_price ? <span className="text-sm text-slate-400 line-through mr-2">{p.original_price}</span> : null}</p>
                <p className="text-xs text-slate-400 mt-1">المعرف: <span dir="ltr">{p.key}</span> • المواد: {p.subjects || 'جميع المواد'}{p.discount_pct > 0 ? ` • خصم ${p.discount_pct}%` : ''}{p.ends_at ? ` • حتى ${p.ends_at}` : ''}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">{editingOffer ? `✏️ تعديل العرض: ${offerForm.title}` : '➕ إضافة عرض ترويجي'}</h3>
            <p className="text-xs text-slate-400 mb-5">تظهر العروض النشطة ضمن فترتها في صفحة الاشتراكات.</p>
            <form onSubmit={saveOffer} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="عنوان العرض" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
              <input value={offerForm.badge} onChange={(e) => setOfferForm({ ...offerForm, badge: e.target.value })} placeholder="الشارة (عرض جديد...)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input value={offerForm.discount_text} onChange={(e) => setOfferForm({ ...offerForm, discount_text: e.target.value })} placeholder="نص الخصم (خصم حتى 20%)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input value={offerForm.starts_at} onChange={(e) => setOfferForm({ ...offerForm, starts_at: e.target.value })} placeholder="بداية (YYYY-MM-DD)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
              <input value={offerForm.ends_at} onChange={(e) => setOfferForm({ ...offerForm, ends_at: e.target.value })} placeholder="نهاية (YYYY-MM-DD)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm" dir="ltr" />
              <textarea value={offerForm.description} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} placeholder="الوصف" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-3" rows={2} />
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600 px-2">
                <input type="checkbox" checked={!!offerForm.active} onChange={(e) => setOfferForm({ ...offerForm, active: e.target.checked ? 1 : 0 })} className="w-4 h-4 accent-violet-600" />
                مفعّل
              </div>
              <div className="flex gap-2 md:col-span-4">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingOffer ? 'حفظ' : 'إضافة'}</button>
                {editingOffer && <button type="button" onClick={() => { setEditingOffer(null); setOfferForm({ title: '', description: '', badge: '', discount_text: '', starts_at: '', ends_at: '', active: 1 }); }} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {offers.length === 0 ? <p className="text-slate-400 text-center py-6">لا توجد عروض.</p> : offers.map((o) => (
              <div key={o.id} className={`bg-white rounded-3xl border p-5 shadow-sm flex flex-wrap items-center justify-between gap-3 ${o.active ? 'border-slate-100' : 'border-red-200 opacity-70'}`}>
                <div>
                  <p className="font-extrabold text-slate-900">{o.title} <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 mr-1">{o.badge || 'عرض'}</span></p>
                  <p className="text-xs text-slate-400 mt-1">{o.description || '—'}{o.discount_text ? ` • ${o.discount_text}` : ''}{o.ends_at ? ` • حتى ${o.ends_at}` : ''}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => editOffer(o)} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                  <button onClick={() => deleteOffer(o.id)} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">🔤 أنواع المواد (Variants)</h3>
            <p className="text-xs text-slate-400 mb-5">تصنيفات فرعية للمادة الواحدة (مثل: الرياضيات المتقدمة/الأساسية في ١١-١٢).</p>
            <form onSubmit={saveVariant} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input value={newVariant.name} onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })} placeholder="اسم النوع (متقدمة)" className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm" required />
              <input value={newVariant.description} onChange={(e) => setNewVariant({ ...newVariant, description: e.target.value })} placeholder="الوصف (اختياري)" className="px-4 py-3 rounded-xl border border-slate-200 text-sm md:col-span-2" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-violet-600 text-white font-extrabold py-3 rounded-xl hover:bg-violet-700 transition-colors">{editingVariant ? 'حفظ' : 'إضافة'}</button>
                {editingVariant && <button type="button" onClick={() => { setEditingVariant(null); setNewVariant({ name: '', description: '' }); }} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">إلغاء</button>}
              </div>
            </form>
            <div className="space-y-2">
              {variants.length === 0 ? <p className="text-slate-400 text-sm">لا توجد أنواع بعد.</p> : variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between border border-slate-100 rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-bold text-slate-800">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.description || '—'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditingVariant(v); setNewVariant({ name: v.name, description: v.description || '' }); }} className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-slate-200">تعديل</button>
                    <button onClick={async () => { if (!confirm('حذف هذا النوع؟')) return; try { await api.del(`/admin/variants/${v.id}`); setVariants((p) => p.filter((x) => x.id !== v.id)); } catch (e) { setError(e.message); } }} className="bg-red-50 text-red-600 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-red-100">حذف</button>
                  </div>
                </div>
              ))}
            </div>
</div>
        </div>
      )}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">📊 التقارير</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { id: 'students', label: 'تقرير الطلاب' },
                { id: 'teachers', label: 'تقرير المعلمين' },
                { id: 'subjects', label: 'تقرير المواد' },
                { id: 'exams', label: 'تقرير الاختبارات' },
                { id: 'revenue', label: 'تقرير الإيرادات' },
                { id: 'activity', label: 'تقرير النشاط' },
                { id: 'export', label: 'تصدير' },
              ].map((s) => (
                <button key={s.id} onClick={() => { setReportTab(s.id); if (s.id !== 'export') loadReport(s.id); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${reportTab === s.id ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">من تاريخ</label>
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm" dir="ltr" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">إلى تاريخ</label>
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm" dir="ltr" />
              </div>
              {reportTab !== 'export' && (
                <button onClick={() => loadReport(reportTab)} className="bg-violet-600 text-white font-extrabold px-6 py-2.5 rounded-xl hover:bg-violet-700 transition-colors text-sm">عرض</button>
              )}
            </div>
          </div>

          {reportTab === 'students' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">الاسم</th>
                    <th className="text-right px-6 py-4">البريد</th>
                    <th className="text-right px-6 py-4">الصف</th>
                    <th className="text-right px-6 py-4">النقاط</th>
                    <th className="text-right px-6 py-4">الدروس المكتملة</th>
                    <th className="text-right px-6 py-4">متوسط الدرجات</th>
                    <th className="text-right px-6 py-4">آخر نشاط</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                      <td className="px-6 py-4 text-slate-500" dir="ltr">{r.email}</td>
                      <td className="px-6 py-4 text-slate-600">{r.grade ?? '—'}</td>
                      <td className="px-6 py-4 font-black text-amber-600">{r.points}</td>
                      <td className="px-6 py-4 text-slate-600">{r.lessons_completed ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.avg_score != null ? `${r.avg_score}%` : '—'}</td>
                      <td className="px-6 py-4 text-xs text-slate-400" dir="ltr">{r.last_active ?? '—'}</td>
                    </tr>
                  ))}
                  {reportData.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-slate-400">لا توجد بيانات.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {reportTab === 'teachers' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">الاسم</th>
                    <th className="text-right px-6 py-4">البريد</th>
                    <th className="text-right px-6 py-4">الدروس المنشأة</th>
                    <th className="text-right px-6 py-4">الاختبارات المنشأة</th>
                    <th className="text-right px-6 py-4">الطلاب المُدرَّسون</th>
                    <th className="text-right px-6 py-4">متوسط درجات الطلاب</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800">{r.name}</td>
                      <td className="px-6 py-4 text-slate-500" dir="ltr">{r.email}</td>
                      <td className="px-6 py-4 text-slate-600">{r.lessons_created ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.exams_created ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.students_taught ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.avg_student_score != null ? `${r.avg_student_score}%` : '—'}</td>
                    </tr>
                  ))}
                  {reportData.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد بيانات.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {reportTab === 'subjects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.map((r, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                  <p className="font-extrabold text-slate-900 mb-2">{r.subject_name}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="font-black text-blue-700 text-lg">{r.student_count ?? 0}</p><p className="text-xs text-slate-500">طالب</p></div>
                    <div className="bg-violet-50 rounded-xl p-3 text-center"><p className="font-black text-violet-700 text-lg">{r.lesson_count ?? 0}</p><p className="text-xs text-slate-500">درس</p></div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="font-black text-emerald-700 text-lg">{r.exam_count ?? 0}</p><p className="text-xs text-slate-500">اختبار</p></div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="font-black text-amber-700 text-lg">{r.avg_score != null ? `${r.avg_score}%` : '—'}</p><p className="text-xs text-slate-500">متوسط الدرجات</p></div>
                  </div>
                </div>
              ))}
              {reportData.length === 0 && <p className="text-slate-400 text-center py-10 col-span-2">لا توجد بيانات.</p>}
            </div>
          )}

          {reportTab === 'exams' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">الاختبار</th>
                    <th className="text-right px-6 py-4">المادة</th>
                    <th className="text-right px-6 py-4">المحاولات</th>
                    <th className="text-right px-6 py-4">متوسط الدرجات</th>
                    <th className="text-right px-6 py-4">نسبة النجاح</th>
                    <th className="text-right px-6 py-4">الأعلى</th>
                    <th className="text-right px-6 py-4">الأدنى</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800">{r.title}</td>
                      <td className="px-6 py-4 text-slate-500">{r.subject}</td>
                      <td className="px-6 py-4 text-slate-600">{r.attempts ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.avg_score != null ? `${r.avg_score}%` : '—'}</td>
                      <td className="px-6 py-4 text-slate-600">{r.pass_rate != null ? `${r.pass_rate}%` : '—'}</td>
                      <td className="px-6 py-4 font-bold text-green-700">{r.highest ?? '—'}</td>
                      <td className="px-6 py-4 font-bold text-red-600">{r.lowest ?? '—'}</td>
                    </tr>
                  ))}
                  {reportData.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-slate-400">لا توجد بيانات.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {reportTab === 'revenue' && (
            <div className="space-y-5">
              {reportData.summary && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
                    <p className="text-xs text-slate-400 font-bold">الإيراد الإجمالي</p>
                    <p className="text-3xl font-black text-green-700">{reportData.summary.total ?? 0} ر.ع</p>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 text-center">
                    <p className="text-xs text-slate-400 font-bold">متوسط شهري</p>
                    <p className="text-3xl font-black text-violet-700">{reportData.summary.monthly_avg ?? 0} ر.ع</p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs">
                    <tr>
                      <th className="text-right px-6 py-4">الشهر</th>
                      <th className="text-right px-6 py-4">الإجمالي (ر.ع)</th>
                      <th className="text-right px-6 py-4">تفصيل المواد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.months && reportData.months.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">{r.month}</td>
                        <td className="px-6 py-4 font-black text-green-700">{r.total ?? 0} ر.ع</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{r.by_subject ?? '—'}</td>
                      </tr>
                    ))}
                    {(!reportData.months || reportData.months.length === 0) && <tr><td colSpan="3" className="text-center py-8 text-slate-400">لا توجد بيانات.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportTab === 'activity' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-right px-6 py-4">التاريخ</th>
                    <th className="text-right px-6 py-4">المستخدمون النشطون</th>
                    <th className="text-right px-6 py-4">التسجيلات الجديدة</th>
                    <th className="text-right px-6 py-4">الدروس المكتملة</th>
                    <th className="text-right px-6 py-4">الاختبارات المتخذة</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800" dir="ltr">{r.date}</td>
                      <td className="px-6 py-4 text-slate-600">{r.active_users ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.signups ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.lessons_completed ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{r.exams_taken ?? 0}</td>
                    </tr>
                  ))}
                  {reportData.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">لا توجد بيانات.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {reportTab === 'export' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="font-extrabold text-slate-900 mb-5">📥 تصدير التقارير كملف CSV</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { type: 'students', label: 'تقرير الطلاب', icon: '🎓' },
                  { type: 'teachers', label: 'تقرير المعلمين', icon: '👨‍🏫' },
                  { type: 'subjects', label: 'تقرير المواد', icon: '📚' },
                  { type: 'exams', label: 'تقرير الاختبارات', icon: '📝' },
                  { type: 'revenue', label: 'تقرير الإيرادات', icon: '💰' },
                  { type: 'activity', label: 'تقرير النشاط', icon: '📈' },
                ].map((r) => (
                  <button key={r.type} onClick={async () => { try { const params = new URLSearchParams(); if (reportFrom) params.set('from_date', reportFrom); if (reportTo) params.set('to_date', reportTo); const q = params.toString(); const data = await api.get(`/admin/reports/${r.type}${q ? '?' + q : ''}`); const rows = Array.isArray(data) ? data : (data.months || []); downloadCSV(rows, `${r.type}_report.csv`); } catch (e) { setError(e.message); } }} className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-2xl px-5 py-4 transition-colors border border-slate-200">
                    <span className="text-2xl">{r.icon}</span>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{r.label}</p>
                      <p className="text-xs text-slate-400">تحميل CSV</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">📋 سجل العمليات</h3>
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">نوع العملية</label>
                <select value={auditAction} onChange={(e) => setAuditAction(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                  <option value="">كل العمليات</option>
                  <option value="create">إنشاء</option>
                  <option value="update">تعديل</option>
                  <option value="delete">حذف</option>
                  <option value="approve">موافقة</option>
                  <option value="reject">رفض</option>
                  <option value="login">تسجيل دخول</option>
                  <option value="export">تصدير</option>
                </select>
              </div>
              <button onClick={() => { setAuditPage(1); loadAuditLog(); }} className="bg-violet-600 text-white font-extrabold px-6 py-2.5 rounded-xl hover:bg-violet-700 transition-colors text-sm">عرض</button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-right px-6 py-4">التاريخ والوقت</th>
                  <th className="text-right px-6 py-4">المستخدم</th>
                  <th className="text-right px-6 py-4">الدور</th>
                  <th className="text-right px-6 py-4">العملية</th>
                  <th className="text-right px-6 py-4">نوع الكيان</th>
                  <th className="text-right px-6 py-4">معرف الكيان</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-6 py-4 text-slate-500 text-xs" dir="ltr">{entry.created_at || entry.date}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{entry.user_name || '—'}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-black ${entry.role === 'admin' ? 'bg-red-100 text-red-700' : entry.role === 'teacher' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{entry.role || '—'}</span></td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-black bg-violet-100 text-violet-700">{entry.action}</span></td>
                    <td className="px-6 py-4 text-slate-600">{entry.entity_type || '—'}</td>
                    <td className="px-6 py-4 text-slate-500" dir="ltr">{entry.entity_id || '—'}</td>
                  </tr>
                ))}
                {auditLog.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">لا توجد سجلات.</td></tr>}
              </tbody>
            </table>
          </div>

          {auditTotal > 20 && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => { if (auditPage > 1) { setAuditPage((p) => p - 1); loadAuditLog(); } }} disabled={auditPage <= 1} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${auditPage <= 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>السابق</button>
              <span className="text-sm text-slate-500 font-bold">صفحة {auditPage} / {Math.ceil(auditTotal / 20)}</span>
              <button onClick={() => { if (auditPage < Math.ceil(auditTotal / 20)) { setAuditPage((p) => p + 1); loadAuditLog(); } }} disabled={auditPage >= Math.ceil(auditTotal / 20)} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${auditPage >= Math.ceil(auditTotal / 20) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>التالي</button>
            </div>
          )}
        </div>
      )}

      {tab === 'teachers' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5">👨‍🏫 إدارة المعلمين</h3>
            <p className="text-xs text-slate-400 mb-4">تحديد المواد المخصصة لكل معلم وتفعيل/تعطيل الحساب.</p>
            <div className="space-y-3">
              {teacherList.map((t) => (
                <div key={t.id} className="border border-slate-100 rounded-2xl px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-extrabold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-400" dir="ltr">{t.email} • {(t.subject_names || []).join(', ') || 'بدون مواد'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={t.enabled !== 0} onChange={(e) => toggleTeacher(t.id, e.target.checked)} className="w-5 h-5 accent-violet-600" />
                        {t.enabled !== 0 ? 'مفعّل' : 'معطّل'}
                      </label>
                      <button onClick={() => setEditingTeacherSubjects(editingTeacherSubjects === t.id ? null : t.id)} className="bg-slate-100 text-slate-700 text-xs font-black px-4 py-2 rounded-xl hover:bg-slate-200">
                        {editingTeacherSubjects === t.id ? 'إغلاق' : 'إدارة المواد'}
                      </button>
                    </div>
                  </div>
                  {editingTeacherSubjects === t.id && (
                    <div className="border-t border-slate-100 pt-3 mt-2">
                      <p className="text-xs text-slate-400 font-bold mb-2">تحديد المواد:</p>
                      <div className="flex flex-wrap gap-2">
                        {allSubjects.map((s) => {
                          const assigned = (t.subject_ids || []).includes(s.id);
                          return (
                            <button key={s.id} onClick={() => toggleTeacherSubject(t.id, s.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${assigned ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {s.icon} {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {teacherList.length === 0 && <p className="text-slate-400 text-center py-8">لا يوجد معلمون.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">⚙️ بيانات التواصل العامة</h3>
            <p className="text-xs text-slate-400 mb-5">تُستخدم في كل صفحات الموقع (زر الواتساب العائم، الفوتر، صفحة تواصل معنا، أزرار الطلب عبر واتساب).</p>
            {!settings ? <Loading label="جارٍ تحميل الإعدادات..." /> : (
              <div className="space-y-5">
                {[
                  { key: 'whatsapp_number', label: 'رقم الواتساب (بصيغة دولية بدون +)', hint: 'مثال: 96877353192 — يستخدم في جميع روابط wa.me', dir: 'ltr' },
                  { key: 'whatsapp_channel', label: 'رابط قناة الواتساب', hint: 'رابط القناة الذي يظهر في الفوتر وصفحة التواصل', dir: 'ltr' },
                  { key: 'instagram_url', label: 'رابط الإنستغرام', hint: 'يُستخدم في الفوتر وصفحة التواصل وزر مشاركة السفراء', dir: 'ltr' },
                  { key: 'contact_phone', label: 'رقم الهاتف المعروض', hint: 'الرقم الظاهر للمستخدم (بدون +968)', dir: 'ltr' },
                  { key: 'contact_email', label: 'البريد الإلكتروني', hint: 'بريد التواصل الرسمي', dir: 'ltr' },
                ].map((f) => (
                  <div key={f.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{f.label}</p>
                      <p className="text-xs text-slate-400">{f.hint}</p>
                    </div>
                    <input
                      value={settings[f.key] || ''}
                      onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
                      dir={f.dir}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold md:col-span-1"
                      placeholder={f.hint}
                    />
                    <button onClick={() => saveSetting(f.key, settings[f.key] || '')} className="md:justify-self-end px-6 py-3 rounded-xl bg-violet-600 text-white font-extrabold text-sm hover:bg-violet-700 transition-colors">
                      حفظ
                    </button>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">لوحة الصدارة (Leaderboard)</p>
                    <p className="text-xs text-slate-400">تعطيل إظهار أفضل 10 طلاب في صفحة الصدارة</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input type="checkbox" className="w-5 h-5 accent-violet-600" checked={settings.leaderboard_enabled !== '0'}
                      onChange={(e) => saveSetting('leaderboard_enabled', e.target.checked ? '1' : '0')} />
                    مفعّلة
                  </label>
                  <div />
                </div>
                {error && <div><Alert>{error}</Alert></div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


