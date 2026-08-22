import { Link } from 'react-router-dom';

export function Loading({ label = 'جارٍ التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">{label}</p>
    </div>
  );
}

// شاشة المحتوى المميز المقفل — تظهر عند محاولة الوصول لمحتوى بدون اشتراك
export function LockedContent({ subjectName = '', icon = '🔒', note }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center animate-fade-up">
        <div className="text-7xl mb-5">{icon}</div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">محتوى مميز 🔒</h1>
        <p className="text-slate-500 leading-7 mb-2">
          هذا المحتوى للمشتركين{subjectName ? ` في مادة ${subjectName}` : ''} فقط — الحصص والملخصات والاختبارات وبنك الأسئلة.
        </p>
        {note && <p className="text-sm text-slate-400 mb-6">{note}</p>}
        <Link to="/pricing" className="block w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200 mb-3">
          عرّف على خطط الاشتراك 💳
        </Link>
        <Link to="/pricing?grade=own" className="block text-sm text-violet-600 font-bold underline">أو اشترك بموادك حسب قسمك الدراسي</Link>
      </div>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, description }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, center }) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''}`}>
      {eyebrow && (
        <span className="inline-block px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-3">{eyebrow}</span>
      )}
      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">{title}</h2>
      {subtitle && <p className={`mt-3 text-slate-500 ${center ? 'mx-auto' : ''} max-w-2xl`}>{subtitle}</p>}
    </div>
  );
}

export function Badge({ children, color = 'bg-violet-100 text-violet-700' }) {
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>{children}</span>;
}

export function difficultyColor(level) {
  if (level === 'مبتدئ') return 'bg-green-100 text-green-700';
  if (level === 'متوسط') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function Alert({ type = 'error', children }) {
  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles[type]}`}>{children}</div>
  );
}

export function Input({ label, error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
      <input
        {...props}
        className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all ${
          error ? 'border-red-300' : 'border-slate-200'
        }`}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>}
      <select
        {...props}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

export function Stat({ icon, value, label }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 font-medium">{label}</div>
    </div>
  );
}
