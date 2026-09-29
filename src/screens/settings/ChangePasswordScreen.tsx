import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { PASSWORD_REGEX } from '@/constants';
import { Button, KozeCard } from '@/components-next';
import { showToast } from '@/utils/toastUtils';
import { AuthService } from '@/store/auth/authService';
import { showAdminError } from '@/store/admin/adminService';
import { AdminTextField } from '@/screens/admin/components/AdminTextField';

type Errors = { current?: string; next?: string; confirm?: string };

// Koze: anyone changes their own password; the server checks the current one.
const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async () => {
    const found: Errors = {
      current: current ? undefined : i18n.t('LOGIN.PASSWORD_REQUIRED'),
      next: PASSWORD_REGEX.test(next) ? undefined : i18n.t('SIGNUP.PASSWORD_ERROR'),
      confirm: confirm === next ? undefined : i18n.t('PROFILE.MISMATCH'),
    };
    setErrors(found);
    if (isSaving || found.current || found.next || found.confirm) return;

    setIsSaving(true);
    try {
      await AuthService.changePassword(current, next);
      showToast({ message: i18n.t('PROFILE.SAVED') });
      navigation.goBack();
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-5 pt-2 pb-8')}>
        <KozeCard style={tailwind.style('px-5 pb-5')}>
          <AdminTextField
            label={i18n.t('PROFILE.CURRENT_PASSWORD')}
            value={current}
            onChangeText={setCurrent}
            error={errors.current}
            secure
          />
          <AdminTextField
            label={i18n.t('PROFILE.NEW_PASSWORD')}
            value={next}
            onChangeText={setNext}
            error={errors.next}
            hint={i18n.t('SIGNUP.PASSWORD_HINT')}
            secure
          />
          <AdminTextField
            label={i18n.t('PROFILE.CONFIRM_PASSWORD')}
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            secure
          />
        </KozeCard>
        <View style={tailwind.style('pt-6')}>
          <Button disabled={isSaving} text={i18n.t('PROFILE.SAVE')} handlePress={onSubmit} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;
