import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import InboxesScreen from '@/screens/inboxes/InboxesScreen';
import MonCashPaywallScreen from '@/screens/inboxes/MonCashPaywallScreen';
import AdminAddInboxScreen from '@/screens/admin/AdminAddInboxScreen';
import AdminInboxAgentsScreen from '@/screens/admin/AdminInboxAgentsScreen';
import AdminAddAgentScreen from '@/screens/admin/AdminAddAgentScreen';
import i18n from '@/i18n';
import { kozeHeaderOptions } from './kozeHeaderOptions';

// Koze: the Inboxes tab. Everyone sees their inboxes; only the owner adds one, after paying
// with MonCash.
export type InboxesStackParamList = {
  Inboxes: undefined;
  MonCashPaywall: undefined;
  AdminAddInbox: { channel: 'telegram' | 'whatsapp' };
  AdminInboxAgents: { inboxId: number; inboxName: string };
  AdminAddAgent: undefined;
};

const Stack = createNativeStackNavigator<InboxesStackParamList>();

export const InboxesStack = () => (
  <Stack.Navigator initialRouteName="Inboxes">
    <Stack.Screen options={{ headerShown: false }} name="Inboxes" component={InboxesScreen} />
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
      options={kozeHeaderOptions(i18n.t('ADMIN.ADD_AGENT'))}
      name="AdminAddAgent"
      component={AdminAddAgentScreen}
    />
  </Stack.Navigator>
);
