import React, { useCallback, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppSelector } from '@/hooks';
import { Button, Icon, KozeCard, Spinner } from '@/components-next';
import { CaretRight } from '@/svg-icons';
import { selectUserId } from '@/store/auth/authSelectors';
import { selectTeamPresence } from '@/store/team-presence/teamPresenceSlice';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import type { TeamMember, TeamResponse } from '@/store/admin/adminTypes';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import { StatusDot, statusLabel } from './components/StatusDot';

const Chip = ({ label, tone }: { label: string; tone: 'muted' | 'warning' | 'brand' }) => (
  <View
    style={tailwind.style(
      'px-2 py-0.5 rounded-full',
      tone === 'warning' ? 'bg-amber-100' : tone === 'brand' ? 'bg-blue-100' : 'bg-gray-100',
    )}>
    <Animated.Text
      style={tailwind.style(
        'text-xs font-inter-medium-24',
        tone === 'warning'
          ? 'text-amber-900'
          : tone === 'brand'
            ? 'text-blue-800'
            : 'text-gray-800',
      )}>
      {label}
    </Animated.Text>
  </View>
);

// Koze: the owner's team. The dot shows who is online right now (websocket presence).
const AdminAgentsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const currentUserId = useAppSelector(selectUserId);
  const presence = useAppSelector(selectTeamPresence);
  const [team, setTeam] = useState<TeamResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      AdminService.team()
        .then(response => isActive && setTeam(response))
        .catch(showAdminError);
      return () => {
        isActive = false;
      };
    }, []),
  );

  const liveStatus = (member: TeamMember) =>
    member.paused ? 'offline' : (presence[member.id] ?? member.availability_status);

  const agentsCount = team?.agents.filter(member => member.role === 'agent').length ?? 0;
  const adminsCount = team?.agents.filter(member => member.role === 'administrator').length ?? 0;
  const isAgentLimitReached = !!team && agentsCount >= team.limits.agents;
  const isAdminLimitReached = !!team && adminsCount >= team.limits.administrators;

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <ScrollView contentContainerStyle={tailwind.style('px-4 pt-2 pb-8')}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-koze-muted pb-2')}>
          {i18n.t('ADMIN.AGENTS_DESCRIPTION')}
        </Animated.Text>

        {!team ? (
          <View style={tailwind.style('py-8 items-center')}>
            <Spinner size={24} />
          </View>
        ) : (
          <>
            <Animated.Text
              style={tailwind.style('text-sm font-inter-medium-24 text-blue-800 pb-3')}>
              {i18n.t('ADMIN.TEAM_LIMITS', {
                agents: agentsCount,
                maxAgents: team.limits.agents,
                admins: adminsCount,
                maxAdmins: team.limits.administrators,
              })}
            </Animated.Text>

            <KozeCard>
              {team.agents.map((member, index) => {
                const isSelf = member.id === currentUserId;
                const status = liveStatus(member);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() =>
                      navigation.navigate('AdminAgentDetail', {
                        memberId: member.id,
                        name: member.name,
                      })
                    }
                    style={({ pressed }) =>
                      tailwind.style(
                        'flex-row items-center px-4 py-3 gap-3',
                        pressed ? 'bg-blue-50' : '',
                        index === 0 ? 'rounded-t-2xl' : '',
                        index === team.agents.length - 1 ? 'rounded-b-2xl' : '',
                        index < team.agents.length - 1 ? 'border-b-[1px] border-b-koze-line' : '',
                      )
                    }>
                    <View style={tailwind.style('flex-1 gap-1')}>
                      <View style={tailwind.style('flex-row items-center gap-2')}>
                        <StatusDot status={status} />
                        <Animated.Text
                          numberOfLines={1}
                          style={tailwind.style(
                            'flex-shrink text-base font-inter-medium-24 text-koze-navy',
                          )}>
                          {isSelf ? `${member.name} (${i18n.t('ADMIN.YOU')})` : member.name}
                        </Animated.Text>
                      </View>
                      <Animated.Text
                        numberOfLines={1}
                        style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
                        {member.email}
                      </Animated.Text>
                      <View
                        style={tailwind.style('flex-row flex-wrap items-center gap-1.5 pt-0.5')}>
                        <Chip
                          tone="brand"
                          label={
                            member.is_owner
                              ? i18n.t('ADMIN.OWNER')
                              : member.role === 'administrator'
                                ? i18n.t('ADMIN.ROLE_ADMINISTRATOR')
                                : i18n.t('ADMIN.ROLE_AGENT')
                          }
                        />
                        <Chip tone="muted" label={statusLabel(status)} />
                        {member.paused && <Chip tone="warning" label={i18n.t('ADMIN.PAUSED')} />}
                        {!member.paused && !member.working_now && (
                          <Chip tone="warning" label={i18n.t('ADMIN.OUTSIDE_HOURS')} />
                        )}
                      </View>
                    </View>
                    <Icon size={20} icon={<CaretRight />} />
                  </Pressable>
                );
              })}
            </KozeCard>

            <View style={tailwind.style('pt-6 gap-2')}>
              <Button
                disabled={isAgentLimitReached && isAdminLimitReached}
                text={i18n.t('ADMIN.ADD_AGENT')}
                handlePress={() => navigation.navigate('AdminAddAgent')}
              />
              {isAgentLimitReached && (
                <Animated.Text
                  style={tailwind.style(
                    'text-sm text-center font-inter-normal-20 text-koze-muted',
                  )}>
                  {i18n.t('ADMIN.LIMIT_REACHED', { max: team.limits.agents })}
                </Animated.Text>
              )}
              {isAdminLimitReached && (
                <Animated.Text
                  style={tailwind.style(
                    'text-sm text-center font-inter-normal-20 text-koze-muted',
                  )}>
                  {i18n.t('ADMIN.ADMIN_LIMIT_REACHED', { max: team.limits.administrators })}
                </Animated.Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminAgentsScreen;
