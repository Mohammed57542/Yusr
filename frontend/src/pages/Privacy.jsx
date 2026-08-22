import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <h1 className="text-3xl font-black text-slate-900 mb-2">🔒 سياسة الخصوصية</h1>
      <p className="text-sm text-slate-400 mb-10">آخر تحديث: 2026</p>

      <div className="space-y-8 text-slate-600 leading-8">
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">1. جمع البيانات</h2>
          <p>نجمع المعلومات التي تقدمها عند إنشاء حسابك مثل الاسم ورقم الهاتف والبريد الإلكتروني والصف الدراسي، بالإضافة إلى بيانات استخدام المنصة مثل الدروس المكتملة ونتائج الاختبارات.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">2. استخدام البيانات</h2>
          <p>نستخدم بياناتك لتحسين تجربتك التعليمية، وتخصيص المحتوى المناسب لصفّك، ومتابعة تقدمك، وإرسال إشعارات بالحصص والملفات الجديدة. لا نبيع بياناتك لأي طرف ثالث.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">3. حماية البيانات</h2>
          <p>نتخذ إجراءات أمنية مناسبة لحماية معلوماتك، ويتم تشفير كلمات المرور وعدم مشاركتها مع أي جهة.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">4. ملفات تعريف الارتباط</h2>
          <p>نستخدم ملفات تعريف الارتباط لتذكر تفضيلاتك وتحسين أداء المنصة. يمكنك تعطيلها من إعدادات المتصفح.</p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">5. حقوقك</h2>
          <p>يحق لك طلب الاطلاع على بياناتك أو تعديلها أو حذفها في أي وقت عبر التواصل معنا.</p>
        </section>
      </div>

      <div className="mt-12 text-center">
        <Link to="/contact" className="text-violet-600 font-bold">تواصل معنا بخصوص أي استفسار ←</Link>
      </div>
    </div>
  );
}
