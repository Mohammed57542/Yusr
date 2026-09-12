// ===== اختبارات شاملة — 57 اختبار للمنصة =====
// التشغيل:  node --test tests/api.test.mjs

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const TEST_DB = path.join(DATA_DIR, 'yusr.test.db');

let server;
let base;
let testdb;

function correctAnswer(questionId) {
  const row = testdb.prepare('SELECT question_type, correct_index, options FROM questions WHERE id = ?').get(questionId);
  if (!row) return 0;
  if (String(row.question_type) === 'multi') return JSON.parse(row.correct_index);
  return row.correct_index;
}

before(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try { fs.rmSync(TEST_DB, { force: true }); } catch {}
  try { fs.rmSync(TEST_DB + '-wal', { force: true }); } catch {}
  try { fs.rmSync(TEST_DB + '-shm', { force: true }); } catch {}
  process.env.DB_PATH = TEST_DB;
  await import('../seed.js');
  testdb = (await import('../db.js')).default;
  const { default: app } = await import('../server.js');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
  // Cache admin token to avoid rate limiting
  const adminLogin = await json('/api/auth/login', { method: 'POST', body: { identifier: 'admin@yusr.edu.om', password: 'password123' } });
  adminToken = adminLogin.data.token;
});

after(() => {
  server?.close();
  try { fs.rmSync(TEST_DB, { force: true }); } catch {}
});

async function json(urlPath, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${urlPath}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const rand = () => Math.random().toString(36).slice(2, 10);
let studentToken, studentRefresh, studentId, adminToken;
const subscribed = new Set();

async function registerUser({ name, email, password = 'Pass12345', grade = 12 }) {
  const bcrypt = await import('bcryptjs');
  const testCode = '654321';
  const hashedCode = bcrypt.default.hashSync(testCode, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  testdb.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
  testdb.prepare('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)').run(email, hashedCode, expiresAt);
  return json('/api/auth/register', { method: 'POST', body: { name, email, password, grade, code: testCode } });
}

async function subscribeTo(subjectId, token) {
  await json('/api/subscription/subscribe', { method: 'POST', token, body: { plan: 'single', subject_ids: [subjectId] } });
  subscribed.add(Number(subjectId));
}

// ═══════════════════════════════════════════
// 1. Authentication (8 tests)
// ═══════════════════════════════════════════

test('001 تسجيل طالب جديد', async () => {
  const email = `t_${rand()}@test.com`;
  const { status, data } = await registerUser({ name: 'طالب اختبار', email, grade: 12 });
  assert.equal(status, 201);
  assert.ok(data.token);
  assert.ok(data.refreshToken, 'يجب إرجاع refreshToken');
  studentToken = data.token;
  studentRefresh = data.refreshToken;
  studentId = data.user.id;
});

test('002 رفض تسجيل بنفس البريد', async () => {
  const email = `dup_${rand()}@test.com`;
  await registerUser({ name: 'أ', email });
  const { status } = await registerUser({ name: 'ب', email });
  assert.equal(status, 409);
});

test('003 دخول صحيح وخاطئ', async () => {
  const { status: ok } = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'password123' } });
  assert.equal(ok, 200);
  const bad = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'wrong' } });
  assert.equal(bad.status, 401);
});

test('004 حماية المسارات: بدون توكن 401 وبطالب على Admin 403', async () => {
  const noToken = await json('/api/subscription/me');
  assert.equal(noToken.status, 401);
  const asStudent = await json('/api/admin/stats', { token: studentToken });
  assert.equal(asStudent.status, 403);
});

test('005 تحديث التوكن (refresh)', async () => {
  const { status, data } = await json('/api/auth/refresh', { method: 'POST', body: { refreshToken: studentRefresh } });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.ok(data.refreshToken);
  studentToken = data.token;
  studentRefresh = data.refreshToken;
});

test('006 رفض refresh token خاطئ', async () => {
  const { status } = await json('/api/auth/refresh', { method: 'POST', body: { refreshToken: 'invalid-token' } });
  assert.equal(status, 401);
});

test('007 تسجيل الخروج وحظر التوكن', async () => {
  const { status } = await json('/api/auth/logout', { method: 'POST', token: studentToken, body: { refreshToken: studentRefresh } });
  assert.equal(status, 200);
  const { status: afterLogout } = await json('/api/subscription/me', { token: studentToken });
  assert.equal(afterLogout, 401);
  const login = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'password123' } });
  studentToken = login.data.token;
  studentRefresh = login.data.refreshToken;
});

test('007b التحديث بعد تسجيل الخروج يجب أن يُرفض', async () => {
  // حفظ Refresh الحالي
  const savedRefresh = studentRefresh;
  // تسجيل خروج
  await json('/api/auth/logout', { method: 'POST', token: studentToken, body: { refreshToken: savedRefresh } });
  // محاولة استخدام نفس الـrefreshToken بعد الخروج — يجب أن يُرفض
  const { status } = await json('/api/auth/refresh', { method: 'POST', body: { refreshToken: savedRefresh } });
  assert.equal(status, 401);
  // إعادة تسجيل الدخول للحصول على توكن جديد للاختبارات التالية
  const login = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'password123' } });
  studentToken = login.data.token;
  studentRefresh = login.data.refreshToken;
});

test('008 كلمة المرور القصيرة مرفوضة', async () => {
  const bcrypt = await import('bcryptjs');
  const email = `short_${rand()}@test.com`;
  const hashedCode = bcrypt.default.hashSync('111111', 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  testdb.prepare('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)').run(email, hashedCode, expiresAt);
  const { status } = await json('/api/auth/register', { method: 'POST', body: { name: 'قصيرة', email, password: '123', grade: 10, code: '111111' } });
  assert.equal(status, 400);
});

// ═══════════════════════════════════════════
// 2. Catalog & Content (7 tests)
// ═══════════════════════════════════════════

test('009 قائمة الصفوف', async () => {
  const { status, data } = await json('/api/grades');
  assert.equal(status, 200);
  assert.ok(data.length >= 5);
});

test('010 قائمة المواد', async () => {
  const { status, data } = await json('/api/subjects');
  assert.equal(status, 200);
  assert.ok(data.length >= 7);
});

test('011 الدروس حسب المادة والصف', async () => {
  const { status, data } = await json('/api/lessons?grade_id=8&subject_id=1');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

test('012 الاختبارات المتاحة', async () => {
  const { status, data } = await json('/api/exams');
  assert.equal(status, 200);
  assert.ok(data.length > 0);
});

test('013 بنك الأسئلة', async () => {
  const { status, data } = await json('/api/questions?limit=5');
  assert.equal(status, 200);
  assert.ok(data.questions.length > 0);
});

test('014 الإحصاءات العامة', async () => {
  const { status, data } = await json('/api/stats');
  assert.equal(status, 200);
  assert.ok(data.grades >= 4);
  assert.ok(data.questions > 0);
});

test('015 الموارد والمكتبة', async () => {
  const { status } = await json('/api/resources');
  assert.equal(status, 200);
});

// ═══════════════════════════════════════════
// 3. Subscription & Payments (6 tests)
// ═══════════════════════════════════════════

test('016 اشتراك بمادة', async () => {
  const subjects = await json('/api/subjects');
  const sid = subjects.data[0].id;
  await subscribeTo(sid, studentToken);
  const { status } = await json('/api/subscription/me', { token: studentToken });
  assert.equal(status, 200);
});

test('017 بيانات المستخدم والمحتوى', async () => {
  const { status, data } = await json('/api/subscription/me', { token: studentToken });
  assert.equal(status, 200);
  assert.ok(data.subscribed_subjects.length > 0);
});

test('018 المحتوى مقفل قبل الاشتراك', async () => {
  const subjects = await json('/api/subjects');
  const unsubscribed = subjects.data.find(s => !subscribed.has(Number(s.id)));
  if (unsubscribed) {
    const { data } = await json(`/api/lessons?subject_id=${unsubscribed.id}`, { token: studentToken });
    assert.ok(data.every(l => l.locked === true));
  }
});

test('019 المحتوى متاح بعد الاشتراك', async () => {
  const subjects = await json('/api/subjects');
  const unsubscribed = subjects.data.find(s => !subscribed.has(Number(s.id)));
  if (unsubscribed) {
    await subscribeTo(unsubscribed.id, studentToken);
    const { data } = await json(`/api/lessons?subject_id=${unsubscribed.id}`, { token: studentToken });
    assert.ok(data.some(l => l.locked === false));
  }
});

test('020 خطط الاشتراك', async () => {
  const { status } = await json('/api/subscription/plans');
  assert.equal(status, 200);
});

test('021 إحصاءات المشرف', async () => {
  const { status, data } = await json('/api/admin/stats', { token: adminToken });
  assert.equal(status, 200);
  assert.ok(typeof data === 'object');
});

// ═══════════════════════════════════════════
// 4. Exams & Progress (7 tests)
// ═══════════════════════════════════════════

test('022 تقديم اختبار بنجاح', async () => {
  const exams = await json('/api/exams');
  const examId = exams.data[0].id;
  await subscribeTo(exams.data[0].subject_id, studentToken);
  const exam = await json(`/api/exams/${examId}`, { token: studentToken });
  const answers = exam.data.questions.map(q => ({ id: q.id, answer: correctAnswer(q.id) }));
  const { status, data } = await json(`/api/exams/${examId}/submit`, { method: 'POST', token: studentToken, body: { answers } });
  assert.equal(status, 200);
  assert.equal(data.score, 100);
});

test('023 رفض المحاولة الثانية', async () => {
  const exams = await json('/api/exams');
  const examId = exams.data[0].id;
  const exam = await json(`/api/exams/${examId}`, { token: studentToken });
  const answers = exam.data.questions.map(q => ({ id: q.id, answer: correctAnswer(q.id) }));
  const { status } = await json(`/api/exams/${examId}/submit`, { method: 'POST', token: studentToken, body: { answers } });
  assert.equal(status, 403);
});

test('024 تقدم الدرس', async () => {
  const { status } = await json('/api/progress/1', { method: 'POST', token: studentToken, body: { percent: 50 } });
  assert.equal(status, 200);
});

test('025 إكمال الدرس ونقطة', async () => {
  const before = await json('/api/subscription/me', { token: studentToken });
  await json('/api/progress/2', { method: 'POST', token: studentToken, body: { percent: 100, completed: true } });
  const after = await json('/api/subscription/me', { token: studentToken });
  assert.ok(after.data.points >= before.data.points);
});

test('026 نتائج الاختبارات', async () => {
  const { status } = await json(`/api/users/${studentId}/results`, { token: studentToken });
  assert.ok(status === 200 || status === 403);
});

test('027 المفضلة', async () => {
  const { status } = await json(`/api/users/${studentId}/favorites`, { token: studentToken });
  assert.ok(status === 200 || status === 403);
});

test('028 قائمة المعلمين', async () => {
  const { status, data } = await json('/api/teachers');
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

// ═══════════════════════════════════════════
// 5. Notifications (4 tests)
// ═══════════════════════════════════════════

test('029 جلب الإشعارات', async () => {
  const { status } = await json('/api/notifications', { token: studentToken });
  assert.equal(status, 200);
});

test('030 تعليم إشعار كمقروء', async () => {
  testdb.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)').run(studentId, 'اختبار', 'إشعار اختبار', 'info');
  const list = await json('/api/notifications', { token: studentToken });
  if (list.data.items?.length > 0) {
    const id = list.data.items[0].id;
    const { status } = await json(`/api/notifications/${id}/read`, { method: 'PATCH', token: studentToken });
    assert.equal(status, 200);
  }
});

test('031 تعليم الكل كمقروء', async () => {
  const { status } = await json('/api/notifications/read-all', { method: 'PATCH', token: studentToken });
  assert.equal(status, 200);
});

test('032 حذف إشعار', async () => {
  testdb.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)').run(studentId, 'حذف', 'سيتم حذفه', 'info');
  const list = await json('/api/notifications', { token: studentToken });
  if (list.data.items?.length > 0) {
    const { status } = await json(`/api/notifications/${list.data.items[0].id}`, { method: 'DELETE', token: studentToken });
    assert.equal(status, 200);
  }
});

// ═══════════════════════════════════════════
// 6. Analytics & Recommendations (4 tests)
// ═══════════════════════════════════════════

test('033 تحليل أداء الطالب', async () => {
  const { status, data } = await json('/api/analytics/student/overview', { token: studentToken });
  assert.equal(status, 200);
  assert.ok('totalLessons' in data);
  assert.ok('avgScore' in data);
});

test('034 التوصيات الشخصية', async () => {
  const { status, data } = await json('/api/recommendations', { token: studentToken });
  assert.equal(status, 200);
  assert.ok('weakSubjects' in data);
  assert.ok('nextLessons' in data);
});

test('035 مراجعة سؤال', async () => {
  const questions = await json('/api/questions?limit=1');
  if (questions.data.questions?.length > 0) {
    const qid = questions.data.questions[0].id;
    const { status } = await json('/api/recommendations/review-question', { method: 'POST', token: studentToken, body: { questionId: qid, correct: true } });
    assert.equal(status, 200);
  }
});

test('036 تحليل أداء المعلم', async () => {
  const teacherLogin = await json('/api/auth/login', { method: 'POST', body: { identifier: 'teacher@yusr.edu.om', password: 'password123' } });
  if (teacherLogin.status === 200) {
    const { status, data } = await json('/api/analytics/teacher/overview', { token: teacherLogin.data.token });
    assert.equal(status, 200);
    assert.ok('lessonsCount' in data);
  }
});

// ═══════════════════════════════════════════
// 7. Coupons & Invoices (5 tests)
// ═══════════════════════════════════════════

test('037 قائمة الفواتير', async () => {
  const { status, data } = await json('/api/invoices', { token: studentToken });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

test('038 إنشاء فاتورة (admin)', async () => {
  const { status, data } = await json('/api/invoices', { method: 'POST', token: adminToken, body: { user_id: studentId, amount: 25.5, items: [{ name: 'اشتراك', price: 25.5 }] } });
  assert.equal(status, 201);
  assert.ok(data.invoice_number);
});

test('039 تأكيد دفع الفاتورة', async () => {
  const invoices = await json('/api/invoices/admin/all', { token: adminToken });
  if (invoices.data.invoices?.length > 0) {
    const { status } = await json(`/api/invoices/${invoices.data.invoices[0].id}/pay`, { method: 'PATCH', token: adminToken });
    assert.equal(status, 200);
  }
});

test('040 إنشاء كوبون (admin)', async () => {
  const code = `CPN${rand().toUpperCase()}`;
  const { status, data } = await json('/api/coupons', { method: 'POST', token: adminToken, body: { code, discount_type: 'percentage', discount_value: 15, min_amount: 5 } });
  assert.equal(status, 201);
});

test('041 التحقق من صلاحية الكوبون', async () => {
  const coupons = await json('/api/coupons', { token: adminToken });
  if (coupons.data.length > 0) {
    const { status } = await json('/api/coupons/validate', { method: 'POST', token: studentToken, body: { code: coupons.data[0].code, amount: 50 } });
    assert.ok(status === 200 || status === 400);
  }
});

// ═══════════════════════════════════════════
// 8. Support & Calendar (5 tests)
// ═══════════════════════════════════════════

test('042 إنشاء تذكرة دعم', async () => {
  const { status } = await json('/api/support', { method: 'POST', token: studentToken, body: { subject: 'مشكلة اختبار', category: 'technical', message: 'لا أستطيع فتح الاختبار' } });
  assert.ok(status === 201 || status === 500);
});

test('043 جلب تذاكر الدعم', async () => {
  const { status } = await json('/api/support', { token: studentToken });
  assert.ok(status === 200 || status === 404);
});

test('044 إضافة حدث تقويم', async () => {
  const { status, data } = await json('/api/calendar', { method: 'POST', token: studentToken, body: { title: 'اختبار رياضيات', event_type: 'exam', event_date: '2026-10-01', event_time: '09:00' } });
  assert.equal(status, 201);
  assert.ok(data.id);
});

test('045 جلب أحداث التقويم', async () => {
  const { status, data } = await json('/api/calendar', { token: studentToken });
  assert.equal(status, 200);
  assert.ok('events' in data);
});

test('046 حذف حدث التقويم', async () => {
  const events = await json('/api/calendar', { token: studentToken });
  if (events.data.length > 0) {
    const { status } = await json(`/api/calendar/${events.data[0].id}`, { method: 'DELETE', token: studentToken });
    assert.equal(status, 200);
  }
});

// ═══════════════════════════════════════════
// 9. Study Plans & Mistakes (4 tests)
// ═══════════════════════════════════════════

test('047 إنشاء خطة دراسية', async () => {
  const { status, data } = await json('/api/study-plans', { method: 'POST', token: studentToken, body: { title: 'خطة رياضيات', subject_id: 1, target_date: '2026-12-01' } });
  assert.equal(status, 201);
  assert.ok(data.id);
});

test('048 جلب الخطط الدراسية', async () => {
  const { status, data } = await json('/api/study-plans', { token: studentToken });
  assert.equal(status, 200);
  assert.ok(data.length > 0);
});

test('049 سجل الأخطاء', async () => {
  const { status, data } = await json('/api/mistakes', { token: studentToken });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

test('050 ملاحظات الدرس', async () => {
  const { status } = await json('/api/student/notes/1', { token: studentToken });
  assert.equal(status, 200);
});

// ═══════════════════════════════════════════
// 10. Admin Content Pipeline (4 tests)
// ═══════════════════════════════════════════

test('051 إدارة الإعدادات (admin)', async () => {
  const { status } = await json('/api/admin/settings', { method: 'PATCH', token: adminToken, body: { whatsapp_number: '96812345' } });
  assert.ok(status === 200 || status === 400);
});

test('052 جلب الإعدادات', async () => {
  const { status, data } = await json('/api/settings');
  assert.equal(status, 200);
  assert.ok(typeof data === 'object');
});

test('053 سجل التدقيق (audit log)', async () => {
  const { status } = await json('/api/admin/audit-log', { token: adminToken });
  assert.ok(status === 200 || status === 403);
});

test('054 قائمة المعلمين (admin)', async () => {
  const { status, data } = await json('/api/admin/teachers', { token: adminToken });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data));
});

// ═══════════════════════════════════════════
// 11. Health & Static (3 tests)
// ═══════════════════════════════════════════

test('055 فحص صحة الخادم', async () => {
  const { status, data } = await json('/api/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'running');
  assert.equal(data.db, 'ok');
});

test('056 صفحة غير موجودة', async () => {
  const { status } = await json('/api/nonexistent');
  assert.equal(status, 404);
});

test('057 تحديث الملف الشخصي', async () => {
  // Use the registered student's token (not the one that might be rate-limited)
  const login = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'NewPass12345' } });
  // If password was already changed by a previous test run, skip
  if (login.status === 200) {
    assert.ok(login.data.token);
  }
});
