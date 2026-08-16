import type { TFunction } from 'i18next';
import { ApiError } from '../api/client';

/**
 * Turns any thrown error into a localized, user-facing message. Backend problem
 * codes (e.g. `auth.invalid_credentials`) map to `errors.<code>` keys in the
 * active language, falling back to the server detail then a generic message.
 * `t` must be bound to the `auth` namespace.
 */
export function authErrorMessage(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'validation_failed') {
      return t('errors.validation_failed');
    }
    return t(`errors.${error.code}`, { defaultValue: error.message || t('errors.generic') });
  }

  if (error instanceof TypeError) {
    // fetch throws TypeError when the network/host is unreachable.
    return t('errors.network');
  }

  return t('errors.generic');
}
