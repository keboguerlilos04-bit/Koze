import React from 'react';
import { Image, Pressable, Text, ViewStyle } from 'react-native';
import Animated, {
  AnimatedStyle,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '@/components-next/common';
import {
  CheckedIcon,
  CloseIcon,
  FilterIcon,
  NotificationIcon,
  UncheckedIcon,
  SearchIcon,
} from '@/svg-icons';
import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useScaleAnimation } from '@/utils';
import { useHeaderAnimation } from '@/hooks/useHeaderAnimation';

type HeaderState = 'Search' | 'Filter' | 'Select' | 'none';

type ConversationHeaderPresenterProps = {
  currentState: HeaderState;
  isSelectedAll: boolean;
  filtersAppliedCount: number;
  unreadNotificationsCount: number;
  onLeftIconPress: () => void;
  onRightIconPress: () => void;
  onClearFilter: () => void;
  onSearchPress: () => void;
  onNotificationsPress: () => void;
};

type RightSectionProps = {
  currentState: HeaderState;
  filtersAppliedCount: number;
  unreadNotificationsCount: number;
  onRightIconPress: () => void;
  onSearchPress: () => void;
  onNotificationsPress: () => void;
};

type LeftSlotProps = {
  currentState: HeaderState;
  isSelectedAll: boolean;
  filtersAppliedCount: number;
  onLeftIconPress: () => void;
  onClearFilter: () => void;
  handlers: Record<string, unknown>;
  animatedStyle: ViewStyle | AnimatedStyle<ViewStyle>;
};

// Koze brand block: the Koze mark next to the screen title.
const Brand = () => (
  <Animated.View style={tailwind.style('flex-row items-center gap-2')}>
    <Image
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      source={require('@/assets/images/logo-mark.png')}
      style={tailwind.style('w-7 h-7')}
      resizeMode="contain"
      accessibilityLabel="Koze"
    />
    <Text
      numberOfLines={1}
      style={tailwind.style('text-[17px] leading-[20px] font-inter-580-24 text-koze-navy')}>
      {i18n.t('CONVERSATION.HEADER.TITLE')}
    </Text>
  </Animated.View>
);

const CROSSFADE_MS = 180;

const LeftSlot = ({
  currentState,
  isSelectedAll,
  filtersAppliedCount,
  onLeftIconPress,
  onClearFilter,
  handlers,
  animatedStyle,
}: LeftSlotProps) => {
  const brandActive = currentState === 'none';
  const clearActive = currentState === 'Filter';
  const selectActive = currentState === 'Select';

  const brandOpacity = useDerivedValue(
    () =>
      withDelay(
        brandActive ? CROSSFADE_MS : 0,
        withTiming(brandActive ? 1 : 0, { duration: CROSSFADE_MS }),
      ),
    [brandActive],
  );
  const clearOpacity = useDerivedValue(
    () =>
      withDelay(
        clearActive ? CROSSFADE_MS : 0,
        withTiming(clearActive ? 1 : 0, { duration: CROSSFADE_MS }),
      ),
    [clearActive],
  );
  const selectOpacity = useDerivedValue(
    () =>
      withDelay(
        selectActive ? CROSSFADE_MS : 0,
        withTiming(selectActive ? 1 : 0, { duration: CROSSFADE_MS }),
      ),
    [selectActive],
  );

  const brandStyle = useAnimatedStyle(() => ({ opacity: brandOpacity.value }));
  const clearStyle = useAnimatedStyle(() => ({ opacity: clearOpacity.value }));
  const selectStyle = useAnimatedStyle(() => ({ opacity: selectOpacity.value }));

  return (
    <Animated.View style={tailwind.style('flex-1 h-8')}>
      <Animated.View
        style={[tailwind.style('absolute inset-0 flex-row items-center'), brandStyle]}
        pointerEvents="none">
        <Brand />
      </Animated.View>

      <Animated.View
        style={[tailwind.style('absolute inset-0 flex-row items-center'), selectStyle]}
        pointerEvents={selectActive ? 'auto' : 'none'}>
        <Pressable onPress={onLeftIconPress} hitSlop={16}>
          <Icon
            size={24}
            icon={
              isSelectedAll ? (
                <CheckedIcon />
              ) : (
                <UncheckedIcon stroke={tailwind.color('text-gray-800')} />
              )
            }
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[tailwind.style('absolute inset-0 flex-row items-center'), clearStyle]}
        pointerEvents={clearActive ? 'auto' : 'none'}>
        <Pressable onPress={onClearFilter} disabled={filtersAppliedCount === 0} {...handlers}>
          <Animated.View style={animatedStyle}>
            <Text
              style={tailwind.style(
                'text-md font-inter-medium-24 leading-[17px] tracking-[0.24px]',
                filtersAppliedCount === 0 ? 'text-gray-700' : 'text-blue-800',
              )}>
              {i18n.t('CONVERSATION.HEADER.CLEAR_FILTER')}
              {filtersAppliedCount > 0 ? ` (${filtersAppliedCount})` : ''}
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// A small Koze-teal count on the bell, capped at 99+.
const Badge = ({ count }: { count: number }) => (
  <Animated.View
    style={tailwind.style(
      'absolute z-10 -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full',
      'bg-blue-800 items-center justify-center',
    )}>
    <Text style={tailwind.style('text-[11px] leading-[13px] font-inter-580-24 text-white')}>
      {count > 99 ? '99+' : count}
    </Text>
  </Animated.View>
);

const RightSection = ({
  currentState,
  filtersAppliedCount,
  unreadNotificationsCount,
  onRightIconPress,
  onSearchPress,
  onNotificationsPress,
}: RightSectionProps) => {
  const { entering, exiting } = useHeaderAnimation();
  const isOpen = currentState === 'Filter' || currentState === 'Select';

  return (
    <Animated.View style={tailwind.style('flex-row items-center gap-5')}>
      {!isOpen && (
        <Animated.View
          style={tailwind.style('flex-row items-center gap-5')}
          exiting={exiting}
          entering={entering}>
          <Pressable
            onPress={onSearchPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Search">
            <Icon size={24} icon={<SearchIcon stroke={tailwind.color('text-gray-800')} />} />
          </Pressable>
          <Pressable
            onPress={onNotificationsPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('KOZE_NAV.NOTIFICATIONS')}>
            {unreadNotificationsCount > 0 && <Badge count={unreadNotificationsCount} />}
            <Icon size={24} icon={<NotificationIcon />} />
          </Pressable>
        </Animated.View>
      )}
      <Pressable onPress={onRightIconPress} hitSlop={12} accessibilityRole="button">
        {isOpen ? (
          <Animated.View exiting={exiting} entering={entering}>
            <Icon size={24} icon={<CloseIcon />} />
          </Animated.View>
        ) : (
          <Animated.View exiting={exiting} entering={entering}>
            {filtersAppliedCount > 0 && (
              <Animated.View
                style={tailwind.style(
                  'absolute z-10 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-800',
                )}
              />
            )}
            <Icon size={24} icon={<FilterIcon />} />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Koze: compact header — brand on the left; search, notifications and the filter menu
// (all / unassigned / mine, status, sort) on the right.
export const ConversationHeaderPresenter = ({
  currentState,
  isSelectedAll,
  filtersAppliedCount,
  unreadNotificationsCount,
  onLeftIconPress,
  onRightIconPress,
  onClearFilter,
  onSearchPress,
  onNotificationsPress,
}: ConversationHeaderPresenterProps) => {
  const { handlers, animatedStyle } = useScaleAnimation();

  return (
    <Animated.View
      style={[tailwind.style('flex flex-row justify-between items-center px-4 pt-1 pb-2.5')]}>
      <LeftSlot
        currentState={currentState}
        isSelectedAll={isSelectedAll}
        filtersAppliedCount={filtersAppliedCount}
        onLeftIconPress={onLeftIconPress}
        onClearFilter={onClearFilter}
        handlers={handlers}
        animatedStyle={animatedStyle}
      />
      <RightSection
        currentState={currentState}
        filtersAppliedCount={filtersAppliedCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onRightIconPress={onRightIconPress}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
      />
    </Animated.View>
  );
};
