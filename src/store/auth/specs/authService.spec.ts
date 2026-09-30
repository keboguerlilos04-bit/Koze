import { AuthService } from '@/store/auth/authService';
import { apiService } from '@/services/APIService';
import { mockUser } from './authMockData';
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/utils/toastUtils', () => ({
  showToast: jest.fn(),
}));

jest.mock('@/services/APIService', () => ({
  SIGNUP_ROUTE: 'api/v1/accounts',
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('AuthService', () => {
  const mockHeaders = {
    'access-token': 'token',
    uid: 'uid',
    client: 'client',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should make a POST request to login endpoint', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      const mockResponse = {
        data: { data: mockUser },
        headers: mockHeaders,
      };

      (apiService.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await AuthService.login(credentials);

      expect(apiService.post).toHaveBeenCalledWith('auth/sign_in', credentials);
      expect(result).toEqual({
        user: mockUser,
        headers: mockHeaders,
      });
    });

    it('should throw error when login fails', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' };
      const error = new Error('Invalid credentials');

      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.login(credentials)).rejects.toThrow(error);
    });
  });
  describe('Koze account self-service', () => {
    it('sets a new password with the reset code, without being signed in', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await AuthService.redeemResetCode('rose@example.com', '123456', 'Rose#2026');

      expect(apiService.post).toHaveBeenCalledWith(
        'api/v1/koze_password_resets',
        { email: 'rose@example.com', code: '123456', password: 'Rose#2026' },
        { skipErrorToast: true },
      );
    });

    it('updates only the phone number of the signed-in member', async () => {
      (apiService.put as jest.Mock).mockResolvedValueOnce({ data: {} });

      await AuthService.updateMyPhone('+50937009988');

      expect(apiService.put).toHaveBeenCalledWith(
        'profile',
        { profile: { phone_number: '+50937009988' } },
        { skipErrorToast: true },
      );
    });

    it('changes the password with the current one', async () => {
      (apiService.put as jest.Mock).mockResolvedValueOnce({ data: {} });

      await AuthService.changePassword('Old#2026', 'New#2026');

      expect(apiService.put).toHaveBeenCalledWith(
        'profile',
        {
          profile: {
            current_password: 'Old#2026',
            password: 'New#2026',
            password_confirmation: 'New#2026',
          },
        },
        { skipErrorToast: true },
      );
    });
  });

  describe('signup', () => {
    const payload = {
      user_full_name: 'Jean Pierre',
      account_name: 'Boutik Jean',
      email: 'jean@example.com',
      password: 'Koze#2026',
      moncash_number: '+50937123456',
      locale: 'fr',
    };

    it('should create the account and return the user with auth headers', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce({
        data: { data: mockUser },
        headers: mockHeaders,
      });

      const result = await AuthService.signup(payload);

      expect(apiService.post).toHaveBeenCalledWith('api/v1/accounts', payload, {
        skipErrorToast: true,
      });
      expect(result).toEqual({ user: mockUser, headers: mockHeaders });
    });

    it('should throw error when signup fails', async () => {
      const error = new Error('Email already exists');
      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.signup(payload)).rejects.toThrow(error);
    });
  });

  describe('getProfile', () => {
    it('should make a GET request to profile endpoint', async () => {
      const mockResponse = { data: mockUser };

      (apiService.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await AuthService.getProfile();

      expect(apiService.get).toHaveBeenCalledWith('profile');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when getProfile fails', async () => {
      const error = new Error('Failed to fetch profile');

      (apiService.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.getProfile()).rejects.toThrow(error);
    });
  });

  describe('resetPassword', () => {
    it('should make a POST request to reset password endpoint', async () => {
      const payload = { email: 'test@example.com' };
      const mockResponse = { data: { message: 'Password reset email sent' } };

      (apiService.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await AuthService.resetPassword(payload);

      expect(apiService.post).toHaveBeenCalledWith('auth/password', payload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when resetPassword fails', async () => {
      const payload = { email: 'test@example.com' };
      const error = new Error('Failed to reset password');

      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.resetPassword(payload)).rejects.toThrow(error);
    });
  });

  describe('updateAvailability', () => {
    it('should make a POST request to update availability endpoint', async () => {
      const payload = { profile: { availability: 'available', account_id: '1' } };
      const mockResponse = { data: mockUser };

      (apiService.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await AuthService.updateAvailability(payload);

      expect(apiService.post).toHaveBeenCalledWith('profile/availability', payload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when updateAvailability fails', async () => {
      const payload = { profile: { availability: 'available', account_id: '1' } };
      const error = new Error('Failed to update availability');

      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.updateAvailability(payload)).rejects.toThrow(error);
    });
  });
});
