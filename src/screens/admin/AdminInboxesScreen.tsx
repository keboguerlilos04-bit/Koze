import React, { useCallback } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { Button, Icon } from '@/components-next';
import { CaretRight } from '@/svg-icons';
import { getChannelIcon } from '@/utils/getChannelIcon';
import { inboxActions } from '@/store/inbox/inboxActions';
import { selectAllInboxes } from '@/store/inbox/inboxSelectors';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';

// Koze: the owner's inboxes. Tap one to choose its agents, or add Telegram / WhatsApp.
const AdminInboxesScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const dispatch = useAppDispatch();
  const inboxes = useAppSelector(selectAllInboxes);

  useFocusEffect(
    useCallback(() => {
      dispatch(inboxActions.fetchInboxes());
    }, [dispatch]),
  );

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <ScrollView contentContainerStyle={tailwind.style('px-4 pt-2 pb-8')}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-900 pb-4')}>
          {i18n.t('ADMIN.INBOXES_DESCRIPTION')}
        </Animated.Text>

        {inboxes.length === 0 ? (
          <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-700 py-4')}>
            {i18n.t('ADMIN.NO_INBOXES')}
          </Animated.Text>
        ) : (
          <View style={tailwind.style('rounded-2xl bg-white border-[1.5px] border-koze-line')}>
            {inboxes.map((inbox, index) => (
              <Pressable
                key={inbox.id}
                onPress={() =>
                  navigation.navigate('AdminInboxAgents', {
                    inboxId: inbox.id,
                    inboxName: inbox.name,
                  })
                }
                style={({ pressed }) =>
                  tailwind.style(
                    'flex-row items-center px-3 py-3 gap-3',
                    pressed ? 'bg-blue-50' : '',
                    index < inboxes.length - 1 ? 'border-b-[1px] border-b-koze-line' : '',
                  )
                }>
                <Icon size={24} icon={getChannelIcon(inbox.channelType, inbox.medium, '')} />
                <Animated.Text
                  style={tailwind.style('flex-1 text-base font-inter-420-20 text-gray-950')}>
                  {inbox.name}
                </Animated.Text>
                <Icon size={20} icon={<CaretRight />} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={tailwind.style('pt-6 gap-3')}>
          <Button
            text={i18n.t('ADMIN.ADD_TELEGRAM')}
            handlePress={() => navigation.navigate('AdminAddInbox', { channel: 'telegram' })}
          />
          <Button
            variant="secondary"
            text={i18n.t('ADMIN.ADD_WHATSAPP')}
            handlePress={() => navigation.navigate('AdminAddInbox', { channel: 'whatsapp' })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminInboxesScreen;
