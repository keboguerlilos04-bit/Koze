import { createAsyncThunk } from '@reduxjs/toolkit';

import type { RootState } from '@/store';
import type { LocalCatalogItem } from '@/types/Catalog';
import { CatalogService } from './catalogService';
import { ensurePhoto, removeUnusedPhotos } from './catalogStorage';

// Koze: brings the phone's catalog up to date. The server is asked only whether the version
// changed; photos are downloaded once and then read from the phone.
const sync = createAsyncThunk<void, void, { state: RootState }>(
  'catalog/sync',
  async (_, { getState, dispatch }) => {
    const state = getState();
    const accountId = state.auth.user?.account_id;
    if (!accountId) return;

    const local = state.catalog?.accountId === accountId ? state.catalog : null;
    const response = await CatalogService.fetch(local?.items.length ? local.version : undefined);
    if (response.unchanged && local) return;

    const serverUrl = state.settings.installationUrl;
    const authHeaders = state.auth.headers;
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true',
      ...(authHeaders
        ? {
            'access-token': authHeaders['access-token'],
            uid: authHeaders.uid,
            client: authHeaders.client,
          }
        : {}),
    };

    const items: LocalCatalogItem[] = [];
    for (const item of response.items ?? []) {
      let localImageUri: string | undefined;
      try {
        localImageUri = await ensurePhoto(accountId, item, serverUrl, headers);
      } catch {
        // A photo that fails now is retried on the next sync.
      }
      items.push({ ...item, localImageUri });
    }
    removeUnusedPhotos(accountId, items);

    // A photo that could not be downloaded keeps the old version number so the next sync tries
    // again instead of hearing "unchanged".
    const missingPhoto = items.some(item => item.image_id && !item.localImageUri);
    dispatch({
      type: 'catalog/setCatalog',
      payload: {
        accountId,
        version: missingPhoto ? 0 : response.version,
        items,
      },
    });
  },
);

export const catalogActions = { sync };
