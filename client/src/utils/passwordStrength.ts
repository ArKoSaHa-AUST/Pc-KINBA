/**
 * PC-KINBA — Password Guessability & Entropy Scorer
 *
 * Replaces naive character-class counting with zxcvbn entropy estimation.
 * Supports long passphrases and penalizes dictionary words, keyboard walks,
 * and project-specific terms (e.g. "pckinba", "dhaka").
 *
 * All operations execute 100% client-side. No credentials are ever transmitted or stored.
 */

let estimatorModule: typeof import('./passwordEstimator') | null = null;
let estimatorLoadingPromise: Promise<typeof import('./passwordEstimator')> | null = null;

export async function loadEstimator(): Promise<typeof import('./passwordEstimator')> {
  if (estimatorModule) return estimatorModule;
  if (!estimatorLoadingPromise) {
    estimatorLoadingPromise = import('./passwordEstimator').then((mod) => {
      estimatorModule = mod;
      mod.initializeEstimator();
      return mod;
    });
  }
  return estimatorLoadingPromise;
}

export function isEstimatorLoaded(): boolean {
  return estimatorModule !== null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // zxcvbn entropy scale (0 = too guessable ... 4 = very unguessable)
  label: string; // i18n key for tier label (e.g. 'pw.tier.veryWeak')
  color: string; // CSS color token for visual meter
  guessesLog10: number; // Log10 of estimated crack guesses
  crackTimeDisplay: string; // Localized/format-ready crack time string or i18n key
  warning: string | null; // i18n key for actionable security warning
  suggestions: string[]; // i18n keys for constructive improvement tips
  meetsPolicy: boolean; // Single source-of-truth policy boolean
  hasMinLength: boolean; // >= 8 characters
  hasMaxBytes: boolean; // <= 72 bytes (bcrypt truncation safety)
  hasUppercase: boolean; // [A-Z]
  hasNumber: boolean; // [0-9]
  hasSymbol: boolean; // [^A-Za-z0-9]
  isProvisional?: boolean; // true if estimated via heuristic fallback before async module loaded
  isEmpty?: boolean; // true if empty string
}

export const TIER_CONFIG: Record<
  0 | 1 | 2 | 3 | 4,
  { labelKey: string; color: string; token: string }
> = {
  0: { labelKey: 'pw.tier.veryWeak', color: 'var(--danger, #ef4444)', token: 'danger' },
  1: { labelKey: 'pw.tier.weak', color: 'var(--danger, #ef4444)', token: 'danger' },
  2: { labelKey: 'pw.tier.fair', color: 'var(--warning, #f59e0b)', token: 'warning' },
  3: { labelKey: 'pw.tier.strong', color: 'var(--accent, #06b6d4)', token: 'accent' },
  4: { labelKey: 'pw.tier.veryStrong', color: 'var(--success, #10b981)', token: 'success' },
};

/**
 * Maps zxcvbn English feedback warnings to stable, localizable i18n keys.
 */
export const WARNING_MAP: Record<string, string> = {
  'Straight rows of keys are easy to guess': 'pw.warning.straightRow',
  'Short keyboard patterns are easy to guess': 'pw.warning.keyboardPattern',
  'Repeats like "aaa" are easy to guess': 'pw.warning.repeatedChars',
  'Repeats like "abcabcabc" are only slightly harder to guess than "abc"':
    'pw.warning.repeatedPattern',
  'Sequences like abc or 6543 are easy to guess': 'pw.warning.sequences',
  'Recent years are easy to guess': 'pw.warning.recentYears',
  'Dates are often easy to guess': 'pw.warning.dates',
  'This is a top-10 common password': 'pw.warning.top10',
  'This is a top-100 common password': 'pw.warning.top100',
  'This is a very common password': 'pw.warning.veryCommon',
  'This is similar to a commonly used password': 'pw.warning.similarToCommon',
  'A word by itself is easy to guess': 'pw.warning.wordByItself',
  'Names and surnames by themselves are easy to guess': 'pw.warning.namesByThemselves',
  'Common names and surnames are easy to guess': 'pw.warning.commonNames',
  "Predictable substitutions like '@' for 'a' are easy to guess": 'pw.warning.substitutions',
};

/**
 * Maps zxcvbn English feedback suggestions to stable, localizable i18n keys.
 */
export const SUGGESTION_MAP: Record<string, string> = {
  'Use a few words, avoid common phrases': 'pw.suggestion.fewWords',
  'No need for symbols, digits, or uppercase letters': 'pw.suggestion.noNeedSymbols',
  'Add another word or two. Uncommon words are better.': 'pw.suggestion.addWords',
  'Avoid repeated words and characters': 'pw.suggestion.avoidRepeats',
  'Avoid sequences': 'pw.suggestion.avoidSequences',
  'Avoid recent years': 'pw.suggestion.avoidRecentYears',
  'Avoid years that are associated with you': 'pw.suggestion.avoidPersonalYears',
  'Avoid dates and years that are associated with you': 'pw.suggestion.avoidPersonalDates',
  "Capitalization doesn't help very much": 'pw.suggestion.capitalization',
  'All-uppercase is almost as easy to guess as all-lowercase': 'pw.suggestion.allUppercase',
  "Reverse words aren't much harder to guess": 'pw.suggestion.reverseWords',
  "Predictable substitutions like '@' for 'a' don't help very much": 'pw.suggestion.substitutions',
};

function mapWarning(warningText?: string | null): string | null {
  if (!warningText) return null;
  return WARNING_MAP[warningText] || 'pw.warning.commonWord';
}

function mapSuggestions(suggestionsList?: string[]): string[] {
  if (!suggestionsList || suggestionsList.length === 0) return [];
  return suggestionsList.map((s) => SUGGESTION_MAP[s] || 'pw.suggestion.addWords');
}

/**
 * Calculates byte length of string (ensuring UTF-8 <= 72 bytes for bcrypt compatibility).
 */
export function getUtf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return encodeURI(str).split(/%..|./).length - 1;
}

/**
 * Conservative synchronous fallback when zxcvbn dictionary is still loading.
 * Ensures the provisional score is strictly conservative (never optimistic).
 */
function calculateHeuristicFallback(password: string, userInputs: string[] = []): PasswordStrength {
  const byteLength = getUtf8ByteLength(password);
  const hasMinLength = password.length >= 8;
  const hasMaxBytes = byteLength <= 72;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9\s]/.test(password);

  if (!password) {
    return {
      score: 0,
      label: 'pw.tier.empty',
      color: 'var(--border, #334155)',
      guessesLog10: 0,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: null,
      suggestions: [],
      meetsPolicy: false,
      hasMinLength: false,
      hasMaxBytes: true,
      hasUppercase: false,
      hasNumber: false,
      hasSymbol: false,
      isEmpty: true,
      isProvisional: false,
    };
  }

  if (!hasMinLength) {
    return {
      score: 0,
      label: TIER_CONFIG[0].labelKey,
      color: TIER_CONFIG[0].color,
      guessesLog10: 1,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: 'pw.warning.tooShort',
      suggestions: ['pw.suggestion.addWords'],
      meetsPolicy: false,
      hasMinLength: false,
      hasMaxBytes,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: true,
    };
  }

  if (!hasMaxBytes) {
    return {
      score: 0,
      label: TIER_CONFIG[0].labelKey,
      color: TIER_CONFIG[0].color,
      guessesLog10: 1,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: 'pw.warning.tooLong',
      suggestions: ['pw.suggestion.fewWords'],
      meetsPolicy: false,
      hasMinLength: true,
      hasMaxBytes: false,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: true,
    };
  }

  const lower = password.toLowerCase();

  // Check user inputs (e.g. email, name)
  for (const input of userInputs) {
    if (input && input.length >= 3 && lower.includes(input.toLowerCase())) {
      return {
        score: 0,
        label: TIER_CONFIG[0].labelKey,
        color: TIER_CONFIG[0].color,
        guessesLog10: 1,
        crackTimeDisplay: 'pw.crackTime.instant',
        warning: 'pw.warning.similarToCommon',
        suggestions: ['pw.suggestion.avoidPersonalDates'],
        meetsPolicy: false,
        hasMinLength,
        hasMaxBytes,
        hasUppercase,
        hasNumber,
        hasSymbol,
        isProvisional: true,
      };
    }
  }

  // Penalize single repeated character (e.g. "aaaaaaaa", "11111111")
  if (/^(.)\1+$/.test(password)) {
    return {
      score: 0,
      label: TIER_CONFIG[0].labelKey,
      color: TIER_CONFIG[0].color,
      guessesLog10: 1,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: 'pw.warning.repeatedChars',
      suggestions: ['pw.suggestion.avoidRepeats'],
      meetsPolicy: false,
      hasMinLength,
      hasMaxBytes,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: true,
    };
  }

  // Pure digits or keyboard walk
  if (/^\d+$/.test(password) || /^(qwerty|asdfgh|zxcvbn|123456)/i.test(password)) {
    return {
      score: 0,
      label: TIER_CONFIG[0].labelKey,
      color: TIER_CONFIG[0].color,
      guessesLog10: 2,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: 'pw.warning.sequences',
      suggestions: ['pw.suggestion.addWords'],
      meetsPolicy: false,
      hasMinLength,
      hasMaxBytes,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: true,
    };
  }

  // Passphrase heuristic: 20+ chars with spaces or multiple distinct words
  const words = password.trim().split(/[\s\-_]+/);
  if (password.length >= 20 && words.length >= 3) {
    return {
      score: 3,
      label: TIER_CONFIG[3].labelKey,
      color: TIER_CONFIG[3].color,
      guessesLog10: 8,
      crackTimeDisplay: 'pw.crackTime.centuries',
      warning: null,
      suggestions: [],
      meetsPolicy: true,
      hasMinLength,
      hasMaxBytes,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: true,
    };
  }

  // Conservative default: score 1 (weak) until zxcvbn resolves
  return {
    score: 1,
    label: TIER_CONFIG[1].labelKey,
    color: TIER_CONFIG[1].color,
    guessesLog10: 3,
    crackTimeDisplay: 'pw.crackTime.minutes',
    warning: 'pw.warning.similarToCommon',
    suggestions: ['pw.suggestion.addWords'],
    meetsPolicy: false,
    hasMinLength,
    hasMaxBytes,
    hasUppercase,
    hasNumber,
    hasSymbol,
    isProvisional: true,
  };
}

/**
 * Formats raw zxcvbn crack time display string into clean localized format key or string.
 */
function formatCrackTimeDisplay(rawDisplay?: string): string {
  if (!rawDisplay) return 'pw.crackTime.instant';
  const clean = rawDisplay.trim().toLowerCase();
  if (clean.includes('second')) return 'pw.crackTime.seconds';
  if (clean.includes('minute')) return 'pw.crackTime.minutes';
  if (clean.includes('hour')) return 'pw.crackTime.hours';
  if (clean.includes('day')) return 'pw.crackTime.days';
  if (clean.includes('month')) return 'pw.crackTime.months';
  if (clean.includes('year')) return 'pw.crackTime.years';
  if (clean.includes('centur')) return 'pw.crackTime.centuries';
  return rawDisplay;
}

/**
 * Synchronous password strength calculator.
 * If zxcvbn is initialized, runs full entropy estimation.
 * Otherwise returns conservative heuristic and triggers background loader.
 */
export function calculatePasswordStrength(
  password: string,
  userInputs: string[] = [],
): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'pw.tier.empty',
      color: 'var(--border, #334155)',
      guessesLog10: 0,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: null,
      suggestions: [],
      meetsPolicy: false,
      hasMinLength: false,
      hasMaxBytes: true,
      hasUppercase: false,
      hasNumber: false,
      hasSymbol: false,
      isEmpty: true,
      isProvisional: false,
    };
  }

  const byteLength = getUtf8ByteLength(password);
  const hasMinLength = password.length >= 8;
  const hasMaxBytes = byteLength <= 72;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9\s]/.test(password);

  if (!hasMinLength) {
    return {
      score: 0,
      label: TIER_CONFIG[0].labelKey,
      color: TIER_CONFIG[0].color,
      guessesLog10: 1,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: 'pw.warning.tooShort',
      suggestions: ['pw.suggestion.addWords'],
      meetsPolicy: false,
      hasMinLength: false,
      hasMaxBytes,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: false,
    };
  }

  if (!hasMaxBytes) {
    return {
      score: 0,
      label: TIER_CONFIG[0].labelKey,
      color: TIER_CONFIG[0].color,
      guessesLog10: 1,
      crackTimeDisplay: 'pw.crackTime.instant',
      warning: 'pw.warning.tooLong',
      suggestions: ['pw.suggestion.fewWords'],
      meetsPolicy: false,
      hasMinLength: true,
      hasMaxBytes: false,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: false,
    };
  }

  // If estimator is loaded, use it synchronously
  if (estimatorModule) {
    const result = estimatorModule.runEstimator(password, userInputs);
    const score = result.score as 0 | 1 | 2 | 3 | 4;
    const tier = TIER_CONFIG[score];
    const crackTimeRaw =
      result.crackTimes?.offlineSlowHashingXPerSecond?.display ||
      result.crackTimes?.onlineNoThrottlingXPerSecond?.display ||
      '';

    const meetsPolicy = score >= 3 && hasMinLength && hasMaxBytes;

    return {
      score,
      label: tier.labelKey,
      color: tier.color,
      guessesLog10: Math.round(result.guessesLog10 * 10) / 10,
      crackTimeDisplay: formatCrackTimeDisplay(crackTimeRaw),
      warning: mapWarning(result.feedback.warning),
      suggestions: mapSuggestions(result.feedback.suggestions),
      meetsPolicy,
      hasMinLength,
      hasMaxBytes,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isProvisional: false,
    };
  }

  // Otherwise, trigger background loading and return conservative heuristic
  loadEstimator().catch(() => {});
  return calculateHeuristicFallback(password, userInputs);
}

/**
 * Asynchronous password strength calculator ensuring the zxcvbn estimator is fully loaded.
 */
export async function calculatePasswordStrengthAsync(
  password: string,
  userInputs: string[] = [],
): Promise<PasswordStrength> {
  if (!estimatorModule) {
    await loadEstimator();
  }
  return calculatePasswordStrength(password, userInputs);
}
