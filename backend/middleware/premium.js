import db from '../db.js';

// هل المستخدم مخوّل للوصول لمحتوى مادة معينة؟
// المشرف والمعلم يصلان دائماً، والطالب يحتاج اشتراكاً سارياً في المادة.
export function canAccessSubject(user, subjectId) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'teacher') return true;
  const row = db.prepare(`
    SELECT id FROM user_subjects
    WHERE user_id = ? AND subject_id = ?
      AND (expires_at IS NULL OR expires_at >= date('now'))
  `).get(user.id, Number(subjectId));
  return !!row;
}

// وسيط تحقق: يقبل دالة تُرجع subject_id من الطلب، ويعيد 403 مع بيانات المادة
// ليعرض العميل شاشة الاشتراك بدل المحتوى.
export function requireSubjectAccess(subjectIdProvider) {
  return (req, res, next) => {
    const subjectId = subjectIdProvider(req);
    if (subjectId === undefined || subjectId === null) return next();
    if (canAccessSubject(req.user ?? null, subjectId)) return next();
    const subject = db.prepare('SELECT id, name, icon FROM subjects WHERE id = ?').get(Number(subjectId));
    return res.status(403).json({
      error: `المحتوى مميز — تحتاج اشتراكاً في مادة ${subject?.name ?? ''} للوصول إليه`,
      locked: true,
      subject_id: Number(subjectId),
      subject_name: subject?.name ?? null,
      subject_icon: subject?.icon ?? null,
    });
  };
}

// هل الدرس عينة مجانية متاحة للجميع حتى بدون اشتراك؟
export function isSampleLesson(lessonId) {
  return !!db.prepare('SELECT id FROM lessons WHERE id = ? AND is_sample = 1').get(Number(lessonId));
}

// إضافة راية القفل لقائمة عناصر (دروس/ملفات/اختبارات) حسب اشتراك المستخدم
export function withLockFlag(items, user) {
  return items.map((it) => {
    if (it.subject_id === undefined || it.subject_id === null) return { ...it, locked: false, sample: false };
    const locked = !canAccessSubject(user, it.subject_id);
    return {
      ...it,
      locked: it.is_sample ? false : locked,
      sample: !!it.is_sample,
    };
  });
}