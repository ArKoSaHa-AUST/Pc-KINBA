import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { UpdateProfilePayload, UserProfile, UserRole } from '../api/auth';
import { createClient } from '../utils/supabase/client';
import {
  AUTH_STORAGE_KEY,
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context';

const DEMO_USER_KEY = 'pckinba.demo_user';
const supabase = createClient();

interface AuthProviderProps {
  children: ReactNode;
}

function mapToUserProfile(
  id: string,
  name: string,
  email: string,
  role: UserRole = 'Customer',
  avatarUrl: string | null = null,
  purpose = 'gaming',
  emailVerified = true,
): UserProfile {
  return {
    id,
    name,
    email,
    role,
    avatarUrl,
    purpose,
    emailVerified,
    createdAt: new Date().toISOString(),
    notificationPreferences: {
      emailPriceDrops: true,
      emailNewsletter: false,
      emailProductUpdates: true,
      pushEnabled: false,
    },
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const fetchProfile = useCallback(
    async (
      userId: string,
      email: string,
      metadata?: Record<string, unknown>,
    ): Promise<UserProfile> => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          return mapToUserProfile(
            profile.id,
            profile.full_name || email.split('@')[0],
            profile.email || email,
            (profile.role as UserRole) || 'Customer',
            profile.avatar_url || null,
            profile.purpose || 'gaming',
            true,
          );
        }
      } catch (e) {
        console.warn('Error fetching Supabase user profile:', e);
      }

      const fallbackName =
        (metadata?.full_name as string) || (metadata?.name as string) || email.split('@')[0];
      const fallbackPurpose = (metadata?.purpose as string) || 'gaming';
      return mapToUserProfile(userId, fallbackName, email, 'Customer', null, fallbackPurpose);
    },
    [],
  );

  // Listen to Supabase Auth state changes
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await fetchProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata,
          );
          setUser(profile);
          setStatus('authenticated');
          return;
        }
      } catch (err) {
        console.warn('Supabase getSession error:', err);
      }

      // Local storage fallback for offline demo session
      try {
        const storedUser = localStorage.getItem(DEMO_USER_KEY);
        if (storedUser && mounted) {
          setUser(JSON.parse(storedUser) as UserProfile);
          setStatus('authenticated');
          return;
        }
      } catch {
        // ignore
      }

      if (mounted) {
        setStatus('unauthenticated');
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const profile = await fetchProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata,
        );
        setUser(profile);
        setStatus('authenticated');
      } else {
        const storedUser = localStorage.getItem(DEMO_USER_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser) as UserProfile);
          setStatus('authenticated');
        } else {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const saveDemoSession = useCallback((nextUser: UserProfile) => {
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
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const profile = await fetchProfile(
          data.user.id,
          data.user.email || '',
          data.user.user_metadata,
        );
        setUser(profile);
        setStatus('authenticated');
      }
    },
    [fetchProfile],
  );

  const loginWithOAuth = useCallback(async (provider: 'google' | 'github' | 'discord') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    if (error) {
      throw error;
    }
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      purpose = 'gaming',
      agreeTerms = true,
    ): Promise<UserProfile> => {
      let userId = `user_${Date.now()}`;

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              purpose,
              agree_terms: agreeTerms,
            },
          },
        });

        if (error) {
          if (
            error.status === 429 ||
            error.code === 'over_email_send_rate_limit' ||
            error.message?.toLowerCase().includes('rate limit')
          ) {
            console.warn('Supabase Auth Email Rate Limit hit. Creating profile session locally.');
          } else {
            throw error;
          }
        } else if (data?.user) {
          userId = data.user.id;
          try {
            await supabase.from('profiles').upsert({
              id: userId,
              full_name: name,
              email: email,
              purpose: purpose,
              agree_terms: agreeTerms,
              role: 'Customer',
              updated_at: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.warn('Direct profile upsert error (handled by DB trigger):', dbErr);
          }
        }
      } catch (err: unknown) {
        const authErr = err as { status?: number; code?: string; message?: string } | null;
        if (
          authErr?.status === 429 ||
          authErr?.code === 'over_email_send_rate_limit' ||
          authErr?.message?.toLowerCase().includes('rate limit')
        ) {
          console.warn('Handling Supabase email rate limit gracefully for sign-up.');
        } else {
          throw err;
        }
      }

      const newUser = mapToUserProfile(userId, name, email);
      saveDemoSession(newUser);

      // Trigger Brevo welcome email (non-blocking)
      try {
        fetch('http://localhost:3001/api/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), name: name.trim() }),
        }).catch((emailErr) => {
          console.warn('Welcome email notification dispatch warning:', emailErr);
        });
      } catch (emailErr) {
        console.warn('Welcome email trigger error:', emailErr);
      }

      return newUser;
    },
    [saveDemoSession],
  );

  const verifyEmail = useCallback(async () => {
    if (user) {
      const updated = { ...user, emailVerified: true };
      saveDemoSession(updated);
    }
  }, [user, saveDemoSession]);

  const forgotPassword = useCallback(async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email);
  }, []);

  const resetPassword = useCallback(async () => {}, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<UserProfile> => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (user.id && !user.id.startsWith('user_')) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: payload.name !== undefined ? payload.name : user.name,
              avatar_url: payload.avatarUrl !== undefined ? payload.avatarUrl : user.avatarUrl,
              purpose: payload.purpose !== undefined ? payload.purpose : user.purpose,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        } catch (err) {
          console.warn('Supabase profile update failed:', err);
        }
      }

      const updated: UserProfile = {
        ...user,
        name: payload.name !== undefined ? payload.name : user.name,
        avatarUrl: payload.avatarUrl !== undefined ? payload.avatarUrl : user.avatarUrl,
        purpose: payload.purpose !== undefined ? payload.purpose : user.purpose,
        notificationPreferences: payload.notificationPreferences
          ? { ...user.notificationPreferences, ...payload.notificationPreferences }
          : user.notificationPreferences,
      };
      saveDemoSession(updated);
      return updated;
    },
    [user, saveDemoSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      loginWithOAuth,
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
      loginWithOAuth,
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
