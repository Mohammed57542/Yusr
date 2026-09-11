import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════
// Database Adapter Layer
// ═══════════════════════════════════════════════════════════
// When DATABASE_URL is set, use Neon PostgreSQL (async).
// Otherwise, use SQLite (sync) for local development.
// All route handlers use `async/await` + `db.prepare().get/all/run()`.
// ═══════════════════════════════════════════════════════════

let db;
let isAsync = false;

if (process.env.DATABASE_URL) {
  const mod = await import('./db/neon.js');
  db = mod.default;
  isAsync = true;
  console.log('✅ Using Neon PostgreSQL');
} else {
  const mod = await import('./db/sqlite.js');
  db = mod.default;
  console.log('✅ Using SQLite (local)');
}

const initPostgres = async () => true;

// ═══════════════════════════════════════════════════════════
// Schema Initialization (SQLite only — PG uses migrations)
// ═══════════════════════════════════════════════════════════
if (!process.env.DATABASE_URL) {
  initSqliteSchema();
}

function initSqliteSchema() {
  db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  grade INTEGER,
  points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  grade_from INTEGER DEFAULT 8,
  grade_to INTEGER DEFAULT 12
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  grade_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (grade_id) REFERENCES grades(id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  unit_id INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL,
  teacher_name TEXT,
  video_url TEXT,
  pdf_url TEXT,
  views INTEGER DEFAULT 0,
  level TEXT DEFAULT 'متوسط',
  order_index INTEGER DEFAULT 0,
  is_sample INTEGER DEFAULT 0,
  is_archive INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  is_free INTEGER DEFAULT 0,
  created_by INTEGER,
  objectives TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (grade_id) REFERENCES grades(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  grade_id INTEGER NOT NULL,
  unit_id INTEGER,
  lesson_id INTEGER,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  question_type TEXT DEFAULT 'mcq',
  explanation TEXT,
  difficulty TEXT DEFAULT 'متوسط',
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (grade_id) REFERENCES grades(id),
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  unit_id INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  exam_type TEXT DEFAULT 'درس',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (grade_id) REFERENCES grades(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  score REAL NOT NULL,
  total INTEGER NOT NULL,
  answers TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_size TEXT,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (grade_id) REFERENCES grades(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS live_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  teacher_name TEXT,
  session_date TEXT,
  session_time TEXT,
  status TEXT DEFAULT 'upcoming',
  meeting_url TEXT,
  video_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (grade_id) REFERENCES grades(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (grade_id) REFERENCES grades(id)
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  admin_name TEXT,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, subject_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'OMR',
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT DEFAULT 'pending',
  plan_key TEXT,
  subject_ids TEXT,
  referral_code TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  started_at TEXT,
  last_position REAL DEFAULT 0,
  watch_percent REAL DEFAULT 0,
  completed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE IF NOT EXISTS points_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teacher_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ambassador_id INTEGER NOT NULL,
  referred_user_id INTEGER NOT NULL,
  amount REAL,
  reward REAL DEFAULT 0,
  status TEXT DEFAULT 'qualified',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ambassador_id) REFERENCES users(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  subjects INTEGER,
  price REAL NOT NULL,
  original_price REAL,
  discount_pct INTEGER DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(section, key)
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  badge TEXT,
  discount_text TEXT,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subject_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

  // ─── ALTER TABLE migrations (idempotent) ───
  try { db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN referred_by TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT'); } catch {}
  try { db.exec('ALTER TABLE subjects ADD COLUMN grade_from INTEGER DEFAULT 8'); } catch {}
  try { db.exec('ALTER TABLE subjects ADD COLUMN grade_to INTEGER DEFAULT 12'); } catch {}
  try { db.exec('ALTER TABLE subjects ADD COLUMN variant_id INTEGER'); } catch {}
  try { db.exec('ALTER TABLE subjects ADD COLUMN price REAL'); } catch {}
  try { db.exec('ALTER TABLE lessons ADD COLUMN is_sample INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE lessons ADD COLUMN is_archive INTEGER DEFAULT 0'); } catch {}
  try {
    db.exec('ALTER TABLE lesson_progress ADD COLUMN started_at TEXT');
    db.exec('ALTER TABLE lesson_progress ADD COLUMN last_position REAL DEFAULT 0');
    db.exec('ALTER TABLE lesson_progress ADD COLUMN watch_percent REAL DEFAULT 0');
    db.exec('ALTER TABLE questions ADD COLUMN lesson_id INTEGER');
    db.exec('ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT "mcq"');
  } catch {}

  // ─── Indexes ───
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_units_subject ON units(subject_id);
    CREATE INDEX IF NOT EXISTS idx_units_grade ON units(grade_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
    CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_questions_grade ON questions(grade_id);
    CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit_id);
    CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id);
    CREATE INDEX IF NOT EXISTS idx_exams_grade ON exams(grade_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
    CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject_id);
    CREATE INDEX IF NOT EXISTS idx_resources_grade ON resources(grade_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON live_sessions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_grade ON live_sessions(grade_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_lesson ON lesson_progress(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_points_user ON points_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_subjects_user ON user_subjects(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_subjects_subject ON user_subjects(subject_id);
    CREATE INDEX IF NOT EXISTS idx_discussions_subject ON subject_discussions(subject_id);
  `);

  // ─── Advanced exam columns ───
  const examCols = db.tableInfo('exams').map((c) => c.name);
  if (!examCols.includes('max_attempts')) db.exec("ALTER TABLE exams ADD COLUMN max_attempts INTEGER DEFAULT 1");
  if (!examCols.includes('open_at')) db.exec("ALTER TABLE exams ADD COLUMN open_at TEXT");
  if (!examCols.includes('close_at')) db.exec("ALTER TABLE exams ADD COLUMN close_at TEXT");
  if (!examCols.includes('is_free')) db.exec("ALTER TABLE exams ADD COLUMN is_free INTEGER DEFAULT 0");
  if (!examCols.includes('show_results')) db.exec("ALTER TABLE exams ADD COLUMN show_results INTEGER DEFAULT 1");
  if (!examCols.includes('allow_review')) db.exec("ALTER TABLE exams ADD COLUMN allow_review INTEGER DEFAULT 1");
  if (!examCols.includes('created_by')) db.exec("ALTER TABLE exams ADD COLUMN created_by INTEGER");
  if (!examCols.includes('points_reward')) db.exec("ALTER TABLE exams ADD COLUMN points_reward INTEGER DEFAULT 20");

  const examResultCols = db.tableInfo('exam_results').map((c) => c.name);
  if (!examResultCols.includes('started_at')) db.exec("ALTER TABLE exam_results ADD COLUMN started_at TEXT");
  if (!examResultCols.includes('time_spent')) db.exec("ALTER TABLE exam_results ADD COLUMN time_spent INTEGER DEFAULT 0");
  if (!examResultCols.includes('attempt_number')) db.exec("ALTER TABLE exam_results ADD COLUMN attempt_number INTEGER DEFAULT 1");

  const questionCols = db.tableInfo('questions').map((c) => c.name);
  if (!questionCols.includes('points')) db.exec("ALTER TABLE questions ADD COLUMN points INTEGER DEFAULT 1");

  const liveCols = db.tableInfo('live_sessions').map((c) => c.name);
  if (!liveCols.includes('duration_minutes')) db.exec("ALTER TABLE live_sessions ADD COLUMN duration_minutes INTEGER DEFAULT 60");
  if (!liveCols.includes('is_subscribers_only')) db.exec("ALTER TABLE live_sessions ADD COLUMN is_subscribers_only INTEGER DEFAULT 0");
  if (!liveCols.includes('is_recorded')) db.exec("ALTER TABLE live_sessions ADD COLUMN is_recorded INTEGER DEFAULT 0");
  if (!liveCols.includes('created_by')) db.exec("ALTER TABLE live_sessions ADD COLUMN created_by INTEGER");
  if (!liveCols.includes('meeting_id')) db.exec("ALTER TABLE live_sessions ADD COLUMN meeting_id TEXT");
  if (!liveCols.includes('max_participants')) db.exec("ALTER TABLE live_sessions ADD COLUMN max_participants INTEGER DEFAULT 50");

  // ─── Advanced tables ───
  db.exec(`
    CREATE TABLE IF NOT EXISTS teacher_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      grade_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(teacher_id, subject_id, grade_id),
      FOREIGN KEY (teacher_id) REFERENCES users(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (grade_id) REFERENCES grades(id)
    );

    CREATE TABLE IF NOT EXISTS lesson_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'draft',
      submitted_by INTEGER,
      reviewed_by INTEGER,
      submitted_at TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id),
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exam_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'draft',
      submitted_by INTEGER,
      reviewed_by INTEGER,
      submitted_at TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      instructions TEXT,
      grade_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      unit_id INTEGER,
      lesson_id INTEGER,
      due_date TEXT NOT NULL,
      max_score INTEGER DEFAULT 100,
      allow_late INTEGER DEFAULT 1,
      max_file_size_mb INTEGER DEFAULT 10,
      allowed_extensions TEXT DEFAULT '.pdf,.doc,.docx,.jpg,.png',
      created_by INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (unit_id) REFERENCES units(id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      file_url TEXT,
      file_name TEXT,
      note TEXT,
      grade INTEGER,
      feedback TEXT,
      status TEXT DEFAULT 'submitted',
      submitted_at TEXT DEFAULT (datetime('now')),
      graded_at TEXT,
      graded_by INTEGER,
      UNIQUE(assignment_id, user_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (graded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS classrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      grade_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      academic_year TEXT DEFAULT '2025-2026',
      semester TEXT DEFAULT 'الأول',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (grade_id) REFERENCES grades(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS classroom_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classroom_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      enrolled_at TEXT DEFAULT (datetime('now')),
      UNIQUE(classroom_id, user_id),
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS class_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classroom_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classroom_id INTEGER,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      grade_id INTEGER,
      subject_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      points_required INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, badge_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );

    CREATE TABLE IF NOT EXISTS levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      points_required INTEGER NOT NULL,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS session_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT DEFAULT (datetime('now')),
      left_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      UNIQUE(session_id, user_id),
      FOREIGN KEY (session_id) REFERENCES live_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      is_reported INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES discussions(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0,
      UNIQUE(exam_id, question_id),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    );
  `);

  // ─── More indexes ───
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id);
    CREATE INDEX IF NOT EXISTS idx_lesson_status_lesson ON lesson_status(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_exam_status_exam ON exam_status(exam_id);
    CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
    CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);
    CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON discussions(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
  `);

  // ─── More ALTER TABLE migrations ───
  const lessonCols = db.tableInfo('lessons').map((c) => c.name);
  if (!lessonCols.includes('created_by')) db.exec("ALTER TABLE lessons ADD COLUMN created_by INTEGER");
  if (!lessonCols.includes('status')) db.exec("ALTER TABLE lessons ADD COLUMN status TEXT DEFAULT 'published'");
  if (!lessonCols.includes('is_free')) db.exec("ALTER TABLE lessons ADD COLUMN is_free INTEGER DEFAULT 0");
  if (!lessonCols.includes('order_index')) db.exec("ALTER TABLE lessons ADD COLUMN order_index INTEGER DEFAULT 0");
  if (!lessonCols.includes('objectives')) db.exec("ALTER TABLE lessons ADD COLUMN objectives TEXT");

  const userCols = db.tableInfo('users').map((c) => c.name);
  if (!userCols.includes('avatar')) db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  if (!userCols.includes('is_active')) db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
  if (!userCols.includes('last_login_at')) db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT");

  const userSubjectCols = db.tableInfo('user_subjects').map((c) => c.name);
  if (!userSubjectCols.includes('status')) db.exec("ALTER TABLE user_subjects ADD COLUMN status TEXT DEFAULT 'active'");

  // ─── Phase 1 tables ───
  db.exec(`
CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  payment_id INTEGER,
  invoice_number TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'OMR',
  items TEXT,
  status TEXT DEFAULT 'issued',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS study_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  lesson_id INTEGER,
  exam_id INTEGER,
  day_of_week INTEGER,
  time_slot TEXT,
  duration_minutes INTEGER DEFAULT 30,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mistakes_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  exam_id INTEGER,
  times_wrong INTEGER DEFAULT 1,
  times_correct INTEGER DEFAULT 0,
  last_reviewed TEXT,
  next_review TEXT,
  mastered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  path TEXT NOT NULL,
  purpose TEXT DEFAULT 'attachment',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT DEFAULT 'percentage',
  discount_value REAL NOT NULL,
  min_amount REAL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  active INTEGER DEFAULT 1,
  plan_ids TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  reference_id INTEGER,
  event_date TEXT NOT NULL,
  event_time TEXT,
  reminder INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_log_user ON mistakes_log(user_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_user ON student_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_reviews_lesson ON reviews(lesson_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
  `);

  // ─── Extra indexes ───
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    CREATE INDEX IF NOT EXISTS idx_exam_results_attempt ON exam_results(attempt_number);
    CREATE INDEX IF NOT EXISTS idx_exam_results_created ON exam_results(created_at);
    CREATE INDEX IF NOT EXISTS idx_questions_lesson ON questions(lesson_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
    CREATE INDEX IF NOT EXISTS idx_lessons_created ON lessons(created_at);
    CREATE INDEX IF NOT EXISTS idx_exams_created ON exams(created_at);
    CREATE INDEX IF NOT EXISTS idx_discussions_user ON discussions(user_id);
    CREATE INDEX IF NOT EXISTS idx_discussions_parent ON discussions(parent_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_session_attendance_user ON session_attendance(user_id);
    CREATE INDEX IF NOT EXISTS idx_lesson_status_status ON lesson_status(status);
    CREATE INDEX IF NOT EXISTS idx_exam_status_status ON exam_status(status);
    CREATE INDEX IF NOT EXISTS idx_user_subjects_status ON user_subjects(status);
    CREATE INDEX IF NOT EXISTS idx_subjects_variant ON subjects(variant_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_grade ON assignments(grade_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_created ON assignments(created_by);
    CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user ON assignment_submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_classrooms_subject ON classrooms(subject_id);
    CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom ON classroom_students(classroom_id);
    CREATE INDEX IF NOT EXISTS idx_classroom_students_user ON classroom_students(user_id);
    CREATE INDEX IF NOT EXISTS idx_class_announcements_classroom ON class_announcements(classroom_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(event_date);
  `);

  // ─── Seed data ───
  const levelData = [
    [1, 'مبتدئ', 0, '🌱'],
    [2, 'متعلم', 100, '📚'],
    [3, 'متوسط', 300, '⭐'],
    [4, 'متقدم', 600, '🏆'],
    [5, 'خبير', 1000, '👑'],
    [6, 'محترف', 2000, '💎'],
  ];
  const levelInsert = db.prepare('INSERT OR IGNORE INTO levels (level, name, points_required, icon) VALUES (?, ?, ?, ?)');
  for (const l of levelData) levelInsert.run(...l);

  const badgeData = [
    ['أول درس', 'أكمل أول درس', '🎬', 0],
    ['محلل', 'حل أول اختبار', '📝', 0],
    ['متفوق', 'حصل على 90% في اختبار', '🌟', 0],
    ['ملتزم', 'أكمل 10 دروس', '📚', 0],
    ['خبير', 'أكمل 50 درس', '🏅', 0],
    ['نجم', 'جمع 500 نقطة', '⭐', 500],
    ['بطل', 'جمع 1000 نقطة', '🏆', 1000],
    ['معلّم', 'أول درس كمعلم', '👨‍🏫', 0],
  ];
  const badgeInsert = db.prepare('INSERT OR IGNORE INTO badges (name, description, icon, points_required) VALUES (?, ?, ?, ?)');
  for (const b of badgeData) badgeInsert.run(...b);

  const DEFAULT_SETTINGS = {
    whatsapp_number: '96877353192',
    whatsapp_channel: 'https://whatsapp.com/channel/0029VaAeZNtIt5s0lepM5T0V',
    instagram_url: 'https://www.instagram.com/yusredu.om',
    contact_email: 'info@yusr.edu.om',
    contact_phone: '77353192',
    leaderboard_enabled: '1',
  };
  const settingInsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) settingInsert.run(k, v);
}

// ═══════════════════════════════════════════
// Exports — unified API used by all routes
// ═══════════════════════════════════════════
export { db, initPostgres };
export default db;
