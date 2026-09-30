import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { EMAIL_REGEX } from '@/constants';
import { Button } from '@/components-next';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import type { UserRole } from '@/types/User';
import { AdminTextField } from './components/AdminTextField';
import { ChoiceChips } from './components/ChoiceChips';
import { showResetCodeAlert } from './components/resetCodeAlert';

type Errors = { name?: string; email?: string };

// Koze: the owner adds an agent or an administrator. The owner never chooses their password:
// a new member gets a one-time code and picks it on the login screen.
const AdminAddAgentScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('agent');
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async () => {
    const found: Errors = {
      name: name.trim() ? undefined : i18n.t('ADMIN.FIELD_REQUIRED'),
      email: EMAIL_REGEX.test(email.trim()) ? undefined : i18n.t('LOGIN.EMAIL_ERROR'),
    };
    setErrors(found);
    if (isSaving || found.name || found.email) return;

    setIsSaving(true);
    try {
      const member = await AdminService.createAgent({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
      });
      if (member.reset_code) {
        showResetCodeAlert({
          title: i18n.t('ADMIN.AGENT_CREATED_TITLE'),
          name: member.name,
          email: member.email,
          code: member.reset_code,
          onClose: () => navigation.goBack(),
        });
      } else {
        Alert.alert(
          i18n.t('ADMIN.AGENT_CREATED_TITLE'),
          i18n.t('ADMIN.AGENT_EXISTING_MESSAGE', { email: member.email }),
          [{ text: i18n.t('ADMIN.DONE'), onPress: () => navigation.goBack() }],
        );
      }
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
        contentContainerStyle={tailwind.style('px-6 pb-8')}>
        <AdminTextField
          label={i18n.t('ADMIN.AGENT_NAME')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
        />
        <AdminTextField
          label={i18n.t('ADMIN.AGENT_EMAIL')}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
        />
        <ChoiceChips<UserRole>
          label={i18n.t('ADMIN.ROLE_LABEL')}
          value={role}
          onChange={setRole}
          options={[
            { value: 'agent', label: i18n.t('ADMIN.ROLE_AGENT') },
            { value: 'administrator', label: i18n.t('ADMIN.ROLE_ADMINISTRATOR') },
          ]}
        />
        <View style={tailwind.style('pt-8')}>
          <Button
            disabled={isSaving}
            text={isSaving ? i18n.t('ADMIN.CREATING_AGENT') : i18n.t('ADMIN.CREATE_AGENT')}
            handlePress={onSubmit}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default AdminAddAgentScreen;
