// ===== تجريد بوابة الدفع (PaymentProvider) =====
// يدعم: Mock (تطوير), MyFatoorah (إنتاج — عُمان والخليج)
// غيّر PAYMENT_PROVIDER في .env إلى "myfatoorah" للتشغيل الفعلي
// ضع MYFATOORAH_API_KEY و FRONTEND_URL في .env

import { MyFatoorahProvider } from './myfatoorah.js';

/**
 * واجهة الموفر المتوقعة:
 * async createPayment({ user, amount, currency, plan_key, subject_ids })
 *   → { provider_ref, payment_url, status: 'pending' | 'paid', provider, meta }
 */

export class MockProvider {
  constructor() {
    this.name = 'mock';
  }

  async createPayment({ amount, currency, plan_key, subject_ids, user }) {
    const ref = `MOCK-${Date.now()}-${user?.id ?? 'guest'}`;
    return { provider_ref: ref, status: 'paid', provider: this.name, meta: { amount, currency, plan_key, subject_ids } };
  }
}

const PROVIDERS = {
  mock: () => new MockProvider(),
  myfatoorah: () => new MyFatoorahProvider(),
};

export function getPaymentProvider(name) {
  const providerName = (name || process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  const factory = PROVIDERS[providerName];
  if (!factory) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `PAYMENT_PROVIDER "${providerName}" is not recognized. ` +
        'Set PAYMENT_PROVIDER to a valid provider name in your environment variables.'
      );
    }
    return new MockProvider();
  }
  if (providerName === 'mock' && process.env.NODE_ENV === 'production') {
    throw new Error(
      'MockProvider must not be used in production. ' +
      'Set PAYMENT_PROVIDER to a real payment provider (e.g. "myfatoorah").'
    );
  }
  return factory();
}
