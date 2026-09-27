import { handleSignupError } from '@/store/auth/authUtils';
import { showToast } from '@/utils/toastUtils';

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/utils/toastUtils', () => ({
  showToast: jest.fn(),
}));

describe('handleSignupError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the server message, e.g. when the email is taken', () => {
    const error = { response: { status: 403, data: { message: 'Email already exists' } } };

    const result = handleSignupError(error);

    expect(showToast).toHaveBeenCalledWith({ message: 'Email already exists' });
    expect(result).toEqual({ success: false, errors: ['Email already exists'] });
  });

  it('falls back to the generic error when the server sends no message', () => {
    const error = { response: { status: 500, data: {} } };

    const result = handleSignupError(error);

    expect(showToast).toHaveBeenCalledWith({ message: 'ERRORS.COMMON_ERROR' });
    expect(result.errors).toEqual(['ERRORS.COMMON_ERROR']);
  });

  it('does not toast again when the request never reached the server', () => {
    const result = handleSignupError(new Error('Network Error'));

    expect(showToast).not.toHaveBeenCalled();
    expect(result.errors).toEqual(['ERRORS.COMMON_ERROR']);
  });
});
