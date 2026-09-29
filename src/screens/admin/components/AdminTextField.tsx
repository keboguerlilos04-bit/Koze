import React, { useState } from 'react';
import { Animated, KeyboardTypeOptions, Pressable, View } from 'react-native';

import { EyeIcon, EyeSlash } from '@/svg-icons';
import { tailwind } from '@/theme';
import { Icon, KozeTextInput } from '@/components-next';

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

// Koze: labelled text input for the administration forms.
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
    <View style={tailwind.style('pt-5 gap-2')}>
      <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
        {label}
      </Animated.Text>
      <KozeTextInput
        value={value}
        onChangeText={onChangeText}
        hasError={!!error}
        secureTextEntry={isHidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        rightAccessory={
          secure ? (
            <Pressable hitSlop={8} onPress={() => setIsHidden(!isHidden)}>
              <Icon size={20} icon={isHidden ? <EyeSlash /> : <EyeIcon />} />
            </Pressable>
          ) : undefined
        }
      />
      {error ? (
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
          {error}
        </Animated.Text>
      ) : hint ? (
        <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
          {hint}
        </Animated.Text>
      ) : null}
    </View>
  );
};
