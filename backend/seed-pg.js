import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function seed() {
  console.log('🔄 جاري تعبئة قاعدة البيانات...');

  // حذف البيانات القديمة
  const tables = [
    'exam_results', 'chat_history', 'lesson_progress', 'favorites', 'points_log',
    'user_subjects', 'notifications', 'lessons', 'questions', 'exams', 'resources',
    'live_sessions', 'groups', 'referrals', 'users', 'teacher_applications',
    'contact_messages', 'units', 'subjects', 'grades', 'plans', 'offers',
    'variants', 'teacher_subjects', 'lesson_status', 'exam_status', 'badges',
    'user_badges', 'levels', 'session_attendance', 'discussions', 'audit_log',
    'admin_logs', 'tickets', 'ticket_messages', 'invoices', 'study_plans',
    'study_plan_items', 'mistakes_log', 'uploads', 'coupons', 'student_notes',
    'calendar_events', 'reviews', 'assignments', 'assignment_submissions',
    'classrooms', 'classroom_students', 'class_announcements', 'schedule',
    'email_verifications', 'password_resets', 'subject_discussions', 'exam_questions',
    'user_notes',
  ];
  for (const t of tables) await query(`DELETE FROM ${t}`);

  // ---------- الصفوف ----------
  const grades = [
    { id: 8, name: 'الصف الثامن', tagline: 'تأسيس قوي في المواد الأساسية', description: 'محتوى تعليمي واختبارات ومراجعات لبناء أساس قوي قبل الثانوية.', color: '#06b6d4' },
    { id: 9, name: 'الصف التاسع', tagline: 'محتوى تعليمي واختبارات ومراجعات', description: 'تأسيس قوي في المواد الأساسية مع تدريب مستمر على الاختبارات.', color: '#f59e0b' },
    { id: 10, name: 'الصف العاشر', tagline: 'شرح ومراجعة وتدريب', description: 'انطلاقة الثانوية بشرح مبسّط ومراجعات واختبارات تفاعلية.', color: '#3b82f6' },
    { id: 11, name: 'الصف الحادي عشر', tagline: 'محتوى متخصص ومراجعات واختبارات', description: 'تخصص علمي وأدبي بمحتوى متكامل ومراجعات دقيقة.', color: '#ef4444' },
    { id: 12, name: 'الصف الثاني عشر', tagline: 'مراجعات مكثفة واستعداد للاختبارات', description: 'مكثفة واستعداد كامل للاختبارات النهائية والقبول الجامعي.', color: '#0f172a' },
  ];
  for (const g of grades) {
    await query('INSERT INTO grades (id, name, tagline, description, color) VALUES ($1, $2, $3, $4, $5)', [g.id, g.name, g.tagline, g.description, g.color]);
  }

  // ---------- أنواع المواد ----------
  const variants = [
    { name: 'عامة', description: 'المادة الأساسية لجميع الطلاب' },
    { name: 'متقدمة', description: 'مستوى متقدم — مسار العلوم والرياضيات' },
    { name: 'أساسية', description: 'مستوى أساسي — المسار الأدبي والتطبيقي' },
  ];
  const variantIds = {};
  for (const v of variants) {
    const r = await query('INSERT INTO variants (name, description) VALUES ($1, $2) RETURNING id', [v.name, v.description]);
    variantIds[v.name] = r.rows[0].id;
  }

  // ---------- المواد ----------
  const subjects = [
    { name: 'الرياضيات', icon: '📘', color: '#3b82f6', slug: 'math', variant: 'عامة', from: 8, to: 10 },
    { name: 'الرياضيات', icon: '🧮', color: '#1d4ed8', slug: 'math_advanced', variant: 'متقدمة', from: 11, to: 12 },
    { name: 'الرياضيات', icon: '🔢', color: '#60a5fa', slug: 'math_basic', variant: 'أساسية', from: 11, to: 12 },
    { name: 'الفيزياء', icon: '📗', color: '#ef4444', slug: 'physics', variant: 'عامة', from: 8, to: 12 },
    { name: 'الكيمياء', icon: '📙', color: '#a855f7', slug: 'chemistry', variant: 'عامة', from: 8, to: 12 },
    { name: 'الأحياء', icon: '📕', color: '#ec4899', slug: 'biology', variant: 'عامة', from: 8, to: 12 },
    { name: 'العلوم البيئية', icon: '🌱', color: '#10b981', slug: 'env_science', variant: 'عامة', from: 11, to: 12 },
    { name: 'اللغة الإنجليزية', icon: '📒', color: '#f59e0b', slug: 'english', variant: 'عامة', from: 8, to: 12 },
    { name: 'اللغة العربية', icon: '📔', color: '#8b5cf6', slug: 'arabic', variant: 'عامة', from: 8, to: 12 },
  ];
  const subjectIds = {};
  for (const s of subjects) {
    const r = await query('INSERT INTO subjects (name, icon, color, slug, grade_from, grade_to, variant_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [s.name, s.icon, s.color, s.slug, s.from, s.to, variantIds[s.variant]]);
    subjectIds[s.slug] = r.rows[0].id;
  }

  // ---------- الوحدات ----------
  const unitNames = ['الأولى', 'الثانية', 'الثالثة'];
  const unitIds = {};
  for (const s of subjects) {
    for (const g of grades) {
      if (g.id < s.from || g.id > s.to) continue;
      for (let u = 1; u <= 3; u++) {
        const r = await query('INSERT INTO units (subject_id, grade_id, name) VALUES ($1, $2, $3) RETURNING id', [subjectIds[s.slug], g.id, `الوحدة ${unitNames[u - 1]}`]);
        unitIds[`${s.slug}:${g.id}:${u - 1}`] = r.rows[0].id;
      }
    }
  }

  // ---------- المستخدمون ----------
  const passwordHash = bcrypt.hashSync('password123', 10);
  const users = [
    { name: 'أحمد المشرف', email: 'admin@yusr.edu.om', role: 'admin' },
    { name: 'فاطمة المعلمة', email: 'teacher@yusr.edu.om', role: 'teacher' },
    { name: 'خالد الطالب', email: 'student@yusr.edu.om', role: 'student', grade: 9 },
  ];
  const userIds = {};
  for (const u of users) {
    const r = await query('INSERT INTO users (name, email, password, role, grade) VALUES ($1, $2, $3, $4, $5) RETURNING id', [u.name, u.email, passwordHash, u.role, u.grade || null]);
    userIds[u.email] = r.rows[0].id;
  }

  // ---------- الإعدادات الافتراضية ----------
  const settings = {
    whatsapp_number: '96877353192',
    whatsapp_channel: 'https://whatsapp.com/channel/0029VaAeZNtIt5s0lepM5T0V',
    instagram_url: 'https://www.instagram.com/yusredu.om',
    contact_email: 'info@yusr.edu.om',
    contact_phone: '77353192',
    leaderboard_enabled: '1',
  };
  for (const [k, v] of Object.entries(settings)) {
    await query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [k, v]);
  }

  // ---------- المستويات ----------
  const levels = [
    [1, 'مبتدئ', 0, '🌱'], [2, 'متعلم', 100, '📚'], [3, 'متوسط', 300, '⭐'],
    [4, 'متقدم', 600, '🏆'], [5, 'خبير', 1000, '👑'], [6, 'محترف', 2000, '💎'],
  ];
  for (const [level, name, points, icon] of levels) {
    await query('INSERT INTO levels (level, name, points_required, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (level) DO NOTHING', [level, name, points, icon]);
  }

  // ---------- الشارات ----------
  const badges = [
    ['أول درس', 'أكمل أول درس', '🎬', 0], ['محلل', 'حل أول اختبار', '📝', 0],
    ['متفوق', 'حصل على 90% في اختبار', '🌟', 0], ['ملتزم', 'أكمل 10 دروس', '📚', 0],
    ['خبير', 'أكمل 50 درس', '🏅', 0], ['نجم', 'جمع 500 نقطة', '⭐', 500],
    ['بطل', 'جمع 1000 نقطة', '🏆', 1000], ['معلّم', 'أول درس كمعلم', '👨‍🏫', 0],
  ];
  for (const [name, description, icon, points_required] of badges) {
    await query('INSERT INTO badges (name, description, icon, points_required) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [name, description, icon, points_required]);
  }

  // ---------- خطط الاشتراك ----------
  const plans = [
    { section: 'junior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 15, original_price: 15 },
    { section: 'junior', key: 'triple', name: '3 مواد', subjects: 3, price: 35, original_price: 45 },
    { section: 'junior', key: 'all', name: 'كل المواد', subjects: 99, price: 55, original_price: 135 },
    { section: 'senior', key: 'single', name: 'مادة واحدة', subjects: 1, price: 20, original_price: 20 },
    { section: 'senior', key: 'triple', name: '3 مواد', subjects: 3, price: 45, original_price: 60 },
    { section: 'senior', key: 'all', name: 'كل المواد', subjects: 99, price: 70, original_price: 180 },
  ];
  for (const p of plans) {
    await query('INSERT INTO plans (section, key, name, subjects, price, original_price) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (section, key) DO NOTHING', [p.section, p.key, p.name, p.subjects, p.price, p.original_price]);
  }

  // ---------- دروس تجريبية ----------
  const sampleLessons = [];
  const sampleTeacher = 'فاطمة المعلمة';
  for (const s of subjects) {
    for (const g of grades) {
      if (g.id < s.from || g.id > s.to) continue;
      const unitKey = `${s.slug}:${g.id}:0`;
      if (!unitIds[unitKey]) continue;
      for (let i = 1; i <= 2; i++) {
        sampleLessons.push({
          grade_id: g.id, subject_id: subjectIds[s.slug], unit_id: unitIds[unitKey],
          title: `درس تجريبي ${i} — ${s.name}`, description: `وصف الدرس التجريبي ${i} في مادة ${s.name}`,
          duration: 30, teacher_name: sampleTeacher, is_sample: 1, is_free: 1, status: 'published',
        });
      }
    }
  }
  for (const l of sampleLessons) {
    await query('INSERT INTO lessons (grade_id, subject_id, unit_id, title, description, duration, teacher_name, is_sample, is_free, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [l.grade_id, l.subject_id, l.unit_id, l.title, l.description, l.duration, l.teacher_name, l.is_sample, l.is_free, l.status]);
  }

  console.log('✅ تم تعبئة قاعدة البيانات بنجاح');
  console.log(`🏫 الصفوف: ${grades.length}`);
  console.log(`📚 المواد: ${subjects.length}`);
  console.log(`📦 الوحدات: ${Object.keys(unitIds).length}`);
  console.log(`🎥 الدروس: ${sampleLessons.length}`);
  console.log(`👤 المستخدمون: ${Object.keys(userIds).length}`);
  await pool.end();
}

seed().catch((err) => { console.error('❌ خطأ:', err.message); process.exit(1); });
