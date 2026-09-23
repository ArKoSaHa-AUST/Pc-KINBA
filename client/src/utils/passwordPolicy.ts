/**
 * PC-KINBA — Single Shared Password Security Policy
 *
 * Enforces unified password security standards across registration and password reset.
 * Evaluates estimated guessability (zxcvbn score >= 3), hard length minimum (8 chars),
 * and bcrypt truncation bounds (<= 72 bytes).
 */

import type { PasswordStrength } from './passwordStrength';

/**
 * Hard minimum character length, matching Supabase Auth project configuration.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Hard maximum UTF-8 byte length to prevent silent bcrypt truncation vulnerabilities.
 */
export const PASSWORD_MAX_BYTES = 72;

/**
 * Minimum acceptable zxcvbn entropy score on the 0 to 4 scale.
 * Score 3 ("safely unguessable") provides robust protection against offline dictionary attacks
 * and brute-force cracking, while rejecting common breached permutations (e.g. "Password1", "Aaaaaaa1").
 */
export const PASSWORD_MIN_SCORE = 3;

/**
 * Unified gate function for account creation and credential updates.
 */
export function meetsPasswordPolicy(strength: PasswordStrength): boolean {
  if (!strength) return false;
  return strength.meetsPolicy && strength.score >= PASSWORD_MIN_SCORE;
}

/**
 * Returns a localized i18n error key if the password does not satisfy the security policy.
 */
export function passwordPolicyMessage(strength: PasswordStrength): string | null {
  if (!strength || strength.isEmpty) {
    return 'validation.required';
  }
  if (!strength.hasMinLength) {
    return 'validation.passwordMinLength';
  }
  if (!strength.hasMaxBytes) {
    return 'validation.passwordMaxBytes';
  }
  if (strength.score < PASSWORD_MIN_SCORE) {
    return strength.warning || 'validation.passwordWeak';
  }
  return null;
}
