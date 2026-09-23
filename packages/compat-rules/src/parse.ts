import { FORM_FACTOR_RANK } from './constants.js';
import type { FormFactor, MemoryType, PsuFormFactor, Socket, StorageInterface } from './types.js';

/**
 * Tolerant parsers that turn the many spellings retailers use into canonical values.
 *
 * All of them return `undefined` rather than a default when the input is uninformative.
 * That is deliberate: a guessed value presented as a fact is how a compatibility engine
 * passes a build it has never actually checked.
 */

const FORM_FACTOR_ALIASES: Array<[RegExp, FormFactor]> = [
  // Order matters: E-ATX and Micro-ATX both contain 'ATX', Mini-ITX contains 'ITX'.
  [/\b(E[-\s]?ATX|EATX|EXTENDED[-\s]?ATX)\b/i, 'E-ATX'],
  [/\b(MICRO[-\s]?ATX|M[-\s]?ATX|MATX|UATX|[µμ]ATX)\b/i, 'mATX'],
  [/\b(MINI[-\s]?ITX|ITX)\b/i, 'ITX'],
  [/\bATX\b/i, 'ATX'],
];

export function parseFormFactor(raw: string | null | undefined): FormFactor | undefined {
  if (!raw) return undefined;
  for (const [pattern, canonical] of FORM_FACTOR_ALIASES) {
    if (pattern.test(raw)) return canonical;
  }
  return undefined;
}

export function formFactorRank(ff: FormFactor | undefined): number | undefined {
  return ff === undefined ? undefined : FORM_FACTOR_RANK[ff];
}

/**
 * Does a board of `board` form factor fit a case rated for `caseFf`?
 * Returns `undefined` when either side is unknown.
 */
export function formFactorFits(
  board: FormFactor | undefined,
  caseFf: FormFactor | undefined,
): boolean | undefined {
  const b = formFactorRank(board);
  const c = formFactorRank(caseFf);
  if (b === undefined || c === undefined) return undefined;
  return b <= c;
}

export function parseSocket(raw: string | null | undefined): Socket | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim().toUpperCase();
  if (!trimmed || trimmed === 'UNKNOWN' || trimmed === 'N/A' || trimmed === '-') return undefined;
  return trimmed;
}

export function parseMemoryType(raw: string | null | undefined): MemoryType | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase();
  if (upper.includes('DDR5')) return 'DDR5';
  if (upper.includes('DDR4')) return 'DDR4';
  if (upper.includes('DDR3')) return 'DDR3';
  return undefined;
}

export function parsePsuFormFactor(raw: string | null | undefined): PsuFormFactor | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase();
  if (/\bSFX\b/.test(upper)) return 'SFX';
  if (/\bATX\b/.test(upper)) return 'ATX';
  return undefined;
}

export function parseStorageInterface(
  raw: string | null | undefined,
): StorageInterface | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase();
  if (/\bNVME\b|\bM\.?2\b|\bPCIE\b/.test(upper)) return 'nvme';
  if (/\bSATA\b/.test(upper)) return 'sata';
  return undefined;
}

/** Parses a wattage from free text such as 'Corsair RM750e 750W 80+ Gold'. */
export function parseWattage(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  const match = String(raw).match(/(\d{3,4})\s*W\b/i);
  if (match) {
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return undefined;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** 'YYYY-MM' strings compare lexicographically, which is all the BIOS rule needs. */
export function isValidYearMonth(raw: string | null | undefined): raw is string {
  return typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw);
}
