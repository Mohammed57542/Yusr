import { Link } from 'react-router-dom';

export function Loading({ label = 'جارٍ التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">{label}</p>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

export function SkeletonLesson() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full shrink-0" />
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="bg-gradient-to-br from-violet-500 via-violet-700 to-night py-20">
      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-4 animate-pulse">
          <Skeleton className="h-6 w-48 bg-white/20" />
          <Skeleton className="h-12 w-full bg-white/20" />
          <Skeleton className="h-12 w-3/4 bg-white/20" />
          <Skeleton className="h-5 w-full bg-white/10" />
          <Skeleton className="h-5 w-5/6 bg-white/10" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-40 bg-white/20 rounded-2xl" />
            <Skeleton className="h-12 w-36 bg-white/10 rounded-2xl" />
          </div>
        </div>
        <div className="hidden lg:block animate-pulse">
          <Skeleton className="h-80 w-full bg-white/10 rounded-3xl" />
        </div>
      </div>
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

export function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
      <a href="/" className="hover:text-violet-600 transition-colors">🏠 الرئيسية</a>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-slate-300">←</span>
          {item.href ? (
            <a href={item.href} className="hover:text-violet-600 transition-colors">{item.label}</a>
          ) : (
            <span className="text-slate-800 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
