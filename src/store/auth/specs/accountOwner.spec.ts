import { selectIsAccountOwner } from '@/store/auth/authSelectors';
import { RootState } from '@/store';

const stateFor = (user: Record<string, unknown> | null) =>
  ({ auth: { user } }) as unknown as RootState;

const owner = {
  id: 1,
  account_id: 10,
  role: 'administrator',
  inviter_id: null,
  accounts: [{ id: 10, role: 'administrator' }],
};

describe('selectIsAccountOwner', () => {
  it('is true for the administrator who created the account', () => {
    expect(selectIsAccountOwner(stateFor(owner))).toBe(true);
  });

  it('is false for an administrator someone invited', () => {
    expect(selectIsAccountOwner(stateFor({ ...owner, inviter_id: 7 }))).toBe(false);
  });

  it('is false for an agent', () => {
    const agent = { ...owner, role: 'agent', accounts: [{ id: 10, role: 'agent' }] };
    expect(selectIsAccountOwner(stateFor(agent))).toBe(false);
  });

  it('is false until the profile says who invited the user', () => {
    const { inviter_id: _unknown, ...withoutInviter } = owner;
    expect(selectIsAccountOwner(stateFor(withoutInviter))).toBe(false);
  });

  it('is false when the active account is one where the user is only an agent', () => {
    const switched = {
      ...owner,
      account_id: 20,
      accounts: [
        { id: 10, role: 'administrator' },
        { id: 20, role: 'agent' },
      ],
    };
    expect(selectIsAccountOwner(stateFor(switched))).toBe(false);
  });

  it('is false when logged out', () => {
    expect(selectIsAccountOwner(stateFor(null))).toBe(false);
  });
});
