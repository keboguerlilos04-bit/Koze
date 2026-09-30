import { Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import i18n from '@/i18n';
import { showToast } from '@/utils/toastUtils';

interface ResetCodeAlertOptions {
  title: string;
  name: string;
  email: string;
  code: string;
  onClose?: () => void;
}

// Koze: shows a member's one-time reset code with the instructions to pass on, and a
// button that copies them (to paste into WhatsApp or an SMS).
export const showResetCodeAlert = ({
  title,
  name,
  email,
  code,
  onClose,
}: ResetCodeAlertOptions) => {
  const message = i18n.t('ADMIN.RESET_CODE_MESSAGE', { name, email, code });
  Alert.alert(title, message, [
    {
      text: i18n.t('ADMIN.COPY_CODE'),
      onPress: () => {
        Clipboard.setString(message);
        showToast({ message: i18n.t('ADMIN.CODE_COPIED') });
        onClose?.();
      },
    },
    { text: i18n.t('ADMIN.DONE'), onPress: onClose },
  ]);
};
