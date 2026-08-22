import db from './db.js';
import bcrypt from 'bcryptjs';

db.exec(`
  DELETE FROM exam_results; DELETE FROM chat_history; DELETE FROM lesson_progress;
  DELETE FROM favorites; DELETE FROM points_log; DELETE FROM user_subjects;
  DELETE FROM notifications; DELETE FROM lessons; DELETE FROM questions; DELETE FROM exams;
  DELETE FROM resources; DELETE FROM live_sessions; DELETE FROM groups;
  DELETE FROM referrals; DELETE FROM users; DELETE FROM teacher_applications; DELETE FROM contact_messages;
  DELETE FROM units; DELETE FROM subjects; DELETE FROM grades;
  DELETE FROM plans; DELETE FROM offers; DELETE FROM variants;
`);
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('exam_results','chat_history','lesson_progress','favorites','points_log','user_subjects','notifications','lessons','questions','exams','resources','live_sessions','groups','referrals','users','teacher_applications','contact_messages','units','subjects','plans','offers','variants');");

// ---------- الصفوف (٨ - ١٢) ----------
const grades = [
  { id: 8,  name: 'الصف الثامن',    tagline: 'تأسيس قوي في المواد الأساسية',            description: 'محتوى تعليمي واختبارات ومراجعات لبناء أساس قوي قبل الثانوية.', color: '#06b6d4' },
  { id: 9,  name: 'الصف التاسع',    tagline: 'محتوى تعليمي واختبارات ومراجعات',        description: 'تأسيس قوي في المواد الأساسية مع تدريب مستمر على الاختبارات.', color: '#f59e0b' },
  { id: 10, name: 'الصف العاشر',    tagline: 'شرح ومراجعة وتدريب',                     description: 'انطلاقة الثانوية بشرح مبسّط ومراجعات واختبارات تفاعلية.', color: '#3b82f6' },
  { id: 11, name: 'الصف الحادي عشر', tagline: 'محتوى متخصص ومراجعات واختبارات',          description: 'تخصص علمي وأدبي بمحتوى متكامل ومراجعات دقيقة.', color: '#ef4444' },
  { id: 12, name: 'الصف الثاني عشر', tagline: 'مراجعات مكثفة واستعداد للاختبارات',       description: 'مكثفة مكثفة واستعداد كامل للاختبارات النهائية والقبول الجامعي.', color: '#0f172a' },
];

const gStmt = db.prepare('INSERT INTO grades (id, name, tagline, description, color) VALUES (?, ?, ?, ?, ?)');
for (const g of grades) gStmt.run(g.id, g.name, g.tagline, g.description, g.color);

// ---------- أنواع المواد (Subject Variants) ----------
const variants = [
  { name: 'عامة',    description: 'المادة الأساسية لجميع الطلاب في هذا الصف' },
  { name: 'متقدمة',  description: 'مستوى متقدم — مسار العلوم والرياضيات' },
  { name: 'أساسية',  description: 'مستوى أساسي — المسار الأدبي والتطبيقي' },
];
const vStmt = db.prepare('INSERT INTO variants (name, description) VALUES (?, ?)');
const variantIds = {};
for (const v of variants) {
  vStmt.run(v.name, v.description);
  variantIds[v.name] = db.prepare('SELECT id FROM variants WHERE name = ?').get(v.name).id;
}

// ---------- المواد (نطاق صفوف لكل مادة) ----------
// ٨-١٠: الرياضيات، الفيزياء، الكيمياء، الأحياء، العربية، الإنجليزية (6 مواد)
// ١١-١٢: الرياضيات (متقدمة/أساسية)، الفيزياء، الكيمياء، الأحياء، العلوم البيئية، العربية، الإنجليزية
const subjects = [
  { name: 'الرياضيات',          icon: '📘', color: '#3b82f6', slug: 'math',           variant: 'عامة',   from: 8, to: 10 },
  { name: 'الرياضيات',          icon: '🧮', color: '#1d4ed8', slug: 'math_advanced',  variant: 'متقدمة', from: 11, to: 12 },
  { name: 'الرياضيات',          icon: '🔢', color: '#60a5fa', slug: 'math_basic',     variant: 'أساسية', from: 11, to: 12 },
  { name: 'الفيزياء',          icon: '📗', color: '#ef4444', slug: 'physics',        variant: 'عامة',   from: 8, to: 12 },
  { name: 'الكيمياء',          icon: '📙', color: '#a855f7', slug: 'chemistry',      variant: 'عامة',   from: 8, to: 12 },
  { name: 'الأحياء',           icon: '📕', color: '#ec4899', slug: 'biology',        variant: 'عامة',   from: 8, to: 12 },
  { name: 'العلوم البيئية',    icon: '🌱', color: '#10b981', slug: 'env_science',    variant: 'عامة',   from: 11, to: 12 },
  { name: 'اللغة الإنجليزية',  icon: '📒', color: '#f59e0b', slug: 'english',        variant: 'عامة',   from: 8, to: 12 },
  { name: 'اللغة العربية',     icon: '📔', color: '#8b5cf6', slug: 'arabic',         variant: 'عامة',   from: 8, to: 12 },
];

const subjStmt = db.prepare('INSERT INTO subjects (name, icon, color, slug, grade_from, grade_to, variant_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
const subjectIds = {};
for (const s of subjects) {
  subjStmt.run(s.name, s.icon, s.color, s.slug, s.from, s.to, variantIds[s.variant]);
  subjectIds[s.slug] = db.prepare('SELECT id FROM subjects WHERE slug = ?').get(s.slug).id;
}

// ---------- الوحدات (٣ وحدات لكل مادة × كل صف داخل نطاق المادة) ----------
const unitStmt = db.prepare('INSERT INTO units (subject_id, grade_id, name) VALUES (?, ?, ?)');
const unitIds = {}; // key: `${subjectSlug}:${grade}:${unitIndex}`
for (const s of subjects) {
  for (const g of grades) {
    if (g.id < s.from || g.id > s.to) continue;
    for (let u = 1; u <= 3; u++) {
      unitStmt.run(subjectIds[s.slug], g.id, `الوحدة ${['الأولى', 'الثانية', 'الثالثة'][u - 1]}`);
      unitIds[`${s.slug}:${g.id}:${u - 1}`] = db.prepare('SELECT last_insert_rowid() id').get().id;
    }
  }
}

// ---------- المعلمون ----------
const teachers = {
  math: 'أ. محمد البلوشي', math_advanced: 'أ. محمد البلوشي', math_basic: 'أ. ناصر العبري',
  physics: 'أ. سالم الحارثي', chemistry: 'أ. عائشة الكندية',
  biology: 'أ. خالد المغيري', env_science: 'أ. ريم الشيبانية',
  english: 'أ. حنان الرواحية', arabic: 'أ. فاطمة الزدجالية',
};

// ---------- الحصص المسجلة ----------
const lessons = [
  // رياضيات (٨ - ١٠)
  { sub: 'math', grade: 8, unit: 0, title: 'الأعداد النسبية والعمليات عليها', desc: 'تمثيل الأعداد النسبية وجمعها وطرحها وضربها وقسمتها.', dur: 30, level: 'مبتدئ', views: 5200 },
  { sub: 'math', grade: 8, unit: 1, title: 'المساحات والحجوم', desc: 'حساب مساحات الأشكال المستوية وحجوم المجسمات الهندسية.', dur: 34, level: 'متوسط', views: 4400 },
  { sub: 'math', grade: 8, unit: 2, title: 'الاحتمالات البسيطة', desc: 'مفهوم الاحتمال والأحداث والحساب في المسائل البسيطة.', dur: 26, level: 'مبتدئ', views: 3100 },
  { sub: 'math', grade: 9, unit: 0, title: 'المتغيرات والعبارات الجبرية', desc: 'تعريف المتغيرات وتكوين العبارات الجبرية وحساب قيمها مع أمثلة من الحياة.', dur: 28, level: 'مبتدئ', views: 9800 },
  { sub: 'math', grade: 9, unit: 1, title: 'حل المعادلات من الدرجة الأولى', desc: 'حل المعادلات الخطية بمجهول واحد وتطبيقاتها في المسائل الحياتية.', dur: 32, level: 'متوسط', views: 8600 },
  { sub: 'math', grade: 9, unit: 2, title: 'النسبة والتناسب', desc: 'مفاهيم النسبة والتناسب والمعدلات واستخداماتها في القياس والتجارة.', dur: 30, level: 'متوسط', views: 7400 },
  { sub: 'math', grade: 10, unit: 0, title: 'المعادلات التربيعية — التحليل والإتمام', desc: 'حل المعادلات التربيعية بطرق التحليل والمميز وإكمال المربع.', dur: 42, level: 'متقدم', views: 9100 },
  { sub: 'math', grade: 10, unit: 1, title: 'الدوال والتمثيل البياني', desc: 'مفهوم الدالة وتمثيلها بيانياً وقراءة التمثيلات البيانية.', dur: 36, level: 'متوسط', views: 6300 },
  { sub: 'math', grade: 10, unit: 2, title: 'الهندسة والتحويلات الهندسية', desc: 'الانعكاس والإزاحة والدوران والتماثل في الأشكال.', dur: 33, level: 'متوسط', views: 4100 },
  // رياضيات متقدمة (١١ - ١٢)
  { sub: 'math_advanced', grade: 11, unit: 0, title: 'الاشتقاق: النهايات وقواعد الاشتقاق', desc: 'مفهوم النهاية واشتقاق الدوال الأساسية وقواعد الاشتقاق.', dur: 42, level: 'متقدم', views: 12000 },
  { sub: 'math_advanced', grade: 11, unit: 1, title: 'تطبيقات الاشتقاق في المسائل', desc: 'إيجاد القيم القصوى ومعدلات التغير ومسائل الهندسة.', dur: 40, level: 'متقدم', views: 7800 },
  { sub: 'math_advanced', grade: 12, unit: 0, title: 'التكامل وتطبيقاته', desc: 'التكامل غير المحدد والمحدد وحساب المساحات والحجوم.', dur: 48, level: 'متقدم', views: 6900 },
  { sub: 'math_advanced', grade: 12, unit: 1, title: 'الاحتمالات والتوزيعات', desc: 'قوانين الاحتمالات والتوزيعات والتحليل التوافقي.', dur: 38, level: 'متقدم', views: 5100 },
  // رياضيات أساسية (١١ - ١٢)
  { sub: 'math_basic', grade: 11, unit: 0, title: 'المراجعة والمعادلات الحياتية', desc: 'تطبيقات المعادلات والنسبة والتناسب في مواقف الحياة اليومية.', dur: 30, level: 'متوسط', views: 4600 },
  { sub: 'math_basic', grade: 11, unit: 1, title: 'الإحصاء والرسوم البيانية', desc: 'قراءة البيانات وتمثيلها بالجداول والأعمدة والدوائر.', dur: 28, level: 'متوسط', views: 3700 },
  { sub: 'math_basic', grade: 12, unit: 0, title: 'المعاملات المالية والحساب', desc: 'الفوائد والخصومات والميزانيات والتطبيقات التجارية.', dur: 34, level: 'متوسط', views: 5200 },
  { sub: 'math_basic', grade: 12, unit: 1, title: 'القياس والهندسة التطبيقية', desc: 'تطبيقات المساحة والحجم في الأعمال والمهن.', dur: 30, level: 'متوسط', views: 3300 },
  // فيزياء
  { sub: 'physics', grade: 8, unit: 0, title: 'مقدمة في الفيزياء والقياس', desc: 'الكميات الفيزيائية وأدوات القياس والوحدات.', dur: 26, level: 'مبتدئ', views: 3800 },
  { sub: 'physics', grade: 8, unit: 1, title: 'السرعة والتسارع', desc: 'مفهوم الحركة والسرعة المتجهة والتسارع.', dur: 30, level: 'متوسط', views: 3300 },
  { sub: 'physics', grade: 9, unit: 0, title: 'الحركة والقوى', desc: 'الكميات الفيزيائية والحركة المنتظمة والقوى وأنواعها.', dur: 34, level: 'متوسط', views: 7200 },
  { sub: 'physics', grade: 9, unit: 1, title: 'الطاقة وتحولاتها', desc: 'أشكال الطاقة وتحولاتها وقانون حفظ الطاقة.', dur: 30, level: 'متوسط', views: 5800 },
  { sub: 'physics', grade: 10, unit: 0, title: 'الضغط وموائع السكون', desc: 'مفهوم الضغط والضغط الجوي ومبدأ باسكال وأرخميدس.', dur: 36, level: 'متوسط', views: 6100 },
  { sub: 'physics', grade: 10, unit: 1, title: 'الشغل والقدرة والطاقة الميكانيكية', desc: 'حساب الشغل والقدرة والطاقة الحركية والوضعية.', dur: 33, level: 'متوسط', views: 5400 },
  { sub: 'physics', grade: 11, unit: 0, title: 'قوانين نيوتن للحركة', desc: 'القوانين الثلاثة لنيوتن وتطبيقاتها على حركة الأجسام.', dur: 42, level: 'متقدم', views: 11000 },
  { sub: 'physics', grade: 11, unit: 1, title: 'الحركة الدائرية والجذب المركزي', desc: 'حركة الأجسام في مسار دائري والقوة المركزية.', dur: 36, level: 'متقدم', views: 4700 },
  { sub: 'physics', grade: 12, unit: 0, title: 'الكهرباء الساكنة والشحنة', desc: 'الشحنة الكهربائية وقانون كولوم والمجال الكهربائي.', dur: 40, level: 'متقدم', views: 5600 },
  { sub: 'physics', grade: 12, unit: 1, title: 'التيار الكهربائي والدوائر', desc: 'قانون أوم والدوائر الكهربائية وحساب المقاومات.', dur: 38, level: 'متقدم', views: 6200 },
  // كيمياء
  { sub: 'chemistry', grade: 8, unit: 0, title: 'المادة وقياسها', desc: 'حالات المادة وخصائصها وكيفية قياس الكتلة والحجم.', dur: 28, level: 'مبتدئ', views: 3200 },
  { sub: 'chemistry', grade: 9, unit: 0, title: 'المادة وخواصها', desc: 'الخواص الفيزيائية والكيميائية للمادة وحالاتها.', dur: 28, level: 'مبتدئ', views: 4900 },
  { sub: 'chemistry', grade: 10, unit: 0, title: 'الذرة والجدول الدوري', desc: 'بنية الذرة وتوزيع الإلكترونات والجدول الدوري.', dur: 38, level: 'متوسط', views: 6700 },
  { sub: 'chemistry', grade: 10, unit: 1, title: 'الترابط الكيميائي', desc: 'الرابطة الأيونية والتساهمية وخصائص المركبات.', dur: 35, level: 'متوسط', views: 5300 },
  { sub: 'chemistry', grade: 11, unit: 0, title: 'التركيب الذري والجدول الدوري', desc: 'خواص العناصر وتصنيفها في الجدول الدوري.', dur: 40, level: 'متقدم', views: 8700 },
  { sub: 'chemistry', grade: 11, unit: 1, title: 'الغازات وقانون الغاز المثالي', desc: 'قوانين الغازات والعلاقات بين الضغط والحجم ودرجة الحرارة.', dur: 36, level: 'متقدم', views: 4600 },
  { sub: 'chemistry', grade: 12, unit: 0, title: 'التفاعلات الكيميائية واتزانها', desc: 'أنواع التفاعلات والمعادلات وموازنة التفاعلات.', dur: 44, level: 'متقدم', views: 5900 },
  { sub: 'chemistry', grade: 12, unit: 1, title: 'السرعة الكيميائية والعوامل المؤثرة', desc: 'سرعة التفاعل والعوامل المؤثرة ونظرية التصادم.', dur: 40, level: 'متقدم', views: 4300 },
  // أحياء
  { sub: 'biology', grade: 8, unit: 0, title: 'العلم والكائنات الحية', desc: 'أهمية علم الأحياء وخصائص الكائنات الحية.', dur: 24, level: 'مبتدئ', views: 2900 },
  { sub: 'biology', grade: 9, unit: 0, title: 'مقدمة في علم الأحياء', desc: 'أدوات عالم الأحياء ومستويات التنظيم في الكائنات الحية.', dur: 26, level: 'مبتدئ', views: 4100 },
  { sub: 'biology', grade: 10, unit: 0, title: 'الخلية ووظائفها الحيوية', desc: 'تركيب الخلية وعضياتها والعمليات الحيوية.', dur: 38, level: 'متوسط', views: 8200 },
  { sub: 'biology', grade: 10, unit: 1, title: 'التركيب الضوئي والتنفس الخلوي', desc: 'تفاعلات البناء الضوئي والتنفس الخلوي في النبات.', dur: 36, level: 'متوسط', views: 5900 },
  { sub: 'biology', grade: 11, unit: 0, title: 'الجهاز العصبي', desc: 'تركيب الجهاز العصبي ووظيفته ونقل السيال العصبي.', dur: 38, level: 'متقدم', views: 5100 },
  { sub: 'biology', grade: 12, unit: 0, title: 'الوراثة وقوانين مندل', desc: 'الأنماط الوراثية وقوانين مندل وتطبيقاتها.', dur: 46, level: 'متقدم', views: 7800 },
  { sub: 'biology', grade: 12, unit: 1, title: 'التنوع الحيوي وتصنيف الكائنات', desc: 'مستويات التصنيف والتنوع الحيوي وأهمية الحفاظ عليه.', dur: 34, level: 'متقدم', views: 3900 },
  // علوم بيئية (١١ - ١٢)
  { sub: 'env_science', grade: 11, unit: 0, title: 'النظم البيئية والموارد الطبيعية', desc: 'مكونات النظام البيئي والموارد وتوازنها.', dur: 32, level: 'متوسط', views: 3400 },
  { sub: 'env_science', grade: 11, unit: 1, title: 'التلوث وتأثيراته', desc: 'أنواع التلوث ومصادره وتأثيراته على البيئة والإنسان.', dur: 34, level: 'متوسط', views: 2900 },
  { sub: 'env_science', grade: 12, unit: 0, title: 'الطاقة المتجددة والاستدامة', desc: 'مصادر الطاقة المتجددة ومفهوم الاستدامة البيئية.', dur: 36, level: 'متقدم', views: 5600 },
  { sub: 'env_science', grade: 12, unit: 1, title: 'التغير المناخي والحماية البيئية', desc: 'أسباب التغير المناخي والسياسات والممارسات الوقائية.', dur: 34, level: 'متقدم', views: 4100 },
  // إنجليزي
  { sub: 'english', grade: 8, unit: 0, title: 'Basics: Be, Have, Vocabulary', desc: 'أساسيات الفعلين Be و Have والمفردات الشائعة.', dur: 28, level: 'مبتدئ', views: 3100 },
  { sub: 'english', grade: 9, unit: 0, title: 'Tenses: Present & Past', desc: 'الأزمنة البسيطة والمستمرة واستخداماتها.', dur: 30, level: 'متوسط', views: 5200 },
  { sub: 'english', grade: 10, unit: 0, title: 'Passive Voice & Modals', desc: 'المبني للمجهول والأفعال الناقصة وقواعد الاستخدام.', dur: 34, level: 'متوسط', views: 4700 },
  { sub: 'english', grade: 11, unit: 0, title: 'Present Perfect Mastery', desc: 'إتقان المضارع التام والفرق بينه وبين الماضي البسيط.', dur: 36, level: 'متقدم', views: 9600 },
  { sub: 'english', grade: 12, unit: 0, title: 'Reported Speech & Conditionals', desc: 'الكلام المنقول والجمل الشرطية بأنواعها.', dur: 38, level: 'متقدم', views: 4400 },
  // عربية
  { sub: 'arabic', grade: 8, unit: 0, title: 'أقسام الكلام والجملة', desc: 'الاسم والفعل والحرف وأنواع الجملة.', dur: 28, level: 'مبتدئ', views: 3400 },
  { sub: 'arabic', grade: 9, unit: 0, title: 'الجملة الفعلية والنحو', desc: 'الفاعل والمفعول به والتمييز بين أنواع الجمل.', dur: 32, level: 'متوسط', views: 4800 },
  { sub: 'arabic', grade: 10, unit: 0, title: 'البلاغة: التشبيه والاستعارة', desc: 'أركان التشبيه وأنواع الاستعارة وأثرها الجمالي.', dur: 34, level: 'متوسط', views: 5600 },
  { sub: 'arabic', grade: 11, unit: 0, title: 'المعاني: الخبر والإنشاء', desc: 'الجملة الخبرية وأغراضها والإنشاء الطلبي.', dur: 36, level: 'متقدم', views: 4300 },
  { sub: 'arabic', grade: 12, unit: 0, title: 'الإعراب والبناء في النصوص', desc: 'قواعد الإعراب والبناء وتطبيقاتها على نصوص أدبية.', dur: 40, level: 'متقدم', views: 6100 },
];

const lessonStmt = db.prepare(`
  INSERT INTO lessons (grade_id, subject_id, unit_id, title, description, duration, teacher_name, level, views, video_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const lessonIds = {};
for (const l of lessons) {
  const unitId = unitIds[`${l.sub}:${l.grade}:${l.unit}`];
  lessonStmt.run(l.grade, subjectIds[l.sub], unitId, l.title, l.desc, l.dur, teachers[l.sub], l.level, l.views, l.video || null);
  lessonIds[`${l.sub}:${l.grade}:${l.unit}`] = lessonIds[`${l.sub}:${l.grade}:${l.unit}`] || [];
  lessonIds[`${l.sub}:${l.grade}:${l.unit}`].push(db.prepare('SELECT last_insert_rowid() id').get().id);
}

// روابط فيديو تجريبية لبعض الدروس (لاختبار المشغل — تُستبدل لاحقاً بفيديوهات حقيقية)
const videoStmt = db.prepare('UPDATE lessons SET video_url = ? WHERE title = ?');
videoStmt.run('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'المتغيرات والعبارات الجبرية');
videoStmt.run('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'الاشتقاق: النهايات وقواعد الاشتقاق');
videoStmt.run('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'الحركة والقوى');
videoStmt.run('https://www.youtube.com/watch?v=LXb3EKWsInQ', 'Tenses: Present & Past');

// ---------- بنك الأسئلة ----------
const qs = [
  { sub: 'math', grade: 9, unit: 0, lesson: 0, d: 'مبتدئ', q: 'ما قيمة العبارة 3س + 5 عندما س = 4؟', o: ['12', '17', '20', '15'], c: 1, e: '3×4 + 5 = 12 + 5 = 17' },
  { sub: 'math', grade: 9, unit: 1, d: 'متوسط', q: 'حل المعادلة: 2س + 5 = 13', o: ['س = 4', 'س = 5', 'س = 6', 'س = 3'], c: 0, e: '2س = 8، إذن س = 4' },
  { sub: 'math', grade: 9, unit: 2, d: 'متوسط', q: 'إذا كانت 2 : 3 = س : 12، فما قيمة س؟', o: ['6', '8', '9', '18'], c: 1, e: 'س = 2×12÷3 = 8' },
  { sub: 'math', grade: 10, unit: 0, d: 'صعب', q: 'ما حل س² - 5س + 6 = 0؟', o: ['س=1 أو 6', 'س=2 أو 3', 'س=-2 أو -3', 'س=2 أو -3'], c: 1, e: '(س-2)(س-3)=0' },
  { sub: 'math', grade: 10, unit: 0, d: 'صعب', q: 'ما قيمة المميز للمعادلة س² - 4س + 3 = 0؟', o: ['4', '8', '12', '16'], c: 0, e: 'المميز = 16 - 12 = 4' },
  { sub: 'math', grade: 8, unit: 0, d: 'مبتدئ', q: 'ناتج ¾ + ¼ = ؟', o: ['½', '1', '¼', '¾'], c: 1, e: '¾ + ¼ = 4/4 = 1' },
  { sub: 'math', grade: 8, unit: 0, d: 'مبتدئ', q: 'العدد الكسري 5/2 يساوي:', o: ['2.5', '2.2', '1.5', '3.5'], c: 0, e: '5 ÷ 2 = 2.5' },
  { sub: 'math', grade: 8, unit: 1, d: 'متوسط', q: 'مساحة مستطيل طوله 8 سم وعرضه 5 سم:', o: ['13 سم²', '40 سم²', '26 سم²', '80 سم²'], c: 1, e: 'المساحة = 8 × 5 = 40' },
  { sub: 'math', grade: 8, unit: 1, d: 'متوسط', q: 'حجم مكعب طول حرفه 3 سم:', o: ['9 سم³', '18 سم³', '27 سم³', '6 سم³'], c: 2, e: 'الحجم = 3³ = 27' },
  { sub: 'math', grade: 8, unit: 2, d: 'متوسط', q: 'عند رمي عملة معدنية مرة واحدة، احتمال ظهور الكتابة:', o: ['0', '¼', '½', '1'], c: 2, e: 'نتيجتان ممكنتان والكتابة واحدة' },
  { sub: 'math_advanced', grade: 11, unit: 0, d: 'صعب', q: 'ما مشتقة الدالة د(س) = س³؟', o: ['3س²', 'س²', '3س', 'س²/3'], c: 0, e: 'مشتقة سⁿ = ن س^(ن-1)' },
  { sub: 'math_advanced', grade: 11, unit: 0, d: 'صعب', q: 'ما نهاية (س² - 1)/(س - 1) عندما س تقترب من 1؟', o: ['0', '1', '2', 'غير موجودة'], c: 2, e: '(س-1)(س+1)/(س-1) = س+1 = 2' },
  { sub: 'math_advanced', grade: 12, unit: 0, d: 'صعب', q: 'ما قيمة ∫ 2س دس؟', o: ['س² + ج', '2س² + ج', 'س + ج', 'س²/2 + ج'], c: 0, e: 'تكامل 2س = س² + ج' },
  { sub: 'math_basic', grade: 11, unit: 0, d: 'متوسط', q: 'إذا كان سعر السلعة 40 ريالاً وخصم 25%، فالسعر بعد الخصم:', o: ['10 ريال', '30 ريالاً', '35 ريالاً', '20 ريالاً'], c: 1, e: 'الخصم = 10، فيصبح 30' },
  { sub: 'math_basic', grade: 11, unit: 1, d: 'متوسط', q: 'الوسيط للأعداد: 3، 5، 7، 9، 11 هو:', o: ['5', '6', '7', '8'], c: 2, e: 'القيمة الوسطى في الترتيب هي 7' },
  { sub: 'math_basic', grade: 12, unit: 0, d: 'متوسط', q: 'فائدة سنوية 5% على مبلغ 200 ريال لمدة سنة هي:', o: ['5 ريالات', '10 ريالات', '20 ريالاً', '100 ريال'], c: 1, e: 'الفائدة = 200 × 0.05 = 10' },
  { sub: 'physics', grade: 9, unit: 0, d: 'متوسط', q: 'وحدة قياس القوة هي:', o: ['الجول', 'النيوتن', 'الباسكال', 'الواط'], c: 1, e: 'القوة تقاس بالنيوتن' },
  { sub: 'physics', grade: 9, unit: 1, d: 'متوسط', q: 'وحدة قياس الطاقة هي:', o: ['النيوتن', 'الجول', 'الباسكال', 'الأمبير'], c: 1, e: 'الطاقة تقاس بالجول' },
  { sub: 'physics', grade: 10, unit: 0, d: 'متوسط', q: 'الضغط = القوة ÷:', o: ['الكتلة', 'المساحة', 'الحجم', 'السرعة'], c: 1, e: 'الضغط = القوة ÷ المساحة' },
  { sub: 'physics', grade: 11, unit: 0, d: 'صعب', q: 'كتلة 2 كجم وتسارع 3 م/ث²، ما القوة؟', o: ['5 نيوتن', '6 نيوتن', '1.5 نيوتن', '9 نيوتن'], c: 1, e: 'ف = ك × ت = 6 نيوتن' },
  { sub: 'physics', grade: 11, unit: 0, d: 'متوسط', q: 'ينص قانون نيوتن الأول على أن الجسم يبقى على حالته ما لم تؤثر عليه:', o: ['قوة محصلة', 'سرعة', 'تسارع', 'كتلة'], c: 0, e: 'القصور الذاتي' },
  { sub: 'physics', grade: 12, unit: 0, d: 'صعب', q: 'قانون كولوم يصف القوة بين:', o: ['كتلتين', 'شحنتين كهربائيتين', 'جسمين متحركين', 'مغناطيسين'], c: 1, e: 'القوة الكهروستاتيكية بين الشحنات' },
  { sub: 'physics', grade: 12, unit: 1, d: 'صعب', q: 'إذا كان الجهد 12 فولت والمقاومة 4 أوم، فما التيار؟', o: ['8 أمبير', '3 أمبير', '16 أمبير', '48 أمبير'], c: 1, e: 'التيار = 12 ÷ 4 = 3 أمبير' },
  { sub: 'chemistry', grade: 9, unit: 0, d: 'مبتدئ', q: 'أي مما يلي يُعد تغيراً فيزيائياً؟', o: ['صدأ الحديد', 'ذوبان الثلج', 'احتراق الورق', 'نضج الفاكهة'], c: 1, e: 'الذوبان تغير فيزيائي' },
  { sub: 'chemistry', grade: 10, unit: 0, d: 'متوسط', q: 'أي الجسيمات لها شحنة موجبة؟', o: ['الإلكترون', 'النيوترون', 'البروتون', 'الفوتون'], c: 2, e: 'البروتون شحنته موجبة' },
  { sub: 'chemistry', grade: 10, unit: 0, d: 'متوسط', q: 'ذرة متعادلة عدد بروتوناتها 8، عدد إلكتروناتها:', o: ['4', '6', '8', '16'], c: 2, e: 'عدد الإلكترونات = عدد البروتونات' },
  { sub: 'chemistry', grade: 10, unit: 1, d: 'متوسط', q: 'الرابطة التي تنشأ بين فلز ولا فلز هي:', o: ['تساهمية', 'أيونية', 'هيدروجينية', 'فلزية'], c: 1, e: 'الرابطة الأيونية' },
  { sub: 'chemistry', grade: 11, unit: 0, d: 'متوسط', q: 'ترتيب العناصر في الجدول الدوري حسب:', o: ['العدد الذري', 'الكتلة', 'الحجم', 'الكثافة'], c: 0, e: 'الترتيب حسب العدد الذري' },
  { sub: 'chemistry', grade: 12, unit: 0, d: 'صعب', q: 'موازنة: H₂ + O₂ → H₂O هي:', o: ['1،1،2', '2،1،2', '2،2،1', '1،2،2'], c: 1, e: '2H₂ + O₂ → 2H₂O' },
  { sub: 'chemistry', grade: 12, unit: 1, d: 'صعب', q: 'رفع درجة الحرارة في التفاعل يؤدي إلى:', o: ['إبطاء التفاعل', 'زيادة سرعة التفاعل', 'لا تأثير', 'توقف التفاعل'], c: 1, e: 'الحرارة تزيد طاقة الجزيئات' },
  { sub: 'biology', grade: 9, unit: 0, d: 'مبتدئ', q: 'الوحدة الأساسية في بناء الكائنات الحية هي:', o: ['الأنسجة', 'الخلية', 'الأعضاء', 'الأجهزة'], c: 1, e: 'الخلية وحدة البناء' },
  { sub: 'biology', grade: 10, unit: 0, d: 'متوسط', q: 'مركز توليد الطاقة في الخلية هو:', o: ['النواة', 'الميتوكوندريا', 'الريبوسوم', 'الجدار الخلوي'], c: 1, e: 'الميتوكوندريا' },
  { sub: 'biology', grade: 10, unit: 1, d: 'متوسط', q: 'العملية التي يصنع بها النبات غذاءه:', o: ['التنفس', 'البناء الضوئي', 'النتح', 'الامتصاص'], c: 1, e: 'البناء الضوئي' },
  { sub: 'biology', grade: 12, unit: 0, d: 'صعب', q: 'طراز الفرد النقي للصفة المتنحية (t) هو:', o: ['TT', 'Tt', 'tt', 'لا يمكن تحديده'], c: 2, e: 'الأليلان متنحيان tt' },
  { sub: 'biology', grade: 12, unit: 0, d: 'صعب', q: 'الخصية الجنسية المتنحية تظهر فقط في:', o: ['الفرد النقي', 'الفرد الهجين', 'كل الأفراد', 'لا شيء'], c: 0, e: 'تظهر في الفرد النقي فقط' },
  { sub: 'english', grade: 9, unit: 0, d: 'متوسط', q: 'She ___ to school every day.', o: ['go', 'goes', 'going', 'gone'], c: 1, e: 'مع she نضيف s' },
  { sub: 'english', grade: 9, unit: 0, d: 'متوسط', q: 'The past tense of "buy" is:', o: ['buyed', 'bought', 'buys', 'baying'], c: 1, e: 'فعل شاذ bought' },
  { sub: 'english', grade: 10, unit: 0, d: 'متوسط', q: 'Choose the correct passive: "They built the bridge"', o: ['The bridge was built', 'The bridge is build', 'The bridge were built', 'The bridge built'], c: 0, e: 'مبني للمجهول في الماضي' },
  { sub: 'english', grade: 11, unit: 0, d: 'صعب', q: 'I ___ this movie three times.', o: ['saw', 'have seen', 'see', 'was seeing'], c: 1, e: 'المضارع التام للتجارب' },
  { sub: 'english', grade: 12, unit: 0, d: 'صعب', q: 'If it ___ tomorrow, we will stay home.', o: ['rains', 'will rain', 'rain', 'rained'], c: 0, e: 'الشرطي الأول + مضارع' },
  { sub: 'english', grade: 12, unit: 0, d: 'صعب', q: 'He said he ___ coming to the party.', o: ['is', 'was', 'will be', 'has been'], c: 1, e: 'نقل الكلام للخلف زمنياً' },
  { sub: 'arabic', grade: 9, unit: 0, d: 'متوسط', q: 'في جملة "جاء اللاعب مسرعاً"، "مسرعاً" تعرب:', o: ['مفعول به', 'حال', 'مفعول مطلق', 'نعت'], c: 1, e: 'حال منصوبة' },
  { sub: 'arabic', grade: 9, unit: 0, d: 'مبتدئ', q: 'الجملة الاسمية تبدأ بـ:', o: ['فعل', 'اسم', 'حرف', 'مصدر'], c: 1, e: 'تبدأ باسم' },
  { sub: 'arabic', grade: 10, unit: 0, d: 'صعب', q: 'في "رأيت أسداً يحمل سيفاً"، الاستعارة:', o: ['مكنية', 'تصريحية', 'تمثيلية', 'بالكناية'], c: 0, e: 'الأسد مكنية عن الرجل الشجاع' },
  { sub: 'arabic', grade: 10, unit: 0, d: 'متوسط', q: 'أركان التشبيه الأساسية:', o: ['3', '4', '5', '2'], c: 1, e: 'المشبه والمشبه به والأداة ووجه الشبه' },
  { sub: 'arabic', grade: 12, unit: 0, d: 'صعب', q: 'الاستعارة المكنية تُذكر فيها:', o: ['المشبه', 'المشبه به', 'أداة التشبيه', 'وجه الشبه'], c: 0, e: 'يُذكر المشبه ويحذف المشبه به' },
  // فيزياء صف ٨
  { sub: 'physics', grade: 8, unit: 0, d: 'مبتدئ', q: 'وحدة قياس الطول في النظام الدولي:', o: ['المتر', 'الجرام', 'اللتر', 'الثانية'], c: 0, e: 'المتر وحدة الطول' },
  { sub: 'physics', grade: 8, unit: 1, d: 'متوسط', q: 'السرعة = المسافة ÷:', o: ['الكتلة', 'الزمن', 'الحجم', 'القوة'], c: 1, e: 'السرعة = المسافة ÷ الزمن' },
  // كيمياء صف ٨
  { sub: 'chemistry', grade: 8, unit: 0, d: 'مبتدئ', q: 'حالات المادة الأساسية:', o: ['2', '3', '4', '5'], c: 1, e: 'صلبة وسائلة وغازية' },
  // أحياء صف ٨
  { sub: 'biology', grade: 8, unit: 0, d: 'مبتدئ', q: 'من خصائص الكائنات الحية:', o: ['التغذية', 'النمو', 'التكاثر', 'كل ما سبق'], c: 3, e: 'جميعها خصائص الحياة' },
  // إنجليزي صف ٨
  { sub: 'english', grade: 8, unit: 0, d: 'مبتدئ', q: 'She ___ a student.', o: ['am', 'is', 'are', 'be'], c: 1, e: 'مع she نستخدم is' },
  // عربية صف ٨
  { sub: 'arabic', grade: 8, unit: 0, d: 'مبتدئ', q: 'أقسام الكلمة في اللغة العربية:', o: ['اسم وفعل وحرف', 'اسم وفعل فقط', 'فعل وحرف فقط', 'اسم وحرف فقط'], c: 0, e: 'الأقسام الثلاثة' },
  // علوم بيئية (١١ - ١٢)
  { sub: 'env_science', grade: 11, unit: 0, d: 'متوسط', q: 'من أمثلة الموارد المتجددة:', o: ['البترول', 'الغاز', 'الطاقة الشمسية', 'الفحم'], c: 2, e: 'الشمس مصدر متجدد' },
  { sub: 'env_science', grade: 11, unit: 1, d: 'متوسط', q: 'الاحتباس الحراري يزداد بسبب زيادة:', o: ['الأكسجين', 'ثاني أكسيد الكربون', 'النيتروجين', 'الأوزون'], c: 1, e: 'غازات الدفيئة ترفع الحرارة' },
  { sub: 'env_science', grade: 12, unit: 0, d: 'متوسط', q: 'الاستدامة تعني:', o: ['استنزاف الموارد', 'تلبية الحاجات دون الإضرار بالأجيال القادمة', 'التوسع العمراني', 'زيادة الاستهلاك'], c: 1, e: 'توازن بين الحاضر والمستقبل' },
  { sub: 'env_science', grade: 12, unit: 0, d: 'صعب', q: 'الطاقة النووية تُصنف ضمن مصادر:', o: ['المتجددة', 'غير المتجددة', 'النظيفة تماماً', 'البدائية'], c: 1, e: 'اليورانيوم مورد غير متجدد' },
  { sub: 'env_science', grade: 12, unit: 1, d: 'صعب', q: 'بروتوكول كيوتو يهدف إلى:', o: ['خفض انبعاثات الغازات الدفيئة', 'زيادة الإنتاج الزراعي', 'حماية الغابات فقط', 'تنظيم الصيد'], c: 0, e: 'اتفاق دولي للحد من الانبعاثات' },
  // أسئلة صح/خطأ (tf)
  { sub: 'math', grade: 9, unit: 0, lesson: 0, t: 'tf', d: 'مبتدئ', q: 'العبارة الجبرية تعبير رياضي يحتوي متغيرات وثوابت.', o: ['صح', 'خطأ'], c: 0, e: 'العبارة الجبرية تحتوي متغيرات وثوابت وعمليات' },
  { sub: 'physics', grade: 9, unit: 0, lesson: 0, t: 'tf', d: 'مبتدئ', q: 'القوة تُقاس بوحدة النيوتن.', o: ['صح', 'خطأ'], c: 0, e: 'النيوتن وحدة القوة في النظام الدولي' },
  { sub: 'arabic', grade: 9, unit: 0, lesson: 0, t: 'tf', d: 'مبتدئ', q: 'الجملة الفعلية تبدأ بفعل.', o: ['صح', 'خطأ'], c: 0, e: 'الجملة الفعلية تبدأ بفعل مثل "جاء اللاعب"' },
  // أسئلة اختيار من متعدد الإجابات (multi)
  { sub: 'math', grade: 8, unit: 1, t: 'multi', d: 'متوسط', q: 'أي من هذه الأشكال تبلغ مساحتها 24 سم²؟', o: ['مستطيل 6×4', 'مربع طول ضلعه 5', 'مستطيل 8×3', 'مثلث قاعدته 12 وارتفاعه 4'], c: [0, 2, 3], e: '6×4=24، 8×3=24، والمثلث: ½×12×4=24' },
  { sub: 'chemistry', grade: 9, unit: 0, t: 'multi', d: 'متوسط', q: 'أي مما يلي يُعد تغيراً كيميائياً؟', o: ['صدأ الحديد', 'ذوبان السكر', 'احتراق الخشب', 'تقطير الماء'], c: [0, 2], e: 'الصدأ والاحتراق ينتجان مواد جديدة' },
  { sub: 'env_science', grade: 12, unit: 0, t: 'multi', d: 'صعب', q: 'أي من الآتي مصادر طاقة متجددة؟', o: ['الطاقة الشمسية', 'الفحم', 'طاقة الرياح', 'الغاز الطبيعي'], c: [0, 2], e: 'الشمس والرياح موردان متجددان' },
];

const qStmt = db.prepare('INSERT INTO questions (subject_id, grade_id, unit_id, lesson_id, question, options, correct_index, question_type, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (const q of qs) {
  const unitId = q.unit !== undefined ? unitIds[`${q.sub}:${q.grade}:${q.unit}`] : null;
  const lessonKey = `${q.sub}:${q.grade}:${q.unit}`;
  const lessonId = q.lesson !== undefined && lessonIds[lessonKey] ? lessonIds[lessonKey][q.lesson] : null;
  const correct = Array.isArray(q.c) ? JSON.stringify(q.c) : q.c;
  qStmt.run(subjectIds[q.sub], q.grade, unitId, lessonId, q.q, JSON.stringify(q.o), correct, q.t || 'mcq', q.e, q.d);
}

// ---------- الاختبارات ----------
const exams = [
  { sub: 'math', grade: 9, unit: 0, type: 'درس', title: 'اختبار الوحدة الأولى — الرياضيات', desc: 'اختبر فهمك للمتغيرات والعبارات الجبرية.', dur: 20, count: 8 },
  { sub: 'math', grade: 9, unit: null, type: 'نهائي', title: 'الاختبار النهائي — الصف التاسع', desc: 'مراجعة شاملة لمنهج الرياضيات كاملاً.', dur: 45, count: 8 },
  { sub: 'math', grade: 10, unit: 0, type: 'وحدة', title: 'اختبار المعادلات التربيعية', desc: 'تقييم مهاراتك في حل المعادلات التربيعية.', dur: 35, count: 8 },
  { sub: 'math_advanced', grade: 11, unit: 0, type: 'وحدة', title: 'اختبار الاشتقاق والنهايات', desc: 'النهايات وقواعد الاشتقاق وتطبيقاتها.', dur: 40, count: 8 },
  { sub: 'math_advanced', grade: 12, unit: 0, type: 'نهائي', title: 'المراجعة النهائية — الرياضيات المتقدمة', desc: 'اختبار شامل لجميع فروع الرياضيات المتقدمة.', dur: 60, count: 8 },
  { sub: 'math_basic', grade: 11, unit: 0, type: 'درس', title: 'اختبار المعادلات الحياتية', desc: 'تطبيقات المعادلات في مواقف الحياة.', dur: 25, count: 8 },
  { sub: 'math_basic', grade: 12, unit: 0, type: 'نهائي', title: 'المراجعة النهائية — الرياضيات الأساسية', desc: 'الإحصاء والمعاملات المالية والقياس.', dur: 45, count: 8 },
  { sub: 'physics', grade: 9, unit: 0, type: 'درس', title: 'اختبار الحركة والقوى', desc: 'الكميات الفيزيائية والحركة.', dur: 25, count: 8 },
  { sub: 'physics', grade: 11, unit: 0, type: 'وحدة', title: 'اختبار قوانين نيوتن', desc: 'القوانين الثلاثة وتطبيقاتها.', dur: 35, count: 8 },
  { sub: 'physics', grade: 12, unit: 1, type: 'نهائي', title: 'الاختبار النهائي — الفيزياء', desc: 'مراجعة شاملة في الكهرباء والدوائر.', dur: 45, count: 8 },
  { sub: 'chemistry', grade: 10, unit: 0, type: 'درس', title: 'اختبار الذرة والجدول الدوري', desc: 'بنية الذرة والترتيب الدوري.', dur: 30, count: 8 },
  { sub: 'chemistry', grade: 12, unit: 0, type: 'نهائي', title: 'الاختبار النهائي — الكيمياء', desc: 'التفاعلات والموازنة والسرعة الكيميائية.', dur: 45, count: 8 },
  { sub: 'biology', grade: 10, unit: 0, type: 'وحدة', title: 'اختبار الخلية ووظائفها', desc: 'تركيب الخلية والعمليات الحيوية.', dur: 30, count: 8 },
  { sub: 'biology', grade: 12, unit: 0, type: 'نهائي', title: 'المراجعة النهائية — الأحياء', desc: 'الوراثة وقوانين مندل والتنوع الحيوي.', dur: 45, count: 8 },
  { sub: 'english', grade: 9, unit: 0, type: 'درس', title: 'Tenses Test — Grade 9', desc: 'الأزمنة البسيطة والمستمرة.', dur: 25, count: 8 },
  { sub: 'english', grade: 11, unit: 0, type: 'نهائي', title: 'Present Perfect Mastery Test', desc: 'إتقان المضارع التام.', dur: 30, count: 8 },
  { sub: 'arabic', grade: 10, unit: 0, type: 'وحدة', title: 'اختبار البلاغة — التشبيه والاستعارة', desc: 'الأساليب البلاغية في النصوص.', dur: 30, count: 8 },
  { sub: 'arabic', grade: 12, unit: 0, type: 'نهائي', title: 'الاختبار النهائي — اللغة العربية', desc: 'النحو والبلاغة والإملاء.', dur: 45, count: 8 },
  { sub: 'env_science', grade: 11, unit: 0, type: 'درس', title: 'اختبار النظم البيئية', desc: 'النظم البيئية والموارد الطبيعية.', dur: 25, count: 8 },
  { sub: 'env_science', grade: 12, unit: 0, type: 'نهائي', title: 'المراجعة النهائية — العلوم البيئية', desc: 'الطاقة المتجددة والاستدامة والتغير المناخي.', dur: 45, count: 8 },
];

const examStmt = db.prepare(`
  INSERT INTO exams (grade_id, subject_id, unit_id, title, description, duration_minutes, question_count, exam_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const e of exams) {
  const unitId = e.unit !== null && e.unit !== undefined ? unitIds[`${e.sub}:${e.grade}:${e.unit}`] : null;
  examStmt.run(e.grade, subjectIds[e.sub], unitId, e.title, e.desc, e.dur, e.count, e.type);
}

// ---------- مكتبة الملفات ----------
const resources = [
  { sub: 'math_advanced', grade: 11, type: 'ملخص', title: 'ملخص الاشتقاق — الصف الحادي عشر', desc: 'جميع قواعد الاشتقاق في صفحتين مع أمثلة محلولة.', size: '1.2 MB', content: 'ملخص شامل لقواعد الاشتقاق:\n1. مشتقة الثابت = صفر\n2. مشتقة سⁿ = ن س^(ن-1)\n3. مشتقة المجموع = مجموع المشتقات\n4. القاعدة التسلسلية: د(ق(س)) = د´(ق(س)) × ق´(س)\n\nأمثلة محلولة خطوة بخطوة + تدريبات.' },
  { sub: 'math_advanced', grade: 12, type: 'ملخص', title: 'ملخص التكامل والاحتمالات', desc: 'قواعد التكامل المحدد وغير المحدد وأهم قوانين الاحتمالات.', size: '2.1 MB', content: 'تكامل سⁿ دس = س^(ن+1)/(ن+1) + ج\nتكامل الجملة المحدد = الفرق بين قيمتين.\nقوانين الاحتمالات: الاتحاد، التقاطع، التوافيق والتباديل.' },
  { sub: 'physics', grade: 11, type: 'ورقة عمل', title: 'ورقة عمل قوانين نيوتن', desc: 'أسئلة تطبيقية على القوانين الثلاثة مع مسائل محلولة.', size: '800 KB', content: '1. اشرح قانون نيوتن الأول مثالاً.\n2. احسب القوة لكتلة 5كجم وتسارع 2م/ث².\n3. قارن بين الفعل ورد الفعل.' },
  { sub: 'chemistry', grade: 10, type: 'مراجعة', title: 'مراجعة الذرة والجدول الدوري', desc: 'مراجعة مكثفة قبل الاختبار مع خرائط ذهنية.', size: '1.5 MB', content: 'مكونات الذرة: بروتونات ونيوترونات وإلكترونات.\nتوزيع الإلكترونات في المدارات.\nخصائص المجموعات الرئيسية في الجدول الدوري.' },
  { sub: 'biology', grade: 12, type: 'مراجعة', title: 'مراجعة الوراثة قبل الاختبار النهائي', desc: 'تلخيص قوانين مندل وحل نماذج وراثية.', size: '1.8 MB', content: 'قانونا مندل: الانعزال والتوزيع الحر.\nرموز الوراثة: الجينات، الأليلات، الطرز الجينية والمظهرية.\nحل نماذج (س س × س س).' },
  { sub: 'math_advanced', grade: 12, type: 'نموذج اختبار', title: 'نموذج اختبار نهائي — الرياضيات المتقدمة', desc: 'نموذج كامل مطابق لمواصفات الاختبار النهائي.', size: '900 KB', content: 'النموذج يشمل: تفاضل، تكامل، احتمالات، مصفوفات.\nالمدة: ساعتان. الدرجة الكلية: 100.' },
  { sub: 'english', grade: 11, type: 'أسئلة تدريبية', title: 'أسئلة تدريبية — Grammar', desc: 'مجموعة كبيرة من الأسئلة المتنوعة مع الإجابات.', size: '1.0 MB', content: 'Practice questions on: Tenses, Conditionals, Passive Voice.\nAnswer key included at the end.' },
  { sub: 'arabic', grade: 12, type: 'كتاب', title: 'دليل النحو والبلاغة الشامل', desc: 'مرجع شامل لقواعد النحو والبلاغة لطلاب الثاني عشر.', size: '3.4 MB', content: 'أبواب النحو كاملة: الفاعل، المفعول به، الحال، التمييز.\nالبلاغة: التشبيه، الاستعارة، الكناية، المجاز.\nنماذج إعرابية موضحّة.' },
  { sub: 'math', grade: 9, type: 'ورقة عمل', title: 'ورقة عمل المعادلات', desc: 'تدريبات على حل المعادلات من الدرجة الأولى.', size: '600 KB', content: 'حل المعادلات ذات الخطوة الواحدة والخطوتين.\nمسائل كلامية محلولة.' },
  { sub: 'physics', grade: 12, type: 'نموذج اختبار', title: 'نموذج اختبار نهائي — الفيزياء', desc: 'نماذج أسئلة مع مراحل الحل الكاملة.', size: '1.3 MB', content: 'أقسام النموذج: مفاهيم، مسائل حسابية، تجارب معملية.' },
  { sub: 'chemistry', grade: 11, type: 'ملخص', title: 'ملخص الغازات وقوانينها', desc: 'قانون الغاز المثالي وعلاقاته في صفحة واحدة.', size: '700 KB', content: 'قانون بويل: PV = ثابت\nقانون تشارلز: V/T = ثابت\nقانون الغاز المثالي: PV = nRT' },
  { sub: 'english', grade: 9, type: 'ورقة عمل', title: 'Workbook: Past Tenses', desc: 'أوراق عمل تفاعلية على الأزمنة الماضية.', size: '850 KB', content: 'Fill in the blanks, correct the mistakes, write sentences.' },
  { sub: 'math_basic', grade: 12, type: 'ملخص', title: 'ملخص المعاملات المالية', desc: 'الفوائد والخصومات والميزانيات في ملخص عملي.', size: '650 KB', content: 'الفائدة البسيطة: القيمة × المعدل × الزمن.\nالخصم التجاري والخصم النقدي.\nأمثلة على إعداد ميزانية بسيطة.' },
  { sub: 'env_science', grade: 12, type: 'مراجعة', title: 'مراجعة الطاقة المتجددة', desc: 'مصادر الطاقة المتجددة والاستدامة في ورقة مراجعة.', size: '1.1 MB', content: 'الطاقة الشمسية وطاقة الرياح والكتلة الحيوية.\nمفهوم البصمة الكربونية.\nدور الأفراد في الاستدامة البيئية.' },
];

const resStmt = db.prepare('INSERT INTO resources (grade_id, subject_id, type, title, description, content, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const r of resources) {
  resStmt.run(r.grade, subjectIds[r.sub], r.type, r.title, r.desc, r.content, r.size);
}

// ---------- الحصص المباشرة ----------
const sessions = [
  { sub: 'math_advanced', grade: 11, title: 'مراجعة الرياضيات المتقدمة المباشرة', teacher: teachers.math_advanced, date: '2026-08-16', time: '19:00', status: 'upcoming' },
  { sub: 'physics', grade: 12, title: 'حصة مباشرة: قوانين نيوتن', teacher: teachers.physics, date: '2026-08-18', time: '20:00', status: 'upcoming' },
  { sub: 'chemistry', grade: 10, title: 'الذرة والجدول الدوري — مباشر', teacher: teachers.chemistry, date: '2026-08-20', time: '17:00', status: 'upcoming' },
  { sub: 'math', grade: 10, title: 'حل المعادلات التربيعية', teacher: teachers.math, date: '2026-08-02', time: '19:00', status: 'recorded' },
  { sub: 'biology', grade: 12, title: 'الوراثة وقوانين مندل', teacher: teachers.biology, date: '2026-08-04', time: '18:00', status: 'recorded' },
  { sub: 'english', grade: 11, title: 'Present Perfect Live Session', teacher: teachers.english, date: '2026-08-05', time: '20:00', status: 'recorded' },
];

const sessStmt = db.prepare('INSERT INTO live_sessions (grade_id, subject_id, title, teacher_name, session_date, session_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const s of sessions) {
  sessStmt.run(s.grade, subjectIds[s.sub], s.title, s.teacher, s.date, s.time, s.status);
}

// ---------- الجروبات المجانية ----------
const groups = [
  { grade: 8,  title: 'جروب الصف الثامن المجاني',   desc: 'أسئلة يومية ومراجعات مجانية ومحتوى تعليمي مستمر.', link: 'https://chat.whatsapp.com/C8uRDBrHLOzGsETiHNmJiz' },
  { grade: 9,  title: 'جروب الصف التاسع المجاني',   desc: 'أسئلة يومية ومراجعات مجانية ومحتوى تعليمي مستمر.', link: 'https://chat.whatsapp.com/IhJ288ChX4V2Lz0Swhpfwz' },
  { grade: 10, title: 'جروب الصف العاشر المجاني',   desc: 'اختبارات قصيرة ونصائح دراسية وفرص حضور حصص مجانية.', link: 'https://chat.whatsapp.com/DEk4BSZgt29H4RKhkrIAEE' },
  { grade: 11, title: 'جروب الصف الحادي عشر المجاني', desc: 'مسابقات ومراجعات وأسئلة يومية لأفضل تخصص.', link: 'https://chat.whatsapp.com/L9hnYemhkbE8vWo9Kl3iXh' },
  { grade: 12, title: 'جروب الصف الثاني عشر المجاني', desc: 'مراجعات مكثفة وتنبيهات ومحتوى استعداد للاختبارات.', link: 'https://chat.whatsapp.com/EVph3f87bHo3QZKiCy9yhI' },
];

const grpStmt = db.prepare('INSERT INTO groups (grade_id, title, description, link) VALUES (?, ?, ?, ?)');
for (const gr of groups) grpStmt.run(gr.grade, gr.title, gr.desc, gr.link);

// ---------- الإشعارات ----------
const notifStmt = db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)');
notifStmt.run(null, '🔔 لديك حصة مباشرة اليوم', 'مراجعة الرياضيات المباشرة الساعة 7:00 مساءً. لا تفوتها!', 'session');
notifStmt.run(null, '📝 اختبار جديد', 'تم إضافة اختبار المعادلات التربيعية في الرياضيات.', 'exam');
notifStmt.run(null, '📖 مراجعة جديدة', 'تم رفع مراجعة الذرة والجدول الدوري في الكيمياء.', 'resource');
notifStmt.run(null, '🎁 عرض يُسر', 'اشترك الآن واحصل على هديتك! أول 10 مشتركين يحصلون على هدية مجانية.', 'offer');

// ---------- المستخدمون ----------
const hash = bcrypt.hashSync('password123', 10);
const studentRes = db.prepare("INSERT INTO users (name, email, phone, password, role, grade, points, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
  .run('أحمد البلوشي', 'student@yusr.edu.om', '91234567', hash, 'student', 12, 240, 'YUSR-AHMED1');
const studentId = studentRes.lastInsertRowid;
db.prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)")
  .run('إدارة يسر', 'admin@yusr.edu.om', '90000000', hash, 'admin');
db.prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)")
  .run('معلم الرياضيات', 'teacher@yusr.edu.om', '91111111', hash, 'teacher');
// طالب اشترك باستخدام كود السفير (للتجربة)
const referredRes = db.prepare("INSERT INTO users (name, email, phone, password, role, grade, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
  .run('سعيد الكندي', 'saeed@yusr.edu.om', '92345678', hash, 'student', 11, 'YUSR-AHMED1');
const referredId = referredRes.lastInsertRowid;

// إحالة تجريبية لسفير (أحمد) — 3 مواد في قسم ١١-١٢ (3 × 20 = 60)
db.prepare('INSERT INTO referrals (ambassador_id, referred_user_id, amount, reward) VALUES (?, ?, ?, ?)')
  .run(studentId, referredId, 60, 6);

// اشتراك تجريبي للمادة الرياضيات
const exp = new Date(); exp.setMonth(exp.getMonth() + 12);
db.prepare('INSERT INTO user_subjects (user_id, subject_id, plan, expires_at) VALUES (?, ?, ?, ?)')
  .run(studentId, subjectIds.math, 'single', exp.toISOString().slice(0, 10));

// نتائج اختبارات تجريبية
const results = [
  { exam: 'math:10', score: 90 },
  { exam: 'physics:11', score: 80 },
  { exam: 'chemistry:10', score: 95 },
];
const examIds = {};
for (const e of db.prepare('SELECT id, subject_id, grade_id FROM exams').all()) {
  const subSlug = Object.keys(subjectIds).find((k) => subjectIds[k] === e.subject_id);
  examIds[`${subSlug}:${e.grade_id}`] = e.id;
}
const resIns = db.prepare('INSERT INTO exam_results (user_id, exam_id, score, total) VALUES (?, ?, ?, ?)');
for (const r of results) {
  const eid = examIds[r.exam];
  if (eid) resIns.run(studentId, eid, r.score, 20);
}

// إنجاز بعض الدروس
const progStmt = db.prepare('INSERT INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)');
const allLessons = db.prepare('SELECT id FROM lessons WHERE grade_id = 12 OR grade_id = 11').all();
allLessons.slice(0, 6).forEach((l) => progStmt.run(studentId, l.id));

// نقاط تحفيز
const pointStmt = db.prepare('INSERT INTO points_log (user_id, points, reason) VALUES (?, ?, ?)');
[['مشاهدة درس الاشتقاق', 10], ['إكمال اختبار المعادلات', 20], ['درجة عالية في الرياضيات', 30], ['مشاهدة حصة مسجلة', 10], ['حل بنك أسئلة', 15]].forEach(([reason, p]) => pointStmt.run(studentId, p, reason));

// رسائل تواصل وطلبات معلمين تجريبية
db.prepare('INSERT INTO contact_messages (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)')
  .run('سعيد المقبالي', '92345678', 'saeed@test.com', 'استفسار عن الاشتراك', 'كيف أستطيع الاشتراك في مادتين؟');
db.prepare('INSERT INTO teacher_applications (name, email, phone, subject, years_experience, message) VALUES (?, ?, ?, ?, ?, ?)')
  .run('أ. ناصر البوسعيدي', 'nasser@test.com', '93456789', 'الفيزياء', 10, 'معلم فيزياء بخبرة عشر سنوات أرغب بالانضمام.');

// ---------- خطط الاشتراك (أسعار ديناميكية تُدار من لوحة الإدارة) ----------
const planStmt = db.prepare('INSERT OR REPLACE INTO plans (section, key, name, subjects, price, original_price, discount_pct) VALUES (?, ?, ?, ?, ?, ?, ?)');
const plansData = [
  { section: 'junior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 15, original: null },
  { section: 'junior', key: 'triple', name: '3 مواد', subjects: 3, price: 38, original: 45 },
  { section: 'junior', key: 'all', name: 'جميع المواد', subjects: null, price: 79, original: 90 },
  { section: 'senior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 20, original: null },
  { section: 'senior', key: 'triple', name: '3 مواد', subjects: 3, price: 52, original: 60 },
  { section: 'senior', key: 'all', name: 'جميع المواد', subjects: null, price: 149, original: 160 },
];
for (const p of plansData) {
  planStmt.run(p.section, p.key, p.name, p.subjects, p.price, p.original, p.original ? Math.round(((p.original - p.price) / p.original) * 100) : 0);
}

// ---------- العروض الترويجية ----------
const offerStmt = db.prepare('INSERT INTO offers (title, description, badge, discount_text, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?)');
const today = new Date();
const plus30 = new Date(); plus30.setDate(plus30.getDate() + 30);
const plus90 = new Date(); plus90.setDate(plus90.getDate() + 90);
const iso = (d) => d.toISOString().slice(0, 10);
offerStmt.run('عرض التأسيس — خصم على جميع الباقات', 'خصم على جميع خطط الاشتراك السنوية للطلاب الجدد المسجلين هذا الشهر.', 'عرض جديد', 'خصم حتى 20%', iso(today), iso(plus30));
offerStmt.run('باقة الثلاث مواد الأكثر طلباً', 'باقة 3 مواد بسعر مخفض — الخيار الأمثل للتفوق في أكثر من مادة.', 'الأكثر طلباً', 'وفّر حتى 8 ريالات', iso(today), iso(plus30));
offerStmt.run('ترقية الجميع لمسابقة شهرية', 'أعلى نقاط في نهاية كل شهر يفوز بمنحة دراسية شهرية.', 'مسابقات', 'منح شهرية', iso(today), iso(plus90));

// ---------- أنواع المواد (Variants) ----------
// (تمت التهيئة أعلاه مع المواد مباشرة)

console.log('✅ تم تهيئة قاعدة البيانات بنجاح (وفق المواصفات الجديدة)');
console.log('🏫 الصفوف:', db.prepare('SELECT COUNT(*) c FROM grades').get().c, '(٨-١٢)');
console.log('📚 المواد:', db.prepare('SELECT COUNT(*) c FROM subjects').get().c);
console.log('📦 الوحدات:', db.prepare('SELECT COUNT(*) c FROM units').get().c);
console.log('🎥 الحصص المسجلة:', db.prepare('SELECT COUNT(*) c FROM lessons').get().c);
console.log('❓ بنك الأسئلة:', db.prepare('SELECT COUNT(*) c FROM questions').get().c);
console.log('📝 الاختبارات:', db.prepare('SELECT COUNT(*) c FROM exams').get().c);
console.log('📁 مكتبة الملفات:', db.prepare('SELECT COUNT(*) c FROM resources').get().c);
console.log('🔴 الحصص المباشرة:', db.prepare('SELECT COUNT(*) c FROM live_sessions').get().c);
console.log('👥 الجروبات:', db.prepare('SELECT COUNT(*) c FROM groups').get().c);
console.log('🔔 الإشعارات:', db.prepare('SELECT COUNT(*) c FROM notifications').get().c);
console.log('🔑 حساب تجريبي: student@yusr.edu.om / password123');
console.log('🔑 حساب إدارة: admin@yusr.edu.om / password123');
