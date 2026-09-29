import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '@/screens/auth/LoginScreen';
import ForgotPassword from '@/screens/auth/ForgotPassword';
import MFAScreen from '@/screens/auth/MFAScreen';
import Signup from '@/screens/auth/SignupScreen';
import { KOZE_COLORS } from '@/theme/colors/koze';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ResetPassword: undefined;
  MFAScreen: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
        name="Login"
        component={Login}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerBackVisible: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: KOZE_COLORS.canvas },
          headerTintColor: KOZE_COLORS.primary,
          title: '',
        }}
        name="ResetPassword"
        component={ForgotPassword}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerBackVisible: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: KOZE_COLORS.canvas },
          headerTintColor: KOZE_COLORS.primary,
          title: '',
        }}
        name="Signup"
        component={Signup}
      />
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerBackVisible: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: KOZE_COLORS.canvas },
          headerTintColor: KOZE_COLORS.primary,
          title: '',
        }}
        name="MFAScreen"
        component={MFAScreen}
      />
    </Stack.Navigator>
  );
};
