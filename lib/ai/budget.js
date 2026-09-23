/**
 * PC-KINBA AI Budget Allocation — Tonima AI adapter.
 *
 * ---------------------------------------------------------------------------
 * The purpose weights and the allocation maths live in `@pc-kinba/compat-rules`
 * (packages/compat-rules/src/budget.ts). Do NOT add a second copy of the table
 * here — the builder's `BUDGET_SPLIT` and this module's `PURPOSE_BUDGET_WEIGHTS`
 * were byte-identical tables under two names, which is exactly the drift this
 * package exists to prevent.
 * ---------------------------------------------------------------------------
 */

import {
  allocateSubBudgets as sharedAllocateSubBudgets,
  PURPOSE_BUDGET_SPLIT
} from "@pc-kinba/compat-rules";

/**
 * Per-purpose budget weights, keyed by the AI-facing purpose vocabulary
 * ('gaming' | 'content_creation' | 'office' | 'streaming' | 'ai_ml' | 'general').
 */
export const PURPOSE_BUDGET_WEIGHTS = PURPOSE_BUDGET_SPLIT;

/**
 * Single source of truth for budget tolerance in Tonima AI agent.
 * Budget is a hard constraint: 0% tolerance.
 */
export const BUDGET_TOLERANCE = 0;

/**
 * Allocates a budget across component categories.
 *
 * @param {string} purpose - 'ai_ml'|'gaming'|'content_creation'|'streaming'|'office'|'general'
 * @param {number} totalBudgetBDT - Total target budget in BDT
 * @param {Object} [constraints] - Accepted for call-site compatibility; unused.
 * @returns {Record<string, { target: number, min: number, max: number }>}
 */
export function allocateSubBudgets(purpose, totalBudgetBDT, constraints = {}) {
  void constraints;
  return sharedAllocateSubBudgets(purpose, totalBudgetBDT);
}

/**
 * Returns the allowed budget ceiling (hard 0% tolerance).
 *
 * @param {number} budgetBDT
 * @returns {number}
 */
export function getBudgetCeiling(budgetBDT) {
  if (!budgetBDT || budgetBDT <= 0) return Infinity;
  return Math.floor(budgetBDT * (1 + BUDGET_TOLERANCE));
}

/**
 * Checks whether total build cost is within the target budget ceiling.
 *
 * @param {number} totalBDT
 * @param {number} budgetBDT
 * @returns {boolean}
 */
export function isWithinBudget(totalBDT, budgetBDT) {
  return totalBDT <= getBudgetCeiling(budgetBDT);
}
