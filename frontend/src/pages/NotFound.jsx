import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <div>
        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-l from-violet-600 to-purple-800 mb-4">404</div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">الصفحة غير موجودة</h1>
        <p className="text-slate-500 mb-8">عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.</p>
        <Link to="/" className="inline-block bg-violet-600 text-white font-extrabold px-8 py-4 rounded-2xl hover:bg-violet-700 transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
