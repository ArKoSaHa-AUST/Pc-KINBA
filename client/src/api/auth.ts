import { apiFetch } from './client';

export type UserRole = 'Customer' | 'Admin';

export interface NotificationPreferences {
  emailPriceDrops: boolean;
  emailNewsletter: boolean;
  emailProductUpdates: boolean;
  pushEnabled: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  purpose?: string;
  emailVerified: boolean;
  createdAt: string;
  notificationPreferences: NotificationPreferences;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserProfile;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string | null;
  purpose?: string;
  notificationPreferences?: NotificationPreferences;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiFetch<UserProfile>('/auth/register', { method: 'POST', body: payload }),

  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),

  refresh: (refreshToken: string) =>
    apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } }),

  logout: (refreshToken: string) =>
    apiFetch<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),

  verify: (email: string, code: string) =>
    apiFetch<void>('/auth/verify', { method: 'POST', body: { email, code } }),

  forgotPassword: (email: string) =>
    apiFetch<void>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (email: string, token: string, newPassword: string) =>
    apiFetch<void>('/auth/reset-password', { method: 'POST', body: { email, token, newPassword } }),

  me: (token: string) => apiFetch<UserProfile>('/users/me', { token }),

  updateMe: (token: string, payload: UpdateProfilePayload) =>
    apiFetch<UserProfile>('/users/me', { method: 'PATCH', body: payload, token }),
};
