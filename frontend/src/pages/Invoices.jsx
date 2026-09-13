import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs, Loading, EmptyState } from '../components/common';

const STATUS_MAP = {
  issued: { label: 'صادرة', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'مدفوعة', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ملغاة', color: 'bg-red-100 text-red-700' },
};

function formatDate(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function InvoiceDetail({ invoice, onBack }) {
  const handleDownload = () => {
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>فاتورة #${invoice.invoice_number}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1e293b; direction: rtl; }
   .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #0d9488; padding-bottom: 20px; }
   .header h1 { font-size: 28px; color: #0d9488; margin: 0; }
  .header .logo { font-size: 36px; }
  .meta { margin-bottom: 30px; }
  .meta p { margin: 5px 0; font-size: 14px; color: #64748b; }
  .meta strong { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { padding: 12px 16px; text-align: right; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  th { background: #f8fafc; color: #475569; font-weight: 700; }
   .total-row td { border-top: 2px solid #0d9488; font-weight: 800; font-size: 18px; color: #0d9488; }
  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
  .status { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .status-paid { background: #dcfce7; color: #15803d; }
  .status-issued { background: #dbeafe; color: #1d4ed8; }
  .status-cancelled { background: #fee2e2; color: #dc2626; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>فاتورة ضريبية</h1>
      <p style="color:#64748b; margin-top:8px;">منصة يسر</p>
    </div>
    <div class="logo">🧾</div>
  </div>
  <div class="meta">
    <p><strong>رقم الفاتورة:</strong> #${invoice.invoice_number}</p>
    <p><strong>التاريخ:</strong> ${formatDate(invoice.date)}</p>
    <p><strong>الحالة:</strong> <span class="status status-${invoice.status}">${STATUS_MAP[invoice.status]?.label || invoice.status}</span></p>
    ${invoice.description ? `<p><strong>الوصف:</strong> ${invoice.description}</p>` : ''}
  </div>
  <table>
    <thead>
      <tr><th>البيان</th><th>المبلغ (ر.ع)</th></tr>
    </thead>
    <tbody>
      <tr><td>${invoice.description || 'اشتراك تعليمي'}</td><td>${invoice.amount}</td></tr>
      <tr class="total-row"><td>الإجمالي</td><td>${invoice.amount} ر.ع</td></tr>
    </tbody>
  </table>
  <div class="footer">
    <p>منصة يسر — جميع الحقوق محفوظة</p>
    <p>هذا مستند إلكتروني صالح بدون توقيع</p>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">→</button>
        <div>
          <h2 className="text-xl font-black text-slate-900">فاتورة #{invoice.invoice_number}</h2>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${STATUS_MAP[invoice.status]?.color || 'bg-slate-100 text-slate-600'}`}>
            {STATUS_MAP[invoice.status]?.label || invoice.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-1">رقم الفاتورة</p>
          <p className="font-extrabold text-slate-900">#{invoice.invoice_number}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-1">التاريخ</p>
          <p className="font-extrabold text-slate-900" dir="ltr">{formatDate(invoice.date)}</p>
        </div>
        <div className="bg-teal-50 rounded-2xl p-4">
          <p className="text-xs text-teal-600 mb-1">المبلغ</p>
          <p className="font-black text-2xl text-teal-700">{invoice.amount} <span className="text-sm font-bold">ر.ع</span></p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-1">الحالة</p>
          <p className="font-extrabold text-slate-900">{STATUS_MAP[invoice.status]?.label || invoice.status}</p>
        </div>
      </div>

      {invoice.description && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-1">الوصف</p>
          <p className="font-bold text-slate-700 text-sm">{invoice.description}</p>
        </div>
      )}

      <button onClick={handleDownload} className="w-full bg-gradient-to-l from-teal-600 to-cyan-600 text-white font-extrabold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-lg shadow-teal-200">
        📄 تحميل الفاتورة (PDF)
      </button>
    </div>
  );
}

export default function Invoices() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    api.get('/invoices')
      .then((r) => setInvoices(r.invoices || r || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (!user) return null;
  if (loading) return <Loading />;

  if (selectedInvoice) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14" dir="rtl">
        <Breadcrumbs items={[{ label: 'فواتيري', href: '/invoices' }, { label: `فاتورة #${selectedInvoice.invoice_number}` }]} />
        <InvoiceDetail invoice={selectedInvoice} onBack={() => setSelectedInvoice(null)} />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-bold mb-5">المالية والفوترة</span>
          <h1 className="text-4xl md:text-5xl font-black mb-4">🧾 فواتيري</h1>
          <p className="text-teal-100 text-lg max-w-2xl mx-auto">تتبع فواتيرك وحمّل نسخ منها في أي وقت.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <p className="text-5xl mb-3">🧾</p>
            <h3 className="font-bold text-slate-700 mb-1">لا توجد فواتير بعد</h3>
            <p className="text-slate-500 text-sm">ستظهر فواتيرك هنا بعد إتمام أي عملية دفع.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="w-full text-right bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl shrink-0">🧾</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-extrabold text-slate-900">فاتورة #{inv.invoice_number}</h3>
                    <span className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_MAP[inv.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_MAP[inv.status]?.label || inv.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm font-bold text-teal-700">{inv.amount} ر.ع</span>
                    <span className="text-xs text-slate-400" dir="ltr">{formatDate(inv.date)}</span>
                  </div>
                </div>
                <span className="text-slate-300 shrink-0">←</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: '✅', label: 'دفع آمن' },
            { icon: '📄', label: 'تحميل فوري' },
            { icon: '🔒', label: 'بيانات مشفّرة' },
          ].map((x) => (
            <div key={x.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
              <p className="text-2xl mb-2">{x.icon}</p>
              <p className="text-xs font-bold text-slate-600">{x.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
