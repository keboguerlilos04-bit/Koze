import React, { useState } from 'react';
import { Animated, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppDispatch } from '@/hooks';
import { Button } from '@/components-next';
import { showToast } from '@/utils/toastUtils';
import { inboxActions } from '@/store/inbox/inboxActions';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import { AdminTextField } from './components/AdminTextField';

type Fields = {
  name: string;
  botToken: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiKey: string;
};
type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY_FIELDS: Fields = {
  name: '',
  botToken: '',
  phoneNumber: '',
  phoneNumberId: '',
  businessAccountId: '',
  apiKey: '',
};

// WhatsApp Cloud expects the number in international format.
const PHONE_REGEX = /^\+\d{8,15}$/;

// Koze: creates a Telegram or WhatsApp (Cloud API) inbox, then opens its agent picker.
const AdminAddInboxScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { channel } = useRoute<RouteProp<SettingsStackParamList, 'AdminAddInbox'>>().params;
  const dispatch = useAppDispatch();
  const isTelegram = channel === 'telegram';
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  const setField = (key: keyof Fields) => (value: string) =>
    setFields(current => ({ ...current, [key]: value }));

  const validate = (): Errors => {
    const required = i18n.t('ADMIN.FIELD_REQUIRED');
    const keys: (keyof Fields)[] = isTelegram
      ? ['name', 'botToken']
      : ['name', 'phoneNumber', 'phoneNumberId', 'businessAccountId', 'apiKey'];
    const found: Errors = {};
    keys.forEach(key => {
      if (!fields[key].trim()) found[key] = required;
    });
    if (!isTelegram && !found.phoneNumber && !PHONE_REGEX.test(fields.phoneNumber.trim())) {
      found.phoneNumber = i18n.t('ADMIN.PHONE_ERROR');
    }
    return found;
  };

  const onSubmit = async () => {
    const found = validate();
    setErrors(found);
    if (isSaving || Object.keys(found).length > 0) return;

    setIsSaving(true);
    const name = fields.name.trim();
    try {
      const inboxId = isTelegram
        ? await AdminService.createTelegramInbox({ name, botToken: fields.botToken.trim() })
        : await AdminService.createWhatsAppInbox({
            name,
            phoneNumber: fields.phoneNumber.trim(),
            phoneNumberId: fields.phoneNumberId.trim(),
            businessAccountId: fields.businessAccountId.trim(),
            apiKey: fields.apiKey.trim(),
          });
      dispatch(inboxActions.fetchInboxes());
      showToast({ message: i18n.t('ADMIN.INBOX_CREATED') });
      navigation.replace('AdminInboxAgents', { inboxId, inboxName: name });
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
        contentContainerStyle={tailwind.style('px-6 pt-2 pb-8')}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-900')}>
          {isTelegram ? i18n.t('ADMIN.TELEGRAM_HINT') : i18n.t('ADMIN.WHATSAPP_HINT')}
        </Animated.Text>

        <AdminTextField
          label={i18n.t('ADMIN.INBOX_NAME')}
          value={fields.name}
          onChangeText={setField('name')}
          error={errors.name}
          autoCapitalize="words"
        />
        {isTelegram ? (
          <AdminTextField
            label={i18n.t('ADMIN.BOT_TOKEN')}
            value={fields.botToken}
            onChangeText={setField('botToken')}
            error={errors.botToken}
          />
        ) : (
          <>
            <AdminTextField
              label={i18n.t('ADMIN.PHONE_NUMBER')}
              value={fields.phoneNumber}
              onChangeText={setField('phoneNumber')}
              error={errors.phoneNumber}
              keyboardType="phone-pad"
            />
            <AdminTextField
              label={i18n.t('ADMIN.PHONE_NUMBER_ID')}
              value={fields.phoneNumberId}
              onChangeText={setField('phoneNumberId')}
              error={errors.phoneNumberId}
              keyboardType="number-pad"
            />
            <AdminTextField
              label={i18n.t('ADMIN.BUSINESS_ACCOUNT_ID')}
              value={fields.businessAccountId}
              onChangeText={setField('businessAccountId')}
              error={errors.businessAccountId}
              keyboardType="number-pad"
            />
            <AdminTextField
              label={i18n.t('ADMIN.API_KEY')}
              value={fields.apiKey}
              onChangeText={setField('apiKey')}
              error={errors.apiKey}
              secure
            />
          </>
        )}

        <View style={tailwind.style('pt-8')}>
          <Button
            text={isSaving ? i18n.t('ADMIN.CREATING_INBOX') : i18n.t('ADMIN.CREATE_INBOX')}
            handlePress={onSubmit}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default AdminAddInboxScreen;
