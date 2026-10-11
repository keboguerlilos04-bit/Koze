import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { Conversation } from '@/types/Conversation';
import type { Message } from '@/types/Message';
import type { RootState } from '@/store';

// Koze: conversations kept on the phone so an agent or administrator can still open them
// without internet. Each one stays usable for OFFLINE_CACHE_TTL after it last came from the
// server, then it is dropped. Logging out clears it with the rest of the store.
export const OFFLINE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
// Kept small: Android storage reads a saved entry in one piece (about 2 MB at most).
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 30;

interface CachedConversation {
  conversation: Conversation;
  // When this conversation last came from the server.
  cachedAt: number;
}

interface OfflineCacheState {
  accountId: number | null;
  entries: Record<number, CachedConversation>;
}

const initialState: OfflineCacheState = { accountId: null, entries: {} };

const isFresh = (entry: CachedConversation | undefined, now: number) =>
  !!entry && now - entry.cachedAt < OFFLINE_CACHE_TTL;

// Union of both lists by id, newest first; the incoming copy of a message wins.
const mergeMessages = (incoming: Message[], saved: Message[]): Message[] => {
  const byId = new Map<number, Message>();
  for (const message of saved) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
};

// Keeps the newest messages only (the list is sorted newest first).
const trimConversation = (conversation: Conversation): Conversation => ({
  ...conversation,
  messages: (conversation.messages ?? []).slice(0, MAX_MESSAGES),
});

const offlineCacheSlice = createSlice({
  name: 'offlineCache',
  initialState,
  reducers: {
    // `fromServer` is true when these conversations were just received while online; otherwise
    // known ones keep their time, so restoring or editing offline never extends the 2 hours.
    saveConversations: (
      state,
      action: PayloadAction<{
        accountId: number;
        conversations: Conversation[];
        fromServer: boolean;
        now: number;
      }>,
    ) => {
      const { accountId, conversations, fromServer, now } = action.payload;
      if (state.accountId !== accountId) {
        state.accountId = accountId;
        state.entries = {};
      }
      for (const conversation of conversations) {
        const existing = state.entries[conversation.id];
        if (!fromServer && !isFresh(existing, now)) continue;
        // A list refresh brings only the last message: merge with the messages we have.
        const messages = mergeMessages(
          conversation.messages ?? [],
          existing?.conversation.messages ?? [],
        );
        state.entries[conversation.id] = {
          conversation: trimConversation({ ...conversation, messages }),
          cachedAt: fromServer ? now : existing!.cachedAt,
        };
      }
      // Drop expired ones and keep the most recently synced.
      const kept = Object.values(state.entries)
        .filter(entry => isFresh(entry, now))
        .sort((a, b) => b.cachedAt - a.cachedAt)
        .slice(0, MAX_CONVERSATIONS);
      state.entries = Object.fromEntries(kept.map(entry => [entry.conversation.id, entry]));
    },
    pruneExpired: (state, action: PayloadAction<number>) => {
      const now = action.payload;
      for (const id of Object.keys(state.entries)) {
        if (!isFresh(state.entries[Number(id)], now)) delete state.entries[Number(id)];
      }
    },
  },
});

export const { saveConversations, pruneExpired } = offlineCacheSlice.actions;

// Conversations still usable offline for the account in use, newest activity first.
export const selectOfflineConversations = (state: RootState, now: number): Conversation[] => {
  const cache = state.offlineCache;
  if (!cache || cache.accountId !== state.auth.user?.account_id) return [];
  return Object.values(cache.entries)
    .filter(entry => isFresh(entry, now))
    .map(entry => entry.conversation)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
};

export const selectOfflineConversation = (
  state: RootState,
  conversationId: number,
  now: number,
): Conversation | undefined => {
  const cache = state.offlineCache;
  if (!cache || cache.accountId !== state.auth.user?.account_id) return undefined;
  const entry = cache.entries[conversationId];
  return isFresh(entry, now) ? entry.conversation : undefined;
};

export default offlineCacheSlice.reducer;
