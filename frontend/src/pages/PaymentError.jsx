import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentError() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const messages = {
    no_invoice: 'لم يتم العثور على الفاتورة.',
    verification_failed: 'تعذر التحقق من حالة الدفع.',
    cancelled: 'تم إلغاء عملية الدفع.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full mx-4 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">❌</span>
        </div>
        <h1 className="text-2xl font-black text-red-700 mb-3">فشلت عملية الدفع</h1>
        <p className="text-slate-600 text-sm mb-2">{messages[reason] || 'حدث خطأ أثناء عملية الدفع.'}</p>
        <p className="text-slate-400 text-xs mb-8">لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/pricing" className="inline-block bg-teal-600 text-white font-extrabold px-8 py-3 rounded-2xl hover:bg-teal-700 transition">
            المحاولة مرة أخرى
          </Link>
          <Link to="/dashboard" className="inline-block bg-slate-100 text-slate-700 font-bold px-6 py-3 rounded-2xl hover:bg-slate-200 transition">
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
