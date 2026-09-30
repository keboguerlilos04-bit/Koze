import type { Account } from './Account';
import type { AvailabilityStatus } from './common/AvailabilityStatus';

export type UserRole = 'administrator' | 'agent';

export type User = {
  id: number;
  name: string;
  account_id: number;
  accounts: Account[];
  email: string;
  pubsub_token: string;
  avatar_url: string;
  available_name: string;
  role: UserRole;
  // Who invited the user to the active account; null for the owner who created it at signup.
  inviter_id?: number | null;
  // Koze: contact details kept on the user.
  custom_attributes?: {
    phone_number?: string;
    gender?: '' | 'female' | 'male' | 'other';
  };
  identifier_hash: string;
  availability: string;
  thumbnail: string;
  availability_status: AvailabilityStatus;
  type: string;
};
