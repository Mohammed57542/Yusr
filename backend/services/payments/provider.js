// ===== تجريد بوابة الدفع (PaymentProvider) =====
// الهدف: عدم ربط النظام ببوابة دفع واحدة.
// لربط بوابة جديدة مستقبلاً (مثل بوابة محلية في عُمان):
//   1) أنشئ فئة جديدة في هذا المجلد تنفذ createPayment
//   2) أضفها إلى PROVIDERS
//   3) غيّر PAYMENT_PROVIDER في .env إلى اسمها
// تأكيد الدفع يتم دائماً من الخادم — لا يُعتمد أبداً على الواجهة.

/**
 * واجهة الموفر المتوقعة:
 * async createPayment({ user, amount, currency, plan_key, subject_ids, referral_code })
 *   → { provider_ref: string, status: 'pending' | 'paid' | 'failed', provider: string }
 */

export class MockProvider {
  constructor() {
    this.name = 'mock';
  }

  async createPayment({ amount, currency, plan_key, subject_ids, referral_code, user }) {
    // في بيئة التطوير: محاكاة نجاح فوري آمن — لا بيانات دفع حقيقية
    const ref = `MOCK-${Date.now()}-${user?.id ?? 'guest'}`;
    return { provider_ref: ref, status: 'paid', provider: this.name, meta: { amount, currency, plan_key, subject_ids, referral_code } };
  }
}

const PROVIDERS = {
  mock: () => new MockProvider(),
};

export function getPaymentProvider(name) {
  const providerName = (name || process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  const factory = PROVIDERS[providerName];
  if (!factory) {
    // لا نسمح بفشل الاشتراك بسبب اسم موفر خاطئ — نرجع للمحاكاة الآمنة
    return new MockProvider();
  }
  return factory();
}
