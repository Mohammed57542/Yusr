import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Alert, LockedContent } from '../components/common';
import useSettings, { waLink } from '../hooks/useSettings';

const TYPES = ['الكل', 'ملخص', 'ورقة عمل', 'مراجعة', 'نموذج اختبار', 'أسئلة تدريبية', 'كتاب'];

function downloadFile(resource) {
  const header = `${resource.title}\n\nالمادة: ${resource.subject_name} • الصف: ${resource.grade_name}\nالنوع: ${resource.type}\n\n`;
  const body = resource.content || 'لا يوجد محتوى نصي لهذا الملف.';
  const blob = new Blob([header + '\n' + body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Library() {
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null);
  const [search, setSearch] = useState('');

  const type = params.get('type') || 'الكل';
  const subject = params.get('subject') || '';
  const grade = params.get('grade') || '';
  const fileParam = params.get('file');

  useEffect(() => { api.get('/subjects').then(setSubjects).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (type !== 'الكل') q.set('type', type);
    if (subject) q.set('subject_id', subject);
    if (grade) q.set('grade_id', grade);
    if (search) q.set('q', search);
    api.get(`/resources?${q}`).then(setFiles).finally(() => setLoading(false));
  }, [type, subject, grade, search]);

  useEffect(() => {
    if (fileParam) {
      setLockedInfo(null);
      api.get(`/resources/${fileParam}`).then(setViewer).catch((e) => { if (e.data?.locked) setLockedInfo(e.data); });
    }
  }, [fileParam]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key === 'file') { if (value) next.set('file', value); else next.delete('file'); }
    setParams(next);
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">مكتبة يُسر</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">ملخصات وملفات تعليمية</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">ملخصات، أوراق عمل، مراجعات، ونماذج اختبارات جاهزة للتحميل والعرض.</p>
          <div className="max-w-xl mx-auto mt-8">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث في المكتبة..." className="w-full px-6 py-4 rounded-2xl bg-white text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-white/30 shadow-2xl" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {lockedInfo && (
          <div className="mb-8">
            <LockedContent subjectName={lockedInfo.subject_name} icon="📄🔒" />
            <button onClick={() => { setLockedInfo(null); updateParam('file', ''); }} className="block mx-auto text-slate-500 text-sm font-bold hover:text-violet-600">← العودة للمكتبة</button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {TYPES.map((t) => (
            <button key={t} onClick={() => updateParam('type', t === 'الكل' ? '' : t)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${type === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'}`}>
              {t === 'الكل' ? '🗂️ الكل' : t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <select value={subject} onChange={(e) => updateParam('subject', e.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">جميع المواد</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select value={grade} onChange={(e) => updateParam('grade', e.target.value)} className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">جميع الصفوف</option>
            {[8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>الصف {g}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-16 bg-slate-100 rounded-full mb-2" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                <div className="h-3 w-2/3 bg-slate-100 rounded mb-4" />
                <div className="h-2 w-1/2 bg-slate-100 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
                  <div className="flex-1 h-9 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
            </div>
            <h3 className="text-gray-500 text-lg font-bold mb-2">لا توجد ملفات متاحة حالياً</h3>
            <p className="text-gray-400 text-sm">جرّب تغيير الفلاتر أو البحث بكلمات أخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((f, i) => (
              <div key={f.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shrink-0">📕</div>
                  <div className="min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-1">{f.type}</span>
                    <h3 className="font-extrabold text-slate-900 leading-6 line-clamp-2">{f.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-6 line-clamp-2 mb-4 flex-1">{f.description || 'ملف تعليمي جاهز للاستخدام.'}</p>
                <div className="text-xs text-slate-400 mb-4">
                  <p>{f.subject_name} • {f.grade_name}</p>
                  <p className="mt-1">{f.file_size || 'PDF'} • 👁️ {f.views}</p>
                </div>
                <div className="flex gap-2">
                  {f.locked ? (
                    <Link to="/pricing" className="flex-1 bg-slate-100 text-slate-500 font-bold py-2.5 rounded-xl text-sm text-center hover:bg-slate-200 transition-colors">🔒 للمشتركين — اشترك</Link>
                  ) : (
                    <>
                      <button onClick={() => setViewer(f)} className="flex-1 bg-violet-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">عرض</button>
                      <button onClick={() => downloadFile(f)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">📥 تحميل</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl">📕</div>
                <div>
                  <h3 className="font-extrabold text-slate-900 leading-6">{viewer.title}</h3>
                  <p className="text-xs text-slate-400">{viewer.subject_name} • {viewer.grade_name} • {viewer.type}</p>
                </div>
              </div>
              <button onClick={() => setViewer(null)} className="text-slate-400 hover:text-slate-700 text-xl font-black">✕</button>
            </div>
            <pre className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-700 leading-7 whitespace-pre-wrap font-sans">{viewer.content || 'لا يوجد محتوى نصي.'}</pre>
            <div className="flex gap-3 mt-6">
              <button onClick={() => downloadFile(viewer)} className="flex-1 bg-violet-600 text-white font-extrabold py-3.5 rounded-2xl hover:bg-violet-700 transition-colors">📥 تحميل الملف</button>
              <a href={waLink(`أرغب في الحصول على الملف: ${viewer.title}`, settings)} target="_blank" rel="noreferrer" className="flex-1 text-center bg-green-600 text-white font-extrabold py-3.5 rounded-2xl hover:bg-green-700 transition-colors">💬 اطلبه واتساب</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
