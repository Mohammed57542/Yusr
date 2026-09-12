// ===== MyFatoorah Payment Gateway Provider =====
// Production: api-om.myfatoorah.com (Oman)
// Docs: https://docs.myfatoorah.com/docs/execute-payment

const COUNTRY_API = {
  OMN: 'https://api-om.myfatoorah.com',
  KWT: 'https://api.myfatoorah.com',
  SAU: 'https://api-sa.myfatoorah.com',
  ARE: 'https://api.myfatoorah.com',
  BHR: 'https://api.myfatoorah.com',
  QAT: 'https://api-qa.myfatoorah.com',
  EGY: 'https://api-eg.myfatoorah.com',
  JOD: 'https://api.myfatoorah.com',
};

export class MyFatoorahProvider {
  constructor() {
    this.name = 'myfatoorah';
    this.apiKey = process.env.MYFATOORAH_API_KEY;
    this.country = process.env.MYFATOORAH_COUNTRY || 'OMN';
    this.testMode = process.env.MYFATOORAH_TEST_MODE === 'true';
    this.baseUrl = this.testMode
      ? 'https://apitest.myfatoorah.com'
      : (COUNTRY_API[this.country] || 'https://apitest.myfatoorah.com');
  }

  async _request(path, body) {
    const url = `${this.baseUrl}${path}`;
    const token = this.testMode
      ? 'rLtt6JWvbUHDDhsZnHPugsHpLuhpMnCj7p8rGAzcQxjwdGLJvyhzcdPiKCHucSfWCWIijFUXQX4YaBj0BQT6NtQAf1zaNNMPqA4Z8NYBzM0d'
      : this.apiKey;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.IsSuccess) {
      const msg = data.Message || 'MyFatoorah API error';
      const validation = data.ValidationErrors?.map((e) => `${e.Name}: ${e.Error}`).join('; ');
      throw new Error(validation ? `${msg} — ${validation}` : msg);
    }
    return data;
  }

  async createPayment({ user, amount, currency, plan_key, subject_ids }) {
    const reference = `YUSR-${user?.id ?? 'guest'}-${Date.now()}`;
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';

    const payment = await this._request('/v2/ExecutePayment', {
      PaymentMethodId: 2, // VISA/MC
      InvoiceValue: amount,
      CurrencyIso: currency || 'OMR',
      CustomerName: user?.name || 'Student',
      CustomerEmail: user?.email,
      CustomerReference: reference,
      Language: 'AR',
      CallBackUrl: `${baseUrl}/payment/success?ref=${reference}`,
      ErrorUrl: `${baseUrl}/payment/error?ref=${reference}`,
      InvoiceItems: [
        {
          ItemName: `اشتراك يُسر — ${plan_key || 'مواد'}`,
          Quantity: 1,
          UnitPrice: amount,
        },
      ],
    });

    return {
      provider_ref: reference,
      provider_invoice_id: payment.Data?.InvoiceId,
      payment_url: payment.Data?.PaymentURL,
      status: 'pending',
      provider: this.name,
      meta: { amount, currency, plan_key, subject_ids },
    };
  }

  async getPaymentStatus(invoiceId) {
    const data = await this._request('/v2/GetPaymentStatus', {
      Key: String(invoiceId),
      KeyType: 'InvoiceId',
    });

    const inv = data.Data?.InvoiceTransactions?.[0];
    return {
      status: inv?.PaymentStatus === 'Paid' ? 'paid' : inv?.PaymentStatus === 'Failed' ? 'failed' : 'pending',
      transaction_id: inv?.PaymentId,
      invoice_id: data.Data?.InvoiceId,
      amount: data.Data?.InvoiceValue,
    };
  }
}

// ===== Webhook signature verification =====
// Docs: https://docs.myfatoorah.com/docs/webhooks
import crypto from 'node:crypto';

export function verifyWebhookSignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  // استخدام timingSafeEqual لمنع هجمات الوقت
  if (hmac.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export function getStatusFromWebhook(payload) {
  return {
    status: payload.PaymentStatus?.toLowerCase() === 'paid' ? 'paid' : 'pending',
    invoice_id: payload.InvoiceId,
    payment_id: payload.PaymentId,
    amount: payload.InvoiceValue,
    reference: payload.CustomerReference,
  };
}
