import { NewConversationService } from '@/store/new-conversation/newConversationService';
import { apiService } from '@/services/APIService';

jest.mock('@/services/APIService', () => ({
  apiService: { get: jest.fn(), post: jest.fn() },
}));

const ownErrors = { skipErrorToast: true };
const templateParams = {
  name: 'hello_world',
  language: 'en_US',
  category: 'UTILITY',
  processed_params: { body: { '1': 'Jean' } },
};

describe('NewConversationService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reuses the contact with the same phone number', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: { payload: [{ id: 9, phone_number: '+50937000001' }] },
    });

    await expect(
      NewConversationService.findOrCreateContact('+50937000001', 'Jean'),
    ).resolves.toBe(9);
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('creates the contact when no one has that number', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: { payload: [{ id: 9, phone_number: '+50937000999' }] },
    });
    (apiService.post as jest.Mock).mockResolvedValueOnce({
      data: { payload: { contact: { id: 12, phone_number: '+50937000001' } } },
    });

    await expect(NewConversationService.findOrCreateContact('+50937000001', '')).resolves.toBe(12);
    expect(apiService.post).toHaveBeenCalledWith(
      'contacts',
      { name: '+50937000001', phone_number: '+50937000001' },
      ownErrors,
    );
  });

  it('starts the conversation with the template as first message', async () => {
    (apiService.get as jest.Mock).mockResolvedValueOnce({
      data: { payload: [{ id: 9, phone_number: '+50937000001' }] },
    });
    (apiService.post as jest.Mock).mockResolvedValueOnce({ data: { id: 31 } });

    const conversationId = await NewConversationService.start({
      inboxId: 4,
      phoneNumber: '+50937000001',
      contactName: 'Jean',
      message: 'Hello Jean',
      templateParams,
    });

    expect(conversationId).toBe(31);
    expect(apiService.post).toHaveBeenCalledWith(
      'conversations',
      {
        inbox_id: 4,
        contact_id: 9,
        message: { content: 'Hello Jean', template_params: templateParams },
      },
      ownErrors,
    );
  });
});
