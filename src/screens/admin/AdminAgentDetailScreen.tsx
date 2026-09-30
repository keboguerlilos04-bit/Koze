import React, { useCallback, useState } from 'react';
import { Alert, Animated, Switch, TextInput, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { EMAIL_REGEX } from '@/constants';
import { useAppSelector } from '@/hooks';
import { Button, KozeCard, Spinner } from '@/components-next';
import { KOZE_COLORS } from '@/theme/colors/koze';
import { showToast } from '@/utils/toastUtils';
import { selectUserId } from '@/store/auth/authSelectors';
import { selectTeamPresence } from '@/store/team-presence/teamPresenceSlice';
import { AdminService, showAdminError } from '@/store/admin/adminService';
import type { Gender, TeamMember, WeekDay, WorkSchedule } from '@/store/admin/adminTypes';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import { AdminTextField } from './components/AdminTextField';
import { StatusDot, statusLabel } from './components/StatusDot';
import { ChoiceChips } from './components/ChoiceChips';
import { showResetCodeAlert } from './components/resetCodeAlert';

const WEEK: { day: WeekDay; label: string }[] = [
  { day: 'mon', label: 'ADMIN.DAY_MON' },
  { day: 'tue', label: 'ADMIN.DAY_TUE' },
  { day: 'wed', label: 'ADMIN.DAY_WED' },
  { day: 'thu', label: 'ADMIN.DAY_THU' },
  { day: 'fri', label: 'ADMIN.DAY_FRI' },
  { day: 'sat', label: 'ADMIN.DAY_SAT' },
  { day: 'sun', label: 'ADMIN.DAY_SUN' },
];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_TIMEZONE = 'America/Port-au-Prince';
// A new schedule starts as a usual work week.
const DEFAULT_DAYS: WorkSchedule['days'] = {
  mon: { start: '08:00', end: '17:00' },
  tue: { start: '08:00', end: '17:00' },
  wed: { start: '08:00', end: '17:00' },
  thu: { start: '08:00', end: '17:00' },
  fri: { start: '08:00', end: '17:00' },
};

const SectionTitle = ({ text }: { text: string }) => (
  <Animated.Text
    style={tailwind.style('pt-6 pb-2 pl-1 text-sm font-inter-medium-24 text-koze-muted')}>
    {text}
  </Animated.Text>
);

const TimeInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <TextInput
    value={value}
    onChangeText={onChange}
    keyboardType="numbers-and-punctuation"
    maxLength={5}
    placeholder="08:00"
    placeholderTextColor={tailwind.color('text-gray-600')}
    style={tailwind.style(
      'w-[68px] h-9 rounded-xl border-[1.5px] border-koze-line bg-white text-center',
      'font-inter-420-20 text-koze-navy',
    )}
  />
);

const switchColors = { false: KOZE_COLORS.line, true: KOZE_COLORS.primary };

// Koze: one team member — contact details, password reset code, pause and working hours.
const AdminAgentDetailScreen = () => {
  const navigation = useNavigation();
  const { memberId } = useRoute<RouteProp<SettingsStackParamList, 'AdminAgentDetail'>>().params;
  const currentUserId = useAppSelector(selectUserId);
  const presence = useAppSelector(selectTeamPresence);

  const [member, setMember] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [days, setDays] = useState<WorkSchedule['days'] | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const applyMember = (next: TeamMember) => {
    setMember(next);
    setName(next.name);
    setEmail(next.email);
    setPhone(next.phone_number ?? '');
    setGender(next.gender ?? '');
    setDays(next.schedule?.days ?? null);
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      AdminService.team()
        .then(team => {
          const found = team.agents.find(item => item.id === memberId);
          if (isActive && found) applyMember(found);
        })
        .catch(showAdminError);
      return () => {
        isActive = false;
      };
    }, [memberId]),
  );

  // Runs one save, with its own busy flag so each section's button can show progress.
  const run = async (key: string, task: () => Promise<TeamMember | void>, doneMessage: string) => {
    if (busy) return;
    setBusy(key);
    try {
      const result = await task();
      if (result) applyMember(result);
      showToast({ message: doneMessage });
    } catch (error) {
      showAdminError(error);
    } finally {
      setBusy(null);
    }
  };

  if (!member) {
    return (
      <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas items-center')}>
        <View style={tailwind.style('pt-16')}>
          <Spinner size={24} />
        </View>
      </SafeAreaView>
    );
  }

  const isSelf = member.id === currentUserId;
  const status = member.paused ? 'offline' : (presence[member.id] ?? member.availability_status);

  const saveContact = () => {
    const found = {
      name: name.trim() ? undefined : i18n.t('ADMIN.FIELD_REQUIRED'),
      email: EMAIL_REGEX.test(email.trim()) ? undefined : i18n.t('LOGIN.EMAIL_ERROR'),
    };
    setErrors(current => ({ ...current, ...found }));
    if (found.name || found.email) return;
    run(
      'contact',
      () =>
        AdminService.updateMember(member.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phone.trim(),
          gender,
        }),
      i18n.t('ADMIN.CONTACT_SAVED'),
    );
  };

  // The owner never sets a member's password: they get a one-time code to hand over.
  const resetPassword = async () => {
    if (busy) return;
    setBusy('password');
    try {
      const { code } = await AdminService.resetPassword(member.id);
      showResetCodeAlert({
        title: i18n.t('ADMIN.RESET_CODE_TITLE'),
        name: member.name,
        email: member.email,
        code,
      });
    } catch (error) {
      showAdminError(error);
    } finally {
      setBusy(null);
    }
  };

  const togglePause = (paused: boolean) =>
    run(
      'pause',
      () => AdminService.setPaused(member.id, paused),
      paused ? i18n.t('ADMIN.AGENT_PAUSED') : i18n.t('ADMIN.AGENT_RESUMED'),
    );

  const setDay = (day: WeekDay, hours: { start: string; end: string } | undefined) =>
    setDays(current => {
      const next = { ...(current ?? {}) };
      if (hours) next[day] = hours;
      else delete next[day];
      return next;
    });

  const saveSchedule = () => {
    const invalid = Object.values(days ?? {}).some(
      hours =>
        !TIME_REGEX.test(hours.start) || !TIME_REGEX.test(hours.end) || hours.end <= hours.start,
    );
    setErrors(current => ({
      ...current,
      schedule: invalid ? i18n.t('ADMIN.TIME_ERROR') : undefined,
    }));
    if (invalid) return;
    run(
      'schedule',
      () =>
        AdminService.setSchedule(member.id, {
          timezone: member.schedule?.timezone ?? DEFAULT_TIMEZONE,
          days: days ?? {},
        }),
      i18n.t('ADMIN.SCHEDULE_SAVED'),
    );
  };

  const removeSchedule = () =>
    run(
      'schedule',
      () => AdminService.setSchedule(member.id, null),
      i18n.t('ADMIN.SCHEDULE_SAVED'),
    );

  const confirmRemove = () =>
    Alert.alert(
      i18n.t('ADMIN.REMOVE_AGENT_TITLE', { name: member.name }),
      i18n.t('ADMIN.REMOVE_AGENT_MESSAGE'),
      [
        { text: i18n.t('ADMIN.CANCEL'), style: 'cancel' },
        {
          text: i18n.t('ADMIN.REMOVE'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.removeAgent(member.id);
              navigation.goBack();
            } catch (error) {
              showAdminError(error);
            }
          },
        },
      ],
    );

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-4 pt-2 pb-10')}>
        <KozeCard style={tailwind.style('px-4 py-3 flex-row items-center gap-2')}>
          <StatusDot status={status} />
          <Animated.Text style={tailwind.style('flex-1 font-inter-medium-24 text-koze-navy')}>
            {member.paused ? i18n.t('ADMIN.PAUSED') : statusLabel(status)}
          </Animated.Text>
          <Animated.Text style={tailwind.style('text-sm font-inter-420-20 text-blue-800')}>
            {member.is_owner
              ? i18n.t('ADMIN.OWNER')
              : member.role === 'administrator'
                ? i18n.t('ADMIN.ROLE_ADMINISTRATOR')
                : i18n.t('ADMIN.ROLE_AGENT')}
          </Animated.Text>
        </KozeCard>

        <SectionTitle text={i18n.t('ADMIN.CONTACT_SECTION')} />
        <KozeCard style={tailwind.style('px-4 pb-4')}>
          <AdminTextField
            label={i18n.t('ADMIN.AGENT_NAME')}
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="words"
          />
          <AdminTextField
            label={i18n.t('ADMIN.AGENT_EMAIL')}
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
          />
          <AdminTextField
            label={i18n.t('ADMIN.PHONE')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <ChoiceChips<Gender>
            label={i18n.t('ADMIN.GENDER')}
            value={gender}
            onChange={setGender}
            options={[
              { value: 'female', label: i18n.t('ADMIN.GENDER_FEMALE') },
              { value: 'male', label: i18n.t('ADMIN.GENDER_MALE') },
              { value: 'other', label: i18n.t('ADMIN.GENDER_OTHER') },
              { value: '', label: i18n.t('ADMIN.GENDER_UNSET') },
            ]}
          />
          <View style={tailwind.style('pt-5')}>
            <Button
              disabled={!!busy}
              text={busy === 'contact' ? '…' : i18n.t('ADMIN.SAVE_CONTACT')}
              handlePress={saveContact}
            />
          </View>
        </KozeCard>

        <SectionTitle text={i18n.t('ADMIN.PASSWORD_SECTION')} />
        <KozeCard style={tailwind.style('px-4 py-4 gap-3')}>
          <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
            {isSelf ? i18n.t('PROFILE.CHANGE_PASSWORD') : i18n.t('ADMIN.RESET_HINT')}
          </Animated.Text>
          <View>
            <Button
              variant="secondary"
              disabled={!!busy}
              text={
                isSelf
                  ? i18n.t('PROFILE.CHANGE_PASSWORD')
                  : busy === 'password'
                    ? '…'
                    : i18n.t('ADMIN.RESET_PASSWORD')
              }
              handlePress={
                isSelf ? () => navigation.navigate('ChangePassword' as never) : resetPassword
              }
            />
          </View>
        </KozeCard>

        {!member.is_owner && (
          <>
            <SectionTitle text={i18n.t('ADMIN.ACCESS_SECTION')} />
            <KozeCard style={tailwind.style('px-4 py-3 gap-2')}>
              <View style={tailwind.style('flex-row items-center justify-between gap-3')}>
                <Animated.Text style={tailwind.style('flex-1 font-inter-medium-24 text-koze-navy')}>
                  {i18n.t('ADMIN.PAUSE_LABEL')}
                </Animated.Text>
                <Switch
                  value={member.paused}
                  disabled={!!busy}
                  onValueChange={togglePause}
                  trackColor={switchColors}
                  thumbColor="white"
                />
              </View>
              <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
                {i18n.t('ADMIN.PAUSE_HINT')}
              </Animated.Text>
            </KozeCard>
          </>
        )}

        {member.role === 'agent' && (
          <>
            <SectionTitle text={i18n.t('ADMIN.SCHEDULE_SECTION')} />
            <KozeCard style={tailwind.style('px-4 py-3 gap-3')}>
              <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
                {i18n.t('ADMIN.SCHEDULE_HINT')}
              </Animated.Text>
              {days === null ? (
                <>
                  <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
                    {i18n.t('ADMIN.SCHEDULE_NONE')}
                  </Animated.Text>
                  <Button
                    variant="secondary"
                    text={i18n.t('ADMIN.SCHEDULE_ENABLE')}
                    handlePress={() => setDays(DEFAULT_DAYS)}
                  />
                </>
              ) : (
                <>
                  {WEEK.map(({ day, label }) => {
                    const hours = days[day];
                    return (
                      <View key={day} style={tailwind.style('flex-row items-center gap-2')}>
                        <Switch
                          value={!!hours}
                          onValueChange={on =>
                            setDay(day, on ? { start: '08:00', end: '17:00' } : undefined)
                          }
                          trackColor={switchColors}
                          thumbColor="white"
                        />
                        <Animated.Text
                          style={tailwind.style('w-[84px] font-inter-420-20 text-koze-navy')}>
                          {i18n.t(label)}
                        </Animated.Text>
                        {hours ? (
                          <View style={tailwind.style('flex-row items-center gap-1.5')}>
                            <TimeInput
                              value={hours.start}
                              onChange={start => setDay(day, { ...hours, start })}
                            />
                            <Animated.Text style={tailwind.style('text-koze-muted')}>
                              –
                            </Animated.Text>
                            <TimeInput
                              value={hours.end}
                              onChange={end => setDay(day, { ...hours, end })}
                            />
                          </View>
                        ) : (
                          <Animated.Text
                            style={tailwind.style('font-inter-normal-20 text-koze-muted')}>
                            {i18n.t('ADMIN.DAY_OFF')}
                          </Animated.Text>
                        )}
                      </View>
                    );
                  })}
                  {errors.schedule ? (
                    <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
                      {errors.schedule}
                    </Animated.Text>
                  ) : null}
                  <Button
                    disabled={!!busy}
                    text={busy === 'schedule' ? '…' : i18n.t('ADMIN.SAVE_SCHEDULE')}
                    handlePress={saveSchedule}
                  />
                  {member.schedule && (
                    <Button
                      variant="secondary"
                      disabled={!!busy}
                      text={i18n.t('ADMIN.SCHEDULE_REMOVE')}
                      handlePress={removeSchedule}
                    />
                  )}
                </>
              )}
            </KozeCard>
          </>
        )}

        {!member.is_owner && !isSelf && (
          <View style={tailwind.style('pt-8')}>
            <Button
              variant="secondary"
              isDestructive
              text={i18n.t('ADMIN.REMOVE_FROM_ACCOUNT')}
              handlePress={confirmRemove}
            />
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default AdminAgentDetailScreen;
