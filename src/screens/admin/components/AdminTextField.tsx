import React, { useState } from 'react';
import { Animated, KeyboardTypeOptions, Pressable, TextInput, View } from 'react-native';

import { EyeIcon, EyeSlash } from '@/svg-icons';
import { tailwind } from '@/theme';
import { Icon } from '@/components-next';

interface AdminTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
}

// Koze: labelled text input for the administration forms, styled like the login screen.
export const AdminTextField = ({
  label,
  value,
  onChangeText,
  error,
  hint,
  secure = false,
  keyboardType,
  autoCapitalize = 'none',
}: AdminTextFieldProps) => {
  const [isHidden, setIsHidden] = useState(secure);

  return (
    <View style={tailwind.style('pt-6 gap-2')}>
      <Animated.Text style={tailwind.style('font-inter-420-20 text-gray-950')}>
        {label}
      </Animated.Text>
      <View style={tailwind.style('relative')}>
        <TextInput
          style={tailwind.style(
            'text-base font-inter-normal-20 tracking-[0.24px] leading-[20px] android:leading-[18px]',
            'py-2 px-3 rounded-xl text-gray-950 bg-blackA-A4 h-10',
            secure ? 'pr-10' : '',
          )}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isHidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {secure && (
          <Pressable
            style={tailwind.style('absolute right-4 top-2.5')}
            onPress={() => setIsHidden(!isHidden)}>
            <Icon size={20} icon={isHidden ? <EyeSlash /> : <EyeIcon />} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
          {error}
        </Animated.Text>
      ) : hint ? (
        <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-gray-700')}>
          {hint}
        </Animated.Text>
      ) : null}
    </View>
  );
};
