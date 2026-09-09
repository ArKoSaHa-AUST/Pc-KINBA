import type { BuySignal } from '../../api/priceHistory';
import { BUDGET_SPLIT, pickFor, suggestDowngrades, type CoreSlot } from './autoBuild';
import { formatTaka, type BuildPurpose } from './buildConfig';
import {
  COMPONENT_CATEGORIES,
  type BuilderProduct,
  type ComponentCategory,
} from './builderCatalog';
import {
  checkCompatibility,
  estimatePowerDraw,
  totalPriceOf,
  type BuildSelection,
} from './compatibility';

/**
 * Rule-based build optimizer. Every rule is a pure `OptimizerContext → Suggestion[]`; the
 * Tonima AI agent can later plug in as one more producer of the same `Suggestion` shape.
 */

export type SuggestionKind = 'downgrade' | 'bottleneck' | 'missing' | 'value' | 'buy' | 'wait';

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  message: string;
  /** One-click swap / add. Absent for advice-only suggestions (buy timing). */
  apply?: { slot: ComponentCategory; product: BuilderProduct };
  /** Cheapest live offer, for "buy now". */
  href?: string;
}

export interface OptimizerContext {
  build: BuildSelection;
  budget: number;
  purpose: BuildPurpose;
  catalog: BuilderProduct[];
  /** Buy signals keyed by product id; missing while loading or for curated parts. */
  signals: Record<string, BuySignal | undefined>;
}

const MAX_SUGGESTIONS = 5;
/** A swap counts as "same performance" within this many score points. */
const SAME_PERF_TOLERANCE = 5;
const MIN_SAVING = 1000;
/** Filled core slots before the "almost there" nudge kicks in. */
const NEARLY_COMPLETE_AT = 5;

const cheapest = (products: BuilderProduct[]) => [...products].sort((a, b) => a.price - b.price)[0];
const fits = (p: BuilderProduct, build: BuildSelection, slot: ComponentCategory) =>
  checkCompatibility(p, build, slot).status !== 'incompatible';
const parts = (build: BuildSelection) =>
  Object.entries(build).filter((e): e is [ComponentCategory, BuilderProduct] => !!e[1]);

function overBudget({ build, budget, catalog }: OptimizerContext): Suggestion[] {
  const over = totalPriceOf(build) - budget;
  return suggestDowngrades(build, budget, catalog).map((d) => ({
    id: `downgrade-${d.to.id}`,
    kind: 'downgrade',
    message: `You're ${formatTaka(over)} over budget. Swapping ${d.from.name} for ${d.to.name} saves ${formatTaka(d.saves)}.`,
    apply: { slot: d.slot, product: d.to },
  }));
}

function bottleneck({ build, catalog }: OptimizerContext): Suggestion[] {
  const { cpu, gpu } = build;
  if (!cpu || !gpu || gpu.performanceScore - cpu.performanceScore < 20) return [];
  const upgrade = cheapest(
    catalog.filter(
      (p) =>
        p.category === 'cpu' &&
        p.id !== cpu.id &&
        p.performanceScore >= gpu.performanceScore - 10 &&
        fits(p, build, 'cpu'),
    ),
  );
  if (!upgrade) return [];
  return [
    {
      id: `bottleneck-${upgrade.id}`,
      kind: 'bottleneck',
      message: `Your ${cpu.name} may bottleneck the ${gpu.name}. Consider upgrading to the ${upgrade.name}.`,
      apply: { slot: 'cpu', product: upgrade },
    },
  ];
}

function missingParts({ build, budget, purpose, catalog }: OptimizerContext): Suggestion[] {
  const { cpu, gpu, psu, cooling } = build;
  const out: Suggestion[] = [];
  const add = (slot: ComponentCategory, product: BuilderProduct, message: string) =>
    out.push({ id: `missing-${product.id}`, kind: 'missing', message, apply: { slot, product } });

  if (cpu && (cpu.tdp ?? 0) > 105 && !cooling) {
    const cooler = cheapest(
      catalog.filter(
        (p) =>
          p.category === 'cooling' &&
          p.performanceScore >= ((cpu.tdp ?? 0) > 200 ? 75 : 50) &&
          fits(p, build, 'cooling'),
      ),
    );
    if (cooler) {
      add(
        'cooling',
        cooler,
        `Add a CPU cooler — the ${cpu.name} runs at ${cpu.tdp}W. The ${cooler.name} is a solid fit.`,
      );
    }
  }

  if ((cpu || gpu) && !psu) {
    const draw = estimatePowerDraw(build);
    const unit = cheapest(
      catalog.filter((p) => p.category === 'psu' && (p.wattage ?? 0) >= draw * 1.3),
    );
    if (unit) {
      add(
        'psu',
        unit,
        `Your build draws ~${draw}W but has no PSU yet. The ${unit.name} gives comfortable headroom.`,
      );
    }
  }

  // Nearly complete: fill the remaining core slots this purpose actually needs.
  const split = BUDGET_SPLIT[purpose];
  const share = (slot: ComponentCategory) => split[slot as CoreSlot] ?? 0;
  const filled = COMPONENT_CATEGORIES.filter((c) => build[c.id]).length;
  const missing = COMPONENT_CATEGORIES.filter((c) => !build[c.id] && share(c.id) > 0);
  if (filled < NEARLY_COMPLETE_AT || missing.length === 0) return out;

  const remaining = budget - totalPriceOf(build);
  const missingShare = missing.reduce((sum, c) => sum + share(c.id), 0);
  for (const c of missing) {
    const pick = pickFor(
      c.id,
      (Math.max(0, remaining) * share(c.id)) / missingShare,
      build,
      catalog,
    );
    if (!pick) continue;
    add(
      c.id,
      pick,
      `Almost there — ${missing.length} slot${missing.length > 1 ? 's' : ''} left. Add a ${c.label}: the ${pick.name} (${formatTaka(pick.price)}) ${
        pick.price <= remaining ? 'fits your remaining budget' : 'is the cheapest compatible pick'
      }.`,
    );
  }
  return out;
}

/** Same performance for ৳X less, in every category. */
function sameForLess({ build, catalog }: OptimizerContext): Suggestion[] {
  const swaps: { saves: number; suggestion: Suggestion }[] = [];
  for (const [slot, from] of parts(build)) {
    const alt = cheapest(
      catalog.filter(
        (p) =>
          p.category === from.category &&
          p.id !== from.id &&
          p.ramType === from.ramType &&
          p.price <= from.price - Math.max(MIN_SAVING, from.price * 0.05) &&
          p.performanceScore >= from.performanceScore - SAME_PERF_TOLERANCE &&
          fits(p, build, slot),
      ),
    );
    if (!alt) continue;
    const saves = from.price - alt.price;
    swaps.push({
      saves,
      suggestion: {
        id: `value-${alt.id}`,
        kind: 'value',
        message: `Same performance for ${formatTaka(saves)} less — ${alt.name} instead of ${from.name}.`,
        apply: { slot, product: alt },
      },
    });
  }
  return swaps.sort((a, b) => b.saves - a.saves).map((s) => s.suggestion);
}

function buyTiming({ build, signals }: OptimizerContext): Suggestion[] {
  const out: Suggestion[] = [];
  for (const [, p] of parts(build)) {
    const s = signals[p.id];
    if (s?.signal !== 'buy' && s?.signal !== 'wait') continue;
    out.push({
      id: `${s.signal}-${p.id}`,
      kind: s.signal,
      message: `${p.name}: ${s.reason}`,
      href: s.signal === 'buy' ? p.listings?.[0]?.url : undefined,
    });
  }
  return out;
}

const RULES = [overBudget, bottleneck, missingParts, sameForLess, buyTiming];

/** Runs every rule in priority order, keeping at most one actionable suggestion per slot. */
export function getSuggestions(ctx: OptimizerContext): Suggestion[] {
  const out: Suggestion[] = [];
  const taken = new Set<ComponentCategory>();
  for (const rule of RULES) {
    for (const s of rule(ctx)) {
      if (s.apply) {
        if (taken.has(s.apply.slot)) continue;
        taken.add(s.apply.slot);
      }
      out.push(s);
    }
  }
  return out.slice(0, MAX_SUGGESTIONS);
}
