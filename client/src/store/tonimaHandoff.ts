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

    // (c) Normalized name match in candidates for this slot
    if (!matchedProduct) {
      const candidates: BuilderProduct[] = forSlot
        ? forSlot(rawSlot)
        : Array.from(catalogById.values()).filter((p) => p.category === rawSlot);

      const targetNorm = normalizeName(part.name);
      // Try exact normalized match
      matchedProduct = candidates.find((c) => normalizeName(c.name) === targetNorm);

      // Try inclusion match if not found
      if (!matchedProduct) {
        matchedProduct = candidates.find(
          (c) =>
            normalizeName(c.name).includes(targetNorm) ||
            targetNorm.includes(normalizeName(c.name)),
        );
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
