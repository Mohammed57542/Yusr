import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const suggestions = [
  'اختبرني في الرياضيات',
  'أعطني خطة مذاكرة',
  'لخص لي درس المعادلات التربيعية',
  'اشرح قوانين نيوتن',
];

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get('/ai/history').then(setMessages).catch(() => {});
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text) => {
    const message = (text || input).trim();
    if (!message || typing) return;
    setError('');
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setTyping(true);
    try {
      const res = await api.post('/ai/chat', { message });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (e) {
      setError(e.message);
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.' }]);
    } finally {
      setTyping(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-4 animate-floaty">🤖</div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">المساعد الذكي</h1>
        <p className="text-slate-500 mb-8 leading-7">سجّل الدخول للتحدث مع مساعدك التعليمي الذكي الذي يساعدك في الشرح والتلخيص وتوليد الأسئلة وخطط المذاكرة.</p>
        <Link to="/login" className="inline-block bg-violet-600 text-white font-extrabold px-10 py-4 rounded-2xl hover:bg-violet-700 transition-colors">تسجيل الدخول</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-3">المساعد الذكي</span>
        <h1 className="text-3xl font-extrabold text-slate-900">تحدث مع مساعدك التعليمي</h1>
        <p className="text-slate-500 mt-2">اسأل عن أي درس، اطلب تلخيصاً، أو اختبر نفسك.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden h-[65vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-l from-violet-700 to-purple-800 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl">🤖</div>
          <div>
            <p className="font-extrabold">مساعد يسر الذكي</p>
            <p className="text-xs text-violet-200 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> متصل الآن</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <div className="text-6xl animate-floaty">💬</div>
              <p className="text-slate-500 font-medium max-w-xs">ابدأ محادثتك مع المساعد. جرّب أحد هذه الاقتراحات:</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="px-4 py-2.5 rounded-2xl bg-white border border-violet-200 text-violet-700 text-sm font-bold hover:bg-violet-50 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex mb-4 ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] px-5 py-3.5 rounded-3xl text-sm leading-7 whitespace-pre-wrap animate-fade-up ${
                m.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-lg'
                  : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-lg'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-end mb-4">
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl rounded-bl-lg px-5 py-3.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
          {error && <p className="text-center text-red-600 text-sm font-bold py-2">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="اكتب سؤالك هنا..."
              className="flex-1 px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
            />
            <button onClick={() => send()} disabled={!input.trim() || typing} className="w-13 h-13 p-3.5 rounded-2xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 20.5v-17l18 8.5-18 8.5zm2-3.2 10.6-5.05L5 7.25v10.05z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
