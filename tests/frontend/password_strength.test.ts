import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculatePasswordStrength,
  calculatePasswordStrengthAsync,
  getUtf8ByteLength,
} from '@/utils/passwordStrength';
import {
  meetsPasswordPolicy,
  passwordPolicyMessage,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_SCORE,
} from '@/utils/passwordPolicy';
import { initializeEstimator } from '@/utils/passwordEstimator';

describe('Frontend Password Entropy & Guessability Integration Suite', () => {
  beforeAll(async () => {
    initializeEstimator();
  });

  it('verifies EX-06: "123" is rejected with score 0', async () => {
    const strength = await calculatePasswordStrengthAsync('123');
    expect(strength.score).toBe(0);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('verifies EX-06a: "Password1" does not meet entropy policy', async () => {
    const strength = await calculatePasswordStrengthAsync('Password1');
    expect(strength.score).toBeLessThan(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('verifies EX-06e: passphrase "correct horse battery staple" meets policy without symbols/digits', async () => {
    const strength = await calculatePasswordStrengthAsync('correct horse battery staple');
    expect(strength.score).toBeGreaterThanOrEqual(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(true);
  });
});
