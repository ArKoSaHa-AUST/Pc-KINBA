import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UpdateProfilePayload, UserProfile } from '../api/auth';
import {
  AUTH_STORAGE_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context';

const DEMO_USER_KEY = 'pckinba.demo_user';

interface AuthProviderProps {
  children: ReactNode;
}

function createDemoUser(nameInput?: string, emailInput?: string): UserProfile {
  const trimmedEmail = emailInput?.trim() || 'demo@example.com';
  const email = trimmedEmail.includes('@') ? trimmedEmail : `${trimmedEmail}@example.com`;

  let name = nameInput?.trim();
  if (!name) {
    const handle = email.split('@')[0];
    name = handle ? handle.charAt(0).toUpperCase() + handle.slice(1) : 'Demo User';
  }

  return {
    id: `user_${Date.now()}`,
    name,
    email,
    role: 'Customer',
    avatarUrl: null,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    notificationPreferences: {
      emailPriceDrops: true,
      emailNewsletter: false,
      emailProductUpdates: true,
      pushEnabled: false,
    },
  };
}

/**
 * Holds the current user in memory and local storage for pure client-side demo mode.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Load session from local storage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(DEMO_USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser) as UserProfile);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    } catch {
      setStatus('unauthenticated');
    }
  }, []);

  const saveSession = useCallback((nextUser: UserProfile) => {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const login = useCallback(
    async (email: string) => {
      const nextUser = createDemoUser(undefined, email);
      saveSession(nextUser);
    },
    [saveSession],
  );

  const register = useCallback(
    async (name: string, email: string): Promise<UserProfile> => {
      const nextUser = createDemoUser(name, email);
      saveSession(nextUser);
      return nextUser;
    },
    [saveSession],
  );

  const verifyEmail = useCallback(async () => {
    if (user) {
      const updated = { ...user, emailVerified: true };
      saveSession(updated);
    }
  }, [user, saveSession]);

  const forgotPassword = useCallback(async () => {}, []);

  const resetPassword = useCallback(async () => {}, []);

  const logout = useCallback(async () => {
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<UserProfile> => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      const updated: UserProfile = {
        ...user,
        name: payload.name !== undefined ? payload.name : user.name,
        avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : user.avatarUrl,
        notificationPreferences: payload.notificationPreferences
          ? { ...user.notificationPreferences, ...payload.notificationPreferences }
          : user.notificationPreferences,
      };
      saveSession(updated);
      return updated;
    },
    [user, saveSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      register,
      verifyEmail,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
    }),
    [
      status,
      user,
      login,
      register,
      verifyEmail,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
