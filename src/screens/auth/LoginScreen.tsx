import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Animated, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { EMAIL_REGEX } from '@/constants';
import { EyeIcon, EyeSlash, LockIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { resetAuth } from '@/store/auth/authSlice';
import { authActions } from '@/store/auth/authActions';
import { useAppDispatch, useAppSelector } from '@/hooks';

import {
  BottomSheetHeader,
  LanguageList,
  Button,
  Icon,
  AuthButton,
  KozeAuthHeader,
  KozeCard,
  KozeTextInput,
} from '@/components-next';
import { Sheet } from '@/components-next/common/sheet/Sheet';
import { selectInstallationUrl, selectLocale } from '@/store/settings/settingsSelectors';
import { selectIsLoggingIn } from '@/store/auth/authSelectors';
import { setLocale } from '@/store/settings/settingsSlice';
import { useRefsContext } from '@/context/RefsContext';
import { SsoUtils } from '@/utils/ssoUtils';

type FormData = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { languagesModalSheetRef } = useRefsContext();

  const dispatch = useAppDispatch();
  const isLoggingIn = useAppSelector(selectIsLoggingIn);

  const installationUrl = useAppSelector(selectInstallationUrl);
  const activeLocale = useAppSelector(selectLocale);

  useEffect(() => {
    languagesModalSheetRef.current?.dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocale]);

  useEffect(() => {
    dispatch(resetAuth());
  }, [dispatch]);

  const onSubmit = async (data: FormData) => {
    const { email, password } = data;
    // Clear any existing auth state before login
    dispatch(resetAuth());

    try {
      const result = await dispatch(authActions.login({ email, password })).unwrap();

      // Check if MFA is required in the response
      if ('mfa_required' in result && result.mfa_required) {
        // Navigate directly to MFA screen with the token
        navigation.navigate('MFAScreen' as never);
      }
      // If MFA not required, the auth state will be updated and
      // the app will automatically navigate to the dashboard
    } catch {
      // Login error is handled by Redux and displayed in the UI
    }
  };

  // TODO: Change this condition based on EE check
  // Show SSO login button only if installation URL contains app.chatwoot.com
  const showSsoLogin = installationUrl.includes('app.chatwoot.com');

  const openResetPassword = () => {
    navigation.navigate('ResetPassword' as never);
  };

  const onChangeLanguage = (locale: string) => {
    dispatch(setLocale(locale));
  };

  const handleSsoLogin = async () => {
    if (!installationUrl) {
      return;
    }

    try {
      const result = await SsoUtils.loginWithSSO(installationUrl);

      if (result.type === 'success' && result.url) {
        const ssoParams = SsoUtils.parseCallbackUrl(result.url);
        await SsoUtils.handleSsoCallback(ssoParams, dispatch);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // SSO login error handled silently
    }
  };

  return (
    <SafeAreaView edges={['top']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-koze-canvas')}
        barStyle={'dark-content'}
      />
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-5 pt-12 pb-8')}>
        <KozeAuthHeader title={i18n.t('LOGIN.TITLE')} subtitle={i18n.t('LOGIN.KOZE_SUBTITLE')} />

        {showSsoLogin && (
          <View>
            <AuthButton
              text={i18n.t('LOGIN.LOGIN_VIA_SSO')}
              icon={<LockIcon />}
              handlePress={handleSsoLogin}
              disabled={isLoggingIn}
              variant="outline"
            />

            <View style={tailwind.style('flex-row items-center my-6')}>
              <View style={tailwind.style('flex-1 h-px bg-koze-line')} />
              <Animated.Text style={tailwind.style('px-4 text-sm text-koze-muted')}>
                OR
              </Animated.Text>
              <View style={tailwind.style('flex-1 h-px bg-koze-line')} />
            </View>
          </View>
        )}

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
              <View style={tailwind.style('gap-2')}>
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

          <Controller
            control={control}
            rules={{
              required: i18n.t('LOGIN.PASSWORD_REQUIRED'),
              minLength: {
                value: 6,
                message: i18n.t('LOGIN.PASSWORD_ERROR'),
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={tailwind.style('pt-5 gap-2')}>
                <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
                  {i18n.t('LOGIN.PASSWORD')}
                </Animated.Text>
                <KozeTextInput
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  hasError={!!errors.password}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  rightAccessory={
                    <Pressable hitSlop={8} onPress={() => setShowPassword(!showPassword)}>
                      <Icon size={20} icon={showPassword ? <EyeIcon /> : <EyeSlash />} />
                    </Pressable>
                  }
                />
                {errors.password && (
                  <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
                    {errors.password.message}
                  </Animated.Text>
                )}
              </View>
            )}
            name="password"
          />

          <Pressable style={tailwind.style('pt-3 pb-6 self-end')} onPress={openResetPassword}>
            <Animated.Text style={tailwind.style('text-blue-800 font-inter-medium-24')}>
              {i18n.t('LOGIN.FORGOT_PASSWORD')}
            </Animated.Text>
          </Pressable>

          <Button
            text={isLoggingIn ? i18n.t('LOGIN.LOGIN_LOADING') : i18n.t('LOGIN.LOGIN')}
            handlePress={handleSubmit(onSubmit)}
          />
        </KozeCard>

        <Pressable
          style={tailwind.style('flex-row justify-center items-center mt-6')}
          onPress={() => navigation.navigate('Signup' as never)}>
          <Animated.Text style={tailwind.style('text-sm text-koze-muted')}>
            {i18n.t('LOGIN.NO_ACCOUNT')}{' '}
          </Animated.Text>
          <Animated.Text style={tailwind.style('text-sm text-blue-800 font-inter-medium-24')}>
            {i18n.t('LOGIN.CREATE_ACCOUNT')}
          </Animated.Text>
        </Pressable>

        <Pressable
          style={tailwind.style('flex-row justify-center items-center mt-4')}
          onPress={() => languagesModalSheetRef.current?.present()}>
          <Animated.Text style={tailwind.style('text-sm text-koze-muted')}>
            {i18n.t('LOGIN.CHANGE_LANGUAGE')}
          </Animated.Text>
        </Pressable>
      </KeyboardAwareScrollView>
      <Sheet ref={languagesModalSheetRef} detents={[0.7]} scrollable>
        <ScrollView showsVerticalScrollIndicator={false}>
          <BottomSheetHeader headerText={i18n.t('SETTINGS.SET_LANGUAGE')} />
          <LanguageList onChangeLanguage={onChangeLanguage} currentLanguage={activeLocale} />
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
};

export default LoginScreen;
