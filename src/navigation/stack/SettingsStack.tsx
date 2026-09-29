import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '@/screens/settings/SettingsScreen';
import ChangePasswordScreen from '@/screens/settings/ChangePasswordScreen';
import AdminAgentsScreen from '@/screens/admin/AdminAgentsScreen';
import AdminAgentDetailScreen from '@/screens/admin/AdminAgentDetailScreen';
import AdminAddAgentScreen from '@/screens/admin/AdminAddAgentScreen';
import AdminAddInboxScreen from '@/screens/admin/AdminAddInboxScreen';
import AdminInboxAgentsScreen from '@/screens/admin/AdminInboxAgentsScreen';
import InboxesScreen from '@/screens/inboxes/InboxesScreen';
import MonCashPaywallScreen from '@/screens/inboxes/MonCashPaywallScreen';
import ReportsScreen from '@/screens/reports/ReportsScreen';
import i18n from '@/i18n';
import { kozeHeaderOptions } from './kozeHeaderOptions';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  ChangePassword: undefined;
  // Koze: owner-only administration (Settings > Administration).
  AdminAgents: undefined;
  AdminAgentDetail: { memberId: number; name: string };
  AdminAddAgent: undefined;
  Inboxes: undefined;
  MonCashPaywall: undefined;
  AdminAddInbox: { channel: 'telegram' | 'whatsapp' };
  AdminInboxAgents: { inboxId: number; inboxName: string };
  Reports: undefined;
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
        options={kozeHeaderOptions(i18n.t('PROFILE.CHANGE_PASSWORD'))}
        name="ChangePassword"
        component={ChangePasswordScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('ADMIN.AGENTS'))}
        name="AdminAgents"
        component={AdminAgentsScreen}
      />
      <Stack.Screen
        options={({ route }) => kozeHeaderOptions(route.params.name)}
        name="AdminAgentDetail"
        component={AdminAgentDetailScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('ADMIN.ADD_AGENT'))}
        name="AdminAddAgent"
        component={AdminAddAgentScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('INBOXES.TITLE'))}
        name="Inboxes"
        component={InboxesScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('PAYWALL.TITLE'))}
        name="MonCashPaywall"
        component={MonCashPaywallScreen}
      />
      <Stack.Screen
        options={({ route }) =>
          kozeHeaderOptions(
            route.params.channel === 'telegram'
              ? i18n.t('ADMIN.ADD_TELEGRAM')
              : i18n.t('ADMIN.ADD_WHATSAPP'),
          )
        }
        name="AdminAddInbox"
        component={AdminAddInboxScreen}
      />
      <Stack.Screen
        options={({ route }) => kozeHeaderOptions(route.params.inboxName)}
        name="AdminInboxAgents"
        component={AdminInboxAgentsScreen}
      />
      <Stack.Screen
        options={kozeHeaderOptions(i18n.t('REPORTS.TITLE'))}
        name="Reports"
        component={ReportsScreen}
      />
    </Stack.Navigator>
  );
};
