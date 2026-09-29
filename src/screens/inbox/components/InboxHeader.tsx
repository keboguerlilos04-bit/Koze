import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { Sheet } from '@/components-next/common/sheet/Sheet';
import { Icon } from '@/components-next/common/icon';
import { ChevronLeft, DoubleCheckIcon, InboxFilterIcon } from '@/svg-icons';
import { tailwind } from '@/theme';
import { KOZE_COLORS } from '@/theme/colors/koze';
import { InboxFilters } from './InboxFilters';
import i18n from '@/i18n';
import { useRefsContext } from '@/context';

type InboxHeaderProps = {
  markAllAsRead: () => void;
};

// Koze: notifications open from the bell in the conversations header, so this header has a
// back button; "mark all as read" and the filters sit on the right.
export const InboxHeader = (props: InboxHeaderProps) => {
  const { markAllAsRead } = props;
  const navigation = useNavigation();
  const { inboxFiltersSheetRef } = useRefsContext();
  const handleToggleState = () => {
    inboxFiltersSheetRef.current?.present();
  };

  return (
    <Animated.View style={[tailwind.style('border-b-[1px] border-b-koze-line bg-koze-canvas')]}>
      <Animated.View
        style={[tailwind.style('flex flex-row justify-between items-center px-4 pt-1 pb-3')]}>
        <Animated.View style={tailwind.style('flex-1 flex-row items-center gap-2')}>
          {navigation.canGoBack() && (
            <Pressable
              hitSlop={16}
              accessibilityRole="button"
              onPress={() => navigation.goBack()}>
              <Icon icon={<ChevronLeft stroke={KOZE_COLORS.primary} />} size={24} />
            </Pressable>
          )}
          <Animated.Text
            style={tailwind.style('text-[17px] leading-[20px] font-inter-580-24 text-koze-navy')}>
            {i18n.t('KOZE_NAV.NOTIFICATIONS')}
          </Animated.Text>
        </Animated.View>
        <Animated.View style={tailwind.style('flex-row items-center gap-5')}>
          <Pressable hitSlop={12} onPress={markAllAsRead}>
            <Icon icon={<DoubleCheckIcon />} size={24} />
          </Pressable>
          <Pressable onPress={handleToggleState} hitSlop={12}>
            <Icon icon={<InboxFilterIcon />} size={24} />
          </Pressable>
        </Animated.View>
      </Animated.View>
      <Sheet ref={inboxFiltersSheetRef} height={160}>
        <InboxFilters />
      </Sheet>
    </Animated.View>
  );
};
