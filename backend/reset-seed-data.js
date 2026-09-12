// ═══════════════════════════════════════════════════════════
// ⚠️ تحذير حرج: سكربت مسح بيانات الجداول
// هذا السكربت يمسح بيانات جداول محددة بالكامل (ليس التجريبي فقط)
// لا تستخدمه إذا كان هناك طلاب حقيقيون يستخدمون المنصة
// الاستخدام: node reset-seed-data.js
// ═══════════════════════════════════════════════════════════
//
// ⛔ الجداول الممسوحة:
//   exam_results, lesson_progress, favorites, points_log,
//   chat_history, questions, exams, resources, lessons
//
// ⛔ هذه الجداول تُستخدم أيضًا من الطلاب الحقيقيين
//   لا تشغل هذا السكربت إلا إذا كنت متأكداً:
//   1. لا يوجد طلاب حقيقيون بالمنصة
//   2. أنت في بيئة تطوير/اختبار فقط
//
// ═══════════════════════════════════════════════════════════

import db from './db.js';
import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askConfirmation() {
  return new Promise((resolve) => {
    rl.question('⚠️  هل أنت متأكد من حذف البيانات؟ اكتب YES للتأكيد: ', (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

async function resetSeedData() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⚠️  تحذير: هذا السكربت يمسح بيانات بالكامل');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('الجداول الممسوحة:');
  console.log('  - exam_results (نتائج اختبارات)');
  console.log('  - lesson_progress (تقدم الطلاب)');
  console.log('  - favorites (المفضلة)');
  console.log('  - points_log (سجل النقاط)');
  console.log('  - chat_history (المحادثات)');
  console.log('  - questions (الأسئلة)');
  console.log('  - exams (الاختبارات)');
  console.log('  - resources (الموارد)');
  console.log('  - lessons (الدروس)');
  console.log('');
  console.log('⛔ هذا يشمل بيانات طلاب حقيقيين إذا كانوا موجودين');
  console.log('');

  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('❌ تم الإلغاء — لم يتم حذف أي بيانات');
    process.exit(0);
  }

  console.log('');
  console.log('🗑️  جاري مسح البيانات...');

  const tables = [
    'exam_results',
    'lesson_progress',
    'favorites',
    'points_log',
    'chat_history',
    'questions',
    'exams',
    'resources',
    'lessons',
  ];

  let totalDeleted = 0;

  for (const table of tables) {
    try {
      const result = db.prepare(`DELETE FROM ${table}`).run();
      if (result.changes > 0) {
        console.log(`  ✅ ${table}: ${result.changes} سجل تم حذفه`);
        totalDeleted += result.changes;
      }
    } catch (err) {
      console.log(`  ⚠️  ${table}: تم تخطيه (${err.message})`);
    }
  }

  console.log('');
  console.log(`✅ تم مسح ${totalDeleted} سجل`);
  console.log('ℹ️  يمكنك الآن تشغيل: node seed.js لإعادة تعبئة البيانات التجريبية');

  db.close();
  process.exit(0);
}

resetSeedData();
