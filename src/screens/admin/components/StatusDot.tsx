import React from 'react';
import { View } from 'react-native';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import type { AvailabilityStatus } from '@/types';

// Koze: green when online, amber when busy, grey when offline.
export const StatusDot = ({ status }: { status: AvailabilityStatus | string }) => (
  <View
    accessibilityLabel={statusLabel(status)}
    style={tailwind.style(
      'w-2.5 h-2.5 rounded-full',
      status === 'online' ? 'bg-green-800' : status === 'busy' ? 'bg-amber-700' : 'bg-gray-500',
    )}
  />
);

export const statusLabel = (status: AvailabilityStatus | string) =>
  status === 'online'
    ? i18n.t('ADMIN.ONLINE')
    : status === 'busy'
      ? i18n.t('ADMIN.BUSY')
      : i18n.t('ADMIN.OFFLINE');
