import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-black text-slate-900 mb-2">📋 الشروط والأحكام</h1>
      <p className="text-sm text-slate-400 mb-10">آخر تحديث: 2026</p>

      <div className="space-y-8 text-slate-600 leading-8">
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">1. قبول الشروط</h2>
          <p>باستخدامك لمنصة يُسر فإنك توافق على هذه الشروط. إذا كنت غير موافق عليها، يرجى عدم استخدام المنصة.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">2. الحساب</h2>
          <p>أنت مسؤول عن الحفاظ على سرية بيانات حسابك. يمنع مشاركة الحساب أو إنشاء حسابات وهمية. يحق لنا إيقاف أي حساب يخالف الشروط.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">3. الاشتراكات والدفع</h2>
          <p>الاشتراك سنوي ويُفعّل فور الدفع. تشمل مدة الاشتراك المواد المختارة في الباقة. لا تُسترد الرسوم بعد التفعيل إلا وفق حالات خاصة تُقيّم من الإدارة.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">4. حقوق المحتوى</h2>
          <p>جميع الدروس والملفات والمحتوى ملك لمنصة يُسر. يمنع إعادة نشر أو بيع أو مشاركة المحتوى خارج المنصة لأي جهة.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">5. الجروبات المجانية</h2>
          <p>الجروبات مجانية بالكامل، ونحتفظ بحق إدارة الأعضاء وإزالة أي محتوى غير لائق أو مخالف.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">6. إلغاء الاشتراك</h2>
          <p>يمكنك طلب إلغاء الاشتراك عبر التواصل معنا، ويبقى وصولك سارياً حتى نهاية المدة المدفوعة.</p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <Link to="/contact" className="text-violet-600 font-bold">لديك استفسار؟ تواصل معنا ←</Link>
      </div>
    </div>
  );
}
