import { apiService } from '@/services/APIService';

// Koze: MonCash payments that unlock inbox creation (server: koze_payments_controller.rb).
export interface BillingSummary {
  moncash_number: string | null;
  price: number;
  currency: 'HTG';
  period_days: number;
  // 'simulated' until MonCash merchant keys are configured on the server.
  gateway: string;
  // Successful payments not yet used by an inbox.
  available_credits: number;
}

export interface MonCashPayment {
  id: string;
  amount: number;
  currency: 'HTG';
  moncash_number: string;
  status: 'pending' | 'success' | 'failed';
  // Set by the real MonCash gateway: the page where the customer approves the payment.
  redirect_url: string | null;
}

type PaymentResponse = BillingSummary & { payment: MonCashPayment };

const ownErrors = { skipErrorToast: true };

export class BillingService {
  static async summary(): Promise<BillingSummary> {
    const response = await apiService.get<BillingSummary>('koze_payments', ownErrors);
    return response.data;
  }

  static async startPayment(): Promise<PaymentResponse> {
    const response = await apiService.post<PaymentResponse>('koze_payments', {}, ownErrors);
    return response.data;
  }

  // For accounts created before signup asked for it. Accepts "+509 3712-3456" or "37123456".
  static async setMoncashNumber(moncashNumber: string): Promise<BillingSummary> {
    const response = await apiService.patch<BillingSummary>(
      'koze_payments/moncash',
      { moncash_number: moncashNumber },
      ownErrors,
    );
    return response.data;
  }

  static async confirmPayment(paymentId: string): Promise<PaymentResponse> {
    const response = await apiService.post<PaymentResponse>(
      `koze_payments/${paymentId}/confirm`,
      {},
      ownErrors,
    );
    return response.data;
  }
}
