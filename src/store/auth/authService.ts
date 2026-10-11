import { apiService, SIGNUP_ROUTE } from '@/services/APIService';
import type { User } from '@/types/User';
import type {
  LoginPayload,
  LoginResponse,
  LoginApiResponse,
  MfaRequiredResponse,
  MfaVerificationPayload,
  ResetPasswordPayload,
  ResetPasswordResponse,
  SignupPayload,
  AvailabilityPayload,
  ProfileResponse,
  SetActiveAccountPayload,
  SsoAuthPayload,
  SsoAuthResponse,
  AvatarUploadPayload,
} from './authTypes';

export class AuthService {
  static async login(credentials: LoginPayload): Promise<LoginResponse | MfaRequiredResponse> {
    const response = await apiService.post<LoginApiResponse>('auth/sign_in', credentials);

    // Check if MFA is required
    if (response.data.mfa_required) {
      return {
        mfa_required: true,
        mfa_token: response.data.mfa_token,
        verification_channel: response.data.verification_channel ?? null,
      } as MfaRequiredResponse;
    }

    // Regular login response
    return {
      user: response.data.data,
      headers: {
        'access-token': response.headers['access-token'],
        uid: response.headers.uid,
        client: response.headers.client,
      },
    } as LoginResponse;
  }

  static async verifyMfa(payload: MfaVerificationPayload): Promise<LoginResponse> {
    const response = await apiService.post<{ data: User }>('auth/sign_in', payload);
    return {
      user: response.data.data,
      headers: {
        'access-token': response.headers['access-token'],
        uid: response.headers.uid,
        client: response.headers.client,
      },
    };
  }
  static async getProfile(): Promise<ProfileResponse> {
    const response = await apiService.get<ProfileResponse>('profile');
    return response.data;
  }
  // Needs ENABLE_ACCOUNT_SIGNUP=api_only on the server so it answers with auth headers.
  static async signup(payload: SignupPayload): Promise<LoginResponse> {
    const response = await apiService.post<{ data: User }>(SIGNUP_ROUTE, payload, {
      skipErrorToast: true,
    });
    return {
      user: response.data.data,
      headers: {
        'access-token': response.headers['access-token'],
        uid: response.headers.uid,
        client: response.headers.client,
      },
    };
  }

  // Koze: anyone changes their own password from Settings; the current one is required.
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiService.put(
      'profile',
      {
        profile: {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPassword,
        },
      },
      { skipErrorToast: true },
    );
  }

  // Koze: an agent updates their own phone number (name and email are the owner's to change).
  static async updateMyPhone(phoneNumber: string): Promise<void> {
    await apiService.put(
      'profile',
      { profile: { phone_number: phoneNumber } },
      { skipErrorToast: true },
    );
  }

  // Koze: sets a new password with the one-time code from the account owner (no sign-in).
  static async redeemResetCode(email: string, code: string, password: string): Promise<void> {
    await apiService.post(
      'api/v1/koze_password_resets',
      { email, code, password },
      { skipErrorToast: true },
    );
  }

  static async resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
    const response = await apiService.post<ResetPasswordResponse>('auth/password', payload);
    return response.data;
  }
  static async updateAvailability(payload: AvailabilityPayload): Promise<ProfileResponse> {
    const response = await apiService.post<ProfileResponse>('profile/availability', payload);
    return response.data;
  }

  // Koze: every user (agent or administrator) sets their own profile photo.
  // PUT /api/v1/profile with profile[avatar]; the server answers with the updated user.
  static async updateAvatar(photo: AvatarUploadPayload): Promise<User> {
    const formData = new FormData();
    formData.append('profile[avatar]', {
      uri: photo.uri,
      name: photo.fileName || `avatar-${Date.now()}.jpg`,
      type: photo.type || 'image/jpeg',
    } as unknown as Blob);
    const response = await apiService.put<User>('profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipErrorToast: true,
    });
    return response.data;
  }

  static async removeAvatar(): Promise<User> {
    const response = await apiService.delete<User>('profile/avatar', { skipErrorToast: true });
    return response.data;
  }

  static async setActiveAccount(payload: SetActiveAccountPayload): Promise<ProfileResponse> {
    const response = await apiService.put<ProfileResponse>('profile/set_active_account', payload);
    return response.data;
  }

  static async loginWithSso(payload: SsoAuthPayload): Promise<SsoAuthResponse> {
    const response = await apiService.post<{ data: User }>('auth/sign_in', payload);
    return {
      user: response.data.data,
      headers: {
        'access-token': response.headers['access-token'],
        uid: response.headers.uid,
        client: response.headers.client,
      },
    };
  }
}
