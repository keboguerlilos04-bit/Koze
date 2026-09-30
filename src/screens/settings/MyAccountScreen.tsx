import React, { useCallback, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
// the member updates their phone number here (the password lives in Settings > My account).
const MyAccountScreen = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isOwner = useAppSelector(selectIsAccountOwner);
  const savedPhone = user?.custom_attributes?.phone_number ?? '';
  const [phone, setPhone] = useState(savedPhone);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // The owner may have changed the name, gender or email since the app opened: reload the
  // profile every time this screen shows.
  useFocusEffect(
    useCallback(() => {
      dispatch(authActions.getProfile());
    }, [dispatch]),
  );

  const gender = user?.custom_attributes?.gender;
  const genderLabel =
    gender && GENDER_LABELS[gender] ? i18n.t(GENDER_LABELS[gender]) : i18n.t('ADMIN.GENDER_UNSET');

  // No saved number yet: the field shows straight away.
  const showPhoneField = isEditingPhone || !savedPhone;

  const startEditing = () => {
    setPhone(savedPhone);
    setIsEditingPhone(true);
  };

  const savePhone = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await AuthService.updateMyPhone(phone.trim());
      await dispatch(authActions.getProfile());
      setIsEditingPhone(false);
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
          {showPhoneField ? (
            <>
              <KozeTextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                autoFocus={isEditingPhone}
              />
              <Button
                disabled={isSaving || !phone.trim()}
                text={i18n.t('PROFILE.SAVE_PHONE')}
                handlePress={savePhone}
              />
              {isEditingPhone && (
                <Button
                  variant="secondary"
                  text={i18n.t('ADMIN.CANCEL')}
                  handlePress={() => setIsEditingPhone(false)}
                />
              )}
            </>
          ) : (
            <View style={tailwind.style('flex-row items-center justify-between gap-3')}>
              <Animated.Text
                style={tailwind.style('text-base font-inter-medium-24 text-koze-navy')}>
                {savedPhone}
              </Animated.Text>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                onPress={startEditing}
                style={({ pressed }) =>
                  tailwind.style(
                    'px-4 py-1.5 rounded-full border-[1.5px] border-koze-line',
                    pressed ? 'bg-blue-50' : 'bg-white',
                  )
                }>
                <Animated.Text style={tailwind.style('font-inter-medium-24 text-blue-800')}>
                  {i18n.t('PROFILE.EDIT')}
                </Animated.Text>
              </Pressable>
            </View>
          )}
        </KozeCard>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default MyAccountScreen;
