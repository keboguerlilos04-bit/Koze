import { apiService } from '@/services/APIService';

// Koze: account statistics for the Reports tab (Chatwoot reports API, administrators only).
export interface ReportMetrics {
  conversations_count: number;
  incoming_messages_count: number;
  outgoing_messages_count: number;
  resolutions_count: number;
  // Seconds; null when there is nothing to average.
  avg_first_response_time: number | null;
  avg_resolution_time: number | null;
}

export interface ReportSummary extends ReportMetrics {
  // The same metrics over the period just before, for comparison.
  previous: ReportMetrics;
}

export interface OpenConversationCounts {
  mine_count: number;
  unassigned_count: number;
  all_count: number;
}

const ownErrors = { skipErrorToast: true };

export class ReportsService {
  static async summary(accountId: number, days: number): Promise<ReportSummary> {
    const until = Math.floor(Date.now() / 1000);
    const since = until - days * 24 * 60 * 60;
    const response = await apiService.get<ReportSummary>(
      `api/v2/accounts/${accountId}/reports/summary`,
      { params: { type: 'account', since, until }, ...ownErrors },
    );
    return response.data;
  }

  static async openConversations(): Promise<OpenConversationCounts> {
    const response = await apiService.get<{ meta: OpenConversationCounts }>('conversations/meta', {
      params: { status: 'open' },
      ...ownErrors,
    });
    return response.data.meta;
  }
}

// 3725 seconds → "1 h 2 min"; null → "—".
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  const daysCount = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${daysCount} j ${restHours} h` : `${daysCount} j`;
}
