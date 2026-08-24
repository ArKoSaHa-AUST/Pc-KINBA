import type { TFunction } from 'i18next';
import { ApiError } from '../api/client';

/**
 * Turns any thrown error into a localized, user-facing message.
 * Handles Supabase Auth errors, network errors, and API errors.
 */
export function authErrorMessage(t: TFunction, error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as { status?: number; message?: string; code?: string };

    if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
      return 'Supabase Email Rate Limit Exceeded: Please wait a few minutes before trying again.';
    }

    if (err.message) {
      return err.message;
    }
  }

  if (error instanceof ApiError) {
    if (error.code === 'validation_failed') {
      return t('errors.validation_failed');
    }
    return t(`errors.${error.code}`, { defaultValue: error.message || t('errors.generic') });
  }

  if (error instanceof TypeError) {
    return t('errors.network');
  }

  return t('errors.generic');
}
