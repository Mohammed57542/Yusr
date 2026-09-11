import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ref) { setStatus('done'); return; }

    const verify = async () => {
      try {
        const data = await api.get(`/subscription/payment/status?ref=${ref}`);
        setStatus(data.payment_status === 'paid' ? 'paid' : 'pending');
      } catch (err) {
        setError(err.message || 'تعذر التحقق');
        setStatus('done');
      }
    };

    // Poll for status (MyFatoorah may take a few seconds)
    const interval = setInterval(() => {
      verify().finally(() => clearInterval(interval));
    }, 2000);

    // Stop after 30s
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [ref]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
        {status === 'verifying' && (
          <>
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">جارٍ التحقق من الدفع...</h1>
            <p className="text-slate-500 text-sm">يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ.</p>
          </>
        )}

        {status === 'paid' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🎉</span>
            </div>
            <h1 className="text-2xl font-black text-emerald-700 mb-3">تم الدفع بنجاح!</h1>
            <p className="text-slate-600 text-sm mb-6">تم تفعيل اشتراكك بنجاح. يمكنك الآن الوصول لجميع الدروس والاختبارات.</p>
            <Link to="/dashboard" className="inline-block bg-teal-600 text-white font-extrabold px-8 py-3 rounded-2xl hover:bg-teal-700 transition">
              الذهاب للوحة التحكم
            </Link>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-black text-amber-700 mb-3">الدفع قيد المعالجة</h1>
            <p className="text-slate-600 text-sm mb-6">تم استلام طلبك وسيتم تفعيل الاشتراك قريباً. يمكنك متابعة الحالة من لوحة التحكم.</p>
            <Link to="/dashboard" className="inline-block bg-teal-600 text-white font-extrabold px-8 py-3 rounded-2xl hover:bg-teal-700 transition">
              الذهاب للوحة التحكم
            </Link>
          </>
        )}

        {error && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-black text-red-700 mb-3">خطأ في التحقق</h1>
            <p className="text-slate-600 text-sm mb-6">{error}</p>
            <Link to="/pricing" className="inline-block bg-teal-600 text-white font-extrabold px-8 py-3 rounded-2xl hover:bg-teal-700 transition">
              المحاولة مرة أخرى
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
