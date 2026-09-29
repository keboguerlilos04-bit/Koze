import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { tailwind } from '@/theme';
import { KOZE_COLORS } from '@/theme/colors/koze';
import { useHaptic, useScaleAnimation } from '@/utils';

interface KozeFabProps {
  onPress: () => void;
  accessibilityLabel: string;
  // Distance from the bottom of the screen, e.g. to sit above the tab bar.
  bottomOffset: number;
}

// Koze floating action button: round, Koze teal, bottom right (Material style).
export const KozeFab = ({ onPress, accessibilityLabel, bottomOffset }: KozeFabProps) => {
  const { handlers, animatedStyle } = useScaleAnimation();
  const haptic = useHaptic();

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[tailwind.style('absolute right-5 z-20'), { bottom: bottomOffset }, animatedStyle]}>
      <Pressable
        {...handlers}
        onPress={() => {
          haptic?.();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          tailwind.style(
            'w-14 h-14 rounded-full items-center justify-center',
            pressed ? 'bg-blue-900' : 'bg-blue-800',
          ),
          styles.shadow,
        ]}>
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
          <Path d="M12 4V20M20 12H4" stroke="white" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    shadowColor: KOZE_COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
