import { UserAccount } from '../types';

export const findAccountByEmail = (
  accounts: UserAccount[],
  email: string
): UserAccount | null => {
  const lowered = email.toLowerCase();
  const account = accounts.find(a => a.email.toLowerCase() === lowered);
  return account || null;
};

export const withUpdatedLastLogin = (account: UserAccount): UserAccount => {
  return {
    ...account,
    lastLogin: new Date().toISOString()
  };
};

