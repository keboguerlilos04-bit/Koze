import type { UserRole } from '@/types/User';

// Koze: types for the owner-only administration screens.
export interface AdminAgent {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  confirmed: boolean;
}

export type WeekDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

// Weekly working hours ("HH:MM"); a day missing from `days` is a day off.
export interface WorkSchedule {
  timezone: string;
  days: Partial<Record<WeekDay, { start: string; end: string }>>;
}

// A member of the team as the owner sees it (server: koze_agents index).
export interface TeamMember extends AdminAgent {
  phone_number: string | null;
  is_owner: boolean;
  availability_status: 'online' | 'offline' | 'busy';
  paused: boolean;
  schedule: WorkSchedule | null;
  working_now: boolean;
}

export interface TeamResponse {
  limits: { agents: number; administrators: number };
  agents: TeamMember[];
}

export interface UpdateMemberPayload {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
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
