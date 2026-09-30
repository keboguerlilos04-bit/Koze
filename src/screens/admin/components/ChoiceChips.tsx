import React from 'react';
import { Animated, Pressable, View } from 'react-native';

import { tailwind } from '@/theme';

interface ChoiceChipsProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// Koze: a labelled row of pill buttons for picking one option (role, gender).
export const ChoiceChips = <T extends string>({
  label,
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) => (
  <View style={tailwind.style('pt-5 gap-2')}>
    <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
      {label}
    </Animated.Text>
    <View style={tailwind.style('flex-row flex-wrap gap-2')}>
      {options.map(option => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={tailwind.style(
              'px-4 py-2 rounded-full border-[1.5px]',
              isSelected ? 'bg-blue-800 border-blue-800' : 'bg-white border-koze-line',
            )}>
            <Animated.Text
              style={tailwind.style(
                'font-inter-medium-24',
                isSelected ? 'text-white' : 'text-koze-navy',
              )}>
              {option.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);
