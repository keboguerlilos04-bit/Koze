import { formatDuration, ReportsService } from '@/store/reports/reportsService';
import { apiService } from '@/services/APIService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn() },
}));

describe('ReportsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the v2 reports API for the chosen number of days', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000_000_000);
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: { conversations_count: 4 } });

    const report = await ReportsService.summary(7, 30);

    expect(report.conversations_count).toBe(4);
    expect(apiService.get).toHaveBeenCalledWith('api/v2/accounts/7/reports/summary', {
      params: { type: 'account', since: 1_000_000_000 - 30 * 86_400, until: 1_000_000_000 },
      skipErrorToast: true,
    });
  });

  it('reads the open conversation counts', async () => {
    const meta = { mine_count: 1, unassigned_count: 2, all_count: 5 };
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: { meta } });

    await expect(ReportsService.openConversations()).resolves.toEqual(meta);
  });
});

describe('formatDuration', () => {
  it.each([
    [null, '—'],
    [42, '42 s'],
    [600, '10 min'],
    [3725, '1 h 2 min'],
    [7200, '2 h'],
    [90_000, '1 j 1 h'],
  ])('formats %p seconds as %p', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
