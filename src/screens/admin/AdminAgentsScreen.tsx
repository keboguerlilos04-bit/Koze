import React, { useCallback, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppSelector } from '@/hooks';
import { Button, Icon, Spinner } from '@/components-next';
import { DeleteIcon } from '@/svg-icons';
import { selectUserId } from '@/store/auth/authSelectors';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import type { AdminAgent } from '@/store/admin/adminTypes';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';

// Koze: the owner's list of agents, with add and remove.
const AdminAgentsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const currentUserId = useAppSelector(selectUserId);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reload on focus so an agent added on the next screen shows up on return.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      AdminService.listAgents()
        .then(list => isActive && setAgents(list))
        .catch(showAdminError)
        .finally(() => isActive && setIsLoading(false));
      return () => {
        isActive = false;
      };
    }, []),
  );

  const removeAgent = async (agent: AdminAgent) => {
    try {
      await AdminService.removeAgent(agent.id);
      setAgents(list => list.filter(item => item.id !== agent.id));
    } catch (error) {
      showAdminError(error);
    }
  };

  const confirmRemove = (agent: AdminAgent) => {
    Alert.alert(
      i18n.t('ADMIN.REMOVE_AGENT_TITLE', { name: agent.name }),
      i18n.t('ADMIN.REMOVE_AGENT_MESSAGE'),
      [
        { text: i18n.t('ADMIN.CANCEL'), style: 'cancel' },
        { text: i18n.t('ADMIN.REMOVE'), style: 'destructive', onPress: () => removeAgent(agent) },
      ],
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <ScrollView contentContainerStyle={tailwind.style('px-4 pt-2 pb-8')}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-900 pb-4')}>
          {i18n.t('ADMIN.AGENTS_DESCRIPTION')}
        </Animated.Text>

        {isLoading ? (
          <View style={tailwind.style('py-8 items-center')}>
            <Spinner size={24} />
          </View>
        ) : agents.length === 0 ? (
          <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-700 py-4')}>
            {i18n.t('ADMIN.NO_AGENTS')}
          </Animated.Text>
        ) : (
          <View style={tailwind.style('rounded-2xl bg-white border-[1.5px] border-koze-line')}>
            {agents.map((agent, index) => {
              const isSelf = agent.id === currentUserId;
              return (
                <View
                  key={agent.id}
                  style={tailwind.style(
                    'flex-row items-center px-3 py-3',
                    index < agents.length - 1 ? 'border-b-[1px] border-b-koze-line' : '',
                  )}>
                  <View style={tailwind.style('flex-1 gap-1')}>
                    <Animated.Text
                      style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                      {isSelf ? `${agent.name} (${i18n.t('ADMIN.YOU')})` : agent.name}
                    </Animated.Text>
                    <Animated.Text
                      style={tailwind.style('text-sm font-inter-normal-20 text-gray-900')}>
                      {agent.email}
                    </Animated.Text>
                    <Animated.Text
                      style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
                      {agent.role === 'administrator'
                        ? i18n.t('ADMIN.ROLE_ADMINISTRATOR')
                        : i18n.t('ADMIN.ROLE_AGENT')}
                    </Animated.Text>
                  </View>
                  {!isSelf && (
                    <Pressable
                      hitSlop={8}
                      accessibilityLabel={i18n.t('ADMIN.REMOVE')}
                      onPress={() => confirmRemove(agent)}>
                      <Icon size={22} icon={<DeleteIcon />} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={tailwind.style('pt-6')}>
          <Button
            text={i18n.t('ADMIN.ADD_AGENT')}
            handlePress={() => navigation.navigate('AdminAddAgent')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminAgentsScreen;
