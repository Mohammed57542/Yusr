import db from '../db.js';

// الصلاحيات المطلوبة لكل دور
const PERMISSIONS = {
  student: [
    'read:own_profile', 'update:own_profile',
    'read:subjects', 'read:lessons', 'read:units',
    'read:exams', 'take:exams', 'read:own_results',
    'read:live_sessions', 'join:live_sessions',
    'manage:favorites', 'read:own_favorites',
    'read:resources', 'read:notifications', 'manage:own_notifications',
    'read:leaderboard', 'read:own_points',
    'submit:discussion', 'read:discussions',
  ],
  teacher: [
    'read:own_profile', 'update:own_profile',
    'read:assigned_subjects', 'read:assigned_grades',
    'manage:own_lessons', 'create:lessons', 'update:own_lessons', 'delete:own_lessons',
    'manage:own_questions', 'create:questions', 'update:own_questions', 'delete:own_questions',
    'manage:own_exams', 'create:exams', 'update:own_exams', 'delete:own_exams',
    'read:exam_analytics', 'read:student_progress',
    'manage:own_sessions', 'create:sessions', 'update:own_sessions', 'delete:own_sessions',
    'read:students_in_subject', 'read:student_results_in_subject',
  ],
  admin: [
    'manage:all', 'manage:users', 'manage:teachers', 'manage:students',
    'manage:all_content', 'manage:grades', 'manage:subjects', 'manage:units',
    'manage:all_lessons', 'approve:lessons', 'publish:lessons',
    'manage:all_exams', 'approve:exams', 'publish:exams',
    'manage:all_sessions', 'manage:subscriptions', 'manage:payments',
    'manage:resources', 'manage:settings', 'manage:notifications',
    'read:reports', 'export:reports', 'read:audit_log',
    'manage:groups', 'manage:offers',
  ],
};

// تحقق من الصلاحية
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'غير مصرح بالدخول' });
    const role = req.user.role;
    if (role === 'admin') return next(); // Admin يملك كل الصلاحيات
    const perms = PERMISSIONS[role] || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذا العمل' });
    }
    next();
  };
}

// تحقق من أن المستخدم معلم المادة
export function requireTeacherSubject(req, res, next) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'فقط المعلمون يمكنهم الوصول' });
  }
  const teacherSubjects = db.prepare('SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?')
    .all(req.user.id).map(r => r.subject_id);
  req.teacherSubjects = teacherSubjects;
  next();
}

// تحقق من أن المعلم يملك المادة المطلوبة
export function requireSubjectOwnership(subjectIdParam = 'subject_id') {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'صلاحية غير كافية' });
    const subjectId = Number(req.params[subjectIdParam] || req.body[subjectIdParam]);
    if (!subjectId) return next();
    const owns = db.prepare('SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?')
      .get(req.user.id, subjectId);
    if (!owns) return res.status(403).json({ error: 'أنت لا تدرس هذه المادة' });
    next();
  };
}

// تحقق من أن المعلم يملك الدرس
export function requireLessonOwnership(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'صلاحية غير كافية' });
  const lessonId = Number(req.params.id);
  if (!lessonId) return next();
  const lesson = db.prepare('SELECT subject_id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'الدرس غير موجود' });
  const owns = db.prepare('SELECT 1 FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?')
    .get(req.user.id, lesson.subject_id);
  if (!owns) return res.status(403).json({ error: 'أنت لا تملك هذا الدرس' });
  next();
}

// تحقق من أن المعلم يملك الاختبار
export function requireExamOwnership(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'صلاحية غير كافية' });
  const examId = Number(req.params.id || req.params.examId);
  if (!examId) return next();
  const exam = db.prepare('SELECT subject_id, created_by FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  if (exam.created_by && exam.created_by !== req.user.id) {
    return res.status(403).json({ error: 'أنت لا تملك هذا الاختبار' });
  }
  next();
}

// تحقق من أن المستخدم يرى فقط طلاب مواده (للمعلم)
export function filterTeacherStudents(teacherId, studentQuery) {
  const subjectIds = db.prepare('SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?')
    .all(teacherId).map(r => r.subject_id);
  if (subjectIds.length === 0) return [];
  const placeholders = subjectIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT DISTINCT u.* FROM users u
    JOIN exam_results er ON er.user_id = u.id
    JOIN exams e ON e.id = er.exam_id AND e.subject_id IN (${placeholders})
    WHERE u.role = 'student'
    UNION
    SELECT DISTINCT u.* FROM users u
    JOIN lesson_progress lp ON lp.user_id = u.id
    JOIN lessons l ON l.id = lp.lesson_id AND l.subject_id IN (${placeholders})
    WHERE u.role = 'student'
  `).all(...subjectIds, ...subjectIds);
}

export { PERMISSIONS };
