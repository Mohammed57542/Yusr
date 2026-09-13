import nodemailer from 'nodemailer';

const isProd = process.env.NODE_ENV === 'production';

const transporter = isProd
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  : null;

const BRAND = {
  name: 'يُسر',
  color: '#0d9488',
  colorDark: '#152c34',
  gold: '#f7be67',
  url: process.env.FRONTEND_URL || 'https://yusr.edu.om',
  phone: '96895123456',
  email: 'info@yusr.edu.om',
};

function wrapTemplate(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND.name} — ${title}</title>
<style>
  body{margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1e293b}
  .container{max-width:600px;margin:0 auto;background:#fff}
  .header{background:${BRAND.colorDark};padding:30px 40px;text-align:center}
  .header h1{color:#fff;font-size:28px;margin:0}
  .header p{color:${BRAND.gold};font-size:14px;margin-top:5px}
  .body{padding:40px}
  .body h2{color:${BRAND.colorDark};font-size:20px;margin-top:0}
  .code{background:${BRAND.color};color:#fff;font-size:32px;font-weight:bold;text-align:center;padding:20px;border-radius:12px;letter-spacing:8px;margin:25px 0;font-family:monospace}
  .btn{display:block;text-align:center;background:${BRAND.color};color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px;margin:25px 0}
  .footer{background:#f8fafc;padding:30px 40px;text-align:center;border-top:1px solid #e2e8f0}
  .footer p{color:#94a3b8;font-size:12px;margin:5px 0}
  .note{background:#f0fdfa;border-right:4px solid ${BRAND.color};padding:15px 20px;border-radius:0 8px 8px 0;margin:20px 0;font-size:14px;color:#0f766e}
</style></head>
<body>
<div class="container">
  <div class="header"><h1>${BRAND.name}</h1><p>المنصة التعليمية العُمانية</p></div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">
    <p>${BRAND.name} — التعليم الإلكتروني العُماني</p>
    <p>البريد: ${BRAND.email} | واتساب: +${BRAND.phone}</p>
    <p><a href="${BRAND.url}" style="color:${BRAND.color}">${BRAND.url}</a></p>
  </div>
</div>
</body></html>`;
}

const templates = {
  verification: (code) => ({
    subject: `رمز التحقق — ${BRAND.name}`,
    html: wrapTemplate('التحقق من البريد', `
      <h2>مرحباً بك في ${BRAND.name}</h2>
      <p>شكراً لتسجيلك. استخدم رمز التحقق التالي لتفعيل حسابك:</p>
      <div class="code">${code}</div>
      <p style="color:#64748b;font-size:14px">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشاركه مع أي شخص.</p>
      <div class="note">إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</div>
    `),
  }),

  passwordReset: (code) => ({
    subject: `إعادة تعيين كلمة المرور — ${BRAND.name}`,
    html: wrapTemplate('إعادة تعيين كلمة المرور', `
      <h2>طلب إعادة تعيين كلمة المرور</h2>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور. استخدم الرمز التالي:</p>
      <div class="code">${code}</div>
      <p style="color:#64748b;font-size:14px">هذا الرمز صالح لمدة 10 دقائق فقط.</p>
      <div class="note">إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة وتأكد من أمان حسابك.</div>
    `),
  }),

  paymentSuccess: (name, plan, amount) => ({
    subject: `تم تأكيد الدفع — ${BRAND.name}`,
    html: wrapTemplate('تأكيد الدفع', `
      <h2>مرحباً ${name}!</h2>
      <p style="font-size:18px;color:${BRAND.color};font-weight:bold">تم استلام الدفع بنجاح</p>
      <div class="note">
        <strong>الخطة:</strong> ${plan}<br>
        <strong>المبلغ:</strong> ${amount} ر.ع<br>
        <strong>الحالة:</strong> مدفوع ✅
      </div>
      <p>تم تفعيل اشتراكك. يمكنك الآن الوصول إلى جميع المحتوى المتاح في خطة ${plan}.</p>
      <a href="${BRAND.url}/dashboard" class="btn">ابدأ التعلم الآن</a>
    `),
  }),

  subscriptionReminder: (name, plan, daysLeft) => ({
    subject: `تذكير: اشتراكك ينتهي قريباً — ${BRAND.name}`,
    html: wrapTemplate('تذكير الاشتراك', `
      <h2>مرحباً ${name}</h2>
      <p>نود تذكيرك بأن اشتراكك في خطة <strong>${plan}</strong> ينتهي خلال <strong>${daysLeft} يوم</strong>.</p>
      <div class="note">للاستمرار في الوصول الكامل للمحتوى، يرجى تجديد اشتراكك قبل انتهاء الصلاحية.</div>
      <a href="${BRAND.url}/pricing" class="btn">تجديد الاشتراك</a>
    `),
  }),

  teacherApproved: (name) => ({
    subject: `تم قبول طلبك — ${BRAND.name}`,
    html: wrapTemplate('قبول طلب المعلم', `
      <h2>أهلاً ${name}!</h2>
      <p style="font-size:18px;color:${BRAND.color};font-weight:bold">🎉 مبروك! تم قبول طلبك كمعلم في ${BRAND.name}</p>
      <p>يمكنك الآن تسجيل الدخول باستخدام حسابك والبدء في إنشاء المحتوى التعليمي.</p>
      <a href="${BRAND.url}/login" class="btn">تسجيل الدخول</a>
    `),
  }),

  teacherRejected: (name, reason) => ({
    subject: `نتيجة طلب المعلم — ${BRAND.name}`,
    html: wrapTemplate('نتيجة طلب المعلم', `
      <h2>مرحباً ${name}</h2>
      <p>نأسف لإبلاغك بأنه لم يتم قبول طلبك كمعلم في هذه المرحلة.</p>
      ${reason ? `<div class="note"><strong>السبب:</strong> ${reason}</div>` : ''}
      <p>يمكنك التقديم مجدداً بعد تحسين ملفك الشخصي.</p>
      <a href="${BRAND.url}/login" class="btn">تسجيل الدخول</a>
    `),
  }),

  examReminder: (name, examTitle, date) => ({
    subject: `تذكير: اختبار قادم — ${BRAND.name}`,
    html: wrapTemplate('تذكير الاختبار', `
      <h2>مرحباً ${name}</h2>
      <p>لديك اختبار قادم:</p>
      <div class="note">
        <strong>الاختبار:</strong> ${examTitle}<br>
        <strong>التاريخ:</strong> ${date}
      </div>
      <p>تأكد من الاستعداد والتحضير المسبق.</p>
      <a href="${BRAND.url}/exams" class="btn">شاهد الاختبارات</a>
    `),
  }),
};

async function sendEmail(to, templateName, ...args) {
  const template = templates[templateName](...args);
  if (!isProd) {
    console.log(`[EMAIL DEV] To: ${to} | Subject: ${template.subject}`);
    console.log(`[EMAIL DEV] محاكاة فقط — بيئة تطوير، لم يُرسل أي بريد فعلي`);
    return { sent: false, simulation: true, message: 'محاكاة — بيئة تطوير' };
  }
  if (!transporter) {
    console.error('[EMAIL] SMTP not configured — cannot send email');
    return { sent: false, simulation: false, message: 'SMTP غير مُعد' };
  }
  try {
    await transporter.sendMail({
      from: `"${BRAND.name}" <${process.env.SMTP_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
    });
    return { sent: true, simulation: false };
  } catch (err) {
    console.error(`[EMAIL] Failed to send to ${to}:`, err.message);
    return { sent: false, simulation: false, message: err.message };
  }
}

// فحص اتصال SMTP عند بدء التشغيل
async function verifySmtpConnection() {
  if (!isProd) {
    console.log('[EMAIL] وضع التطوير — تم تخطي فحص SMTP');
    return true;
  }
  if (!transporter) {
    console.error('[EMAIL] ⛔ SMTP غير مُعد — البريد لن يُرسل');
    return false;
  }
  try {
    await transporter.verify();
    console.log('[EMAIL] ✅ اتصال SMTP ناجح — البريد جاهز للإرسال');
    return true;
  } catch (err) {
    console.error('[EMAIL] ⛔ فشل اتصال SMTP:', err.message);
    console.error('[EMAIL] تأكد من صحة SMTP_USER و SMTP_PASS و SMTP_HOST');
    return false;
  }
}

export { sendEmail, templates, verifySmtpConnection };
