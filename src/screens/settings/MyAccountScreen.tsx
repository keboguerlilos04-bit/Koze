import React, { useState } from 'react';
import { Animated, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { Button, KozeCard, KozeTextInput } from '@/components-next';
import { showToast } from '@/utils/toastUtils';
import { selectIsAccountOwner, selectUser } from '@/store/auth/authSelectors';
import { authActions } from '@/store/auth/authActions';
import { AuthService } from '@/store/auth/authService';
import { showAdminError } from '@/store/admin/adminService';

const GENDER_LABELS: Record<string, string> = {
  female: 'ADMIN.GENDER_FEMALE',
  male: 'ADMIN.GENDER_MALE',
  other: 'ADMIN.GENDER_OTHER',
};

const InfoRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <View
    style={tailwind.style('px-4 py-3 gap-0.5', isLast ? '' : 'border-b-[1px] border-b-koze-line')}>
    <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
      {label}
    </Animated.Text>
    <Animated.Text style={tailwind.style('text-base font-inter-420-20 text-koze-navy')}>
      {value}
    </Animated.Text>
  </View>
);

// Koze: everyone sees their own details. Name, gender and email are the owner's to change;
// the member updates their phone number here and their password from "Change my password".
const MyAccountScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isOwner = useAppSelector(selectIsAccountOwner);
  const [phone, setPhone] = useState(user?.custom_attributes?.phone_number ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const gender = user?.custom_attributes?.gender;
  const genderLabel =
    gender && GENDER_LABELS[gender] ? i18n.t(GENDER_LABELS[gender]) : i18n.t('ADMIN.GENDER_UNSET');

  const savePhone = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await AuthService.updateMyPhone(phone.trim());
      dispatch(authActions.getProfile());
      showToast({ message: i18n.t('PROFILE.PHONE_SAVED') });
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
        contentContainerStyle={tailwind.style('px-4 pt-2 pb-10 gap-4')}>
        <KozeCard>
          <InfoRow label={i18n.t('PROFILE.NAME')} value={user?.name ?? ''} />
          <InfoRow label={i18n.t('ADMIN.GENDER')} value={genderLabel} />
          <InfoRow label={i18n.t('ADMIN.AGENT_EMAIL')} value={user?.email ?? ''} isLast />
        </KozeCard>
        {!isOwner && (
          <Animated.Text
            style={tailwind.style('px-1 text-sm font-inter-normal-20 text-koze-muted')}>
            {i18n.t('PROFILE.MANAGED_BY_OWNER')}
          </Animated.Text>
        )}

        <KozeCard style={tailwind.style('p-4 gap-3')}>
          <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
            {i18n.t('ADMIN.PHONE')}
          </Animated.Text>
          <KozeTextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Button disabled={isSaving} text={i18n.t('PROFILE.SAVE_PHONE')} handlePress={savePhone} />
        </KozeCard>

        <Button
          variant="secondary"
          text={i18n.t('PROFILE.CHANGE_PASSWORD')}
          handlePress={() => navigation.navigate('ChangePassword' as never)}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default MyAccountScreen;
