import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { tailwind } from '@/theme';
import { useHaptic, useScaleAnimation } from '@/utils';

type ButtonProps = {
  isDestructive?: boolean;
  text: string;
  handlePress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

// Koze: 16px corners; primary = Koze teal, secondary = white card with a soft outline.
const getButtonStyles = (isPrimary: boolean, pressed: boolean) => {
  const baseStyles = 'py-[13px] flex items-center justify-center rounded-2xl';
  const variantStyles = isPrimary
    ? pressed
      ? 'bg-blue-900'
      : 'bg-blue-800'
    : pressed
      ? 'bg-blue-50 border-[1.5px] border-koze-line'
      : 'bg-white border-[1.5px] border-koze-line';

  return tailwind.style(baseStyles, variantStyles);
};

const getTextStyles = (isPrimary: boolean, isDestructive: boolean) => {
  const baseStyles = 'text-base font-medium tracking-[0.16px] leading-[22px]';
  const colorStyles = isPrimary
    ? isDestructive
      ? 'text-tomato-800'
      : 'text-white'
    : isDestructive
      ? 'text-ruby-800'
      : 'text-blue-800';

  return tailwind.style(baseStyles, colorStyles);
};

export const Button = ({
  text,
  isDestructive = false,
  handlePress,
  variant = 'primary',
  disabled = false,
}: ButtonProps) => {
  const { handlers, animatedStyle } = useScaleAnimation();
  const haptic = useHaptic(isDestructive ? 'medium' : 'selection');

  const handleButtonPress = useCallback(() => {
    if (!disabled) {
      haptic?.();
      handlePress?.();
    }
  }, [disabled, handlePress, haptic]);

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handleButtonPress}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={({ pressed }) => getButtonStyles(isPrimary, pressed)}
        {...handlers}>
        <Animated.Text style={getTextStyles(isPrimary, isDestructive)}>{text}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
};
