import { useState, useRef } from 'react';
import { api } from '../api/client';

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_PDF = ['application/pdf'];
const MAX_SIZE_MB = 100;

export default function FileUpload({ type = 'video', lessonId, onUpload, className = '' }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  const isVideo = type === 'video';
  const accept = isVideo ? 'video/mp4,video/webm,video/ogg' : 'application/pdf';
  const label = isVideo ? 'فيديو الدرس' : 'ملف PDF';

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setProgress(0);

    const allowed = isVideo ? ALLOWED_VIDEO : ALLOWED_PDF;
    if (!allowed.includes(file.mimetype)) {
      setError(isVideo ? 'الصيغة غير مدعومة. استخدم MP4 أو WebM' : 'الصيغة غير مدعومة. استخدم PDF');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`حجم الملف يتجاوز ${MAX_SIZE_MB} ميجابايت`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', isVideo ? 'lesson_video' : 'lesson_pdf');

      const xhr = new XMLHttpRequest();
      const promise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.error || 'فشل الرفع'));
          } catch {
            reject(new Error('خطأ في الاستجابة'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('خطأ في الشبكة')));
      });

      xhr.open('POST', '/api/uploads');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('yusr_token')}`);
      xhr.send(formData);

      const uploadResult = await promise;

      if (lessonId) {
        await api.post(`/uploads/${uploadResult.id}/link-lesson`, {
          lesson_id: lessonId,
          field: isVideo ? 'video' : 'pdf',
        });
      }

      setSuccess(`تم رفع ${label} بنجاح`);
      if (fileRef.current) fileRef.current.value = '';
      onUpload?.(uploadResult);
    } catch (err) {
      setError(err.message || 'خطأ في الرفع');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={`border-2 border-dashed rounded-2xl p-4 transition-colors ${error ? 'border-red-300 bg-red-50' : success ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-teal-300 bg-slate-50'} ${className}`}>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
        id={`upload-${type}-${lessonId || 'new'}`}
        disabled={uploading}
      />
      <label
        htmlFor={`upload-${type}-${lessonId || 'new'}`}
        className="cursor-pointer flex items-center gap-3"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${isVideo ? 'bg-teal-100' : 'bg-red-100'}`}>
          {uploading ? (
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          ) : isVideo ? '🎬' : '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800">
            {uploading ? `جارٍ الرفع... ${progress}%` : success || `رفع ${label}`}
          </p>
          <p className="text-xs text-slate-400">
            {uploading ? `${progress}% مكتمل` : `اضغط لاختيار ملف (حد أقصى ${MAX_SIZE_MB}MB)`}
          </p>
        </div>
        {uploading && (
          <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </label>
      {error && <p className="text-xs text-red-600 mt-2 font-bold">{error}</p>}
      {success && !uploading && <p className="text-xs text-green-600 mt-2 font-bold">{success}</p>}
    </div>
  );
}
