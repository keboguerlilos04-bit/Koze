import React, { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { authActions } from '@/store/auth/authActions';
import * as Sentry from '@sentry/react-native';

import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  selectLoggedIn,
  selectUser,
  selectCurrentUserAccount,
  selectPubSubToken,
  selectUserId,
  selectCurrentUserAccountId,
} from '@/store/auth/authSelectors';
import { selectWebSocketUrl } from '@/store/settings/settingsSelectors';

import { getUserPermissions } from '@/utils/permissionUtils';
import { CONVERSATION_PERMISSIONS } from 'constants/permissions';

import { AuthStack, ConversationStack, InboxesStack, ReportsStack, SettingsStack } from '../stack';
import ChatScreen from '@/screens/chat-screen/ChatScreen';
import ContactDetailsScreen from '@/screens/contact-details/ContactDetailsScreen';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import SearchScreen from '@/screens/search/SearchScreen';
import NotificationsScreen from '@/screens/inbox/InboxScreen';
import NewConversationScreen from '@/screens/new-conversation/NewConversationScreen';
import { kozeHeaderOptions } from '../stack/kozeHeaderOptions';
import i18n from '@/i18n';

import { selectInstallationUrl } from '@/store/settings/settingsSelectors';
import { BottomTabBar } from './BottomTabBar';
import { settingsActions } from '@/store/settings/settingsActions';
import { selectChatwootVersion } from '@/store/settings/settingsSelectors';
import { checkServerSupport } from '@/utils/serverUtils';
import { inboxActions } from '@/store/inbox/inboxActions';
import { labelActions } from '@/store/label/labelActions';
import actionCableConnector from '@/utils/actionCable';
import { setCurrentState } from '@/store/conversation/conversationHeaderSlice';
import AnalyticsHelper from '@/utils/analyticsUtils';
import { clearAllDeliveredNotifications } from '@/utils/pushUtils';
import { dashboardAppActions } from '@/store/dashboard-app/dashboardAppActions';
import { customAttributeActions } from '@/store/custom-attribute/customAttributeActions';
import { clearSelection } from '@/store/conversation/conversationSelectedSlice';
import { notificationActions } from '@/store/notification/notificationAction';

const Tab = createBottomTabNavigator();

export type TabParamList = {
  Conversations: undefined;
  // Koze: WhatsApp / Telegram inboxes (notifications moved behind the bell).
  Inboxes: undefined;
  Reports: undefined;
  Settings: undefined;
  Login: undefined;
  ConfigInstallationURL: undefined;
  ForgotPassword: undefined;
  Search: undefined;
  Notifications: undefined;
};

export type TabBarExcludedScreenParamList = {
  Tab: undefined;
  ChatScreen: {
    conversationId: number;
    primaryActorId?: number;
    primaryActorType?: string;
    messageId?: number;
  };
  ContactDetails: { conversationId?: number; contactId?: number };
  ConversationActions: undefined;
  Dashboard: { url: string };
  Login: undefined;
  SearchScreen: undefined;
  Notifications: undefined;
  NewConversation: undefined;
  ImageScreen: undefined;
  ConversationDetails: undefined;
  ConversationAction: undefined;
};
const Stack = createNativeStackNavigator<TabBarExcludedScreenParamList>();

const CustomTabBar = (props: BottomTabBarProps) => <BottomTabBar {...props} />;

const Tabs = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const installationUrl = useAppSelector(selectInstallationUrl);
  const chatwootVersion = useAppSelector(selectChatwootVersion);
  const currentAccount = useAppSelector(selectCurrentUserAccount);
  const currentAccountRole = currentAccount?.role;
  const pubSubToken = useAppSelector(selectPubSubToken);
  const userId = useAppSelector(selectUserId);
  const accountId = useAppSelector(selectCurrentUserAccountId);
  const webSocketUrl = useAppSelector(selectWebSocketUrl);

  useEffect(() => {
    // Here is the place we are loading all the data for the app first time first time or user switches account
    dispatch(authActions.getProfile());
    dispatch(settingsActions.saveDeviceDetails());
    dispatch(inboxActions.fetchInboxes());
    initActionCable();
    dispatch(labelActions.fetchLabels());
    dispatch(setCurrentState('none'));
    dispatch(clearSelection());
    dispatch(dashboardAppActions.index());
    dispatch(customAttributeActions.index());
    // Koze: loads the unread count for the bell in the conversations header.
    dispatch(notificationActions.fetchNotifications({ page: 1, sort_order: 'desc' }));
    initAnalytics();
    initSentry();
    initPushNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initAnalytics = useCallback(async () => {
    if (user) {
      AnalyticsHelper.identify(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initPushNotifications = useCallback(async () => {
    clearAllDeliveredNotifications();
  }, []);

  const initSentry = useCallback(async () => {
    Sentry.setUser({
      id: user?.id,
      email: user?.email,
      account_id: user?.account_id,
      name: user?.name,
      role: user?.role,
      installation_url: installationUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initActionCable = useCallback(async () => {
    if (pubSubToken && webSocketUrl && accountId && userId) {
      actionCableConnector.init({ pubSubToken, webSocketUrl, accountId, userId });
    }
  }, [accountId, pubSubToken, userId, webSocketUrl]);

  // Re-run the account-scoped bootstrap when the active account changes, e.g. after a
  // cross-account push switch while the tabs stay mounted (mount is handled above).
  const isInitialAccountMount = useRef(true);
  useEffect(() => {
    if (isInitialAccountMount.current) {
      isInitialAccountMount.current = false;
      return;
    }
    dispatch(inboxActions.fetchInboxes());
    dispatch(labelActions.fetchLabels());
    dispatch(dashboardAppActions.index());
    dispatch(customAttributeActions.index());
    dispatch(notificationActions.fetchNotifications({ page: 1, sort_order: 'desc' }));
    initActionCable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    dispatch(settingsActions.getChatwootVersion({ installationUrl: installationUrl }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installationUrl]);

  const userPermissions = user ? getUserPermissions(user, user.account_id) : [];

  // Checking if user has conversation permission to show inbox and conversations tabs
  const hasConversationPermission = CONVERSATION_PERMISSIONS.some(permission =>
    userPermissions.includes(permission),
  );

  const checkAppVersion = useCallback(async () => {
    if (chatwootVersion) {
      checkServerSupport({
        installedVersion: chatwootVersion,
        userRole: currentAccountRole,
      });
    }
  }, [chatwootVersion, currentAccountRole]);

  useEffect(() => {
    checkAppVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tab.Navigator tabBar={CustomTabBar} initialRouteName="Conversations">
      {hasConversationPermission && (
        <Tab.Screen
          name="Conversations"
          options={{ headerShown: false }}
          component={ConversationStack}
        />
      )}
      {hasConversationPermission && (
        <Tab.Screen name="Inboxes" options={{ headerShown: false }} component={InboxesStack} />
      )}
      {/* Koze: Chatwoot only serves reports to administrators. */}
      {currentAccountRole === 'administrator' && (
        <Tab.Screen name="Reports" options={{ headerShown: false }} component={ReportsStack} />
      )}
      <Tab.Screen name="Settings" options={{ headerShown: false }} component={SettingsStack} />
    </Tab.Navigator>
  );
};

export const AppTabs = () => {
  const isLoggedIn = useAppSelector(selectLoggedIn);

  if (isLoggedIn) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tab" component={Tabs} />
        <Stack.Screen
          options={{ animation: 'slide_from_right' }}
          name="ChatScreen"
          component={ChatScreen}
        />
        <Stack.Screen
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            animation: 'slide_from_bottom',
          }}
          name="ContactDetails"
          component={ContactDetailsScreen}
        />
        <Stack.Screen
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            animation: 'slide_from_bottom',
          }}
          name="Dashboard"
          component={DashboardScreen}
        />
        <Stack.Screen
          options={{ headerShown: false, animation: 'slide_from_right' }}
          name="SearchScreen"
          component={SearchScreen}
        />
        <Stack.Screen
          options={{ headerShown: false, animation: 'slide_from_right' }}
          name="Notifications"
          component={NotificationsScreen}
        />
        <Stack.Screen
          options={{
            ...kozeHeaderOptions(i18n.t('NEW_CONVERSATION.TITLE')),
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            animation: 'slide_from_bottom',
          }}
          name="NewConversation"
          component={NewConversationScreen}
        />
      </Stack.Navigator>
    );
  } else {
    return <AuthStack />;
  }
};
