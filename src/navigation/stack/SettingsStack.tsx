import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '@/screens/settings/SettingsScreen';
import AdminAgentsScreen from '@/screens/admin/AdminAgentsScreen';
import AdminAddAgentScreen from '@/screens/admin/AdminAddAgentScreen';
import i18n from '@/i18n';
import { kozeHeaderOptions } from './kozeHeaderOptions';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  // Koze: owner-only team management. Inboxes live in their own tab (InboxesStack).
  AdminAgents: undefined;
  AdminAddAgent: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack = () => {
  return (
    <Stack.Navigator initialRouteName="SettingsScreen">
      <Stack.Screen
        options={{ headerShown: false }}
        name="SettingsScreen"
        component={SettingsScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('ADMIN.AGENTS'))}
        name="AdminAgents"
        component={AdminAgentsScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('ADMIN.ADD_AGENT'))}
        name="AdminAddAgent"
        component={AdminAddAgentScreen}
      />
    </Stack.Navigator>
  );
};
