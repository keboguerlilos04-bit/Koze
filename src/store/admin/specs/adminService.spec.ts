import { AdminService, showAdminError } from '@/store/admin/adminService';
import { apiService } from '@/services/APIService';
import { showToast } from '@/utils/toastUtils';

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/utils/toastUtils', () => ({
  showToast: jest.fn(),
}));

jest.mock('@/services/APIService', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const ownErrors = { skipErrorToast: true };

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an agent with a temporary password through the Koze endpoint', async () => {
    const payload = { name: 'Marie', email: 'marie@example.com', password: 'Agent#2026' };
    const created = { id: 3, ...payload, role: 'agent', confirmed: true, existing_user: false };
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: created });

    await expect(AdminService.createAgent(payload)).resolves.toEqual(created);
    expect(apiService.post).toHaveBeenCalledWith('koze_agents', payload, ownErrors);
  });

  it('removes an agent from the account', async () => {
    (apiService.delete as jest.Mock).mockResolvedValueOnce({});

    await AdminService.removeAgent(3);

    expect(apiService.delete).toHaveBeenCalledWith('agents/3', ownErrors);
  });

  it('creates a Telegram inbox from the bot token and returns its id', async () => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: { id: 12 } });

    const id = await AdminService.createTelegramInbox({ name: 'Boutik', botToken: '123:abc' });

    expect(id).toBe(12);
    expect(apiService.post).toHaveBeenCalledWith(
      'inboxes',
      { name: 'Boutik', channel: { type: 'telegram', bot_token: '123:abc' } },
      ownErrors,
    );
  });

  it('creates a WhatsApp Cloud inbox with its Meta credentials', async () => {
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: { id: 13 } });

    await AdminService.createWhatsAppInbox({
      name: 'WhatsApp Boutik',
      phoneNumber: '+50937000000',
      phoneNumberId: '111',
      businessAccountId: '222',
      apiKey: 'secret',
    });

    expect(apiService.post).toHaveBeenCalledWith(
      'inboxes',
      {
        name: 'WhatsApp Boutik',
        channel: {
          type: 'whatsapp',
          phone_number: '+50937000000',
          provider: 'whatsapp_cloud',
          provider_config: {
            api_key: 'secret',
            phone_number_id: '111',
            business_account_id: '222',
          },
        },
      },
      ownErrors,
    );
  });

  it('reads and replaces the members of an inbox', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: { payload: [{ id: 3 }, { id: 5 }] },
    });
    (apiService.patch as jest.Mock).mockResolvedValueOnce({});

    await expect(AdminService.getInboxMemberIds(12)).resolves.toEqual([3, 5]);
    await AdminService.setInboxMembers(12, [3]);

    expect(apiService.get).toHaveBeenCalledWith('inbox_members/12', ownErrors);
    expect(apiService.patch).toHaveBeenCalledWith(
      'inbox_members',
      { inbox_id: 12, user_ids: [3] },
      ownErrors,
    );
  });
});

describe('showAdminError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the server message', () => {
    showAdminError({ response: { data: { message: 'Only the account owner can add agents' } } });
    expect(showToast).toHaveBeenCalledWith({ message: 'Only the account owner can add agents' });
  });

  it('shows the first validation error', () => {
    showAdminError({ response: { data: { errors: ['Bot token is invalid'] } } });
    expect(showToast).toHaveBeenCalledWith({ message: 'Bot token is invalid' });
  });

  it('stays quiet when the server never answered', () => {
    showAdminError(new Error('Network Error'));
    expect(showToast).not.toHaveBeenCalled();
  });
});
