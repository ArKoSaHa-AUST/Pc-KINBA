import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi, type UpdateProfilePayload, type AuthResponse, type UserProfile } from '../api/auth';
import { ApiError } from '../api/client';
import { AUTH_STORAGE_KEY, AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

/** Renew the access token this many milliseconds before it actually expires. */
const REFRESH_SKEW_MS = 60_000;

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Holds the current user and tokens. The refresh token is persisted so a session
 * survives reloads (up to the 24h server lifetime); the access token is kept in
 * memory and renewed silently shortly before it expires.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const accessTokenRef = useRef<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    clearRefreshTimer();
    accessTokenRef.current = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setStatus('unauthenticated');
  }, [clearRefreshTimer]);

  // Declared as a ref so the scheduled timer always calls the latest closure.
  const renewRef = useRef<() => Promise<void>>(async () => {});

  const applySession = useCallback(
    (response: AuthResponse) => {
      accessTokenRef.current = response.accessToken;
      localStorage.setItem(AUTH_STORAGE_KEY, response.refreshToken);
      setUser(response.user);
      setStatus('authenticated');

      clearRefreshTimer();
      const expiresAt = new Date(response.accessTokenExpiresAt).getTime();
      const delay = Math.max(expiresAt - Date.now() - REFRESH_SKEW_MS, 5_000);
      refreshTimer.current = setTimeout(() => void renewRef.current(), delay);
    },
    [clearRefreshTimer],
  );

  const renew = useCallback(async () => {
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!refreshToken) {
      clearSession();
      return;
    }
    try {
      const response = await authApi.refresh(refreshToken);
      applySession(response);
    } catch {
      clearSession();
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    renewRef.current = renew;
  }, [renew]);

  // Bootstrap the session once on mount.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!refreshToken) {
      setStatus('unauthenticated');
      return;
    }
    void renew();
    return clearRefreshTimer;
  }, [renew, clearRefreshTimer]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password);
      applySession(response);
    },
    [applySession],
  );

  const register = useCallback(
    (name: string, email: string, password: string) => authApi.register({ name, email, password }),
    [],
  );

  const verifyEmail = useCallback((email: string, code: string) => authApi.verify(email, code), []);

  const forgotPassword = useCallback((email: string) => authApi.forgotPassword(email), []);

  const resetPassword = useCallback(
    (email: string, token: string, newPassword: string) =>
      authApi.resetPassword(email, token, newPassword),
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEY);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Best-effort: revoke locally even if the server call fails.
      }
    }
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      const runUpdate = () => authApi.updateMe(accessTokenRef.current ?? '', payload);
      try {
        const updated = await runUpdate();
        setUser(updated);
        return updated;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await renew();
          const updated = await runUpdate();
          setUser(updated);
          return updated;
        }
        throw error;
      }
    },
    [renew],
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
    [status, user, login, register, verifyEmail, logout, forgotPassword, resetPassword, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
