import type { AppLanguage } from './index';

const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-BD',
  bn: 'bn-BD',
};

function resolveLocale(language?: string): string {
  return language && typeof language === 'string' && language.startsWith('bn')
    ? LOCALE_MAP.bn
    : LOCALE_MAP.en;
}

/**
 * Format a number as Bangladeshi Taka (৳) with correct thousands separators.
 * Uses Bengali numerals when the active language is Bangla.
 *
 * @param amount   Price value in BDT.
 * @param language Active app language ('en' | 'bn').
 */
export function formatBDT(amount: number, language: string): string {
  return new Intl.NumberFormat(resolveLocale(language), {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'symbol',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a plain number with locale-aware separators/numerals (no currency).
 *
 * @param value    Number to format.
 * @param language Active app language ('en' | 'bn').
 */
export function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(resolveLocale(language)).format(value);
}

/**
 * Format a date using the active locale (Bengali calendar numerals for bn).
 *
 * @param date     Date or timestamp to format.
 * @param language Active app language ('en' | 'bn').
 * @param options  Optional Intl.DateTimeFormat overrides.
 */
export function formatDate(
  date: Date | number | string,
  language: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(resolveLocale(language), options).format(value);
}
