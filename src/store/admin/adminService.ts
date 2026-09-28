import { AxiosError } from 'axios';

import { apiService } from '@/services/APIService';
import I18n from '@/i18n';
import { showToast } from '@/utils/toastUtils';
import type {
  AdminAgent,
  CreateAgentPayload,
  CreateAgentResponse,
  TelegramInboxPayload,
  WhatsAppInboxPayload,
} from './adminTypes';

// Koze: account administration for the owner. Callers show the server's own error message
// with showAdminError instead of the generic "could not connect" toast.
const ownErrors = { skipErrorToast: true };

export class AdminService {
  static async listAgents(): Promise<AdminAgent[]> {
    const response = await apiService.get<AdminAgent[]>('agents', ownErrors);
    return response.data;
  }

  // Custom Koze endpoint: creates the agent with a temporary password chosen by the owner.
  static async createAgent(payload: CreateAgentPayload): Promise<CreateAgentResponse> {
    const response = await apiService.post<CreateAgentResponse>('koze_agents', payload, ownErrors);
    return response.data;
  }

  static async removeAgent(agentId: number): Promise<void> {
    await apiService.delete(`agents/${agentId}`, ownErrors);
  }

  // Both inbox creators return the new inbox's id.
  static async createTelegramInbox({ name, botToken }: TelegramInboxPayload): Promise<number> {
    const response = await apiService.post<{ id: number }>(
      'inboxes',
      { name, channel: { type: 'telegram', bot_token: botToken } },
      ownErrors,
    );
    return response.data.id;
  }

  static async createWhatsAppInbox(payload: WhatsAppInboxPayload): Promise<number> {
    const response = await apiService.post<{ id: number }>(
      'inboxes',
      {
        name: payload.name,
        channel: {
          type: 'whatsapp',
          phone_number: payload.phoneNumber,
          provider: 'whatsapp_cloud',
          provider_config: {
            api_key: payload.apiKey,
            phone_number_id: payload.phoneNumberId,
            business_account_id: payload.businessAccountId,
          },
        },
      },
      ownErrors,
    );
    return response.data.id;
  }

  static async getInboxMemberIds(inboxId: number): Promise<number[]> {
    const response = await apiService.get<{ payload: AdminAgent[] }>(
      `inbox_members/${inboxId}`,
      ownErrors,
    );
    return response.data.payload.map(agent => agent.id);
  }

  // Replaces the inbox's members with exactly these agents.
  static async setInboxMembers(inboxId: number, userIds: number[]): Promise<void> {
    await apiService.patch('inbox_members', { inbox_id: inboxId, user_ids: userIds }, ownErrors);
  }
}

// Chatwoot answers admin errors as { message }, { error } or { errors: [...] }. Without a
// response the API service has already shown the "could not connect" toast.
export function showAdminError(error: unknown) {
  const { response } = error as AxiosError<{ message?: string; error?: string; errors?: string[] }>;
  if (!response) return;
  const data = response.data;
  showToast({
    message: data?.message || data?.error || data?.errors?.[0] || I18n.t('ERRORS.COMMON_ERROR'),
  });
}
