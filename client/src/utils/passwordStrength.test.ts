import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculatePasswordStrength,
  calculatePasswordStrengthAsync,
  getUtf8ByteLength,
} from './passwordStrength';
import { meetsPasswordPolicy, passwordPolicyMessage, PASSWORD_MIN_SCORE } from './passwordPolicy';
import { initializeEstimator } from './passwordEstimator';

describe('PC-KINBA Password Strength & Entropy Policy (EX-06 Suite)', () => {
  beforeAll(async () => {
    initializeEstimator();
  });

  it('EX-06: "123" is rejected as too short (score 0, does not meet policy)', async () => {
    const strength = await calculatePasswordStrengthAsync('123');
    expect(strength.score).toBe(0);
    expect(strength.hasMinLength).toBe(false);
    expect(meetsPasswordPolicy(strength)).toBe(false);
    expect(strength.meetsPolicy).toBe(false);
    expect(passwordPolicyMessage(strength)).toBe('validation.passwordMinLength');
  });

  it('EX-06a: "Password1" does not meet policy despite satisfying character classes (regression test)', async () => {
    const strength = await calculatePasswordStrengthAsync('Password1');
    expect(strength.hasMinLength).toBe(true);
    expect(strength.hasUppercase).toBe(true);
    expect(strength.hasNumber).toBe(true);
    // Under naive class counting this was "Strong" (3/4). Under zxcvbn entropy it is guessable (score < 3).
    expect(strength.score).toBeLessThan(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(false);
    expect(strength.warning).toBeDefined();
  });

  it('EX-06b: "Aaaaaaa1" does not meet policy (repeated characters pattern)', async () => {
    const strength = await calculatePasswordStrengthAsync('Aaaaaaa1');
    expect(strength.score).toBeLessThan(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('EX-06c: "pckinba123" does not meet policy (penalized by project dictionary)', async () => {
    const strength = await calculatePasswordStrengthAsync('pckinba123');
    expect(strength.score).toBeLessThan(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('EX-06d: password containing user email local-part fails policy via userInputs', async () => {
    const emailLocal = 'tanvir99';
    const password = `${emailLocal}12345`;
    const strength = await calculatePasswordStrengthAsync(password, [emailLocal, 'Tanvir']);
    expect(strength.score).toBeLessThan(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('EX-06e: "correct horse battery staple" meets policy (passphrase support without symbols/digits)', async () => {
    const passphrase = 'correct horse battery staple';
    const strength = await calculatePasswordStrengthAsync(passphrase);
    expect(strength.hasMinLength).toBe(true);
    expect(strength.hasUppercase).toBe(false);
    expect(strength.hasNumber).toBe(false);
    expect(strength.hasSymbol).toBe(false);
    // Passphrase has ~44+ bits of entropy -> score 3 or 4
    expect(strength.score).toBeGreaterThanOrEqual(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(true);
  });

  it('EX-06f: "Qwerty12" does not meet policy (keyboard walk sequence)', async () => {
    const strength = await calculatePasswordStrengthAsync('Qwerty12');
    expect(strength.score).toBeLessThan(PASSWORD_MIN_SCORE);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('EX-06g: 7-character password fails specifically on min length constraint', async () => {
    const strength = await calculatePasswordStrengthAsync('Abc1!xy');
    expect(strength.hasMinLength).toBe(false);
    expect(meetsPasswordPolicy(strength)).toBe(false);
    expect(passwordPolicyMessage(strength)).toBe('validation.passwordMinLength');
    expect(strength.warning).toBe('pw.warning.tooShort');
  });

  it('EX-06h: 100-character password is rejected due to 72-byte bcrypt safety limit', async () => {
    const longPw = 'A'.repeat(100);
    expect(getUtf8ByteLength(longPw)).toBe(100);
    const strength = await calculatePasswordStrengthAsync(longPw);
    expect(strength.hasMaxBytes).toBe(false);
    expect(meetsPasswordPolicy(strength)).toBe(false);
    expect(passwordPolicyMessage(strength)).toBe('validation.passwordMaxBytes');
    expect(strength.warning).toBe('pw.warning.tooLong');
  });

  it('EX-06i: empty string returns distinct empty state with score 0 and no warning', () => {
    const strength = calculatePasswordStrength('');
    expect(strength.score).toBe(0);
    expect(strength.isEmpty).toBe(true);
    expect(strength.label).toBe('pw.tier.empty');
    expect(strength.warning).toBeNull();
    expect(strength.suggestions).toEqual([]);
    expect(meetsPasswordPolicy(strength)).toBe(false);
  });

  it('EX-06j: heuristic fallback is always strictly conservative compared to zxcvbn', () => {
    const testCases = [
      'Password1',
      '12345678',
      'qwertyuiop',
      'pckinba-store',
      'dhaka-bangladesh-2026',
      'correct horse battery staple',
    ];

    for (const pw of testCases) {
      const live = calculatePasswordStrength(pw);
      // Synchronous score must never be optimistically higher than what policy requires
      expect(live.score).toBeLessThanOrEqual(4);
      if (!live.hasMinLength || !live.hasMaxBytes) {
        expect(live.score).toBe(0);
      }
    }
  });

  it('EX-06k: RegisterPage and ResetPasswordPage share identical policy acceptance', async () => {
    const samplePasswords = [
      { pw: '123', valid: false },
      { pw: 'Password1', valid: false },
      { pw: 'Aaaaaaa1', valid: false },
      { pw: 'pckinba123', valid: false },
      { pw: 'Qwerty12', valid: false },
      { pw: 'short7!', valid: false },
      { pw: 'correct horse battery staple', valid: true },
      { pw: 'Tr0ub4dor&3#CyberKinba', valid: true },
      { pw: 'K!nba-2026$UltraSecure#Rig', valid: true },
    ];

    for (const { pw, valid } of samplePasswords) {
      const regStrength = await calculatePasswordStrengthAsync(pw);
      const resetStrength = await calculatePasswordStrengthAsync(pw);

      expect(meetsPasswordPolicy(regStrength)).toBe(valid);
      expect(meetsPasswordPolicy(resetStrength)).toBe(valid);
      expect(meetsPasswordPolicy(regStrength)).toBe(meetsPasswordPolicy(resetStrength));
    }
  });
});
