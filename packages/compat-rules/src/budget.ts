import type { CompatCategory } from './types.js';

/**
 * Purpose-driven budget allocation, shared by the builder's auto-build and the
 * Tonima AI retriever.
 *
 * These weights previously existed as two byte-identical tables under two different
 * names (`BUDGET_SPLIT` in client/src/components/builder/autoBuild.ts and
 * `PURPOSE_BUDGET_WEIGHTS` in lib/ai/budget.js) keyed by two different purpose
 * vocabularies. This is the one table; the two vocabularies are now explicit
 * mappings onto it.
 */

/** Canonical purpose vocabulary (the AI-facing one; it has the extra `general` bucket). */
export type CanonicalPurpose =
  | 'gaming'
  | 'content_creation'
  | 'office'
  | 'streaming'
  | 'ai_ml'
  | 'general';

/** The builder UI's purpose vocabulary. */
export type BuilderPurpose =
  | 'Gaming'
  | 'Content Creation'
  | 'Office/Productivity'
  | 'Streaming'
  | 'AI/ML Workstation';

/** Slots a budget is split across. Uses the canonical `cooler`, not the builder's `cooling`. */
export type BudgetSlot = Extract<
  CompatCategory,
  'cpu' | 'gpu' | 'motherboard' | 'ram' | 'storage' | 'psu' | 'case' | 'cooler'
>;

export type BudgetSplit = Record<BudgetSlot, number>;

/** Each row sums to 1.0. A weight of 0 means "this purpose does not buy that part". */
export const PURPOSE_BUDGET_SPLIT: Record<CanonicalPurpose, BudgetSplit> = {
  ai_ml: {
    cpu: 0.17,
    gpu: 0.45,
    motherboard: 0.1,
    ram: 0.09,
    storage: 0.07,
    psu: 0.05,
    case: 0.04,
    cooler: 0.03,
  },
  gaming: {
    cpu: 0.2,
    gpu: 0.4,
    motherboard: 0.11,
    ram: 0.07,
    storage: 0.07,
    psu: 0.06,
    case: 0.05,
    cooler: 0.04,
  },
  content_creation: {
    cpu: 0.25,
    gpu: 0.3,
    motherboard: 0.11,
    ram: 0.1,
    storage: 0.1,
    psu: 0.05,
    case: 0.05,
    cooler: 0.04,
  },
  streaming: {
    cpu: 0.22,
    gpu: 0.35,
    motherboard: 0.11,
    ram: 0.09,
    storage: 0.07,
    psu: 0.06,
    case: 0.05,
    cooler: 0.05,
  },
  office: {
    cpu: 0.35,
    gpu: 0.0,
    motherboard: 0.2,
    ram: 0.12,
    storage: 0.15,
    psu: 0.08,
    case: 0.1,
    cooler: 0.0,
  },
  general: {
    cpu: 0.22,
    gpu: 0.3,
    motherboard: 0.13,
    ram: 0.1,
    storage: 0.1,
    psu: 0.06,
    case: 0.05,
    cooler: 0.04,
  },
};

const BUILDER_TO_CANONICAL: Record<BuilderPurpose, CanonicalPurpose> = {
  Gaming: 'gaming',
  'Content Creation': 'content_creation',
  'Office/Productivity': 'office',
  Streaming: 'streaming',
  'AI/ML Workstation': 'ai_ml',
};

const CANONICAL_TO_BUILDER: Record<CanonicalPurpose, BuilderPurpose | undefined> = {
  gaming: 'Gaming',
  content_creation: 'Content Creation',
  office: 'Office/Productivity',
  streaming: 'Streaming',
  ai_ml: 'AI/ML Workstation',
  // The builder has no "general" purpose. Returning undefined rather than silently
  // picking one keeps the gap visible; callers choose their own default.
  general: undefined,
};

export function builderPurposeToCanonical(purpose: BuilderPurpose): CanonicalPurpose {
  return BUILDER_TO_CANONICAL[purpose] ?? 'general';
}

/** Returns `undefined` for `general`, which has no builder equivalent. */
export function canonicalToBuilderPurpose(purpose: CanonicalPurpose): BuilderPurpose | undefined {
  return CANONICAL_TO_BUILDER[purpose];
}

export function isCanonicalPurpose(value: string): value is CanonicalPurpose {
  return Object.prototype.hasOwnProperty.call(PURPOSE_BUDGET_SPLIT, value);
}

export function budgetSplitFor(purpose: string): BudgetSplit {
  return PURPOSE_BUDGET_SPLIT[isCanonicalPurpose(purpose) ? purpose : 'general'];
}

export interface SubBudget {
  target: number;
  min: number;
  max: number;
}

/** Retrieval band around each slot's target: -35% / +45%. */
export const SUB_BUDGET_MIN_RATIO = 0.65;
export const SUB_BUDGET_MAX_RATIO = 1.45;
export const SUB_BUDGET_FLOOR_BDT = 1000;
export const DEFAULT_TOTAL_BUDGET_BDT = 120000;

/** Splits a total budget into per-slot target/min/max bands. */
export function allocateSubBudgets(
  purpose: string,
  totalBudgetBDT: number,
): Record<BudgetSlot, SubBudget> {
  const weights = budgetSplitFor(purpose);
  const base = totalBudgetBDT > 0 ? totalBudgetBDT : DEFAULT_TOTAL_BUDGET_BDT;

  const allocation = {} as Record<BudgetSlot, SubBudget>;

  for (const [slot, weight] of Object.entries(weights) as Array<[BudgetSlot, number]>) {
    if (weight === 0) {
      allocation[slot] = { target: 0, min: 0, max: 0 };
      continue;
    }
    const target = Math.round(base * weight);
    allocation[slot] = {
      target,
      min: Math.max(SUB_BUDGET_FLOOR_BDT, Math.round(target * SUB_BUDGET_MIN_RATIO)),
      max: Math.round(target * SUB_BUDGET_MAX_RATIO),
    };
  }

  return allocation;
}
