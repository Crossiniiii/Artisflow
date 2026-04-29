import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount, UserRole } from '../types';
import { supabase } from '../supabase';
import { mapFromSnakeCase, mapToSnakeCase } from '../utils/supabaseUtils';
import { IS_DEMO_MODE } from '../constants';

interface AuthContextType {
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  justLoggedIn: boolean;
  setJustLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  isAdmin: boolean;
  isInventory: boolean;
  isSales: boolean;
  isExclusive: boolean;
  handleLogin: (account: UserAccount) => Promise<void>;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PROFILE_COLUMNS = 'id, name, first_name, full_name, email, role, branch, status, permissions, last_login, position';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Presence System using Supabase Realtime
  useEffect(() => {
    if (currentUser?.id && !IS_DEMO_MODE) {
      const channel = supabase.channel(`presence:${currentUser.id}`, {
        config: {
          presence: {
            key: currentUser.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          // Presence sync for real-time collaboration
        })
        .on('presence', { event: 'join' }, () => {
          // User joined presence channel
        })
        .on('presence', { event: 'leave' }, () => {
          // User left presence channel
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user: currentUser.name,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [currentUser?.id, currentUser?.name]);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isInventory = currentUser?.role === UserRole.INVENTORY_PERSONNEL;
  const isSales = currentUser?.role === UserRole.SALES_AGENT;
  const isExclusive = currentUser?.role === UserRole.EXCLUSIVE;

  const handleLogin = async (account: UserAccount) => {
    const timestamp = new Date().toISOString();
    let finalAccount = { ...account, lastLogin: timestamp };

    if (!IS_DEMO_MODE) {
      try {
        // Ensure a valid Supabase session before allowing access in live mode.
        let { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            if (error.code === 'anonymous_provider_disabled' || error.status === 422) {
              throw new Error('Supabase Anonymous Auth is disabled. Enable it in Supabase Dashboard > Authentication > Providers > Anonymous.');
            }
            throw new Error(error.message || 'Unable to establish secure session.');
          }
          if (!data.session) throw new Error('Unable to establish secure session.');
          session = data.session;
        }

        if (!session?.user?.id) {
          throw new Error('No authenticated user in session.');
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', account.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Profile hydration on login failed:', profileError.message);
        } else if (profileData) {
          finalAccount = {
            ...finalAccount,
            ...(mapFromSnakeCase([profileData])[0] as UserAccount)
          };
        }

      } catch (error: any) {
        console.error('Supabase auth/sync process error:', error);
        throw new Error(error?.message || 'Login failed. Please try again.');
      }
    }

    setJustLoggedIn(true);
    setCurrentUser(finalAccount);

    if (!IS_DEMO_MODE) {
      void supabase
        .from('profiles')
        .update(mapToSnakeCase({ lastLogin: timestamp, status: 'Active' }))
        .eq('id', account.id)
        .then(({ error }) => {
          if (error) {
            console.error('Profile last login sync failed:', error.message);
          }
        });
    }
  };

  const handleLogout = async () => {
    if (!IS_DEMO_MODE) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setJustLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        justLoggedIn,
        setJustLoggedIn,
        isAdmin,
        isInventory,
        isSales,
        isExclusive,
        handleLogin,
        handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
