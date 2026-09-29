import React from 'react';
import { Animated, Image, View } from 'react-native';

import { tailwind } from '@/theme';

interface KozeEmptyStateProps {
  title: string;
  subtitle?: string;
}

// Koze empty state: the Koze mark, faded, in a soft teal circle, with a short message.
export const KozeEmptyState = ({ title, subtitle }: KozeEmptyStateProps) => (
  <View style={tailwind.style('items-center px-10')}>
    <View style={tailwind.style('w-32 h-32 rounded-full bg-blue-100 items-center justify-center')}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        source={require('@/assets/images/logo-mark.png')}
        style={tailwind.style('w-20 h-20 opacity-40')}
        resizeMode="contain"
      />
    </View>
    <Animated.Text
      style={tailwind.style('pt-6 text-lg text-center text-koze-navy font-inter-580-24')}>
      {title}
    </Animated.Text>
    {subtitle ? (
      <Animated.Text
        style={tailwind.style(
          'pt-2 text-center font-inter-normal-20 leading-[20px] text-koze-muted',
        )}>
        {subtitle}
      </Animated.Text>
    ) : null}
  </View>
);
