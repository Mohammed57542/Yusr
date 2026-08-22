# منصة يُسر التعليمية

منصة تعليمية متكاملة لطلاب المدارس في سلطنة عُمان.

## للرفع على الإنترنت (خطوات بسيطة):

### الخطوة 1: حساب GitHub
1. ادخل على [github.com](https://github.com)
2. اضغط "Sign up" وأسوي حساب مجاني

### الخطوة 2: حساب Railway
1. ادخل على [railway.app](https://railway.app)
2. اضغط "Login" وسجّل بحساب GitHub

### الخطوة 3: ارفع الكود
افتح PowerShell واكتب:

```powershell
cd "C:\Users\HASSAN\OneDrive\Documents\Default Project"
git init
git add .
git commit -m "منصة يسر"
```

ثم ارجع لـ GitHub وأنشئ مستودع جديد (Repository) واتبع الخطوات اللي تظهر لك.

### الخطوة 4: شغّل على Railway
1. في Railway اضغط "New Project"
2. اختر "Deploy from GitHub"
3. اختر مستودعك
4. اضغط "Deploy"

### الخطوة 5: أضف كلمة السر
في Railway → Variables أضف:
```
JWT_SECRET=كلمة_سر_قوية_هنا_32_حرف
```

**خلص! المنصة شغالة على رابط مثل: https://yusr.up.railway.app**
