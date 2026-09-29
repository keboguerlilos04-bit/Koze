import { apiService } from '@/services/APIService';
import type { TemplateSendParams } from '@/types';

// Koze: start a WhatsApp conversation from the app. WhatsApp only lets a business write
// first with an approved template, so the first message is always a template.
interface ContactPayload {
  id: number;
  phone_number: string | null;
}

export interface StartConversationPayload {
  inboxId: number;
  phoneNumber: string;
  contactName: string;
  message: string;
  templateParams: TemplateSendParams;
}

const ownErrors = { skipErrorToast: true };

export class NewConversationService {
  // Reuses the contact with this exact phone number, or creates one.
  static async findOrCreateContact(phoneNumber: string, name: string): Promise<number> {
    const search = await apiService.get<{ payload: ContactPayload[] }>('contacts/search', {
      params: { q: phoneNumber },
      ...ownErrors,
    });
    const existing = search.data.payload.find(contact => contact.phone_number === phoneNumber);
    if (existing) return existing.id;

    const created = await apiService.post<{ payload: { contact: ContactPayload } }>(
      'contacts',
      { name: name || phoneNumber, phone_number: phoneNumber },
      ownErrors,
    );
    return created.data.payload.contact.id;
  }

  // Returns the new conversation's id, which opens it in the chat screen.
  static async start(payload: StartConversationPayload): Promise<number> {
    const contactId = await NewConversationService.findOrCreateContact(
      payload.phoneNumber,
      payload.contactName,
    );
    const response = await apiService.post<{ id: number }>(
      'conversations',
      {
        inbox_id: payload.inboxId,
        contact_id: contactId,
        message: { content: payload.message, template_params: payload.templateParams },
      },
      ownErrors,
    );
    return response.data.id;
  }
}
