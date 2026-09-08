import type { BuildPurpose } from './buildConfig';
import type { BuilderProduct, ComponentCategory } from './builderCatalog';
import { checkCompatibility, totalPriceOf, type BuildSelection } from './compatibility';

type CoreSlot = 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'storage' | 'psu' | 'case' | 'cooling';

/** Share of the total budget each slot should get, per purpose (sums to 1). */
export const BUDGET_SPLIT: Record<BuildPurpose, Record<CoreSlot, number>> = {
  Gaming: {
    cpu: 0.2,
    gpu: 0.4,
    motherboard: 0.11,
    ram: 0.07,
    storage: 0.07,
    psu: 0.06,
    case: 0.05,
    cooling: 0.04,
  },
  'Content Creation': {
    cpu: 0.25,
    gpu: 0.3,
    motherboard: 0.11,
    ram: 0.1,
    storage: 0.1,
    psu: 0.05,
    case: 0.05,
    cooling: 0.04,
  },
  'Office/Productivity': {
    cpu: 0.35,
    gpu: 0,
    motherboard: 0.2,
    ram: 0.12,
    storage: 0.15,
    psu: 0.08,
    case: 0.1,
    cooling: 0,
  },
  Streaming: {
    cpu: 0.22,
    gpu: 0.35,
    motherboard: 0.11,
    ram: 0.09,
    storage: 0.07,
    psu: 0.06,
    case: 0.05,
    cooling: 0.05,
  },
  'AI/ML Workstation': {
    cpu: 0.17,
    gpu: 0.45,
    motherboard: 0.1,
    ram: 0.09,
    storage: 0.07,
    psu: 0.05,
    case: 0.04,
    cooling: 0.03,
  },
};

/** Fill order: platform first so later picks can be checked against socket / RAM type / power. */
const FILL_ORDER: CoreSlot[] = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooling',
  'storage',
];

const compatible = (p: BuilderProduct, build: BuildSelection, slot: ComponentCategory) =>
  checkCompatibility(p, build, slot).status !== 'incompatible';

/** Best-scoring compatible part at or under `cap`; falls back to the cheapest compatible part. */
function pickFor(
  slot: CoreSlot,
  cap: number,
  build: BuildSelection,
  catalog: BuilderProduct[],
): BuilderProduct | undefined {
  const candidates = catalog.filter((p) => p.category === slot && compatible(p, build, slot));
  const within = candidates.filter((p) => p.price <= cap);
  if (within.length) {
    return within.sort((a, b) => b.performanceScore - a.performanceScore || a.price - b.price)[0];
  }
  return candidates.sort((a, b) => a.price - b.price)[0];
}

/** Fills every empty core slot within the remaining budget using the purpose's allocation. */
export function autoBuild(
  build: BuildSelection,
  budget: number,
  purpose: BuildPurpose,
  catalog: BuilderProduct[],
): BuildSelection {
  const split = BUDGET_SPLIT[purpose];
  const next: BuildSelection = { ...build };
  const empty = FILL_ORDER.filter((slot) => !next[slot] && split[slot] > 0);
  const emptyShare = empty.reduce((sum, slot) => sum + split[slot], 0);
  let remaining = budget - totalPriceOf(next);

  for (const slot of empty) {
    // Scale this slot's share to what's actually left, then let unspent money roll forward.
    const cap = emptyShare > 0 ? remaining * (split[slot] / emptyShare) : remaining;
    const pick = pickFor(slot, cap, next, catalog);
    if (!pick) continue;
    next[slot] = pick;
    remaining -= pick.price;
  }
  return next;
}

export interface Downgrade {
  slot: ComponentCategory;
  from: BuilderProduct;
  to: BuilderProduct;
  saves: number;
}

/** Cheapest-loss swaps (largest saving per performance point) until the build fits the budget. */
export function suggestDowngrades(
  build: BuildSelection,
  budget: number,
  catalog: BuilderProduct[],
  max = 3,
): Downgrade[] {
  const over = totalPriceOf(build) - budget;
  if (over <= 0) return [];

  const options: Downgrade[] = [];
  for (const [slot, from] of Object.entries(build) as [ComponentCategory, BuilderProduct][]) {
    const rest: BuildSelection = { ...build };
    delete rest[slot];
    const alt = catalog
      .filter(
        (p) => p.category === from.category && p.price < from.price && compatible(p, rest, slot),
      )
      .map((to) => ({ slot, from, to, saves: from.price - to.price }))
      .filter((d) => d.saves >= Math.min(over, 2000))
      .sort(
        (a, b) =>
          b.saves / Math.max(1, from.performanceScore - b.to.performanceScore) -
          a.saves / Math.max(1, from.performanceScore - a.to.performanceScore),
      )[0];
    if (alt) options.push(alt);
  }
  return options.sort((a, b) => b.saves - a.saves).slice(0, max);
}
