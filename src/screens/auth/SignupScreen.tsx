import React, { useState } from 'react';
import { Control, Controller, FieldError, RegisterOptions, useForm } from 'react-hook-form';
import {
  Animated,
  Image,
  KeyboardTypeOptions,
  Pressable,
  StatusBar,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { EMAIL_REGEX, PASSWORD_REGEX } from '@/constants';
import { EyeIcon, EyeSlash } from '@/svg-icons';
import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { resetAuth } from '@/store/auth/authSlice';
import { authActions } from '@/store/auth/authActions';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { Button, Icon } from '@/components-next';
import { selectLocale } from '@/store/settings/settingsSelectors';
import { selectIsLoggingIn } from '@/store/auth/authSelectors';

type FormData = {
  fullName: string;
  companyName: string;
  email: string;
  password: string;
};

const inputStyle = tailwind.style(
  'text-base font-inter-normal-20 tracking-[0.24px] leading-[20px] android:leading-[18px]',
  'py-2 px-3 rounded-xl text-gray-950 bg-blackA-A4',
  'h-10',
);

interface FormFieldProps {
  control: Control<FormData>;
  name: keyof FormData;
  label: string;
  rules: RegisterOptions<FormData, keyof FormData>;
  error?: FieldError;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'name' | 'organization' | 'email' | 'new-password';
}

const FormField = ({
  control,
  name,
  label,
  rules,
  error,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
}: FormFieldProps) => (
  <Controller
    control={control}
    rules={rules}
    name={name}
    render={({ field: { onChange, onBlur, value } }) => (
      <View style={tailwind.style('pt-6 gap-2')}>
        <Animated.Text style={tailwind.style('font-inter-420-20 text-gray-950')}>
          {label}
        </Animated.Text>
        <TextInput
          style={inputStyle}
          onBlur={onBlur}
          onChangeText={onChange}
          value={value}
          placeholderTextColor={tailwind.color('text-gray-900')}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
        />
        {error && (
          <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
            {error.message}
          </Animated.Text>
        )}
      </View>
    )}
  />
);

const SignupScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const isLoggingIn = useAppSelector(selectIsLoggingIn);
  const activeLocale = useAppSelector(selectLocale);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { fullName: '', companyName: '', email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    if (isLoggingIn) return;
    dispatch(resetAuth());
    try {
      await dispatch(
        authActions.signup({
          user_full_name: data.fullName.trim(),
          account_name: data.companyName.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password,
          locale: activeLocale,
        }),
      ).unwrap();
      // The new user is now in the auth state, so the app switches to the conversation list.
    } catch {
      // The error toast is shown by the signup action.
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-white')}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-white')}
        barStyle={'dark-content'}
      />
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-6 pt-4 pb-8')}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
          source={require('@/assets/images/logo.png')}
          style={tailwind.style('w-20 h-24')}
          resizeMode="contain"
        />
        <View style={tailwind.style('pt-6 gap-4')}>
          <Animated.Text style={tailwind.style('text-2xl text-gray-950 font-inter-semibold-20')}>
            {i18n.t('SIGNUP.TITLE')}
          </Animated.Text>
          <Animated.Text
            style={tailwind.style(
              'font-inter-normal-20 leading-[18px] tracking-[0.32px] text-gray-900',
            )}>
            {i18n.t('SIGNUP.DESCRIPTION')}
          </Animated.Text>
        </View>

        <FormField
          control={control}
          name="fullName"
          label={i18n.t('SIGNUP.FULL_NAME')}
          rules={{
            validate: value => value.trim().length > 0 || i18n.t('SIGNUP.FULL_NAME_REQUIRED'),
          }}
          error={errors.fullName}
          autoCapitalize="words"
          autoComplete="name"
        />

        <FormField
          control={control}
          name="companyName"
          label={i18n.t('SIGNUP.COMPANY_NAME')}
          rules={{
            validate: value => value.trim().length > 0 || i18n.t('SIGNUP.COMPANY_NAME_REQUIRED'),
          }}
          error={errors.companyName}
          autoCapitalize="words"
          autoComplete="organization"
        />

        <FormField
          control={control}
          name="email"
          label={i18n.t('SIGNUP.EMAIL')}
          rules={{
            required: i18n.t('LOGIN.EMAIL_REQUIRED'),
            validate: value => EMAIL_REGEX.test(value.trim()) || i18n.t('LOGIN.EMAIL_ERROR'),
          }}
          error={errors.email}
          keyboardType="email-address"
          autoComplete="email"
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: i18n.t('LOGIN.PASSWORD_REQUIRED'),
            pattern: { value: PASSWORD_REGEX, message: i18n.t('SIGNUP.PASSWORD_ERROR') },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={tailwind.style('pt-6 gap-2')}>
              <Animated.Text style={tailwind.style('font-inter-420-20 text-gray-950')}>
                {i18n.t('SIGNUP.PASSWORD')}
              </Animated.Text>
              <View style={tailwind.style('relative')}>
                <TextInput
                  style={[inputStyle, tailwind.style('pr-10')]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <Pressable
                  style={tailwind.style('absolute right-4 top-2.5')}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Icon size={20} icon={showPassword ? <EyeIcon /> : <EyeSlash />} />
                </Pressable>
              </View>
              {errors.password ? (
                <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
                  {errors.password.message}
                </Animated.Text>
              ) : (
                <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
                  {i18n.t('SIGNUP.PASSWORD_HINT')}
                </Animated.Text>
              )}
            </View>
          )}
        />

        <View style={tailwind.style('pt-8')}>
          <Button
            text={isLoggingIn ? i18n.t('SIGNUP.SUBMIT_LOADING') : i18n.t('SIGNUP.SUBMIT')}
            handlePress={handleSubmit(onSubmit)}
          />
        </View>

        <Pressable
          style={tailwind.style('flex-row justify-center items-center mt-6')}
          onPress={() => navigation.goBack()}>
          <Animated.Text style={tailwind.style('text-sm text-gray-900')}>
            {i18n.t('SIGNUP.HAVE_ACCOUNT')}{' '}
          </Animated.Text>
          <Animated.Text style={tailwind.style('text-sm text-blue-800 font-inter-medium-24')}>
            {i18n.t('SIGNUP.LOGIN')}
          </Animated.Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SignupScreen;
