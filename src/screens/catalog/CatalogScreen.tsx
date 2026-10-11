import React, { useCallback, useLayoutEffect } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { Icon, KozeEmptyState } from '@/components-next';
import { AddIcon } from '@/svg-icons';
import { KOZE_COLORS } from '@/theme/colors/koze';
import { selectIsAdministrator } from '@/store/auth/authSelectors';
import { catalogActions } from '@/store/catalog/catalogActions';
import { selectCatalogItems, selectIsCatalogSyncing } from '@/store/catalog/catalogSlice';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import { CatalogItemRow } from './components/CatalogItemRow';

// Koze: the business's products, kept on the phone. Everyone sees it; administrators add and
// edit products.
const CatalogScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCatalogItems);
  const isSyncing = useAppSelector(selectIsCatalogSyncing);
  const isAdministrator = useAppSelector(selectIsAdministrator);

  useFocusEffect(
    useCallback(() => {
      dispatch(catalogActions.sync());
    }, [dispatch]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdministrator
        ? () => (
            <Pressable
              hitSlop={10}
              accessibilityLabel={i18n.t('CATALOG.ADD_PRODUCT')}
              onPress={() => navigation.navigate('CatalogItemForm', {})}>
              <Icon size={24} icon={<AddIcon stroke={KOZE_COLORS.primary} />} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, isAdministrator]);

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={tailwind.style('px-4 pt-2 pb-8 flex-grow')}
        refreshControl={
          <RefreshControl refreshing={isSyncing} onRefresh={() => dispatch(catalogActions.sync())} />
        }
        renderItem={({ item }) => (
          <CatalogItemRow
            item={item}
            onPress={
              isAdministrator
                ? () => navigation.navigate('CatalogItemForm', { itemId: item.id })
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          isSyncing ? null : (
            <View style={tailwind.style('flex-1 justify-center pt-24')}>
              <KozeEmptyState
                title={i18n.t('CATALOG.EMPTY_TITLE')}
                subtitle={
                  isAdministrator
                    ? i18n.t('CATALOG.EMPTY_ADMIN')
                    : i18n.t('CATALOG.EMPTY_AGENT')
                }
              />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

export default CatalogScreen;
