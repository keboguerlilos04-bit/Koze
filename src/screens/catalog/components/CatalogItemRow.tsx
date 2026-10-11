import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { KozeCard } from '@/components-next';
import type { LocalCatalogItem } from '@/types/Catalog';

export const formatPrice = (item: LocalCatalogItem) =>
  [item.price, item.price ? item.currency : ''].filter(Boolean).join(' ');

// Text sent to the customer with the product photo.
export const productMessage = (item: LocalCatalogItem) =>
  [
    item.name,
    formatPrice(item) ? `${i18n.t('CATALOG.PRICE')} : ${formatPrice(item)}` : '',
    item.in_stock === false ? i18n.t('CATALOG.OUT_OF_STOCK') : '',
    item.description || '',
  ]
    .filter(Boolean)
    .join('\n');

type Props = {
  item: LocalCatalogItem;
  onPress?: () => void;
  // Shown under the price, e.g. "Touchez pour envoyer".
  hint?: string;
};

// Koze: one product, with its photo read from the phone.
export const CatalogItemRow = ({ item, onPress, hint }: Props) => (
  <Pressable onPress={onPress} disabled={!onPress} style={tailwind.style('mb-3')}>
    <KozeCard style={tailwind.style('flex-row p-3 gap-3 items-center')}>
      <View style={tailwind.style('h-16 w-16 rounded-xl overflow-hidden bg-blue-100')}>
        {item.localImageUri ? (
          <Image
            source={{ uri: item.localImageUri }}
            style={tailwind.style('h-16 w-16')}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View style={tailwind.style('flex-1 gap-1')}>
        <Text
          numberOfLines={1}
          style={tailwind.style('text-base font-inter-580-24 text-koze-navy')}>
          {item.name}
        </Text>
        {formatPrice(item) ? (
          <Text style={tailwind.style('font-inter-500-24 text-blue-800')}>{formatPrice(item)}</Text>
        ) : null}
        {item.in_stock === false ? (
          <Text style={tailwind.style('text-sm font-inter-normal-20 text-ruby-900')}>
            {i18n.t('CATALOG.OUT_OF_STOCK')}
          </Text>
        ) : item.description ? (
          <Text
            numberOfLines={1}
            style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted')}>
            {item.description}
          </Text>
        ) : null}
        {hint ? (
          <Text style={tailwind.style('text-xs font-inter-normal-20 text-koze-muted')}>{hint}</Text>
        ) : null}
      </View>
    </KozeCard>
  </Pressable>
);
