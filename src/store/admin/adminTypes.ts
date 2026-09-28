import type { UserRole } from '@/types/User';

// Koze: types for the owner-only administration screens.
export interface AdminAgent {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  confirmed: boolean;
}

export interface CreateAgentPayload {
  name: string;
  email: string;
  password: string;
}

export interface CreateAgentResponse extends AdminAgent {
  // True when the email already had a Koze account: that person keeps their own password.
  existing_user: boolean;
}

export interface TelegramInboxPayload {
  name: string;
  botToken: string;
}

export interface WhatsAppInboxPayload {
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiKey: string;
}
