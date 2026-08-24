export interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  color: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

/**
 * Calculates a 4-tier password strength score and returns detailed criteria analysis.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Too Short',
      color: 'var(--danger)',
      hasMinLength: false,
      hasUppercase: false,
      hasNumber: false,
      hasSymbol: false,
    };
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  const tierConfig: Array<{ label: string; color: string }> = [
    { label: 'Too Short', color: 'var(--danger)' },
    { label: 'Weak', color: 'var(--danger)' },
    { label: 'Fair', color: 'var(--warning)' },
    { label: 'Strong', color: 'var(--accent)' },
    { label: 'Quantum Cyber', color: 'var(--success)' },
  ];

  const currentTier = tierConfig[score];

  return {
    score,
    label: currentTier.label,
    color: currentTier.color,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSymbol,
  };
}
