import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RootState } from '@/store';
import type { Conversation } from '@/types/Conversation';
import { conversationActions } from '@/store/conversation/conversationActions';
import { restoreConversations } from '@/store/conversation/conversationSlice';
import {
  pruneExpired,
  saveConversations,
  selectOfflineConversation,
  selectOfflineConversations,
} from './offlineCacheSlice';

// Koze: keeps the offline copy of conversations up to date, and puts it back when the server
// cannot be reached.
export const offlineCacheListenerMiddleware = createListenerMiddleware();

const serverResponses = isAnyOf(
  conversationActions.fetchConversations.fulfilled,
  conversationActions.fetchConversation.fulfilled,
  conversationActions.fetchPreviousMessages.fulfilled,
);

// When the server last answered. Changes that arrive soon after (including live messages over
// the WebSocket, which only flow while online) count as fresh server data.
let lastServerResponseAt = 0;
const FRESH_WINDOW = 60 * 1000;

offlineCacheListenerMiddleware.startListening({
  matcher: serverResponses,
  effect: () => {
    lastServerResponseAt = Date.now();
  },
});

// Save a snapshot a moment after the conversations change, not on every single update.
offlineCacheListenerMiddleware.startListening({
  predicate: (action, currentState, previousState) =>
    action.type !== restoreConversations.type &&
    (currentState as RootState).conversations !== (previousState as RootState).conversations,
  effect: async (_action, listenerApi) => {
    listenerApi.cancelActiveListeners();
    await listenerApi.delay(1500);
    const state = listenerApi.getState() as RootState;
    const accountId = state.auth.user?.account_id;
    if (!accountId) return;
    const conversations = Object.values(state.conversations.entities).filter(
      Boolean,
    ) as Conversation[];
    if (conversations.length === 0) return;
    const now = Date.now();
    listenerApi.dispatch(
      saveConversations({
        accountId,
        conversations,
        fromServer: now - lastServerResponseAt < FRESH_WINDOW,
        now,
      }),
    );
  },
});

// The list could not be loaded (no internet, or the server is off): show the saved one.
offlineCacheListenerMiddleware.startListening({
  actionCreator: conversationActions.fetchConversations.rejected,
  effect: (action, listenerApi) => {
    if (action.meta.aborted || action.meta.arg.page > 1) return;
    const state = listenerApi.getState() as RootState;
    if (state.conversations.ids.length > 0) return;
    const now = Date.now();
    listenerApi.dispatch(pruneExpired(now));
    const cached = selectOfflineConversations(listenerApi.getState() as RootState, now);
    if (cached.length > 0) listenerApi.dispatch(restoreConversations(cached));
  },
});

// A conversation opened offline (e.g. from a notification) comes from the saved copy.
offlineCacheListenerMiddleware.startListening({
  actionCreator: conversationActions.fetchConversation.rejected,
  effect: (action, listenerApi) => {
    const conversationId = action.meta.arg;
    const state = listenerApi.getState() as RootState;
    if (state.conversations.entities[conversationId]) return;
    const cached = selectOfflineConversation(state, conversationId, Date.now());
    if (cached) listenerApi.dispatch(restoreConversations([cached]));
  },
});

// When the app starts, forget conversations saved more than 2 hours ago.
offlineCacheListenerMiddleware.startListening({
  predicate: action => action.type === REHYDRATE,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(pruneExpired(Date.now()));
  },
});

// Logging out also deletes the saved copy from the phone's storage.
offlineCacheListenerMiddleware.startListening({
  predicate: action => action.type === 'auth/logout',
  effect: async () => {
    try {
      await AsyncStorage.removeItem('persist:offlineCache');
    } catch {
      // The emptied state is written over it anyway.
    }
  },
});
