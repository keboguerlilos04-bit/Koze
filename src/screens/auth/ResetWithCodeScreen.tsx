import React, { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { EMAIL_REGEX, PASSWORD_REGEX } from '@/constants';
import { Button, KozeAuthHeader, KozeCard } from '@/components-next';
import { showToast } from '@/utils/toastUtils';
import { AuthService } from '@/store/auth/authService';
import { showAdminError } from '@/store/admin/adminService';
import { AdminTextField } from '@/screens/admin/components/AdminTextField';

type Errors = { email?: string; code?: string; password?: string; confirm?: string };

// Koze: a member sets their own password with the one-time code from the account owner
// (password resets work without email this way).
const ResetWithCodeScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async () => {
    const found: Errors = {
      email: EMAIL_REGEX.test(email.trim()) ? undefined : i18n.t('LOGIN.EMAIL_ERROR'),
      code: /^\d{6}$/.test(code.trim()) ? undefined : i18n.t('RESET_CODE.CODE_ERROR'),
      password: PASSWORD_REGEX.test(password) ? undefined : i18n.t('SIGNUP.PASSWORD_ERROR'),
      confirm: confirm === password ? undefined : i18n.t('PROFILE.MISMATCH'),
    };
    setErrors(found);
    if (isSaving || Object.values(found).some(Boolean)) return;

    setIsSaving(true);
    try {
      await AuthService.redeemResetCode(email.trim().toLowerCase(), code.trim(), password);
      showToast({ message: i18n.t('RESET_CODE.DONE') });
      navigation.goBack();
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-koze-canvas')}
        barStyle={'dark-content'}
      />
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-5 pt-2 pb-8')}>
        <KozeAuthHeader
          title={i18n.t('RESET_CODE.TITLE')}
          subtitle={i18n.t('RESET_CODE.SUBTITLE')}
        />
        <KozeCard style={tailwind.style('px-5 pb-5')}>
          <AdminTextField
            label={i18n.t('LOGIN.EMAIL')}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
          />
          <AdminTextField
            label={i18n.t('RESET_CODE.CODE')}
            value={code}
            onChangeText={setCode}
            error={errors.code}
            keyboardType="number-pad"
          />
          <AdminTextField
            label={i18n.t('PROFILE.NEW_PASSWORD')}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
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
          <View style={tailwind.style('pt-6')}>
            <Button disabled={isSaving} text={i18n.t('RESET_CODE.SUBMIT')} handlePress={onSubmit} />
          </View>
        </KozeCard>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ResetWithCodeScreen;
