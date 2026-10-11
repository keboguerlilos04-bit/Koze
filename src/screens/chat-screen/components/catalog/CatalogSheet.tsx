import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components-next/common/sheet/Sheet';
import { KozeEmptyState } from '@/components-next';
import i18n from '@/i18n';
import { useRefsContext } from '@/context';
import { tailwind } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectCatalogItems } from '@/store/catalog/catalogSlice';
import { setMessageContent, updateAttachments } from '@/store/conversation/sendMessageSlice';
import { CatalogItemRow, productMessage } from '@/screens/catalog/components/CatalogItemRow';
import type { LocalCatalogItem } from '@/types/Catalog';

// Koze: pick a product from the catalog on the phone; its photo is attached and its details
// are put in the reply box, so the agent can review before sending.
export const CatalogSheet = () => {
  const { bottom } = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { catalogSheetRef } = useRefsContext();
  const items = useAppSelector(selectCatalogItems);

  const sendProduct = (item: LocalCatalogItem) => {
    if (item.localImageUri) {
      dispatch(
        updateAttachments([
          {
            uri: item.localImageUri,
            fileName: `${item.name.replace(/[^a-zA-Z0-9]+/g, '-') || 'produit'}.jpg`,
            type: 'image/jpeg',
          },
        ]),
      );
    }
    dispatch(setMessageContent(productMessage(item)));
    catalogSheetRef.current?.dismiss();
  };

  return (
    <Animated.View>
      <Sheet ref={catalogSheetRef} detents={[0.75]} scrollable>
        <View style={tailwind.style('px-4 pt-1 pb-4 items-center')}>
          <Animated.Text
            style={tailwind.style('text-gray-700 font-inter-580-24 leading-[17px] tracking-[0.32px]')}>
            {i18n.t('CATALOG.SELECT_PRODUCT')}
          </Animated.Text>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tailwind.style('px-3', `pb-[${24 + bottom}px]`)}>
          {items.length === 0 ? (
            <View style={tailwind.style('pt-8')}>
              <KozeEmptyState title={i18n.t('CATALOG.EMPTY_TITLE')} />
            </View>
          ) : (
            items.map(item => (
              <CatalogItemRow
                key={item.id}
                item={item}
                hint={i18n.t('CATALOG.TAP_TO_SEND')}
                onPress={() => sendProduct(item)}
              />
            ))
          )}
        </ScrollView>
      </Sheet>
    </Animated.View>
  );
};
