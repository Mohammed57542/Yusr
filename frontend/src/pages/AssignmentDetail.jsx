import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Loading, Alert, Breadcrumbs } from '../components/common';

export default function AssignmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/assignments/${id}`),
      user?.role === 'student' ? api.get(`/assignments/${id}/my-submission`).catch(() => null) : null,
    ]).then(([a, s]) => { setAssignment(a); setSubmission(s); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id, user]);

  const handleSubmit = async () => {
    setSubmitting(true); setError(''); setSuccess('');
    try {
      await api.post(`/assignments/${id}/submit`, { note });
      const s = await api.get(`/assignments/${id}/my-submission`).catch(() => null);
      setSubmission(s);
      setSuccess('تم تسليم الواجب بنجاح');
    } catch (e) { setError(e.message); }
    setSubmitting(false);
  };

  if (loading) return <Loading label="جارٍ تحميل الواجب..." />;
  if (!assignment) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><p className="text-slate-500">الواجب غير موجود</p></div>;

  const isOverdue = new Date(assignment.due_date) < new Date();
  const graded = submission?.status === 'graded';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Breadcrumbs items={[{ label: 'الواجبات', href: '/assignments' }, { label: assignment.title }]} />

      {error && <div className="mb-5"><Alert>{error}</Alert></div>}
      {success && <div className="mb-5"><div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 font-bold text-sm">{success}</div></div>}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700">{assignment.subject_name}</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">{assignment.grade_name}</span>
          {isOverdue && <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-600">منتهي</span>}
          {graded && <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">مُصحّح</span>}
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-3">{assignment.title}</h1>
        {assignment.description && <p className="text-slate-600 mb-4">{assignment.description}</p>}
        {assignment.instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
            <h3 className="font-bold text-amber-800 mb-2">📝 التعليمات</h3>
            <p className="text-sm text-amber-700 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{assignment.max_score}</p>
            <p className="text-xs text-slate-500">الدرجة الكاملة</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{new Date(assignment.due_date).toLocaleDateString('ar-OM')}</p>
            <p className="text-xs text-slate-500">موعد التسليم</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{assignment.allow_late ? 'نعم' : 'لا'}</p>
            <p className="text-xs text-slate-500">التسليم المتأخر</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{assignment.submission_count || 0}</p>
            <p className="text-xs text-slate-500">التسليمات</p>
          </div>
        </div>
      </div>

      {user?.role === 'student' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">{submission ? 'تعديل التسليم' : 'تسليم الواجب'}</h2>

          {submission && (
            <div className="bg-slate-50 rounded-2xl p-5 mb-4">
              <p className="text-sm text-slate-500 mb-1">📅 تم التسليم: {new Date(submission.submitted_at).toLocaleString('ar-OM')}</p>
              {submission.status === 'late' && <p className="text-xs text-red-500 font-bold">⚠️ تسليم متأخر</p>}
              {graded && (
                <div className="mt-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-green-700 font-extrabold text-lg">الدرجة: {submission.grade}/{assignment.max_score}</p>
                  {submission.feedback && <p className="text-sm text-green-600 mt-1">{submission.feedback}</p>}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات (اختياري)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="اكتب ملاحظاتك على التسليم..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="bg-rose-600 text-white font-extrabold px-8 py-3.5 rounded-2xl hover:bg-rose-700 transition-colors disabled:opacity-50">
              {submitting ? 'جارٍ التسليم...' : submission ? 'تحديث التسليم' : 'تسليم الواجب'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
