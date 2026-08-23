// ===== اختبارات آلية لوظائف المنصة الأساسية (node:test + دون اعتماد على خادم خارجي) =====
// التشغيل:  node --test tests/
// ملاحظة: الاختبارات تعمل على نسخة مؤقتة من قاعدة البيانات (yusr.test.db) ولا تمس بيانات التطوير.

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

// الإجابة الصحيحة تُقرأ من قاعدة الاختبار (وليس من الـ API العام الذي لا يكشفها)
function correctAnswer(questionId) {
  const row = testdb.prepare('SELECT question_type, correct_index, options FROM questions WHERE id = ?').get(questionId);
  const opts = JSON.parse(row.options);
  if (String(row.question_type) === 'multi') return JSON.parse(row.correct_index);
  return row.correct_index;
}

before(async () => {
  // نسخة معزولة من قاعدة البيانات + إعادة زرع البيانات التجريبية فيها
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try { fs.copyFileSync(path.join(DATA_DIR, 'yusr.db'), TEST_DB); } catch { /* جديدة */ }
  process.env.DB_PATH = TEST_DB;
  await import('../seed.js');
  testdb = (await import('../db.js')).default;
  const { default: app } = await import('../server.js');
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(() => {
  server?.close();
  try { fs.rmSync(TEST_DB, { force: true }); } catch {}
});

async function json(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const rand = () => Math.random().toString(36).slice(2, 10);
const randPhone = () => `9${String(Math.floor(Math.random() * 10000000) + 1000000)}`;
let studentToken;
let studentId;

async function registerUser({ name, phone, email, password = 'Pass12345', grade = 12 }) {
  const otpRes = await json('/api/auth/send-otp', { method: 'POST', body: { phone } });
  assert.equal(otpRes.status, 200);
  return json('/api/auth/register', {
    method: 'POST',
    body: { name, phone, email, password, grade, otp: otpRes.data.dev_code },
  });
}

test('001 تسجيل طالب جديد', async () => {
  const { status, data } = await registerUser({ name: 'طالب اختبار', phone: randPhone(), email: `t_${rand()}@test.com`, grade: 12 });
  assert.equal(status, 201);
  assert.ok(data.token);
  studentToken = data.token;
  studentId = data.user.id;
});

test('002 رفض تسجيل بنفس البريد', async () => {
  // إنشاء حسابين متطابقين البريد
  const email = `dup_${rand()}@test.com`;
  const phone1 = randPhone();
  const first = { name: 'أ', phone: phone1, email, password: 'Pass12345' };
  const { status: s1 } = await registerUser(first);
  assert.equal(s1, 201);
  const { status: s2 } = await registerUser({ ...first, phone: randPhone() });
  assert.equal(s2, 409, 'البريد المكرر مرفوض من الخادم');
});

test('003 دخول صحيح وخاطئ', async () => {
  const { status: ok } = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'password123' } });
  assert.equal(ok, 200);
  const bad = await json('/api/auth/login', { method: 'POST', body: { identifier: 'student@yusr.edu.om', password: 'wrong-password' } });
  assert.equal(bad.status, 401);
});

test('004 حماية المسارات: بدون توكن 401 وبطالب على Admin 403', async () => {
  const noToken = await json('/api/subscription/me');
  assert.equal(noToken.status, 401);
  const asStudent = await json('/api/admin/stats', { token: studentToken });
  assert.equal(asStudent.status, 403);
});

async function subscribeTo(subjectId, token) {
  const res = await json('/api/subscription/subscribe', { method: 'POST', token, body: { plan: 'single', subject_ids: [subjectId] } });
  assert.equal(res.status, 200, res.data.error);
  subscribed.add(Number(subjectId));
}

let subscribed = new Set();

test('005 بنك الأسئلة: تصفية بالدرس وتصحيح أنواع متعددة', async () => {
  const list = await json('/api/questions');
  assert.equal(list.status, 200);
  assert.ok(list.data.questions.length > 0);

  const lessonFiltered = await json('/api/questions?lesson_id=1');
  assert.equal(lessonFiltered.status, 200);

  // أسئلة من مادة واحدة فقط (التصحيح يتجاهل أسئلة غير مادتها)
  const subjectId = list.data.questions[0].subject_id;
  const sameSubject = await json(`/api/questions?subject_id=${subjectId}&limit=3`);
  assert.ok(sameSubject.data.questions.length > 0);
  await subscribeTo(subjectId, studentToken);
  const qs = sameSubject.data.questions;
  const answers = qs.map((q) => ({ id: q.id, answer: correctAnswer(q.id) }));
  const { status, data } = await json('/api/questions/verify', { method: 'POST', token: studentToken, body: { answers } });
  assert.equal(status, 200);
  assert.equal(data.score, qs.length, 'يجب أن تكون كل الإجابات صحيحة');
});

test('006 تقديم الاختبار: النقاط تُمنح للمحاولة الأولى فقط', async () => {
  const exams = await json('/api/exams');
  assert.ok(exams.data.length > 0);
  const examId = exams.data[0].id;
  await subscribeTo(exams.data[0].subject_id, studentToken);
  const exam = await json(`/api/exams/${examId}`, { token: studentToken });
  assert.equal(exam.status, 200);

  const answers = exam.data.questions.map((q) => ({ id: q.id, answer: correctAnswer(q.id) }));
  const first = await json(`/api/exams/${examId}/submit`, { method: 'POST', token: studentToken, body: { answers } });
  assert.equal(first.status, 200);
  assert.equal(first.data.score, 100, 'تصحيح كامل من الخادم (نسبة مئوية)');
  assert.equal(first.data.correct, first.data.total);
  assert.ok(first.data.points > 0, 'نقاط المحاولة الأولى');

  const second = await json(`/api/exams/${examId}/submit`, { method: 'POST', token: studentToken, body: { answers } });
  assert.equal(second.status, 403, 'رفض المحاولة الثانية عند استنفاد المحاولات');
  assert.ok(second.data.error.includes('المحاولات'), 'رسالة خطأ واضحة');
});

test('007 تقدم الدرس: نقطة واحدة عند الإكمال الأول', async () => {
  const before1 = await json('/api/subscription/me', { token: studentToken });
  const res = await json('/api/progress/1', { method: 'POST', token: studentToken, body: { percent: 100, completed: true } });
  assert.equal(res.status, 200);
  assert.equal(res.data.points, 10);
  const again = await json('/api/progress/1', { method: 'POST', token: studentToken, body: { percent: 100, completed: true } });
  assert.equal(again.data.points, 0);
  const after1 = await json('/api/subscription/me', { token: studentToken });
  assert.equal(after1.data.points, before1.data.points + 10);
});

test('008 اشتراك: دفعة عبر مزود الدفع وإتاحة المحتوى', async () => {
  const subjects = await json('/api/subjects');
  // مادة لم يُشترك بها هذا الطالب بعد
  const freeSubject = subjects.data.find((s) => !subscribed.has(Number(s.id)));
  assert.ok(freeSubject, 'توجد مادة غير مشترك بها');
  const sid = freeSubject.id;

  // طالب غير مشترك لا يصل لمحتوى مادة
  const locked = await json(`/api/lessons?subject_id=${sid}`, { token: studentToken });
  assert.ok(locked.data.every((l) => l.locked === true), 'محتوى غير المشترك مقفل من الخادم');

  const sub = await json('/api/subscription/subscribe', { method: 'POST', token: studentToken, body: { plan: 'single', subject_ids: [sid] } });
  assert.equal(sub.status, 200, sub.data.error);
  subscribed.add(Number(sid));

  const me = await json('/api/subscription/me', { token: studentToken });
  assert.ok(me.data.subscribed_subjects.includes(sid));

  const open = await json(`/api/lessons?subject_id=${sid}`, { token: studentToken });
  const unlocked = open.data.find((l) => l.locked === false);
  assert.ok(unlocked, 'المحتوى متاح بعد الاشتراك');
});

test('009 مسار الإدارة: إضافة مادة ثم حذف محمي للمواد المستخدمة', async () => {
  const adminLogin = await json('/api/auth/login', { method: 'POST', body: { identifier: 'admin@yusr.edu.om', password: 'password123' } });
  assert.equal(adminLogin.status, 200);
  const token = adminLogin.data.token;

  const added = await json('/api/admin/subjects', { method: 'POST', token, body: { name: 'مادة اختبار', icon: '🧪', color: '#123456', slug: 'test-subject', grade_from: 9, grade_to: 12 } });
  assert.equal(added.status, 201, added.data.error);
  const newId = added.data.id;

  const del = await json(`/api/admin/subjects/${newId}`, { method: 'DELETE', token });
  assert.equal(del.status, 200, del.data.error);

  // المواد المستخدمة في محتوى حقيقي لا تُحذف (حماية)
  const used = await json('/api/admin/subjects', { token });
  const usedId = used.data.find((s) => s.slug === 'math').id;
  const guard = await json(`/api/admin/subjects/${usedId}`, { method: 'DELETE', token });
  assert.equal(guard.status, 400);
});

test('010 إحصاءات عامة حية', async () => {
  const { status, data } = await json('/api/stats');
  assert.equal(status, 200);
  assert.ok(data.grades >= 4);
  assert.ok(data.subjects >= 7);
  assert.ok(data.questions > 0);
});