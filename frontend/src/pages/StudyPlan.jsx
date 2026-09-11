import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const daysArabic = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-2/3 mb-4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
      <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
      <div className="h-3 bg-slate-200 rounded w-4/5"></div>
    </div>
  );
}

function SkeletonDetail() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/2 mb-6"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-6">
          <div className="h-5 bg-slate-200 rounded w-1/4 mb-3"></div>
          <div className="space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="h-16 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="text-center py-20">
      <div className="w-24 h-24 mx-auto mb-6 bg-teal-50 rounded-full flex items-center justify-center">
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 className="text-xl font-extrabold text-slate-800 mb-2">لا توجد خطط دراسية</h3>
      <p className="text-slate-500 mb-6">ابدأ بإنشاء خطة دراسية جديدة لتنظيم وقتك</p>
      <button
        onClick={onCreate}
        className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-2xl transition-colors duration-200"
      >
        إنشاء خطة جديدة
      </button>
    </div>
  );
}

export default function StudyPlan() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [newPlan, setNewPlan] = useState({
    title: '',
    subject: '',
    targetDate: '',
    description: '',
  });

  useEffect(() => {
    fetchPlans();
    fetchSubjects();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/study-plans');
      setPlans(res.data);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchPlanDetail = async (planId) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/study-plans/${planId}`);
      setSelectedPlan(res.data);
    } catch (err) {
      console.error('Error fetching plan detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/study-plans', newPlan);
      setShowCreateForm(false);
      setNewPlan({ title: '', subject: '', targetDate: '', description: '' });
      fetchPlans();
    } catch (err) {
      console.error('Error creating plan:', err);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      setGenerating(true);
      await api.post('/study-plans/generate');
      fetchPlans();
    } catch (err) {
      console.error('Error generating plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleItem = async (planId, itemId, completed) => {
    try {
      await api.patch(`/study-plans/${planId}/items/${itemId}`, { completed: !completed });
      fetchPlanDetail(planId);
      fetchPlans();
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const getProgress = (plan) => {
    if (!plan.items || plan.items.length === 0) return { completed: 0, total: 0 };
    const completed = plan.items.filter((item) => item.completed).length;
    return { completed, total: plan.items.length };
  };

  const getProgressPercent = (plan) => {
    const { completed, total } = getProgress(plan);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const groupItemsByDay = (items) => {
    const grouped = {};
    daysArabic.forEach((day) => {
      grouped[day] = [];
    });
    if (items) {
      items.forEach((item) => {
        const dayName = item.day || daysArabic[0];
        if (grouped[dayName]) {
          grouped[dayName].push(item);
        }
      });
    }
    return grouped;
  };

  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-cyan-800 text-white py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setSelectedPlan(null)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              العودة للخطط
            </button>
            <h1 className="text-3xl font-extrabold">{selectedPlan.title}</h1>
            {selectedPlan.subject && (
              <p className="text-cyan-100 mt-2">{selectedPlan.subject.name || selectedPlan.subject}</p>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-8">
          {detailLoading ? (
            <SkeletonDetail />
          ) : (
            <div className="space-y-6">
              {Object.entries(groupItemsByDay(selectedPlan.items || [])).map(([day, items]) => (
                <div key={day} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center text-sm font-bold">
                      {items.length}
                    </span>
                    {day}
                  </h3>
                  {items.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">لا توجد دروس مجدولة</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                            item.completed
                              ? 'bg-teal-50 border-teal-200'
                              : 'bg-slate-50 border-slate-100 hover:border-cyan-200'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleItem(selectedPlan.id, item.id, item.completed)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              item.completed
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'border-slate-300 hover:border-cyan-400'
                            }`}
                          >
                            {item.completed && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold ${item.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {item.lessonName || item.title}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              {item.timeSlot && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {item.timeSlot}
                                </span>
                              )}
                              {item.duration && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  {item.duration} دقيقة
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-cyan-800 text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold">خطتي الدراسية</h1>
          <p className="text-cyan-100 mt-2">نظّم وقتك وتابع تقدمك في الدراسة</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-2xl transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء خطة جديدة
          </button>
          <button
            onClick={handleAutoGenerate}
            disabled={generating}
            className="bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-2xl transition-colors duration-200 flex items-center gap-2"
          >
            {generating ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            توليد تلقائي
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6">إنشاء خطة دراسية جديدة</h2>
            <form onSubmit={handleCreatePlan} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">عنوان الخطة</label>
                <input
                  type="text"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  placeholder="مثال: خطة مراجعة الفصل الأول"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المادة</label>
                <select
                  value={newPlan.subject}
                  onChange={(e) => setNewPlan({ ...newPlan, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-800 bg-white"
                  required
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الهدف النهائي</label>
                <input
                  type="date"
                  value={newPlan.targetDate}
                  onChange={(e) => setNewPlan({ ...newPlan, targetDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="أضف ملاحظات أو تفاصيل إضافية..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-800 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-2xl transition-colors duration-200"
                >
                  حفظ الخطة
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-2xl transition-colors duration-200"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <EmptyState onCreate={() => setShowCreateForm(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => {
              const percent = getProgressPercent(plan);
              const { completed, total } = getProgress(plan);
              return (
                <div
                  key={plan.id}
                  onClick={() => fetchPlanDetail(plan.id)}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-cyan-200 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-extrabold text-slate-800">{plan.title}</h3>
                    <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full">
                      {percent}%
                    </span>
                  </div>
                  {plan.subject && (
                    <p className="text-sm text-slate-500 mb-3">
                      {plan.subject.name || plan.subject}
                    </p>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">
                        {completed} من {total} درس مكتمل
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                  {plan.targetDate && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      الهدف: {new Date(plan.targetDate).toLocaleDateString('ar-EG')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
