import { useState } from 'react';
import { api } from '../api/client';
import { Alert, Input } from '../components/common';
import useSettings, { DEFAULT_WHATSAPP, DEFAULT_CHANNEL, DEFAULT_INSTAGRAM } from '../hooks/useSettings';

const INQUIRY_TYPES = ['استفسار عن الاشتراكات', 'مشكلة تقنية', 'محتوى تعليمي', 'اقتراحات', 'أخرى'];

export default function Contact() {
  const settings = useSettings();
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      const res = await api.post('/auth/contact', form);
      setStatus(res.message);
      setForm({ name: '', phone: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const wa = (settings.whatsapp_number) || DEFAULT_WHATSAPP;
  const phone = (settings.contact_phone) || '77353192';
  const email = (settings.contact_email) || 'info@yosr.edu.om';
  const cards = [
    { icon: '📞', title: 'اتصل بنا', value: `+968 ${phone}`, href: `tel:+${wa}` },
    { icon: '💬', title: 'واتساب', value: phone, href: `https://wa.me/${wa}` },
    { icon: '✉️', title: 'البريد الإلكتروني', value: email, href: `mailto:${email}` },
    { icon: '📸', title: 'انستغرام', value: '@yusredu.om', href: (settings.instagram_url) || DEFAULT_INSTAGRAM },
    { icon: '▶️', title: 'يوتيوب', value: '@yuser_226', href: 'https://www.youtube.com/@yuser_226' },
    { icon: '📣', title: 'قناة واتساب', value: 'يسر — واتساب', href: (settings.whatsapp_channel) || DEFAULT_CHANNEL },
  ];

  return (
    <div>
      <div className="bg-gradient-to-br from-violet-700 via-purple-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">تواصل معنا</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">نحن هنا لمساعدتك</h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto">فريقنا جاهز للإجابة على جميع استفساراتك على مدار الساعة.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="space-y-5 mb-8">
              {cards.map((c) => (
                <a key={c.title} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-2xl shrink-0">{c.icon}</div>
                  <div>
                    <p className="text-sm text-slate-500">{c.title}</p>
                    <p className="font-extrabold text-slate-900" dir="ltr">{c.value}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="bg-gradient-to-l from-violet-600 to-purple-700 text-white rounded-3xl p-8">
              <h3 className="text-xl font-extrabold mb-2">ساعات العمل</h3>
              <div className="space-y-2 text-violet-100 text-sm">
                <p>الأحد - الخميس: 8 صباحاً - 9 مساءً</p>
                <p>الجمعة - السبت: 10 صباحاً - 6 مساءً</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">أرسل لنا رسالة</h2>
            {error && <div className="mb-5"><Alert>{error}</Alert></div>}
            {status && <div className="mb-5"><Alert type="success">{status}</Alert></div>}
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">نوع الاستفسار</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value="">اختر نوع الاستفسار</option>
                    {INQUIRY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">الرسالة</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows="5" required placeholder="اكتب رسالتك هنا..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-l from-violet-600 to-purple-700 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-violet-200">
                إرسال الرسالة
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
