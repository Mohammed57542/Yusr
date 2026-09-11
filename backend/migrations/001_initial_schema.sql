-- ═══════════════════════════════════════════════════════════
-- منصة يسر التعليمية — Initial Schema Migration
-- ═══════════════════════════════════════════════════════════

-- ─── المستخدمون ───
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
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
  avatar TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── المراحل الدراسية ───
CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL
);

-- ─── المواد ───
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  grade_from INTEGER DEFAULT 8,
  grade_to INTEGER DEFAULT 12,
  variant_id INTEGER,
  price REAL
);

-- ─── الوحدات ───
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- ─── الدروس ───
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL,
  teacher_name TEXT,
  video_url TEXT,
  pdf_url TEXT,
  views INTEGER DEFAULT 0,
  level TEXT DEFAULT 'متوسط',
  is_sample INTEGER DEFAULT 0,
  is_archive INTEGER DEFAULT 0,
  created_by INTEGER,
  status TEXT DEFAULT 'published',
  is_free INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الأسئلة ───
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  question_type TEXT DEFAULT 'mcq',
  explanation TEXT,
  difficulty TEXT DEFAULT 'متوسط',
  points INTEGER DEFAULT 1
);

-- ─── الاختبارات ───
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  exam_type TEXT DEFAULT 'درس',
  max_attempts INTEGER DEFAULT 1,
  open_at TEXT,
  close_at TEXT,
  is_free INTEGER DEFAULT 0,
  show_results INTEGER DEFAULT 1,
  allow_review INTEGER DEFAULT 1,
  created_by INTEGER,
  points_reward INTEGER DEFAULT 20,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── نتائج الاختبارات ───
CREATE TABLE IF NOT EXISTS exam_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  total INTEGER NOT NULL,
  answers TEXT,
  started_at TEXT,
  time_spent INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── أسئلة الاختبارات (الربط) ───
CREATE TABLE IF NOT EXISTS exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  UNIQUE(exam_id, question_id)
);

-- ─── الملفات ───
CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_size TEXT,
  views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الحصص المباشرة ───
CREATE TABLE IF NOT EXISTS live_sessions (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  teacher_name TEXT,
  session_date TEXT,
  session_time TEXT,
  status TEXT DEFAULT 'upcoming',
  meeting_url TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 60,
  is_subscribers_only INTEGER DEFAULT 0,
  is_recorded INTEGER DEFAULT 0,
  created_by INTEGER,
  meeting_id TEXT,
  max_participants INTEGER DEFAULT 50,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── حضور الحصص ───
CREATE TABLE IF NOT EXISTS session_attendance (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  left_at TEXT,
  duration_seconds INTEGER DEFAULT 0,
  UNIQUE(session_id, user_id)
);

-- ─── الجروبات ───
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── سجل الإجراءات الإدارية ───
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER,
  admin_name TEXT,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الإشعارات ───
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── اشتراكات المستخدمين ───
CREATE TABLE IF NOT EXISTS user_subjects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  expires_at TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(user_id, subject_id)
);

-- ─── المدفوعات ───
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'OMR',
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT DEFAULT 'pending',
  plan_key TEXT,
  subject_ids TEXT,
  referral_code TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الإعدادات ───
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── تقدم الدروس ───
CREATE TABLE IF NOT EXISTS lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TEXT,
  last_position REAL DEFAULT 0,
  watch_percent REAL DEFAULT 0,
  completed_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(user_id, lesson_id)
);

-- ─── المفضلة ───
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(user_id, lesson_id)
);

-- ─── سجل النقاط ───
CREATE TABLE IF NOT EXISTS points_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── طلبات المعلمين ───
CREATE TABLE IF NOT EXISTS teacher_applications (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── رسائل الاتصال ───
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── سجل المحادثات ───
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الإحالات ───
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  ambassador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL,
  reward REAL DEFAULT 0,
  status TEXT DEFAULT 'qualified',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الخطط ───
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
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
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(section, key)
);

-- ─── العروض ───
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  badge TEXT,
  discount_text TEXT,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── المتغيرات ───
CREATE TABLE IF NOT EXISTS variants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── نقاشات المواد ───
CREATE TABLE IF NOT EXISTS subject_discussions (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── مواد المعلمين ───
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(teacher_id, subject_id, grade_id)
);

-- ─── حالة الدروس ───
CREATE TABLE IF NOT EXISTS lesson_status (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TEXT,
  reviewed_at TEXT,
  review_notes TEXT
);

-- ─── حالة الاختبارات ───
CREATE TABLE IF NOT EXISTS exam_status (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL UNIQUE REFERENCES exams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TEXT,
  reviewed_at TEXT,
  review_notes TEXT
);

-- ─── الواجبات ───
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  due_date TEXT NOT NULL,
  max_score INTEGER DEFAULT 100,
  allow_late INTEGER DEFAULT 1,
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_extensions TEXT DEFAULT '.pdf,.doc,.docx,.jpg,.png',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── تسليمات الواجبات ───
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT,
  file_name TEXT,
  note TEXT,
  grade INTEGER,
  feedback TEXT,
  status TEXT DEFAULT 'submitted',
  submitted_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  graded_at TEXT,
  graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, user_id)
);

-- ─── الفصول الدراسية ───
CREATE TABLE IF NOT EXISTS classrooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_year TEXT DEFAULT '2025-2026',
  semester TEXT DEFAULT 'الأول',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── طلاب الفصول ───
CREATE TABLE IF NOT EXISTS classroom_students (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(classroom_id, user_id)
);

-- ─── إعلانات الفصول ───
CREATE TABLE IF NOT EXISTS class_announcements (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الجدول ───
CREATE TABLE IF NOT EXISTS schedule (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER REFERENCES classrooms(id) ON DELETE SET NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الشارات ───
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points_required INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── شارات المستخدمين ───
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(user_id, badge_id)
);

-- ─── المستويات ───
CREATE TABLE IF NOT EXISTS levels (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  icon TEXT
);

-- ─── النقاشات ───
CREATE TABLE IF NOT EXISTS discussions (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_reported INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── سجل المراجعة ───
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── ملاحظات المستخدمين ───
CREATE TABLE IF NOT EXISTS user_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(user_id, lesson_id)
);

-- ─── التحقق من البريد ───
CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── إعادة تعيين كلمة المرور ───
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── تذاكر الدعم ───
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  updated_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── رسائل التذاكر ───
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الفواتير ───
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'OMR',
  items TEXT,
  status TEXT DEFAULT 'issued',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── خطط الدراسة ───
CREATE TABLE IF NOT EXISTS study_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── عناصر خطط الدراسة ───
CREATE TABLE IF NOT EXISTS study_plan_items (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  exam_id INTEGER REFERENCES exams(id) ON DELETE SET NULL,
  day_of_week INTEGER,
  time_slot TEXT,
  duration_minutes INTEGER DEFAULT 30,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── سجل الأخطاء ───
CREATE TABLE IF NOT EXISTS mistakes_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_id INTEGER,
  times_wrong INTEGER DEFAULT 1,
  times_correct INTEGER DEFAULT 0,
  last_reviewed TEXT,
  next_review TEXT,
  mastered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الرفع ───
CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  path TEXT NOT NULL,
  purpose TEXT DEFAULT 'attachment',
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── الكوبونات ───
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT DEFAULT 'percentage',
  discount_value REAL NOT NULL,
  min_amount REAL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  active INTEGER DEFAULT 1,
  plan_ids TEXT,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── ملاحظات الطلاب ───
CREATE TABLE IF NOT EXISTS student_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC'),
  updated_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── أحداث التقويم ───
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  reference_id INTEGER,
  event_date TEXT NOT NULL,
  event_time TEXT,
  reminder INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ─── المراجعات ───
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now() AT TIME ZONE 'UTC')
);

-- ═══════════════════════════════════════════════════════════
-- الفهارس (Indexes)
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON lessons(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_grade ON questions(grade_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson ON questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_exams_grade ON exams(grade_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_user ON user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_subject ON user_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_points_log_user ON points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_grade ON assignments(grade_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom ON classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_user ON classroom_students(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON mistakes_log(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_lesson ON reviews(lesson_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_grade ON live_sessions(grade_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_subject ON live_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ambassador ON referrals(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_subject_discussions_subject ON subject_discussions(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_user ON student_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_items_plan ON study_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_class_announcements_classroom ON class_announcements(classroom_id);
CREATE INDEX IF NOT EXISTS idx_schedule_teacher ON schedule(teacher_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
