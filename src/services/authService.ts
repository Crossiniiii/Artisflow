import { UserAccount } from '../types';

export const findAccountByEmail = (
  accounts: UserAccount[],
  email: string
): UserAccount | null => {
  if (!email) return null;
  const lowered = email.toLowerCase();
  const account = accounts.find(a => a.email?.toLowerCase() === lowered);
  return account || null;
};
