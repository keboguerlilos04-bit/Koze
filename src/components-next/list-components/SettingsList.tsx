import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { CaretRight } from '@/svg-icons';
import { tailwind } from '@/theme';
import { GenericListType } from '@/types';
import { Icon } from '@/components-next/common/icon';

type GenericListProps = {
  sectionTitle?: string;
  list: GenericListType[];
};

type ListItemProps = {
  listItem: GenericListType;
  index: number;
  isLastItem: boolean;
};

const ListItem = (props: ListItemProps) => {
  const { listItem, index, isLastItem } = props;

  return (
    <Pressable
      onPress={() => listItem.onPressListItem && listItem.onPressListItem()}
      key={index}
      style={({ pressed }) => [
        tailwind.style(
          pressed ? 'bg-blue-50' : '',
          index === 0 ? 'rounded-t-2xl' : '',
          isLastItem ? 'rounded-b-2xl' : '',
        ),
      ]}>
      <Animated.View style={tailwind.style('flex flex-row items-center pl-3')}>
        {listItem.icon ? (
          <Animated.View>
            <Icon icon={listItem.icon} size={24} />
          </Animated.View>
        ) : null}
        <Animated.View
          style={tailwind.style(
            'flex-1 flex-row items-center justify-between py-[11px]',
            listItem.icon ? 'ml-3' : '',
            !isLastItem ? 'border-b-[1px] border-b-blackA-A3' : '',
          )}>
          <Animated.View>
            <Animated.Text
              style={tailwind.style(
                'text-base font-inter-420-20 leading-[22px] tracking-[0.16px] text-gray-950',
              )}>
              {listItem.title}
            </Animated.Text>
          </Animated.View>
          <Animated.View style={tailwind.style('flex flex-row items-center pr-3')}>
            <Animated.Text
              style={tailwind.style(
                'text-base font-inter-normal-20 leading-[22px] tracking-[0.16px]',
                listItem.subtitleType === 'light' ? 'text-gray-900' : 'text-gray-950',
              )}>
              {listItem.subtitle}
            </Animated.Text>
            {listItem.hasChevron ? <Icon icon={<CaretRight />} size={20} /> : null}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export const SettingsList = (props: GenericListProps) => {
  const { list, sectionTitle } = props;

  return (
    <Animated.View>
      {sectionTitle ? (
        <Animated.View style={tailwind.style('pl-5 pb-2')}>
          <Animated.Text
            style={tailwind.style(
              'text-sm font-inter-medium-24 leading-[16px] tracking-[0.32px] text-koze-muted',
            )}>
            {sectionTitle}
          </Animated.Text>
        </Animated.View>
      ) : null}
      <Animated.View
        style={tailwind.style('rounded-2xl mx-4 bg-white border-[1.5px] border-koze-line')}>
        {list.map(
          (listItem, index) =>
            !listItem.disabled && (
              <ListItem
                key={index}
                {...{ listItem, index }}
                isLastItem={index === list.length - 1}
              />
            ),
        )}
      </Animated.View>
    </Animated.View>
  );
};
