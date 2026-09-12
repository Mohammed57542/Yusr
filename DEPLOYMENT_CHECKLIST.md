# قائمة التحقق قبل الإطلاق — منصة يُسر

## متغيرات البيئة المطلوبة

### أساسي (إلزامي)
| المتغير | الوصف | مثال |
|---------|-------|------|
| `JWT_SECRET` | مفتاح توقيع التوكنات (32+ حرف عشوائي) | `yusr-secret-key-2024-very-long` |
| `DATABASE_URL` | رابط اتصال قاعدة البيانات PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | بيئة التشغيل | `production` |
| `PORT` | رقم البورت | `10000` |

### البريد الإلكتروني (اختياري — للتحقق من الحسابات)
| المتغير | الوصف | مثال |
|---------|-------|------|
| `SMTP_HOST` | خادم SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | بورت SMTP | `587` |
| `SMTP_USER` | بريد المرسل | `yusr@example.com` |
| `SMTP_PASS` | كلمة مرور تطبيق Gmail | `xxxx xxxx xxxx xxxx` |

### الدفع الإلكتروني (اختياري — للاشتراكات المدفوعة)
| المتغير | الوصف | مثال |
|---------|-------|------|
| `PAYMENT_PROVIDER` | مزود الدفع | `myfatoorah` |
| `MYFATOORAH_TEST_MODE` | وضع التجربة | `true` أو `false` |
| `MYFATOORAH_API_KEY` | مفتاح MyFatoorah | `test_xxxxx` |

### التخزين السحابي (اختياري — لرفع الملفات)
| المتغير | الوصف | مثال |
|---------|-------|------|
| `STORAGE_DRIVER` | نوع التخزين | `local` أو `r2` أو `s3` |
| `S3_BUCKET` | اسم الـ Bucket | `yusr-uploads` |
| `S3_REGION` | المنطقة | `auto` |
| `S3_ENDPOINT` | رابط Endpoint | `https://xxx.r2.cloudflarestorage.com` |
| `S3_PUBLIC_BASE` | الرابط العام | `https://pub-xxx.r2.dev` |
| `S3_ACCESS_KEY_ID` | Access Key | `xxxx` |
| `S3_SECRET_ACCESS_KEY` | Secret Key | `xxxx` |

### الذكاء الاصطناعي (اختياري)
| المتغير | الوصف |
|---------|-------|
| `OPENAI_API_KEY` | مفتاح OpenAI للميزات الذكية |

---

## خطوات النشر على Render

### 1. إعداد قاعدة البيانات
1. سجّل في [Render.com](https://render.com)
2. أنشئ **New PostgreSQL Database**
3. انسخ الـ **External Database URL** (وليس Internal — لأنك تحتاجه من جهازك المحلي)
4. أضفه كمتغير بيئة `DATABASE_URL`

> ⚠️ **تنبيه:** قواعد PostgreSQL المجانية على Render تُحذف تلقائياً بعد 30 يوماً من عدم النشاط. للإنتاج الفعلي، استخدم Neon أو أي مزود دائم.

### 2. إعداد الخادم
1. أنشئ **New Web Service**
2. اربط مستودع GitHub
3. اختر **Free** plan
4. أضف متغيرات البيئة من القائمة أعلاه

### 3. تشغيل الترحيل والتعبئة (من جهازك المحلي)
```bash
# ⛔ لا تشغل هذه الأوامر من داخل Render (الخطة المجانية بدون SSH)

# 1. اتصل بقاعدة البيانات من جهازك
export DATABASE_URL="postgresql://user:pass@external-host:5432/db"

# 2. تشغيل Migration (إنشاء الجداول)
node backend/migrate-pg.js

# 3. تعبئة البيانات التجريبية (اختياري)
node backend/seed-pg.js

# 4. بناء الواجهة الأمامية
cd frontend && npm install && npm run build
```

### 4. التحقق
- [ ] `/api/health` يرجّع `ok`
- [ ] تسجيل حساب جديد يعمل
- [ ] تسجيل الدخول يعمل
- [ ] الواجهة الأمامية تظهر بشكل صحيح

---

## ⚠️ تحذيرات أمنية

- **لا ترفع ملف `.env` أبداً** لأي مستودع Git
- **لا تشارك `JWT_SECRET`** مع أي شخص
- **غيّر `MYFATOORAH_TEST_MODE`** إلى `false` عند الإنتاج الفعلي
- **راجع سجلات الخادم** بشكل دوري للتأكد من عدم وجود أخطاء

---

## ⚠️ قيود الخطة المجانية على Render

- **بدون Shell/SSH:** لا تقدر تشغل `node migrate-pg.js` من داخل الخادم
- **الاستيقاظ البطيء:** الخادم يستيقظ بعد 30-50 ثانية من طلب أول
- **وقت البناء المحدود:** حاصل 900 دقيقة شهرياً
- **قاعدة البيانات:** تُحذف بعد 30 يوم من عدم النشاط

> للإنتاج الفعلي، يُنصح بترقية الخطة أو استخدام Neon للقاعدة.
