import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { LocalCatalogItem } from '@/types/Catalog';
import type { RootState } from '@/store';
import { catalogActions } from './catalogActions';

// Koze: the catalog as last synced on this phone. It is persisted with the rest of the store,
// so the list (and the photos on disk) are available offline and on the next start.
interface CatalogState {
  accountId: number | null;
  version: number;
  items: LocalCatalogItem[];
  isSyncing: boolean;
}

const initialState: CatalogState = {
  accountId: null,
  version: 0,
  items: [],
  isSyncing: false,
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setCatalog: (
      state,
      action: PayloadAction<{ accountId: number; version: number; items: LocalCatalogItem[] }>,
    ) => {
      state.accountId = action.payload.accountId;
      state.version = action.payload.version;
      state.items = action.payload.items;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(catalogActions.sync.pending, state => {
        state.isSyncing = true;
      })
      .addCase(catalogActions.sync.fulfilled, state => {
        state.isSyncing = false;
      })
      .addCase(catalogActions.sync.rejected, state => {
        state.isSyncing = false;
      });
  },
});

export const { setCatalog } = catalogSlice.actions;

const selectCatalogState = (state: RootState) => state.catalog;

// Only the catalog of the business account in use.
export const selectCatalogItems = (state: RootState): LocalCatalogItem[] => {
  const catalog = selectCatalogState(state);
  return catalog && catalog.accountId === state.auth.user?.account_id ? catalog.items : [];
};

export const selectIsCatalogSyncing = (state: RootState) => !!selectCatalogState(state)?.isSyncing;

export default catalogSlice.reducer;
