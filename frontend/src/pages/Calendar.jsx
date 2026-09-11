import { useState, useEffect } from 'react';
import { api } from '../api/client';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const EVENT_TYPES = {
  exam: { label: 'اختبار', color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '📝' },
  live: { label: 'حصة مباشرة', color: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '🟢' },
  assignment: { label: 'واجب', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '📋' },
  custom: { label: 'حدث خاص', color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '📌' },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return (day + 1) % 7;
}

function toKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isToday(y, m, d) {
  const now = new Date();
  return now.getFullYear() === y && now.getMonth() === m && now.getDate() === d;
}

function CalendarSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10" dir="rtl">
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-48 bg-slate-200 rounded-2xl" />
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
          <div className="flex justify-between">
            <div className="h-8 w-8 bg-slate-200 rounded-full" />
            <div className="h-6 w-36 bg-slate-200 rounded" />
            <div className="h-8 w-8 bg-slate-200 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-50 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDay() {
  return (
    <div className="flex items-center justify-center h-full py-4">
      <p className="text-xs text-slate-300 font-bold">لا أحداث</p>
    </div>
  );
}

export default function Calendar() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', description: '' });
  const [addingEvent, setAddingEvent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/exams').catch(() => []),
      api.get('/live-sessions').catch(() => []),
      api.get('/assignments').catch(() => []),
    ])
      .then(([exams, liveSessions, assignments]) => {
        const allEvents = [];
        (exams || []).forEach((e) => {
          if (e.due_date) {
            allEvents.push({
              id: `exam-${e.id}`,
              type: 'exam',
              title: e.title,
              date: e.due_date,
              time: e.due_time || null,
              link: e.id ? `/exams/${e.id}` : null,
              subject: e.subject_name,
            });
          }
        });
        (liveSessions || []).forEach((s) => {
          if (s.session_date) {
            allEvents.push({
              id: `live-${s.id}`,
              type: 'live',
              title: s.title,
              date: s.session_date,
              time: s.session_time || null,
              link: s.meeting_url || null,
              subject: s.subject_name,
            });
          }
        });
        (assignments || []).forEach((a) => {
          if (a.due_date) {
            allEvents.push({
              id: `assignment-${a.id}`,
              type: 'assignment',
              title: a.title,
              date: a.due_date.split('T')[0],
              time: null,
              link: a.id ? `/assignments/${a.id}` : null,
              subject: a.subject_name,
            });
          }
        });
        const stored = JSON.parse(localStorage.getItem('calendar_custom_events') || '[]');
        stored.forEach((e) => {
          allEvents.push({ ...e, type: 'custom', id: `custom-${e.id}` });
        });
        setEvents(allEvents);
      })
      .catch(() => setError('حدث خطأ أثناء تحميل الأحداث'))
      .finally(() => setLoading(false));
  }, []);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const eventsByDate = {};
  events.forEach((ev) => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });

  const selectedEvents = selectedDay ? eventsByDate[selectedDay] || [] : [];

  const todayKey = toKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const upcomingEvents = events
    .filter((ev) => ev.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 7);

  const reminders = events
    .filter((ev) => {
      if (!ev.date) return false;
      const evDate = new Date(`${ev.date}T${ev.time || '23:59:59'}`);
      const now = new Date();
      const diff = evDate - now;
      return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || '23:59:59'}`);
      const db = new Date(`${b.date}T${b.time || '23:59:59'}`);
      return da - db;
    });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth());
    setSelectedDay(toKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  };

  const addCustomEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    setAddingEvent(true);
    try {
      const ev = {
        id: Date.now(),
        ...newEvent,
        date: newEvent.date,
      };
      const stored = JSON.parse(localStorage.getItem('calendar_custom_events') || '[]');
      stored.push(ev);
      localStorage.setItem('calendar_custom_events', JSON.stringify(stored));
      setEvents((prev) => [...prev, { ...ev, type: 'custom', id: `custom-${ev.id}` }]);
      setNewEvent({ title: '', date: '', time: '', description: '' });
      setShowAddForm(false);
    } catch {
      setError('حدث خطأ أثناء إضافة الحدث');
    } finally {
      setAddingEvent(false);
    }
  };

  const removeCustomEvent = (evId) => {
    const numericId = evId.replace('custom-', '');
    const stored = JSON.parse(localStorage.getItem('calendar_custom_events') || '[]');
    const updated = stored.filter((e) => String(e.id) !== String(numericId));
    localStorage.setItem('calendar_custom_events', JSON.stringify(updated));
    setEvents((prev) => prev.filter((e) => e.id !== evId));
  };

  if (loading) return <CalendarSkeleton />;

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-14 text-center">
          <span className="text-5xl mb-4 block">📅</span>
          <h1 className="text-4xl md:text-5xl font-black mb-3">تقويمي</h1>
          <p className="text-cyan-200 text-lg max-w-xl mx-auto">تابع مواعيدك ومهامك وأحداثك في مكان واحد.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{error}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">
                  ❮
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-800">{ARABIC_MONTHS[month]} {year}</h2>
                  <button onClick={goToToday} className="px-3 py-1 rounded-full bg-teal-500 text-white text-xs font-extrabold hover:bg-teal-600 transition-colors">
                    اليوم
                  </button>
                </div>
                <button onClick={nextMonth} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors">
                  ❯
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEK_DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-extrabold text-slate-400 py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 md:h-28 rounded-2xl" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const key = toKey(year, month, day);
                  const dayEvents = eventsByDate[key] || [];
                  const today = isToday(year, month, day);
                  const selected = selectedDay === key;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(key)}
                      className={`h-24 md:h-28 rounded-2xl border p-2 text-left transition-all flex flex-col ${
                        selected
                          ? 'border-cyan-400 bg-cyan-50 shadow-md ring-2 ring-cyan-200'
                          : today
                            ? 'border-teal-300 bg-teal-50/50'
                            : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <span className={`text-xs font-black mb-1 ${
                        today ? 'bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : selected ? 'text-cyan-700' : 'text-slate-600'
                      }`}>
                        {day}
                      </span>
                      <div className="flex-1 flex flex-col justify-end gap-0.5 overflow-hidden">
                        {dayEvents.length === 0 ? (
                          <div className="hidden md:block">
                            <EmptyDay />
                          </div>
                        ) : (
                          <>
                            <div className="flex gap-0.5 flex-wrap">
                              {dayEvents.slice(0, 3).map((ev) => (
                                <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPES[ev.type]?.color || 'bg-slate-400'}`} />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[9px] text-slate-400 font-bold">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold line-clamp-1 hidden md:block">
                              {dayEvents[0].title}
                            </p>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-lg text-slate-800">
                  {selectedDay ? `أحداث ${new Date(`${selectedDay}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}` : 'اختر يوماً لعرض أحداثه'}
                </h3>
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-sm font-extrabold hover:bg-cyan-600 transition-colors"
                >
                  + إضافة حدث
                </button>
              </div>

              {showAddForm && (
                <div className="mb-5 p-5 rounded-2xl border border-cyan-200 bg-cyan-50/50 space-y-3">
                  <input
                    type="text"
                    placeholder="عنوان الحدث"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent((p) => ({ ...p, time: e.target.value }))}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <textarea
                    placeholder="الوصف (اختياري)"
                    rows={2}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addCustomEvent}
                      disabled={addingEvent || !newEvent.title.trim() || !newEvent.date}
                      className="px-5 py-2 rounded-xl bg-cyan-500 text-white text-sm font-extrabold hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingEvent ? 'جارٍ الإضافة...' : 'حفظ'}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {selectedDay ? (
                selectedEvents.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-4xl block mb-3">📭</span>
                    <p className="text-slate-400 font-bold text-sm">لا توجد أحداث في هذا اليوم</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((ev) => {
                      const type = EVENT_TYPES[ev.type] || EVENT_TYPES.custom;
                      return (
                        <div key={ev.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${type.border} ${type.bg} transition-all`}>
                          <span className="text-2xl">{type.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-extrabold text-sm text-slate-800 truncate">{ev.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${type.bg} ${type.text}`}>{type.label}</span>
                            </div>
                            {ev.subject && <p className="text-xs text-slate-500 mb-1">{ev.subject}</p>}
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              {ev.time && <span>🕐 {ev.time}</span>}
                              {ev.description && <span className="truncate">{ev.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ev.link && (
                              <a
                                href={ev.link}
                                target={ev.link.startsWith('http') ? '_blank' : undefined}
                                rel={ev.link.startsWith('http') ? 'noreferrer' : undefined}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-extrabold hover:bg-cyan-600 transition-colors"
                              >
                                فتح
                              </a>
                            )}
                            {ev.type === 'custom' && (
                              <button
                                onClick={() => removeCustomEvent(ev.id)}
                                className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs hover:bg-red-200 transition-colors"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <p className="text-center text-slate-300 font-bold text-sm py-8">اضغط على يوم في التقويم لعرض أحداثه</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-extrabold text-lg text-slate-800 mb-4">📅 الأحداث القادمة</h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-center text-slate-300 font-bold text-sm py-6">لا توجد أحداث قادمة</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((ev) => {
                    const type = EVENT_TYPES[ev.type] || EVENT_TYPES.custom;
                    const evDate = new Date(`${ev.date}T00:00:00`);
                    const dayName = evDate.toLocaleDateString('ar-EG', { weekday: 'short' });
                    const dayNum = evDate.getDate();
                    return (
                      <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${type.border} ${type.bg}`}>
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 leading-none">{dayName}</span>
                          <span className="text-sm font-black text-slate-800 leading-none">{dayNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 truncate">{ev.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{type.icon} {type.label}</span>
                            {ev.time && <span>🕐 {ev.time}</span>}
                          </div>
                        </div>
                        {ev.link && (
                          <a
                            href={ev.link}
                            target={ev.link.startsWith('http') ? '_blank' : undefined}
                            rel={ev.link.startsWith('http') ? 'noreferrer' : undefined}
                            className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs hover:bg-cyan-200 transition-colors shrink-0"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-extrabold text-lg text-slate-800 mb-4">⏰ التذكيرات</h3>
              {reminders.length === 0 ? (
                <p className="text-center text-slate-300 font-bold text-sm py-6">لا توجد تذكيرات قريبة</p>
              ) : (
                <div className="space-y-3">
                  {reminders.map((ev) => {
                    const type = EVENT_TYPES[ev.type] || EVENT_TYPES.custom;
                    const evDate = new Date(`${ev.date}T${ev.time || '23:59:59'}`);
                    const now = new Date();
                    const diffMs = evDate - now;
                    const diffH = Math.floor(diffMs / 3600000);
                    const diffD = Math.floor(diffMs / 86400000);
                    let timeLeft = '';
                    if (diffD > 0) timeLeft = `بعد ${diffD} يوم`;
                    else if (diffH > 0) timeLeft = `بعد ${diffH} ساعة`;
                    else timeLeft = 'قريباً';

                    return (
                      <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${type.border} ${type.bg}`}>
                        <span className="text-xl">{type.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 truncate">{ev.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{timeLeft} • {ev.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-extrabold text-sm text-slate-600 mb-3">دليل الألوان</h3>
              <div className="space-y-2">
                {Object.entries(EVENT_TYPES).map(([, t]) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                    <span className="text-xs text-slate-500 font-bold">{t.icon} {t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
