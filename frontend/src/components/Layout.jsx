import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import useSettings, { waLink, DEFAULT_WHATSAPP, DEFAULT_CHANNEL, DEFAULT_INSTAGRAM } from '../hooks/useSettings';

const navItems = [
  { to: '/', label: 'الرئيسية' },
  { to: '/grades', label: 'المراحل' },
  { to: '/subjects', label: 'المواد' },
  { to: '/live-sessions', label: 'البث المباشر' },
  { to: '/recordings', label: 'التسجيلات' },
  { to: '/exams', label: 'الاختبارات' },
  { to: '/reviews', label: 'المراجعات' },
  { to: '/library', label: 'الملفات' },
  { to: '/groups', label: 'الجروبات المجانية' },
  { to: '/pricing', label: 'الاشتراكات' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <img src="/logo.png" alt="يُسر" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-violet-300" />
      <span className="text-xl font-extrabold text-slate-800">يُسر<span className="text-violet-600">.</span></span>
    </Link>
  );
}

function SearchBar({ onNavigate, className = 'hidden md:block' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`).then((r) => { setResults(r); setOpen(true); }).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const total = results ? results.lessons.length + results.resources.length + results.exams.length + results.subjects.length + results.grades.length : 0;

  return (
    <div ref={boxRef} className={`relative flex-1 max-w-md ${className}`}>
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="🔍 ابحث عن درس أو مادة أو اختبار"
          className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-slate-100 focus:bg-white border border-transparent focus:border-violet-300 focus:outline-none text-sm transition-all"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
      </div>
      {open && results && total > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-2xl p-3 z-50 max-h-96 overflow-y-auto animate-fade-up">
          {results.lessons.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-black text-violet-600 px-2 mb-1.5">دروس</p>
              {results.lessons.map((l) => (
                <button key={l.id} onClick={() => { navigate(`/lessons/${l.id}`); setOpen(false); setQ(''); onNavigate?.(); }} className="w-full text-right px-2 py-2 rounded-xl hover:bg-violet-50 flex items-center gap-2">
                  <span>{l.subject_icon}</span>
                  <span className="text-sm font-bold text-slate-700 truncate">{l.title}</span>
                  <span className="text-xs text-slate-400 mr-auto shrink-0">{l.grade_name}</span>
                </button>
              ))}
            </div>
          )}
          {results.resources.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-black text-violet-600 px-2 mb-1.5">ملفات</p>
              {results.resources.map((r) => (
                <button key={r.id} onClick={() => { navigate(`/library?file=${r.id}`); setOpen(false); setQ(''); onNavigate?.(); }} className="w-full text-right px-2 py-2 rounded-xl hover:bg-violet-50 flex items-center gap-2">
                  <span>📄</span>
                  <span className="text-sm font-bold text-slate-700 truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}
          {results.exams.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-black text-violet-600 px-2 mb-1.5">اختبارات</p>
              {results.exams.map((e) => (
                <button key={e.id} onClick={() => { navigate(`/exams/${e.id}/take`); setOpen(false); setQ(''); onNavigate?.(); }} className="w-full text-right px-2 py-2 rounded-xl hover:bg-violet-50 flex items-center gap-2">
                  <span>{e.subject_icon}</span>
                  <span className="text-sm font-bold text-slate-700 truncate">{e.title}</span>
                </button>
              ))}
            </div>
          )}
          {(results.subjects.length > 0 || results.grades.length > 0) && (
            <div className="border-t border-slate-100 pt-2">
              {results.subjects.map((s) => (
                <button key={s.id} onClick={() => { navigate(`/subjects/${s.id}`); setOpen(false); setQ(''); onNavigate?.(); }} className="w-full text-right px-2 py-2 rounded-xl hover:bg-violet-50 flex items-center gap-2">
                  <span>{s.icon}</span>
                  <span className="text-sm font-bold text-slate-700">مادة: {s.name}</span>
                </button>
              ))}
              {results.grades.map((g) => (
                <button key={g.id} onClick={() => { navigate(`/grades/${g.id}`); setOpen(false); setQ(''); onNavigate?.(); }} className="w-full text-right px-2 py-2 rounded-xl hover:bg-violet-50 flex items-center gap-2">
                  <span>🏫</span>
                  <span className="text-sm font-bold text-slate-700">{g.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/70 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          <Logo />
          <SearchBar onNavigate={() => setOpen(false)} />

          <div className="hidden xl:flex items-center gap-0.5">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) => `px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${isActive ? 'text-violet-700 bg-violet-50' : 'text-slate-600 hover:text-violet-700 hover:bg-violet-50/60'}`}>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/notifications" className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors" title="الإشعارات">
                  🔔
                </Link>
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 text-violet-800 hover:bg-violet-100 transition-colors text-sm font-bold">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center text-sm font-bold">{user.name.charAt(0)}</span>
                    <span className="max-w-[90px] truncate hidden sm:block">{user.name.split(' ')[0]}</span>
                    {user.role === 'admin' && <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">ADMIN</span>}
                  </button>
                  {userMenu && (
                    <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 animate-fade-up">
                      <Link to="/dashboard" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50">📊 لوحة الطالب</Link>
                      <Link to="/profile" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50">👤 حسابي</Link>
                      <Link to="/my-results" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50">📝 نتائجي</Link>
                      <Link to="/favorites" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50">⭐ دروسي المحفوظة</Link>
                      <Link to="/leaderboard" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-violet-50">🏆 نقاط يُسر</Link>
                      {user.role === 'admin' || user.role === 'teacher' ? (
                        <Link to="/admin" onClick={() => setUserMenu(false)} className="block px-4 py-2.5 text-sm text-red-700 hover:bg-red-50">⚙️ لوحة الإدارة</Link>
                      ) : null}
                      <div className="border-t border-slate-100 my-1" />
                      <button onClick={handleLogout} className="block w-full text-right px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">تسجيل الخروج</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-slate-700 hover:text-violet-700 px-3 py-2">تسجيل الدخول</Link>
                <Link to="/register" className="text-sm font-bold bg-gradient-to-l from-violet-600 to-purple-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-violet-200 hover:-translate-y-0.5 transition-all">ابدأ الآن</Link>
              </>
            )}
          </div>

          <button onClick={() => setOpen(!open)} className="xl:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100" aria-label="القائمة">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {open ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <nav className="xl:hidden pb-4 animate-fade-up">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setOpen(false)}
                className={({ isActive }) => `block px-4 py-3 rounded-xl mb-1 text-sm font-medium ${isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                {item.label}
              </NavLink>
            ))}
            <div className="border-t border-slate-100 my-2 pt-3">
              {user ? (
                <button onClick={() => { handleLogout(); setOpen(false); }} className="w-full text-center py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm">تسجيل الخروج</button>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 font-bold text-sm">تسجيل الدخول</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-l from-violet-600 to-purple-700 text-white font-bold text-sm">ابدأ الآن</Link>
                </div>
              )}
            </div>
          </nav>
        )}
        <div className="md:hidden pb-3">
          <SearchBar className="w-full" onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </header>
  );
}



function Footer() {
  const settings = useSettings();
  const wa = (settings.whatsapp_number) || DEFAULT_WHATSAPP;
  const instagram = (settings.instagram_url) || DEFAULT_INSTAGRAM;
  const channel = (settings.whatsapp_channel) || DEFAULT_CHANNEL;
  const email = (settings.contact_email) || 'info@yosr.edu.om';
  const phone = (settings.contact_phone) || '77353192';
  return (
    <footer className="bg-white/70 backdrop-blur-xl text-slate-600 mt-20 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="يُسر" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-extrabold text-violet-800">يُسر</span>
          </div>
          <p className="text-sm leading-7">منصة تعليمية عُمانية تساعد طلاب الصف الثامن وحتى الثاني عشر على فهم الدروس ومراجعتها والتدرب عليها. طريقك الأسهل للفهم والنجاح.</p>
          <div className="flex gap-3 mt-4">
            <a href={instagram} target="_blank" rel="noreferrer" title="انستغرام" className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center hover:bg-violet-600 transition-colors">📸</a>
            <a href="https://www.youtube.com/@yuser_226" target="_blank" rel="noreferrer" title="يوتيوب" className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center hover:bg-violet-600 transition-colors">▶️</a>
            <a href={channel} target="_blank" rel="noreferrer" title="قناة واتساب" className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center hover:bg-violet-600 transition-colors">📣</a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="واتساب" className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center hover:bg-violet-600 transition-colors">💬</a>
          </div>
        </div>
        <div>
          <h4 className="font-bold text-violet-900 mb-4">روابط</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/grades" className="hover:text-violet-700">المراحل الدراسية</Link></li>
            <li><Link to="/subjects" className="hover:text-violet-700">المواد</Link></li>
            <li><Link to="/live-sessions" className="hover:text-violet-700">الحصص</Link></li>
            <li><Link to="/exams" className="hover:text-violet-700">الاختبارات</Link></li>
            <li><Link to="/reviews" className="hover:text-violet-700">المراجعات</Link></li>
            <li><Link to="/groups" className="hover:text-violet-700">الجروبات المجانية</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-violet-900 mb-4">عن يُسر</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/about" className="hover:text-violet-700">من نحن</Link></li>
            <li><Link to="/teachers" className="hover:text-violet-700">المعلمون</Link></li>
            <li><Link to="/offers" className="hover:text-violet-700">العروض</Link></li>
            <li><Link to="/privacy" className="hover:text-violet-700">سياسة الخصوصية</Link></li>
            <li><Link to="/terms" className="hover:text-violet-700">الشروط والأحكام</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-violet-900 mb-4">تواصل</h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">📞 <a href={`tel:+${wa}`} className="hover:text-violet-700" dir="ltr">+968 {phone}</a></li>
            <li className="flex items-center gap-2">📱 <a href={`https://wa.me/${wa}`} className="hover:text-violet-700">واتساب: {phone}</a></li>
            <li className="flex items-center gap-2">📧 <a href={`mailto:${email}`} className="hover:text-violet-700">{email}</a></li>
            <li className="flex items-center gap-2">📸 <a href={instagram} target="_blank" rel="noreferrer" className="hover:text-violet-700">@yusredu.om</a></li>
            <li className="flex items-center gap-2">▶️ <a href="https://www.youtube.com/@yuser_226" target="_blank" rel="noreferrer" className="hover:text-violet-700">يوتيوب: يُسر</a></li>
            <li className="flex items-center gap-2">📣 <a href={channel} target="_blank" rel="noreferrer" className="hover:text-violet-700">قناة واتساب</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-5 text-center text-sm text-slate-500">
        © 2026 منصة يُسر التعليمية. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}

