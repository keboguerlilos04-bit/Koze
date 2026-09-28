import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import { Account } from '@/types/Account';

export const selectAuth = (state: RootState) => state.auth;

export const selectAuthHeaders = createSelector(selectAuth, auth => auth.headers);

export const selectUser = createSelector(selectAuth, auth => auth.user);

export const selectIsLoggingIn = createSelector(selectAuth, auth => auth.uiFlags.isLoggingIn);

export const selectAuthError = createSelector(selectAuth, auth => auth.error);

export const selectLoggedIn = createSelector(selectAuth, auth => auth.user !== null);

export const selectUserId = createSelector(selectAuth, auth => auth.user?.id);

export const selectPubSubToken = createSelector(selectAuth, auth => auth.user?.pubsub_token);

export const selectUserThumbnail = createSelector(selectAuth, auth => auth.user?.avatar_url);

export const selectUserName = createSelector(selectAuth, auth => auth.user?.name);

export const selectResetPasswordLoading = createSelector(
  selectAuth,
  auth => auth.uiFlags.isResettingPassword,
);

export const selectAccounts = createSelector(selectAuth, auth => auth.user?.accounts);

export const selectCurrentUserAvailability = createSelector(selectAuth, auth => {
  if (!auth.user) {
    return 'offline';
  }
  const {
    user: { account_id, accounts = [] },
  } = auth;
  const [currentAccount] = accounts.filter(account => account.id === account_id) as Account[];
  return currentAccount?.availability ?? 'offline';
});

export const selectCurrentUserAccountId = createSelector(selectAuth, auth => auth.user?.account_id);

export const selectCurrentUserAccount = createSelector(selectAuth, auth => {
  const { user } = auth;
  const currentAccount = user?.accounts?.find(
    account => Number(account.id) === Number(user?.account_id),
  );
  return currentAccount;
});

// Koze: the account owner is the administrator who created it at signup (nobody invited
// them). Only they see the in-app administration screens. `role` and `inviter_id` describe
// the server-side active account, so the local current account must agree as well.
export const selectIsAccountOwner = createSelector(
  selectAuth,
  selectCurrentUserAccount,
  (auth, currentAccount) =>
    auth.user?.role === 'administrator' &&
    auth.user.inviter_id === null &&
    currentAccount?.role === 'administrator',
);

export const selectMfaToken = createSelector(selectAuth, auth => auth.mfaToken);

export const selectIsMfaRequired = createSelector(selectAuth, auth => auth.mfaToken !== null);

export const selectVerificationChannel = createSelector(
  selectAuth,
  auth => auth.verificationChannel,
);

export const selectIsVerifyingMfa = createSelector(selectAuth, auth => auth.uiFlags.isVerifyingMfa);
