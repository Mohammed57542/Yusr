import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'yusr.db');

const db = new DatabaseSync(dbPath);

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

-- مدفوعات المنصة: تسجل كل محاولة دفع حتى يعتمد الوصول من الخادم فقط
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

-- إعدادات المنصة القابلة للتعديل من لوحة الإدارة
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

-- خطط الاشتراك (أسعار ديناميكية قابلة للتعديل من الإدارة — لا تُثبت في الكود)
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

-- العروض الترويجية
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

-- أنواع المواد (Subject Variants) — مثال: الرياضيات (علمي) / الرياضيات (أدبي)
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- مناقشات المواد: أسئلة ونقاشات الطلاب المرتبطة بكل مادة
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

try {
  db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT');
  db.exec('ALTER TABLE users ADD COLUMN referred_by TEXT');
} catch {
  // الأعمدة موجودة بالفعل في قاعدة بيانات قديمة
}

try {
  db.exec('ALTER TABLE subjects ADD COLUMN grade_from INTEGER DEFAULT 8');
  db.exec('ALTER TABLE subjects ADD COLUMN grade_to INTEGER DEFAULT 12');
} catch {
  // الأعمدة موجودة بالفعل في قاعدة بيانات قديمة
}

try {
  db.exec('ALTER TABLE subjects ADD COLUMN variant_id INTEGER');
} catch {
  // العمود موجود بالفعل في قاعدة بيانات قديمة
}

// سعر مادة واحدة (ر.ع) — فارغ يعني السعر الافتراضي من خطط الاشتراك
try {
  db.exec('ALTER TABLE subjects ADD COLUMN price REAL');
} catch {
  // العمود موجود بالفعل
}

// درس عينة مجانية (متاح للجميع بدون اشتراك) / درس من السنوات السابقة
try {
  db.exec('ALTER TABLE lessons ADD COLUMN is_sample INTEGER DEFAULT 0');
  db.exec('ALTER TABLE lessons ADD COLUMN is_archive INTEGER DEFAULT 0');
} catch {
  // الأعمدة موجودة بالفعل
}

try {
  db.exec('ALTER TABLE lesson_progress ADD COLUMN started_at TEXT');
  db.exec('ALTER TABLE lesson_progress ADD COLUMN last_position REAL DEFAULT 0');
  db.exec('ALTER TABLE lesson_progress ADD COLUMN watch_percent REAL DEFAULT 0');
  db.exec('ALTER TABLE questions ADD COLUMN lesson_id INTEGER');
  db.exec('ALTER TABLE questions ADD COLUMN question_type TEXT DEFAULT "mcq"');
} catch {
  // الأعمدة موجودة بالفعل في قاعدة بيانات قديمة
}

// فهارس لتسريع الاستعلامات على مفاتيح الربط
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
  CREATE INDEX IF NOT EXISTS idx_referrals_ambassador ON referrals(ambassador_id);
  CREATE INDEX IF NOT EXISTS idx_discussions_subject ON subject_discussions(subject_id);
`);

// الإعدادات العامة الافتراضية (قابلة للتعديل من لوحة الإدارة)
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

export default db;
