import { groqJson, MODELS } from "./llm.js";
import { retrieveCandidates } from "./retriever.js";
import { validateBuild } from "./validator.js";
import { planBuild, enforceBudgetCeiling } from "./planner.js";
import { getBudgetCeiling } from "./budget.js";

const REFINER_SYSTEM_PROMPT = `You parse follow-up refinement and part-swap requests for an existing PC build.
Extract the operation into JSON matching:
{
  "op": "replace" | "downgrade" | "upgrade" | "budget_adjust" | "custom",
  "category": "cpu" | "gpu" | "motherboard" | "ram" | "storage" | "psu" | "case" | "cooler",
  "query": string (e.g. "RTX 4060", "64GB DDR5", "360mm AIO", "Ryzen 7 7800X3D"),
  "budget_delta": number (optional, e.g. -5000 if user wants to save 5000)
}
Examples:
- "Swap GPU to RTX 4060" -> { "op": "replace", "category": "gpu", "query": "RTX 4060" }
- "Downgrade RAM to save 5000" -> { "op": "downgrade", "category": "ram", "query": "16GB", "budget_delta": -5000 }
- "Upgrade to 64GB RAM" -> { "op": "upgrade", "category": "ram", "query": "64GB" }
- "Change cooler to 360mm liquid cooler" -> { "op": "replace", "category": "cooler", "query": "360mm AIO" }`;

/**
 * Fallback regex refinement parser.
 */
function parseRefineRegex(message = "") {
  const text = message.toLowerCase();

  if (/4060/i.test(text)) {
    return { op: "replace", category: "gpu", query: "RTX 4060" };
  }
  if (/4080/i.test(text)) {
    return { op: "upgrade", category: "gpu", query: "RTX 4080" };
  }
  if (/4070/i.test(text)) {
    return { op: "replace", category: "gpu", query: "RTX 4070" };
  }
  if (/64gb/i.test(text)) {
    return { op: "upgrade", category: "ram", query: "64GB" };
  }
  if (/downgrade ram|16gb|save 5000/i.test(text)) {
    return { op: "downgrade", category: "ram", query: "16GB", budget_delta: -5000 };
  }
  if (/aio|liquid|water/i.test(text)) {
    return { op: "replace", category: "cooler", query: "360mm Liquid Cooler" };
  }

  return { op: "custom", query: message };
}

/**
 * Applies a refinement modification to an existing build session.
 * 
 * @param {Object} session - { request: BuildRequest, build: Build, candidateLookup: Object, pinnedConstraints: Object }
 * @param {string} userMessage - User follow-up query
 * @param {any} supabaseClient 
 * @returns {Promise<{ newBuild: any, candidateLookup: any, validation: any, diff: { category: string, oldPart: any, newPart: any, priceDelta: number } }>}
 */
export async function applyRefinement(session, userMessage, supabaseClient) {
  let refineAction = null;

  try {
    const { data } = await groqJson([
      { role: "system", content: REFINER_SYSTEM_PROMPT },
      { role: "user", content: userMessage }
    ], {
      model: MODELS.OPEN,
      temperature: 0.1,
      max_tokens: 150
    });

    if (data && data.category) {
      refineAction = data;
    }
  } catch (err) {
    console.warn("[Refiner LLM Warning]:", err.message);
  }

  if (!refineAction) {
    refineAction = parseRefineRegex(userMessage);
  }

  const currentBuild = session.build || { parts: {}, total_bdt: 0 };
  const currentLookup = session.candidateLookup || {};

  // Merge pinned constraints so turn 20 still respects turn 1 budget and requirements
  const pinned = session.pinnedConstraints || {};
  const currentRequest = {
    budget_bdt: pinned.budget_bdt ?? session.request?.budget_bdt ?? 150000,
    purpose: pinned.purpose || session.request?.purpose || "general",
    constraints: { ...(pinned.constraints || {}), ...(session.request?.constraints || {}) },
    language: pinned.language || session.request?.language || "en"
  };

  // Re-fetch candidates for category if needed
  const targetCategory = refineAction.category || "gpu";
  const candidatesMap = await retrieveCandidates(currentRequest, supabaseClient);

  // Merge candidate lookup
  const candidateLookup = { ...currentLookup };
  for (const list of Object.values(candidatesMap)) {
    for (const c of list) {
      candidateLookup[c.id] = c;
    }
  }

  const categoryCandidates = candidatesMap[targetCategory] || [];
  let matchingCandidate = null;

  if (refineAction.query) {
    const q = refineAction.query.toLowerCase();
    matchingCandidate = categoryCandidates.find(c => c.name.toLowerCase().includes(q)) ||
      categoryCandidates[0];
  } else {
    matchingCandidate = categoryCandidates[0];
  }

  if (!matchingCandidate) {
    // If no candidate found, re-validate current build
    const validation = validateBuild(currentBuild, candidateLookup, currentRequest.budget_bdt);
    return {
      newBuild: currentBuild,
      candidateLookup,
      validation,
      diff: null
    };
  }

  const oldPartId = currentBuild.parts[targetCategory];
  const oldPart = currentLookup[oldPartId] || null;
  const newPart = matchingCandidate;

  const newParts = {
    ...currentBuild.parts,
    [targetCategory]: newPart.id
  };

  // Recalculate total price
  let newTotal = 0;
  for (const pId of Object.values(newParts)) {
    if (candidateLookup[pId]) {
      newTotal += candidateLookup[pId].best_price;
    }
  }

  let newBuild = {
    ...currentBuild,
    parts: newParts,
    total_bdt: newTotal
  };

  let validation = validateBuild(newBuild, candidateLookup, currentRequest.budget_bdt);
  const ceiling = getBudgetCeiling(currentRequest.budget_bdt);
  const isExplicitUpgrade = refineAction.op === "upgrade";

  // If the single-part swap broke compatibility (e.g. PSU headroom or socket mismatch), re-run planner
  if (!validation.ok && validation.violations.some(v => v.rule !== "budget_exceeded")) {
    const replanned = await planBuild(currentRequest, candidatesMap, validation.violations);
    newBuild = replanned.build;
    validation = replanned.validation;
  } else if (newBuild.total_bdt > ceiling) {
    if (isExplicitUpgrade) {
      // User explicitly requested an upgrade exceeding budget: report status and shortfall
      newBuild.budget_status = "over";
      newBuild.budget_shortfall_bdt = newBuild.total_bdt - currentRequest.budget_bdt;
    } else {
      // Apply budget ceiling enforcement
      const enforced = enforceBudgetCeiling(newBuild, candidatesMap, candidateLookup, currentRequest.budget_bdt);
      newBuild = enforced.build;
      validation = enforced.validation;
    }
  }

  // Update budget status if not set
  if (currentRequest.budget_bdt > 0 && !newBuild.budget_status) {
    if (newBuild.total_bdt > currentRequest.budget_bdt) {
      newBuild.budget_status = "over";
      newBuild.budget_shortfall_bdt = newBuild.total_bdt - currentRequest.budget_bdt;
    } else if (newBuild.total_bdt === currentRequest.budget_bdt) {
      newBuild.budget_status = "met";
      newBuild.budget_shortfall_bdt = 0;
    } else {
      newBuild.budget_status = "under";
      newBuild.budget_shortfall_bdt = 0;
    }
  }

  const priceDelta = oldPart ? (newPart.best_price - oldPart.best_price) : 0;

  return {
    newBuild,
    candidateLookup,
    validation,
    diff: {
      category: targetCategory,
      oldPart,
      newPart,
      priceDelta
    }
  };
}
