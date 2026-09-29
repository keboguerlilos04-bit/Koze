import React, { PropsWithChildren } from 'react';
import { View, ViewProps } from 'react-native';

import { tailwind } from '@/theme';

// Koze card: white, 16px corners, soft outline, on the tinted page background.
export const KozeCard = ({ children, style, ...props }: PropsWithChildren<ViewProps>) => (
  <View
    style={[tailwind.style('bg-white rounded-2xl border-[1.5px] border-koze-line'), style]}
    {...props}>
    {children}
  </View>
);
