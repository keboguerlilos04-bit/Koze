import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '@/screens/settings/SettingsScreen';
import AdminAgentsScreen from '@/screens/admin/AdminAgentsScreen';
import AdminAddAgentScreen from '@/screens/admin/AdminAddAgentScreen';
import AdminInboxesScreen from '@/screens/admin/AdminInboxesScreen';
import AdminAddInboxScreen from '@/screens/admin/AdminAddInboxScreen';
import AdminInboxAgentsScreen from '@/screens/admin/AdminInboxAgentsScreen';
import i18n from '@/i18n';
import { KOZE_COLORS } from '@/theme/colors/koze';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  // Koze: owner-only administration.
  AdminAgents: undefined;
  AdminAddAgent: undefined;
  AdminInboxes: undefined;
  AdminAddInbox: { channel: 'telegram' | 'whatsapp' };
  AdminInboxAgents: { inboxId: number; inboxName: string };
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

const adminScreenOptions = (title: string) => ({
  headerShown: true,
  headerBackTitle: 'Back',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: KOZE_COLORS.canvas },
  headerTintColor: KOZE_COLORS.primary,
  headerTitleStyle: { color: KOZE_COLORS.navy },
  title,
});

export const SettingsStack = () => {
  return (
    <Stack.Navigator initialRouteName="SettingsScreen">
      <Stack.Screen
        options={{ headerShown: false }}
        name="SettingsScreen"
        component={SettingsScreen}
      />
      <Stack.Screen
        options={adminScreenOptions(i18n.t('ADMIN.AGENTS'))}
        name="AdminAgents"
        component={AdminAgentsScreen}
      />
      <Stack.Screen
        options={adminScreenOptions(i18n.t('ADMIN.ADD_AGENT'))}
        name="AdminAddAgent"
        component={AdminAddAgentScreen}
      />
      <Stack.Screen
        options={adminScreenOptions(i18n.t('ADMIN.INBOXES'))}
        name="AdminInboxes"
        component={AdminInboxesScreen}
      />
      <Stack.Screen
        options={({ route }) =>
          adminScreenOptions(
            route.params.channel === 'telegram'
              ? i18n.t('ADMIN.ADD_TELEGRAM')
              : i18n.t('ADMIN.ADD_WHATSAPP'),
          )
        }
        name="AdminAddInbox"
        component={AdminAddInboxScreen}
      />
      <Stack.Screen
        options={({ route }) => adminScreenOptions(route.params.inboxName)}
        name="AdminInboxAgents"
        component={AdminInboxAgentsScreen}
      />
    </Stack.Navigator>
  );
};
