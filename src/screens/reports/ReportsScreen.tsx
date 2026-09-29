import React, { useCallback, useState } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppSelector } from '@/hooks';
import { KozeCard, Spinner } from '@/components-next';
import { useTabBarHeight } from '@/utils';
import { selectCurrentUserAccountId } from '@/store/auth/authSelectors';
import { showAdminError } from '@/store/admin/adminService';
import {
  formatDuration,
  OpenConversationCounts,
  ReportsService,
  ReportSummary,
} from '@/store/reports/reportsService';

const PERIODS = [7, 30] as const;
type Period = (typeof PERIODS)[number];

const MetricCard = ({
  label,
  value,
  previous,
}: {
  label: string;
  value: string;
  previous?: string;
}) => (
  <KozeCard style={tailwind.style('flex-1 p-4 gap-1')}>
    <Animated.Text style={tailwind.style('text-sm font-inter-420-20 text-koze-muted')}>
      {label}
    </Animated.Text>
    <Animated.Text style={tailwind.style('text-2xl font-inter-580-24 text-koze-navy')}>
      {value}
    </Animated.Text>
    {previous !== undefined && (
      <Animated.Text style={tailwind.style('text-xs font-inter-normal-20 text-koze-muted')}>
        {i18n.t('REPORTS.PREVIOUS', { value: previous })}
      </Animated.Text>
    )}
  </KozeCard>
);

// Koze: Settings > Administration > Reports (Chatwoot reports API).
const ReportsScreen = () => {
  const accountId = useAppSelector(selectCurrentUserAccountId);
  const tabBarHeight = useTabBarHeight();
  const [period, setPeriod] = useState<Period>(7);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [open, setOpen] = useState<OpenConversationCounts | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    try {
      const [report, counts] = await Promise.all([
        ReportsService.summary(accountId, period),
        ReportsService.openConversations(),
      ]);
      setSummary(report);
      setOpen(counts);
    } catch (error) {
      showAdminError(error);
    }
  }, [accountId, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <View style={tailwind.style('flex-row items-center justify-end px-4 pt-1 pb-2')}>
        <View
          style={tailwind.style(
            'flex-row rounded-full bg-white border-[1.5px] border-koze-line p-0.5',
          )}>
          {PERIODS.map(days => (
            <Pressable
              key={days}
              accessibilityRole="button"
              accessibilityState={{ selected: period === days }}
              onPress={() => setPeriod(days)}
              style={tailwind.style(
                'px-3 py-1 rounded-full',
                period === days ? 'bg-blue-800' : '',
              )}>
              <Animated.Text
                style={tailwind.style(
                  'text-sm font-inter-medium-24',
                  period === days ? 'text-white' : 'text-koze-muted',
                )}>
                {days === 7 ? i18n.t('REPORTS.PERIOD_7') : i18n.t('REPORTS.PERIOD_30')}
              </Animated.Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!summary || !open ? (
        <View style={tailwind.style('pt-16 items-center')}>
          <Spinner size={24} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          contentContainerStyle={tailwind.style('px-4 pt-4 gap-3', `pb-[${tabBarHeight + 24}px]`)}>
          <Animated.Text
            style={tailwind.style('text-sm font-inter-medium-24 text-koze-muted pl-1')}>
            {i18n.t('REPORTS.OPEN_NOW')}
          </Animated.Text>
          <View style={tailwind.style('flex-row gap-3')}>
            <MetricCard label={i18n.t('REPORTS.MINE')} value={String(open.mine_count)} />
            <MetricCard
              label={i18n.t('REPORTS.UNASSIGNED')}
              value={String(open.unassigned_count)}
            />
            <MetricCard label={i18n.t('REPORTS.ALL')} value={String(open.all_count)} />
          </View>

          <Animated.Text
            style={tailwind.style('pt-3 text-sm font-inter-medium-24 text-koze-muted pl-1')}>
            {i18n.t('REPORTS.ACTIVITY')}
          </Animated.Text>
          <View style={tailwind.style('flex-row gap-3')}>
            <MetricCard
              label={i18n.t('REPORTS.CONVERSATIONS')}
              value={String(summary.conversations_count)}
              previous={String(summary.previous.conversations_count)}
            />
            <MetricCard
              label={i18n.t('REPORTS.RESOLVED')}
              value={String(summary.resolutions_count)}
              previous={String(summary.previous.resolutions_count)}
            />
          </View>
          <View style={tailwind.style('flex-row gap-3')}>
            <MetricCard
              label={i18n.t('REPORTS.INCOMING')}
              value={String(summary.incoming_messages_count)}
              previous={String(summary.previous.incoming_messages_count)}
            />
            <MetricCard
              label={i18n.t('REPORTS.OUTGOING')}
              value={String(summary.outgoing_messages_count)}
              previous={String(summary.previous.outgoing_messages_count)}
            />
          </View>
          <View style={tailwind.style('flex-row gap-3')}>
            <MetricCard
              label={i18n.t('REPORTS.FIRST_RESPONSE')}
              value={formatDuration(summary.avg_first_response_time)}
              previous={formatDuration(summary.previous.avg_first_response_time)}
            />
            <MetricCard
              label={i18n.t('REPORTS.RESOLUTION_TIME')}
              value={formatDuration(summary.avg_resolution_time)}
              previous={formatDuration(summary.previous.avg_resolution_time)}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ReportsScreen;
