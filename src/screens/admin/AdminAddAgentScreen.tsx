import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Clipboard from '@react-native-clipboard/clipboard';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { EMAIL_REGEX, PASSWORD_REGEX } from '@/constants';
import { Button } from '@/components-next';
import { showToast } from '@/utils/toastUtils';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import { AdminTextField } from './components/AdminTextField';

type Errors = { name?: string; email?: string; password?: string };

// Koze: the owner adds an agent with a temporary password, since invitation emails cannot
// be sent without SMTP. The owner then passes the sign-in details on to the agent.
const AdminAddAgentScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const validate = (): Errors => ({
    name: name.trim() ? undefined : i18n.t('ADMIN.FIELD_REQUIRED'),
    email: EMAIL_REGEX.test(email.trim()) ? undefined : i18n.t('LOGIN.EMAIL_ERROR'),
    password: PASSWORD_REGEX.test(password) ? undefined : i18n.t('SIGNUP.PASSWORD_ERROR'),
  });

  const showCredentials = (agentName: string, agentEmail: string) => {
    const details = i18n.t('ADMIN.AGENT_CREATED_MESSAGE', {
      name: agentName,
      email: agentEmail,
      password,
    });
    Alert.alert(i18n.t('ADMIN.AGENT_CREATED_TITLE'), details, [
      {
        text: i18n.t('ADMIN.COPY_DETAILS'),
        onPress: () => {
          Clipboard.setString(details);
          showToast({ message: i18n.t('ADMIN.DETAILS_COPIED') });
          navigation.goBack();
        },
      },
      { text: i18n.t('ADMIN.DONE'), onPress: () => navigation.goBack() },
    ]);
  };

  const onSubmit = async () => {
    const found = validate();
    setErrors(found);
    if (isSaving || found.name || found.email || found.password) return;

    setIsSaving(true);
    try {
      const agent = await AdminService.createAgent({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (agent.existing_user) {
        Alert.alert(
          i18n.t('ADMIN.AGENT_CREATED_TITLE'),
          i18n.t('ADMIN.AGENT_EXISTING_MESSAGE', { email: agent.email }),
          [{ text: i18n.t('ADMIN.DONE'), onPress: () => navigation.goBack() }],
        );
      } else {
        showCredentials(agent.name, agent.email);
      }
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-white')}>
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
        <AdminTextField
          label={i18n.t('ADMIN.TEMP_PASSWORD')}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint={i18n.t('ADMIN.TEMP_PASSWORD_HINT')}
          secure
        />
        <View style={tailwind.style('pt-8')}>
          <Button
            text={isSaving ? i18n.t('ADMIN.CREATING_AGENT') : i18n.t('ADMIN.CREATE_AGENT')}
            handlePress={onSubmit}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default AdminAddAgentScreen;
