import type { ComponentCategory, BuilderProduct } from '../components/builder/builderCatalog';
import type { BuildPurpose } from '../components/builder/buildConfig';
import type { BuildSelection } from '../components/builder/compatibility';

export const TONIMA_HANDOFF_KEY = 'pc-kinba.tonima-handoff';
export const TONIMA_HANDOFF_VERSION = 1;
export const TONIMA_HANDOFF_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export interface TonimaHandoffPart {
  productId?: string;
  listingId?: string;
  category: string;
  name: string;
  priceBDT: number;
  retailer: string;
}

export interface TonimaHandoff {
  version: 1;
  sessionId: string | null;
  createdAt: string;
  purpose: string | null;
  budgetBDT: number | null;
  totalBDT: number;
  parts: TonimaHandoffPart[];
}

/**
 * Maps an agent category label to a builder slot.
 */
export function toBuilderSlot(agentCategory: string): ComponentCategory | null {
  if (!agentCategory) return null;
  const normalized = agentCategory.trim().toLowerCase();

  if (normalized === 'cpu' || normalized === 'processor') return 'cpu';
  if (normalized === 'gpu' || normalized === 'graphics card') return 'gpu';
  if (normalized === 'motherboard' || normalized === 'mainboard') return 'motherboard';
  if (normalized === 'ram' || normalized === 'memory') return 'ram';
  if (normalized === 'storage' || normalized === 'ssd' || normalized === 'hdd') return 'storage';
  if (normalized === 'power supply' || normalized === 'psu') return 'psu';
  if (normalized === 'case' || normalized === 'casing' || normalized === 'chassis') return 'case';
  if (normalized === 'cooler' || normalized === 'cooling' || normalized === 'fan') return 'cooling';

  return null;
}

/**
 * Maps an agent purpose string to a BuildPurpose union.
 */
export function toBuilderPurpose(agentPurpose?: string | null): BuildPurpose {
  if (!agentPurpose) return 'Gaming';
  const norm = agentPurpose.trim().toLowerCase();

  switch (norm) {
    case 'gaming':
      return 'Gaming';
    case 'ai_ml':
    case 'ai/ml':
    case 'ai_workstation':
    case 'workstation':
      return 'AI/ML Workstation';
    case 'content_creation':
    case 'editing':
    case 'video_editing':
      return 'Content Creation';
    case 'streaming':
      return 'Streaming';
    case 'office':
    case 'productivity':
    case 'general':
      return 'Office/Productivity';
    default:
      return 'Gaming';
  }
}

/**
 * Normalizes a string for comparison.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Words that say what kind of part something is rather than which part it is. They are
 * dropped before comparison so "Cooler Master Hyper 212" and "DeepCool AK400 Cooler"
 * do not look similar merely because both end in "cooler".
 */
const DESCRIPTOR_TOKENS = new Set([
  'the',
  'with',
  'and',
  'for',
  'pc',
  'desktop',
  'gaming',
  'gamer',
  'edition',
  'series',
  'retail',
  'box',
  'boxed',
  'bulk',
  'processor',
  'cpu',
  'graphics',
  'card',
  'gpu',
  'memory',
  'module',
  'kit',
  'ram',
  'cooler',
  'cooling',
  'fan',
  'power',
  'supply',
  'psu',
  'unit',
  'casing',
  'case',
  'chassis',
  'ssd',
  'hdd',
  'drive',
  'motherboard',
  'mainboard',
  'internal',
  'new',
]);

function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length > 1 && !DESCRIPTOR_TOKENS.has(token));
}

/**
 * Similarity of two product names, 0 (no relation) to 1 (same part).
 *
 * Retailer listings and catalog entries rarely spell a part the same way — the agent may
 * return "RTX 4070 Super 12GB" for a catalog row called "Gigabyte GeForce RTX 4070 SUPER
 * WINDFORCE OC 12G" — so plain substring matching finds nothing. Worse, substring
 * matching happily pairs "RTX 4060" with "RTX 4060 Ti". Token overlap fixes the first
 * problem; requiring the model identifiers to agree fixes the second.
 */
function nameSimilarity(targetName: string, candidateName: string): number {
  const target = tokenizeName(targetName);
  const candidate = tokenizeName(candidateName);
  if (target.length === 0 || candidate.length === 0) return 0;

  const candidateSet = new Set(candidate);
  const shared = target.filter((token) => candidateSet.has(token));
  if (shared.length === 0) return 0;

  // A token with a run of three or more digits is a model identifier (4070, 13600k,
  // 12400f, 750w) rather than a family name like "i5" or "DDR5". Every one of them has
  // to appear on the other side, or these are two different parts that merely share a
  // brand — an RTX 4060 must never be accepted as an RTX 4070.
  const targetModelTokens = target.filter((token) => /\d{3,}/.test(token));
  if (!targetModelTokens.every((token) => candidateSet.has(token))) {
    return 0;
  }

  return shared.length / Math.min(target.length, candidate.length);
}

/** Below this, two names are treated as different parts. */
const NAME_MATCH_THRESHOLD = 0.5;

/**
 * Resolves handoff parts against the builder catalog.
 */
export function resolveHandoffParts(
  parts: TonimaHandoffPart[],
  catalogById: Map<string, BuilderProduct>,
  forSlot?: (slot: ComponentCategory) => BuilderProduct[],
): {
  selection: BuildSelection;
  resolved: TonimaHandoffPart[];
  unresolved: TonimaHandoffPart[];
} {
  const selection: BuildSelection = {};
  const resolved: TonimaHandoffPart[] = [];
  const unresolved: TonimaHandoffPart[] = [];

  for (const part of parts) {
    const rawSlot = toBuilderSlot(part.category);
    if (!rawSlot) {
      unresolved.push(part);
      continue;
    }

    // Determine target slot (assign 2nd storage to storage2)
    const slot: ComponentCategory =
      rawSlot === 'storage' && selection.storage ? 'storage2' : rawSlot;

    // Check if slot already populated
    if (selection[slot]) {
      unresolved.push(part);
      continue;
    }

    let matchedProduct: BuilderProduct | undefined;

    // (a) Exact productId hit
    if (part.productId && catalogById.has(part.productId)) {
      matchedProduct = catalogById.get(part.productId);
    }

    // (b) Exact listingId hit
    if (!matchedProduct && part.listingId && catalogById.has(part.listingId)) {
      matchedProduct = catalogById.get(part.listingId);
    }

    // (c) Name match against the candidates for this slot
    if (!matchedProduct) {
      const candidates: BuilderProduct[] = forSlot
        ? forSlot(rawSlot)
        : Array.from(catalogById.values()).filter((p) => p.category === rawSlot);

      const targetNorm = normalizeName(part.name);
      // Try exact normalized match
      matchedProduct = candidates.find((c) => normalizeName(c.name) === targetNorm);

      // Otherwise take the best token-overlap match above the threshold
      if (!matchedProduct) {
        let bestScore = 0;
        for (const candidate of candidates) {
          const score = nameSimilarity(part.name, candidate.name);
          if (score > bestScore) {
            bestScore = score;
            matchedProduct = candidate;
          }
        }
        if (bestScore < NAME_MATCH_THRESHOLD) {
          matchedProduct = undefined;
        }
      }
    }

    if (matchedProduct) {
      selection[slot] = matchedProduct;
      resolved.push(part);
    } else {
      unresolved.push(part);
    }
  }

  return { selection, resolved, unresolved };
}

/**
 * Saves Tonima handoff data to localStorage.
 */
export function saveTonimaHandoff(handoff: TonimaHandoff): boolean {
  try {
    localStorage.setItem(TONIMA_HANDOFF_KEY, JSON.stringify(handoff));
    return true;
  } catch (err) {
    console.warn('[Tonima Handoff] Storage write failed:', err);
    return false;
  }
}

/**
 * Loads and validates Tonima handoff data from localStorage.
 */
export function loadTonimaHandoff(): TonimaHandoff | null {
  try {
    const raw = localStorage.getItem(TONIMA_HANDOFF_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as TonimaHandoff;
    if (!data || data.version !== TONIMA_HANDOFF_VERSION) return null;

    const createdTime = new Date(data.createdAt).getTime();
    if (isNaN(createdTime) || Date.now() - createdTime > TONIMA_HANDOFF_MAX_AGE_MS) {
      // Stale handoff (> 30 min)
      clearTonimaHandoff();
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[Tonima Handoff] Storage read failed:', err);
    return null;
  }
}

/**
 * Deletes Tonima handoff data from localStorage.
 */
export function clearTonimaHandoff(): void {
  try {
    localStorage.removeItem(TONIMA_HANDOFF_KEY);
  } catch {
    // Ignore storage deletion errors
  }
}
