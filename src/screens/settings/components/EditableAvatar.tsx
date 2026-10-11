import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, View } from 'react-native';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import {
  Asset,
  ImageLibraryOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';

import i18n from '@/i18n';
import { tailwind } from '@/theme';
import { KOZE_COLORS } from '@/theme/colors/koze';
import { CameraIcon } from '@/svg-icons';
import { useAppDispatch } from '@/hooks';
import { authActions } from '@/store/auth/authActions';
import { showToast } from '@/utils/toastUtils';
import { AvailabilityStatus } from '@/types/common/AvailabilityStatus';
import { UserAvatar } from './UserAvatar';

// Koze: every agent and administrator sets their own profile photo from Settings.
// Photos are shrunk on the phone before upload so the server only keeps a small image.
const PHOTO_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.7,
};

type Props = {
  name?: string;
  avatarUrl?: string;
  status?: AvailabilityStatus;
};

export const EditableAvatar = ({ name, avatarUrl, status }: Props) => {
  const dispatch = useAppDispatch();
  const [isSaving, setIsSaving] = useState(false);

  const upload = async (asset?: Asset) => {
    if (!asset?.uri) return;
    setIsSaving(true);
    const result = await dispatch(
      authActions.updateAvatar({ uri: asset.uri, fileName: asset.fileName, type: asset.type }),
    );
    setIsSaving(false);
    showToast({
      message: authActions.updateAvatar.fulfilled.match(result)
        ? i18n.t('PROFILE_PHOTO.UPDATED')
        : i18n.t('PROFILE_PHOTO.FAILED'),
    });
  };

  const showPermissionAlert = () =>
    Alert.alert(i18n.t('PROFILE_PHOTO.PERMISSION_TITLE'), i18n.t('PROFILE_PHOTO.PERMISSION'), [
      { text: i18n.t('PROFILE_PHOTO.CANCEL'), style: 'cancel' },
      { text: i18n.t('PROFILE_PHOTO.OPEN_SETTINGS'), onPress: () => Linking.openSettings() },
    ]);

  const pick = async (fromCamera: boolean) => {
    if (fromCamera) {
      const permission = await request(
        Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA,
      );
      if (permission !== RESULTS.GRANTED && permission !== RESULTS.LIMITED) {
        showPermissionAlert();
        return;
      }
    }
    const result = fromCamera
      ? await launchCamera({ ...PHOTO_OPTIONS, cameraType: 'front', saveToPhotos: false })
      : await launchImageLibrary(PHOTO_OPTIONS);
    if (result.didCancel) return;
    if (result.errorCode) {
      showPermissionAlert();
      return;
    }
    await upload(result.assets?.[0]);
  };

  const remove = async () => {
    setIsSaving(true);
    const result = await dispatch(authActions.removeAvatar());
    setIsSaving(false);
    showToast({
      message: authActions.removeAvatar.fulfilled.match(result)
        ? i18n.t('PROFILE_PHOTO.REMOVED')
        : i18n.t('PROFILE_PHOTO.FAILED'),
    });
  };

  const openMenu = () => {
    if (isSaving) return;
    const buttons = [
      { text: i18n.t('PROFILE_PHOTO.CHOOSE'), onPress: () => pick(false) },
      { text: i18n.t('PROFILE_PHOTO.TAKE'), onPress: () => pick(true) },
      ...(avatarUrl
        ? [{ text: i18n.t('PROFILE_PHOTO.REMOVE'), style: 'destructive' as const, onPress: remove }]
        : []),
      { text: i18n.t('PROFILE_PHOTO.CANCEL'), style: 'cancel' as const },
    ];
    Alert.alert(i18n.t('PROFILE_PHOTO.TITLE'), undefined, buttons, { cancelable: true });
  };

  return (
    <Pressable
      onPress={openMenu}
      accessibilityRole="button"
      accessibilityLabel={i18n.t('PROFILE_PHOTO.TITLE')}>
      {/* key resets the fallback state when the photo changes */}
      <UserAvatar key={avatarUrl || 'none'} src={avatarUrl} name={name} status={status} />
      {isSaving && (
        <View
          style={tailwind.style(
            'absolute inset-0 rounded-full h-24 w-24 items-center justify-center bg-black/30',
          )}>
          <ActivityIndicator color="white" />
        </View>
      )}
      <View
        style={[
          tailwind.style(
            'absolute -top-1 -right-1 h-8 w-8 p-[6px] rounded-full border-2 border-white',
          ),
          { backgroundColor: KOZE_COLORS.primary },
        ]}>
        <CameraIcon stroke="white" />
      </View>
    </Pressable>
  );
};
