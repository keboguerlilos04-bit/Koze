import React, { forwardRef, ReactNode, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import { tailwind } from '@/theme';

export interface KozeTextInputProps extends TextInputProps {
  hasError?: boolean;
  // Shown inside the field on the right, e.g. the show/hide password button.
  rightAccessory?: ReactNode;
}

// Koze text field: white, softly outlined at rest, Koze teal outline while focused.
export const KozeTextInput = forwardRef<TextInput, KozeTextInputProps>(
  ({ hasError = false, rightAccessory, style, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = hasError
      ? 'border-ruby-800'
      : isFocused
        ? 'border-blue-700'
        : 'border-koze-line';

    return (
      <View style={tailwind.style('relative justify-center')}>
        <TextInput
          ref={ref}
          style={[
            tailwind.style(
              'text-base font-inter-normal-20 tracking-[0.24px] leading-[20px] android:leading-[18px]',
              'h-12 px-4 rounded-2xl bg-white text-gray-950 border-[1.5px]',
              borderColor,
              rightAccessory ? 'pr-12' : '',
            ),
            style,
          ]}
          placeholderTextColor={tailwind.color('text-gray-700')}
          selectionColor={tailwind.color('text-blue-700')}
          onFocus={event => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {rightAccessory ? (
          <View style={tailwind.style('absolute right-4')}>{rightAccessory}</View>
        ) : null}
      </View>
    );
  },
);

KozeTextInput.displayName = 'KozeTextInput';
