import React from 'react';
import { Animated, Image, View } from 'react-native';

import { tailwind } from '@/theme';

interface KozeAuthHeaderProps {
  title: string;
  subtitle?: string;
}

// Koze header for the login, signup and password screens: centred logo, title, subtitle.
export const KozeAuthHeader = ({ title, subtitle }: KozeAuthHeaderProps) => (
  <View style={tailwind.style('items-center pb-6')}>
    <View style={tailwind.style('bg-white rounded-3xl p-4 border-[1.5px] border-koze-line')}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        source={require('@/assets/images/logo.png')}
        style={tailwind.style('w-16 h-[78px]')}
        resizeMode="contain"
        accessibilityLabel="Koze"
      />
    </View>
    <Animated.Text
      style={tailwind.style('pt-6 text-2xl text-center text-koze-navy font-inter-semibold-20')}>
      {title}
    </Animated.Text>
    {subtitle ? (
      <Animated.Text
        style={tailwind.style(
          'pt-2 text-center font-inter-normal-20 leading-[20px] tracking-[0.32px] text-koze-muted',
        )}>
        {subtitle}
      </Animated.Text>
    ) : null}
  </View>
);
