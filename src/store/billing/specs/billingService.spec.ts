import { BillingService } from '@/store/billing/billingService';
import { apiService } from '@/services/APIService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const ownErrors = { skipErrorToast: true };
const summary = {
  moncash_number: '+50937123456',
  price: 1500,
  currency: 'HTG',
  period_days: 30,
  gateway: 'simulated',
  available_credits: 0,
};

describe('BillingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the billing summary', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: summary });

    await expect(BillingService.summary()).resolves.toEqual(summary);
    expect(apiService.get).toHaveBeenCalledWith('koze_payments', ownErrors);
  });

  it('saves the MonCash number of an account created before signup asked for it', async () => {
    (apiService.patch as jest.Mock).mockResolvedValueOnce({ data: summary });

    await expect(BillingService.setMoncashNumber('+50937123456')).resolves.toEqual(summary);
    expect(apiService.patch).toHaveBeenCalledWith(
      'koze_payments/moncash',
      { moncash_number: '+50937123456' },
      ownErrors,
    );
  });

  it('starts a payment, then confirms it by id', async () => {
    const payment = { id: 'pay-1', status: 'pending', redirect_url: null };
    (apiService.post as jest.Mock)
      .mockResolvedValueOnce({ data: { ...summary, payment } })
      .mockResolvedValueOnce({
        data: { ...summary, available_credits: 1, payment: { ...payment, status: 'success' } },
      });

    const started = await BillingService.startPayment();
    const confirmed = await BillingService.confirmPayment(started.payment.id);

    expect(apiService.post).toHaveBeenNthCalledWith(1, 'koze_payments', {}, ownErrors);
    expect(apiService.post).toHaveBeenNthCalledWith(
      2,
      'koze_payments/pay-1/confirm',
      {},
      ownErrors,
    );
    expect(confirmed.payment.status).toBe('success');
    expect(confirmed.available_credits).toBe(1);
  });
});
