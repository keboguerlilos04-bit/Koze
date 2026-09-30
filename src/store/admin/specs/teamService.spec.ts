import { AdminService } from '@/store/admin/adminService';
import { apiService } from '@/services/APIService';
import teamPresenceReducer, { setTeamPresence } from '@/store/team-presence/teamPresenceSlice';

jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/utils/toastUtils', () => ({ showToast: jest.fn() }));
jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() },
}));

const ownErrors = { skipErrorToast: true };

describe('AdminService team management', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the team with its limits', async () => {
    const team = { limits: { agents: 3, administrators: 2 }, agents: [] };
    (apiService.get as jest.Mock).mockResolvedValueOnce({ data: team });

    await expect(AdminService.team()).resolves.toEqual(team);
    expect(apiService.get).toHaveBeenCalledWith('koze_agents', ownErrors);
  });

  it("edits a member's contact details and password", async () => {
    (apiService.patch as jest.Mock).mockResolvedValueOnce({ data: { id: 5 } });
    const payload = {
      name: 'Emi',
      email: 'emi@example.com',
      phone_number: '+50937001122',
      gender: 'female' as const,
    };

    await AdminService.updateMember(5, payload);

    expect(apiService.patch).toHaveBeenCalledWith('koze_agents/5', payload, ownErrors);
  });

  it("gets a one-time code to reset a member's password", async () => {
    const code = { code: '654321', expires_at: '2026-10-01T12:00:00Z' };
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: code });

    await expect(AdminService.resetPassword(5)).resolves.toEqual(code);
    expect(apiService.post).toHaveBeenCalledWith('koze_agents/5/reset_password', {}, ownErrors);
  });

  it('pauses and resumes an agent', async () => {
    (apiService.post as jest.Mock).mockResolvedValue({ data: { id: 5 } });

    await AdminService.setPaused(5, true);
    await AdminService.setPaused(5, false);

    expect(apiService.post).toHaveBeenNthCalledWith(1, 'koze_agents/5/pause', {}, ownErrors);
    expect(apiService.post).toHaveBeenNthCalledWith(2, 'koze_agents/5/resume', {}, ownErrors);
  });

  it('saves and removes working hours', async () => {
    (apiService.put as jest.Mock).mockResolvedValue({ data: { id: 5 } });
    const schedule = {
      timezone: 'America/Port-au-Prince',
      days: { mon: { start: '08:00', end: '17:00' } },
    };

    await AdminService.setSchedule(5, schedule);
    await AdminService.setSchedule(5, null);

    expect(apiService.put).toHaveBeenNthCalledWith(
      1,
      'koze_agents/5/schedule',
      { schedule },
      ownErrors,
    );
    expect(apiService.put).toHaveBeenNthCalledWith(
      2,
      'koze_agents/5/schedule',
      { schedule: null },
      ownErrors,
    );
  });
});

describe('teamPresence slice', () => {
  it('keeps the latest status of every user from presence events', () => {
    const state = teamPresenceReducer(undefined, setTeamPresence({ 5: 'online', 7: 'busy' }));
    expect(state.users).toEqual({ 5: 'online', 7: 'busy' });

    const next = teamPresenceReducer(state, setTeamPresence({ 5: 'offline' }));
    expect(next.users).toEqual({ 5: 'offline' });
  });
});
