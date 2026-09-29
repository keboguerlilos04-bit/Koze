import React, { useCallback } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { Button, Icon, KozeEmptyState } from '@/components-next';
import { CaretRight } from '@/svg-icons';
import { getChannelIcon } from '@/utils/getChannelIcon';
import { useTabBarHeight } from '@/utils';
import { inboxActions } from '@/store/inbox/inboxActions';
import { selectAllInboxes } from '@/store/inbox/inboxSelectors';
import { selectIsAccountOwner } from '@/store/auth/authSelectors';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';

// Koze: Settings > Administration > Inboxes. The owner adds an inbox (after the MonCash
// paywall) and chooses each inbox's agents.
const InboxesScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const dispatch = useAppDispatch();
  const inboxes = useAppSelector(selectAllInboxes);
  const isOwner = useAppSelector(selectIsAccountOwner);
  const tabBarHeight = useTabBarHeight();

  useFocusEffect(
    useCallback(() => {
      dispatch(inboxActions.fetchInboxes());
    }, [dispatch]),
  );

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <ScrollView
        contentContainerStyle={tailwind.style('px-4 pt-2', `pb-[${tabBarHeight + 24}px]`)}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-koze-muted pb-4')}>
          {isOwner ? i18n.t('INBOXES.DESCRIPTION_OWNER') : i18n.t('INBOXES.DESCRIPTION_AGENT')}
        </Animated.Text>

        {inboxes.length === 0 ? (
          <View style={tailwind.style('py-10')}>
            <KozeEmptyState
              title={i18n.t('INBOXES.TITLE')}
              subtitle={isOwner ? i18n.t('INBOXES.EMPTY_OWNER') : i18n.t('INBOXES.EMPTY_AGENT')}
            />
          </View>
        ) : (
          <View style={tailwind.style('rounded-2xl bg-white border-[1.5px] border-koze-line')}>
            {inboxes.map((inbox, index) => (
              <Pressable
                key={inbox.id}
                disabled={!isOwner}
                onPress={() =>
                  navigation.navigate('AdminInboxAgents', {
                    inboxId: inbox.id,
                    inboxName: inbox.name,
                  })
                }
                style={({ pressed }) =>
                  tailwind.style(
                    'flex-row items-center px-4 py-3.5 gap-3',
                    pressed ? 'bg-blue-50' : '',
                    index === 0 ? 'rounded-t-2xl' : '',
                    index === inboxes.length - 1 ? 'rounded-b-2xl' : '',
                    index < inboxes.length - 1 ? 'border-b-[1px] border-b-koze-line' : '',
                  )
                }>
                <Icon size={24} icon={getChannelIcon(inbox.channelType, inbox.medium, '')} />
                <Animated.Text
                  style={tailwind.style('flex-1 text-base font-inter-420-20 text-gray-950')}>
                  {inbox.name}
                </Animated.Text>
                {isOwner && <Icon size={20} icon={<CaretRight />} />}
              </Pressable>
            ))}
          </View>
        )}

        {isOwner && (
          <View style={tailwind.style('pt-6')}>
            <Button
              text={i18n.t('INBOXES.ADD')}
              handlePress={() => navigation.navigate('MonCashPaywall')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InboxesScreen;
