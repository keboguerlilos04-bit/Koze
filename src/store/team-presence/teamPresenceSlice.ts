import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/store';
import type { AvailabilityStatus } from '@/types';

// Koze: live status of every user in the account, from the websocket "presence.update"
// events, so the team screen can show who is online. Not persisted: statuses are only
// meaningful while connected.
interface TeamPresenceState {
  users: Record<number, AvailabilityStatus>;
}

const initialState: TeamPresenceState = { users: {} };

const teamPresenceSlice = createSlice({
  name: 'teamPresence',
  initialState,
  reducers: {
    setTeamPresence: (state, action: PayloadAction<Record<number, AvailabilityStatus>>) => {
      state.users = action.payload ?? {};
    },
  },
});

export const { setTeamPresence } = teamPresenceSlice.actions;

export const selectTeamPresence = (state: RootState) => state.teamPresence.users;

export default teamPresenceSlice.reducer;
