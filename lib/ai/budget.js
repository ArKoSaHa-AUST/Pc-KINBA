/**
 * PC-KINBA AI Budget Allocation Heuristics
 * Calculates target sub-budgets and min/max bounds per component category.
 */

export const PURPOSE_BUDGET_WEIGHTS = {
  ai_ml: {
    cpu: 0.17,
    gpu: 0.45,
    motherboard: 0.10,
    ram: 0.09,
    storage: 0.07,
    psu: 0.05,
    case: 0.04,
    cooler: 0.03
  },
  gaming: {
    cpu: 0.20,
    gpu: 0.40,
    motherboard: 0.11,
    ram: 0.07,
    storage: 0.07,
    psu: 0.06,
    case: 0.05,
    cooler: 0.04
  },
  content_creation: {
    cpu: 0.25,
    gpu: 0.30,
    motherboard: 0.11,
    ram: 0.10,
    storage: 0.10,
    psu: 0.05,
    case: 0.05,
    cooler: 0.04
  },
  streaming: {
    cpu: 0.22,
    gpu: 0.35,
    motherboard: 0.11,
    ram: 0.09,
    storage: 0.07,
    psu: 0.06,
    case: 0.05,
    cooler: 0.05
  },
  office: {
    cpu: 0.35,
    gpu: 0.00,
    motherboard: 0.20,
    ram: 0.12,
    storage: 0.15,
    psu: 0.08,
    case: 0.10,
    cooler: 0.00
  },
  general: {
    cpu: 0.22,
    gpu: 0.30,
    motherboard: 0.13,
    ram: 0.10,
    storage: 0.10,
    psu: 0.06,
    case: 0.05,
    cooler: 0.04
  }
};

/**
 * Allocates budget across component categories.
 * 
 * @param {string} purpose - 'ai_ml'|'gaming'|'content_creation'|'streaming'|'office'|'general'
 * @param {number} totalBudgetBDT - Total target budget in BDT
 * @param {Object} [constraints]
 * @returns {Record<string, { target: number, min: number, max: number }>}
 */
export function allocateSubBudgets(purpose, totalBudgetBDT, constraints = {}) {
  const normalizedPurpose = PURPOSE_BUDGET_WEIGHTS[purpose] ? purpose : "general";
  const weights = PURPOSE_BUDGET_WEIGHTS[normalizedPurpose];

  // Default fallback budget if user did not specify one
  const baseBudget = totalBudgetBDT > 0 ? totalBudgetBDT : 120000;
  
  const allocation = {};

  for (const [category, weight] of Object.entries(weights)) {
    if (weight === 0) {
      allocation[category] = { target: 0, min: 0, max: 0 };
      continue;
    }

    const target = Math.round(baseBudget * weight);
    // Allow ±25% margin around target for retrieval candidates
    const min = Math.max(1000, Math.round(target * 0.65));
    const max = Math.round(target * 1.45);

    allocation[category] = { target, min, max };
  }

  return allocation;
}

/**
 * Returns allowed budget ceiling including 3% tolerance.
 * @param {number} budgetBDT 
 * @returns {number}
 */
export function getBudgetCeiling(budgetBDT) {
  if (!budgetBDT || budgetBDT <= 0) return Infinity;
  return Math.round(budgetBDT * 1.03);
}
