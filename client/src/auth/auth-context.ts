import { createContext } from 'react';
import type { UpdateProfilePayload, UserProfile } from '../api/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  /** Lifecycle of the session: resolving on load, then authed/anon. */
  status: AuthStatus;
  /** The signed-in user, or null when anonymous. */
  user: UserProfile | null;
  /** Authenticate with email + password. Throws ApiError on failure. */
  login: (email: string, password: string) => Promise<void>;
  /** Create an account (returns the unverified profile). */
  register: (name: string, email: string, password: string, purpose?: string, agreeTerms?: boolean) => Promise<UserProfile>;
  /** Confirm an email address with the emailed OTP code. */
  verifyEmail: (email: string, code: string) => Promise<void>;
  /** Revoke the session and clear local state. */
  logout: () => Promise<void>;
  /** Request a password-reset email. */
  forgotPassword: (email: string) => Promise<void>;
  /** Complete a password reset with the emailed token. */
  resetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  /** Update the signed-in user's profile. */
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
}

export const AUTH_STORAGE_KEY = 'pckinba.refresh';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
