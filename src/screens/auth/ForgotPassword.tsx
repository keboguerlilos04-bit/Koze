import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Animated, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button, KozeAuthHeader, KozeCard, KozeTextInput } from '@/components-next';
import { EMAIL_REGEX } from '@/constants';
import { tailwind } from '@/theme';
import { authActions } from '@/store/auth/authActions';
import { useAppDispatch } from '@/hooks';
import { resetAuth } from '@/store/auth/authSlice';
import AnalyticsHelper from '@/utils/analyticsUtils';
import { ACCOUNT_EVENTS } from '@/constants/analyticsEvents';
import i18n from '@/i18n';

type FormData = {
  email: string;
  password: string;
};

const ForgotPassword = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(resetAuth());
  }, [dispatch]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    const { email } = data;
    dispatch(authActions.resetPassword({ email }));
    AnalyticsHelper.track(ACCOUNT_EVENTS.FORGOT_PASSWORD);
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-koze-canvas')}
        barStyle={'dark-content'}
      />
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-5 pt-2 pb-8')}>
        <KozeAuthHeader
          title={i18n.t('FORGOT_PASSWORD.TITLE')}
          subtitle={i18n.t('FORGOT_PASSWORD.SUB_TITLE')}
        />

        <KozeCard style={tailwind.style('p-5')}>
          <Controller
            control={control}
            rules={{
              required: i18n.t('LOGIN.EMAIL_REQUIRED'),
              pattern: {
                value: EMAIL_REGEX,
                message: i18n.t('LOGIN.EMAIL_ERROR'),
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={tailwind.style('pb-6 gap-2')}>
                <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
                  {i18n.t('LOGIN.EMAIL')}
                </Animated.Text>
                <KozeTextInput
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  hasError={!!errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {errors.email && (
                  <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
                    {errors.email.message}
                  </Animated.Text>
                )}
              </View>
            )}
            name="email"
          />

          <Button
            text={i18n.t('FORGOT_PASSWORD.RESET_HERE')}
            handlePress={handleSubmit(onSubmit)}
          />
        </KozeCard>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ForgotPassword;
