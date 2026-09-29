import React, { useCallback, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { Button, Icon, Spinner } from '@/components-next';
import { CheckedIcon, UncheckedIcon } from '@/svg-icons';
import { showToast } from '@/utils/toastUtils';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import type { AdminAgent } from '@/store/admin/adminTypes';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';

// Koze: pick the agents who can see and answer one inbox. Administrators see every inbox,
// so only agents are listed.
const AdminInboxAgentsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { inboxId, inboxName } =
    useRoute<RouteProp<SettingsStackParamList, 'AdminInboxAgents'>>().params;
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([AdminService.listAgents(), AdminService.getInboxMemberIds(inboxId)])
        .then(([allAgents, memberIds]) => {
          if (!isActive) return;
          setAgents(allAgents.filter(agent => agent.role === 'agent'));
          setSelectedIds(memberIds);
        })
        .catch(showAdminError)
        .finally(() => isActive && setIsLoading(false));
      return () => {
        isActive = false;
      };
    }, [inboxId]),
  );

  const toggle = (agentId: number) =>
    setSelectedIds(ids =>
      ids.includes(agentId) ? ids.filter(id => id !== agentId) : [...ids, agentId],
    );

  const onSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Keep members that are not listed here (administrators) untouched.
      const agentIds = agents.map(agent => agent.id);
      const keptIds = selectedIds.filter(id => !agentIds.includes(id));
      const chosenIds = selectedIds.filter(id => agentIds.includes(id));
      await AdminService.setInboxMembers(inboxId, [...keptIds, ...chosenIds]);
      showToast({ message: i18n.t('ADMIN.SAVED') });
      navigation.goBack();
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <ScrollView contentContainerStyle={tailwind.style('px-4 pt-2 pb-8')}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-900 pb-4')}>
          {i18n.t('ADMIN.INBOX_AGENTS_DESCRIPTION', { name: inboxName })}
        </Animated.Text>

        {isLoading ? (
          <View style={tailwind.style('py-8 items-center')}>
            <Spinner size={24} />
          </View>
        ) : agents.length === 0 ? (
          <View style={tailwind.style('gap-4')}>
            <Animated.Text style={tailwind.style('font-inter-normal-20 text-gray-700')}>
              {i18n.t('ADMIN.NO_AGENTS')}
            </Animated.Text>
            <Button
              text={i18n.t('ADMIN.ADD_AGENT')}
              handlePress={() => navigation.navigate('AdminAddAgent')}
            />
          </View>
        ) : (
          <>
            <View style={tailwind.style('rounded-2xl bg-white border-[1.5px] border-koze-line')}>
              {agents.map((agent, index) => {
                const isSelected = selectedIds.includes(agent.id);
                return (
                  <Pressable
                    key={agent.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => toggle(agent.id)}
                    style={({ pressed }) =>
                      tailwind.style(
                        'flex-row items-center px-3 py-3 gap-3',
                        pressed ? 'bg-blue-50' : '',
                        index < agents.length - 1 ? 'border-b-[1px] border-b-koze-line' : '',
                      )
                    }>
                    <Icon size={22} icon={isSelected ? <CheckedIcon /> : <UncheckedIcon />} />
                    <View style={tailwind.style('flex-1')}>
                      <Animated.Text
                        style={tailwind.style('text-base font-inter-420-20 text-gray-950')}>
                        {agent.name}
                      </Animated.Text>
                      <Animated.Text
                        style={tailwind.style('text-sm font-inter-normal-20 text-gray-900')}>
                        {agent.email}
                      </Animated.Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={tailwind.style('pt-6')}>
              <Button
                text={isSaving ? i18n.t('ADMIN.SAVING') : i18n.t('ADMIN.SAVE')}
                handlePress={onSave}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminInboxAgentsScreen;
