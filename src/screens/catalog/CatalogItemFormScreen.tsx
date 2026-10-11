import React, { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { launchImageLibrary } from 'react-native-image-picker';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { KOZE_COLORS } from '@/theme/colors/koze';
import { Button, KozeTextInput } from '@/components-next';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { showToast } from '@/utils/toastUtils';
import { showAdminError } from '@/store/admin/adminService';
import { CatalogService } from '@/store/catalog/catalogService';
import { catalogActions } from '@/store/catalog/catalogActions';
import { seedPhoto } from '@/store/catalog/catalogStorage';
import { selectCatalogItems } from '@/store/catalog/catalogSlice';
import { selectCurrentUserAccountId } from '@/store/auth/authSelectors';
import type { CatalogItemInput } from '@/types/Catalog';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';
import { AdminTextField } from '@/screens/admin/components/AdminTextField';

type PickedPhoto = NonNullable<CatalogItemInput['image']>;

const DEFAULT_CURRENCY = 'HTG';

// Koze: an administrator adds or edits a product. The photo is shrunk on the phone (about
// 800px, JPEG) so the server keeps only a light copy.
const CatalogItemFormScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<SettingsStackParamList, 'CatalogItemForm'>>();
  const accountId = useAppSelector(selectCurrentUserAccountId);
  const existing = useAppSelector(selectCatalogItems).find(
    item => item.id === route.params?.itemId,
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing?.price ?? '');
  const [currency, setCurrency] = useState(existing?.currency || DEFAULT_CURRENCY);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [inStock, setInStock] = useState(existing?.in_stock !== false);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: existing ? i18n.t('CATALOG.EDIT_PRODUCT') : i18n.t('CATALOG.ADD_PRODUCT'),
    });
  }, [navigation, existing]);

  const shownPhoto = photo?.uri ?? (removePhoto ? undefined : existing?.localImageUri);

  const pickPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.6,
    });
    const asset = result.assets?.[0];
    if (result.didCancel || !asset?.uri) return;
    setPhoto({ uri: asset.uri, fileName: asset.fileName, type: asset.type });
    setRemovePhoto(false);
  };

  const save = async () => {
    if (!name.trim()) {
      setNameError(i18n.t('ADMIN.FIELD_REQUIRED'));
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    const input: CatalogItemInput = {
      name: name.trim(),
      price: price.trim(),
      currency: currency.trim().toUpperCase() || DEFAULT_CURRENCY,
      description: description.trim(),
      in_stock: inStock,
      image: photo ?? undefined,
      remove_image: removePhoto && !photo,
    };
    try {
      const saved = existing
        ? await CatalogService.update(existing.id, input)
        : await CatalogService.create(input);
      if (photo && accountId) seedPhoto(accountId, saved, photo.uri);
      await dispatch(catalogActions.sync());
      showToast({ message: i18n.t('CATALOG.SAVED') });
      navigation.goBack();
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(i18n.t('CATALOG.DELETE_TITLE', { name: existing.name }), undefined, [
      { text: i18n.t('ADMIN.CANCEL'), style: 'cancel' },
      {
        text: i18n.t('ADMIN.REMOVE'),
        style: 'destructive',
        onPress: async () => {
          try {
            await CatalogService.remove(existing.id);
            await dispatch(catalogActions.sync());
            navigation.goBack();
          } catch (error) {
            showAdminError(error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-6 pb-8')}>
        <View style={tailwind.style('items-center pt-4 gap-3')}>
          <Pressable
            onPress={pickPhoto}
            style={tailwind.style(
              'h-36 w-36 rounded-2xl overflow-hidden bg-white border-[1.5px] border-koze-line items-center justify-center',
            )}>
            {shownPhoto ? (
              <Image
                source={{ uri: shownPhoto }}
                style={tailwind.style('h-36 w-36')}
                contentFit="cover"
              />
            ) : (
              <Text style={tailwind.style('px-4 text-center font-inter-420-20 text-koze-muted')}>
                {i18n.t('CATALOG.ADD_PHOTO')}
              </Text>
            )}
          </Pressable>
          <View style={tailwind.style('flex-row gap-6')}>
            <Pressable hitSlop={8} onPress={pickPhoto}>
              <Text style={tailwind.style('font-inter-500-24 text-blue-800')}>
                {shownPhoto ? i18n.t('CATALOG.CHANGE_PHOTO') : i18n.t('CATALOG.CHOOSE_PHOTO')}
              </Text>
            </Pressable>
            {shownPhoto ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setPhoto(null);
                  setRemovePhoto(true);
                }}>
                <Text style={tailwind.style('font-inter-500-24 text-ruby-800')}>
                  {i18n.t('CATALOG.REMOVE_PHOTO')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <AdminTextField
          label={i18n.t('CATALOG.NAME')}
          value={name}
          onChangeText={value => {
            setName(value);
            setNameError(undefined);
          }}
          error={nameError}
          autoCapitalize="words"
        />
        <View style={tailwind.style('flex-row gap-3')}>
          <View style={tailwind.style('flex-1')}>
            <AdminTextField
              label={i18n.t('CATALOG.PRICE')}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={tailwind.style('w-28')}>
            <AdminTextField
              label={i18n.t('CATALOG.CURRENCY')}
              value={currency}
              onChangeText={setCurrency}
            />
          </View>
        </View>
        <View style={tailwind.style('pt-5 gap-2')}>
          <Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
            {i18n.t('CATALOG.DESCRIPTION')}
          </Text>
          <KozeTextInput
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            style={tailwind.style('h-28 pt-3')}
          />
        </View>
        <View style={tailwind.style('pt-5 flex-row items-center justify-between')}>
          <Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
            {i18n.t('CATALOG.IN_STOCK')}
          </Text>
          <Switch
            value={inStock}
            onValueChange={setInStock}
            trackColor={{ true: KOZE_COLORS.primary, false: KOZE_COLORS.line }}
            thumbColor="white"
          />
        </View>

        <View style={tailwind.style('pt-8 gap-3')}>
          <Button
            text={isSaving ? i18n.t('CATALOG.SAVING') : i18n.t('CATALOG.SAVE')}
            handlePress={save}
          />
          {existing ? (
            <Button
              variant="secondary"
              isDestructive
              text={i18n.t('CATALOG.DELETE')}
              handlePress={confirmDelete}
            />
          ) : null}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default CatalogItemFormScreen;
