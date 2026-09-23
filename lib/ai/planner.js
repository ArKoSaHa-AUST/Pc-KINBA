import { groqJson, MODELS } from "./llm.js";
import {
  validateBuild,
  extractSocket,
  extractRamType,
  extractFormFactor,
  extractPsuWattage,
  estimateBuildWattage
} from "./validator.js";
import { getBudgetCeiling, isWithinBudget, allocateSubBudgets } from "./budget.js";
import { SOURCING_REFERENCE } from "./retriever.js";

/**
 * The extractors return `undefined` rather than a guess when a product name is uninformative.
 * Treat an unknown on either side as "could match".
 */
const specMatches = (a, b) => !a || !b || a === b;

const FF_RANKS = { ITX: 1, mATX: 2, ATX: 3, "E-ATX": 4 };
function caseAccommodatesMobo(moboFF, caseFF) {
  if (!moboFF || !caseFF) return true;
  const mRank = FF_RANKS[moboFF] || 3;
  const cRank = FF_RANKS[caseFF] || 3;
  return cRank >= mRank;
}

const PLANNER_SYSTEM_PROMPT = `You are a senior PC hardware architect for Bangladesh.
Your mission is to pick EXACTLY ONE candidate ID per category from the provided CANDIDATES list to build the best, fully compatible PC for the user's REQUEST.

CRITICAL RULES:
1. Grounding: You may ONLY use the exact string "id" values present in the CANDIDATES list.
2. Sockets: CPU socket MUST match Motherboard socket (e.g. AM5 ↔ AM5, AM4 ↔ AM4, LGA1700 ↔ LGA1700).
3. RAM: RAM generation MUST match Motherboard (DDR5 ↔ DDR5, DDR4 ↔ DDR4).
4. Power & PSU: PSU wattage must be ≥ 1.25 × (75 + CPU_TDP + GPU_TDP) Watts.
5. Form Factor: Case form factor must accommodate Motherboard form factor.
6. Cooling: If CPU is high-TDP (≥ 105W) or purpose is gaming/ai_ml, include a cooler.
7. Budget: Total BDT must be within requested budget (0% tolerance; hard constraint).
8. Purpose Optimization:
   - For "ai_ml": Maximize GPU VRAM, prefer NVIDIA (CUDA), minimum 32GB RAM.
   - For "gaming": Optimize single-core CPU and GPU tier for target resolution.
   - For "content_creation": High CPU core count, ≥ 32GB RAM, fast NVMe.
   - For "office": CPU must have integrated GPU (iGPU), no dedicated GPU.

OUTPUT FORMAT: Return ONLY valid JSON:
{
  "parts": {
    "cpu": "id",
    "gpu": "id",
    "motherboard": "id",
    "ram": "id",
    "storage": "id",
    "psu": "id",
    "case": "id",
    "cooler": "id"
  },
  "rationale": [
    { "category": "gpu", "why": "Selected GPU for high performance and VRAM." },
    { "category": "cpu", "why": "Selected matching processor." }
  ],
  "alternatives": [
    { "category": "ram", "id": "candidate_id", "delta_bdt": -5000, "label": "📉 Downgrade RAM (-৳5,000)" }
  ]
}`;

/**
 * Creates a compact, truncated candidate payload for the LLM prompt.
 * Truncates to top 8 candidates per category by sub-budget fit and drops null/empty spec keys.
 */
function summarizeCandidatesForPrompt(candidatesMap = {}, subBudgets = {}) {
  const summary = {};
  for (const [cat, list] of Object.entries(candidatesMap)) {
    if (!Array.isArray(list)) continue;
    const target = subBudgets[cat]?.target || 20000;

    // Real candidates first, whatever the caller passed in — see the SOURCING_REFERENCE
    // comment on scoreCandidate(). A reference specimen priced near the sub-budget used
    // to sort ahead of a real, more expensive part here and get handed to the LLM as an
    // equally valid option.
    const sorted = [...list]
      .sort((a, b) => {
        const sourcingDelta = (a.sourcing ?? SOURCING_REFERENCE) - (b.sourcing ?? SOURCING_REFERENCE);
        if (sourcingDelta !== 0) return sourcingDelta;
        const diffA = Math.abs(a.best_price - target);
        const diffB = Math.abs(b.best_price - target);
        if (diffA !== diffB) return diffA - diffB;
        return String(a.id).localeCompare(String(b.id));
      })
      .slice(0, 8);

    summary[cat] = sorted.map((c) => {
      const cleanSpecs = {};
      if (c.specs && typeof c.specs === "object") {
        for (const [k, v] of Object.entries(c.specs)) {
          if (v !== null && v !== undefined && v !== "") {
            cleanSpecs[k] = v;
          }
        }
      }
      return {
        id: c.id,
        name: c.name,
        brand: c.brand || undefined,
        price: c.best_price,
        store: c.best_retailer,
        specs: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : undefined,
        bench: c.bench || undefined,
        signal: c.buy_signal
      };
    });
  }
  return summary;
}

/**
 * Creates an ID lookup map of all candidates.
 */
export function buildCandidateLookup(candidatesMap = {}) {
  const lookup = {};
  for (const list of Object.values(candidatesMap)) {
    if (Array.isArray(list)) {
      for (const c of list) {
        lookup[c.id] = c;
      }
    }
  }
  return lookup;
}

/**
 * Post-assembly budget enforcement. While the build is over the ceiling, swap the single part
 * whose downgrade costs the least performance per taka saved, until the build fits or no
 * further downgrade is possible.
 *
 * @param {import("./schemas.js").Build} build
 * @param {Record<string, Array<import("./schemas.js").Candidate>>} candidatesMap
 * @param {Record<string, import("./schemas.js").Candidate>} candidateLookup
 * @param {number} budgetBDT
 * @returns {{ build: any, validation: any, swaps: Array<{category: string, from: string, to: string, saved: number}>, fits: boolean }}
 */
export function enforceBudgetCeiling(build, candidatesMap, candidateLookup, budgetBDT, constraints = {}) {
  const ceiling = getBudgetCeiling(budgetBDT);
  const swaps = [];

  let currentParts = { ...(build?.parts || {}) };
  let currentTotal = build?.total_bdt;

  const rejectedMap = constraints.rejected_parts || {};
  const isRejected = (cat, c) => {
    if (!c) return false;
    const list = rejectedMap[cat] || [];
    const nameLower = (c.name || "").toLowerCase();
    const brandLower = (c.brand || "").toLowerCase();
    return list.some((kw) => {
      const kwLower = String(kw).toLowerCase();
      return nameLower.includes(kwLower) || brandLower.includes(kwLower);
    });
  };

  let calcTotal = 0;
  for (const pId of Object.values(currentParts)) {
    if (candidateLookup[pId]) calcTotal += candidateLookup[pId].best_price;
  }
  if (calcTotal > 0) currentTotal = calcTotal;

  if (!budgetBDT || budgetBDT <= 0 || currentTotal <= ceiling) {
    const validation = validateBuild({ parts: currentParts, total_bdt: currentTotal }, candidateLookup, budgetBDT);
    return {
      build: { ...build, parts: currentParts, total_bdt: currentTotal, swaps: [] },
      validation,
      swaps: [],
      fits: validation.ok && (!budgetBDT || currentTotal <= ceiling)
    };
  }

  // Downgrade order: cheapest performance loss first
  const DOWNGRADE_ORDER = ["case", "cooler", "storage", "ram", "motherboard", "psu", "gpu", "cpu"];
  let swapCount = 0;
  const maxSwaps = 12;

  while (currentTotal > ceiling && swapCount < maxSwaps) {
    let bestSwap = null;
    let bestPerfLossPerTaka = Infinity;

    for (const cat of DOWNGRADE_ORDER) {
      const currentPartId = currentParts[cat];
      if (!currentPartId) continue;
      const currentPart = candidateLookup[currentPartId];
      if (!currentPart) continue;

      const candidates = (candidatesMap[cat] || [])
        // sourcing !== SOURCING_REFERENCE: a hardcoded specimen must never be reached for
        // as a downgrade lever. It was the closest thing to a free budget save — cheap,
        // and with no real product behind it to disqualify it on price — which is exactly
        // how a correctly-chosen real case got swapped back out for one no store sells,
        // right after selection got it right. Landing the build slightly over budget with
        // real parts is the honest outcome; substituting a part that does not exist is not.
        .filter(
          (c) =>
            c.id !== currentPartId &&
            c.best_price < currentPart.best_price &&
            !isRejected(cat, c) &&
            c.sourcing !== SOURCING_REFERENCE
        )
        .sort((a, b) => {
          if (b.best_price !== a.best_price) return b.best_price - a.best_price;
          return String(a.id).localeCompare(String(b.id));
        });

      if (candidates.length === 0) continue;

      for (const cand of candidates) {
        const testParts = { ...currentParts, [cat]: cand.id };
        const testPartsMap = {};
        for (const [k, id] of Object.entries(testParts)) {
          if (candidateLookup[id]) testPartsMap[k] = candidateLookup[id];
        }

        // PSU wattage safety check
        if (cat === "psu") {
          const reqWattage = estimateBuildWattage(testPartsMap) * 1.25;
          if (extractPsuWattage(cand) < reqWattage) continue;
        }

        // Compatibility checks before full validation
        if (cat === "motherboard") {
          const cpuPart = candidateLookup[testParts.cpu];
          const ramPart = candidateLookup[testParts.ram];
          if (!specMatches(extractSocket(cpuPart), extractSocket(cand))) continue;
          if (!specMatches(extractRamType(ramPart), extractRamType(cand))) continue;
        } else if (cat === "cpu") {
          const moboPart = candidateLookup[testParts.motherboard];
          if (!specMatches(extractSocket(cand), extractSocket(moboPart))) continue;
        } else if (cat === "ram") {
          const moboPart = candidateLookup[testParts.motherboard];
          if (!specMatches(extractRamType(cand), extractRamType(moboPart))) continue;
        } else if (cat === "case") {
          const moboPart = candidateLookup[testParts.motherboard];
          if (!caseAccommodatesMobo(extractFormFactor(moboPart), extractFormFactor(cand))) continue;
        }

        const testTotal = currentTotal - currentPart.best_price + cand.best_price;
        const testValidation = validateBuild(
          { parts: testParts, total_bdt: testTotal },
          candidateLookup,
          budgetBDT
        );

        // Disallow socket, ram_mismatch, form_factor, psu_insufficient violations
        const nonBudgetViolations = testValidation.violations.filter((v) => v.rule !== "budget_exceeded");
        if (nonBudgetViolations.length > 0) continue;

        const takaSaved = currentPart.best_price - cand.best_price;
        const currentPerf = currentPart.bench?.score || currentPart.best_price / 1000;
        const candPerf = cand.bench?.score || cand.best_price / 1000;
        const perfLoss = Math.max(0, currentPerf - candPerf);
        const perfLossPerTaka = perfLoss / takaSaved;

        if (perfLossPerTaka < bestPerfLossPerTaka) {
          bestPerfLossPerTaka = perfLossPerTaka;
          bestSwap = {
            category: cat,
            from: currentPart.name,
            to: cand.name,
            saved: takaSaved,
            newTotal: testTotal,
            testParts
          };
        }
      }

      if (bestSwap) break;
    }

    if (!bestSwap) break;

    currentParts = bestSwap.testParts;
    currentTotal = bestSwap.newTotal;
    swaps.push({
      category: bestSwap.category,
      from: bestSwap.from,
      to: bestSwap.to,
      saved: bestSwap.saved
    });
    swapCount++;
  }

  const finalBuild = {
    ...build,
    parts: currentParts,
    total_bdt: currentTotal,
    swaps
  };

  const finalValidation = validateBuild(finalBuild, candidateLookup, budgetBDT);
  const fits = currentTotal <= ceiling && finalValidation.violations.filter((v) => v.rule === "budget_exceeded").length === 0;

  return {
    build: finalBuild,
    validation: finalValidation,
    swaps,
    fits
  };
}

/**
 * Helper to stably score a candidate component within its category and sub-budget.
 */
function scoreCandidate(candidate, targetSubBudget, purpose) {
  if (!candidate || candidate.best_price <= 0) return -Infinity;
  const benchScore = candidate.bench?.score ?? 50;
  const priceDiff = Math.abs(candidate.best_price - targetSubBudget);
  const budgetFit = Math.max(0, 100 - (priceDiff / Math.max(targetSubBudget, 1000)) * 50);

  let bonus = 0;
  if (purpose === "gaming" && candidate.category === "gpu") bonus += 25;
  if (purpose === "ai_ml" && candidate.category === "gpu") {
    if (/rtx|nvidia|geforce/i.test(candidate.name)) bonus += 30;
    if ((candidate.bench?.vram_gb || 0) >= 16) bonus += 20;
  }

  // Hardcoded reference specimens (no listing, no product row — see retriever.js) score
  // as if they were priced perfectly and benchmarked flawlessly, so a large, fixed
  // penalty keeps them from ever outscoring a real, purchasable part on this metric
  // alone. retrieveCandidates() no longer offers them when a real candidate exists, but
  // this is the second line of defense for whichever category ever mixes the two.
  if (candidate.sourcing === SOURCING_REFERENCE) bonus -= 1000;

  return benchScore * 1.5 + budgetFit + bonus;
}

/**
 * Fast, deterministic O(n) algorithmic staged selection guaranteeing compatibility and budget ceiling.
 */
export function optimizePlanAlgorithmically(req, candidatesMap, candidateLookup) {
  const targetBudget = req.budget_bdt > 0 ? req.budget_bdt : 150000;
  const ceiling = getBudgetCeiling(targetBudget);
  const purpose = req.purpose || "general";
  const constraints = req.constraints || {};
  const subBudgets = allocateSubBudgets(purpose, targetBudget, constraints);

  const rejectedMap = constraints.rejected_parts || {};
  const isRejected = (cat, c) => {
    if (!c) return false;
    const list = rejectedMap[cat] || [];
    const nameLower = (c.name || "").toLowerCase();
    const brandLower = (c.brand || "").toLowerCase();
    return list.some((kw) => {
      const kwLower = String(kw).toLowerCase();
      return nameLower.includes(kwLower) || brandLower.includes(kwLower);
    });
  };

  // Staged selection in dependency order:
  // cpu → motherboard (socket) → ram (gen) → gpu → storage → cooler → psu → case

  // 1. CPU
  const cpus = [...(candidatesMap.cpu || [])]
    .filter((c) => !isRejected("cpu", c))
    .sort((a, b) => {
      const sA = scoreCandidate(a, subBudgets.cpu?.target || 25000, purpose);
      const sB = scoreCandidate(b, subBudgets.cpu?.target || 25000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
  const selectedCpu = cpus[0] || (candidatesMap.cpu || [])[0] || null;
  const cpuSocket = extractSocket(selectedCpu);

  // 2. Motherboard (socket-matched)
  const mobos = [...(candidatesMap.motherboard || [])]
    .filter((m) => !isRejected("motherboard", m) && specMatches(cpuSocket, extractSocket(m)))
    .sort((a, b) => {
      const sA = scoreCandidate(a, subBudgets.motherboard?.target || 15000, purpose);
      const sB = scoreCandidate(b, subBudgets.motherboard?.target || 15000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
  const selectedMobo = mobos[0] || (candidatesMap.motherboard || [])[0] || null;
  const moboRamType = extractRamType(selectedMobo);
  const moboFF = extractFormFactor(selectedMobo);

  // 3. RAM (generation-matched)
  const rams = [...(candidatesMap.ram || [])]
    .filter((r) => !isRejected("ram", r) && specMatches(moboRamType, extractRamType(r)))
    .sort((a, b) => {
      const sA = scoreCandidate(a, subBudgets.ram?.target || 10000, purpose);
      const sB = scoreCandidate(b, subBudgets.ram?.target || 10000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
  const selectedRam = rams[0] || (candidatesMap.ram || [])[0] || null;

  // 4. GPU (omitted for office)
  let selectedGpu = null;
  if (purpose !== "office") {
    const gpus = [...(candidatesMap.gpu || [])]
      .filter((g) => !isRejected("gpu", g))
      .sort((a, b) => {
        const sA = scoreCandidate(a, subBudgets.gpu?.target || 50000, purpose);
        const sB = scoreCandidate(b, subBudgets.gpu?.target || 50000, purpose);
        if (sB !== sA) return sB - sA;
        return String(a.id).localeCompare(String(b.id));
      });
    selectedGpu = gpus[0] || null;
  }

  // 5. Storage (by sub-budget and capacity constraint, removing magic index)
  const storages = [...(candidatesMap.storage || [])]
    .filter((s) => !isRejected("storage", s))
    .sort((a, b) => {
      const sA = scoreCandidate(a, subBudgets.storage?.target || 8000, purpose);
      const sB = scoreCandidate(b, subBudgets.storage?.target || 8000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
  const selectedStorage = storages[0] || null;

  // 6. Cooler (needed if high TDP or gaming/ai_ml)
  let selectedCooler = null;
  const cpuTdp = selectedCpu?.bench?.tdp_watts || 65;
  const needsCooler = cpuTdp >= 105 || purpose === "gaming" || purpose === "ai_ml";
  const coolersList = [...(candidatesMap.cooler || [])].filter((c) => !isRejected("cooler", c));
  if (needsCooler || coolersList.length > 0) {
    const coolers = coolersList.sort((a, b) => {
      const sA = scoreCandidate(a, subBudgets.cooler?.target || 5000, purpose);
      const sB = scoreCandidate(b, subBudgets.cooler?.target || 5000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
    selectedCooler = coolers[0] || null;
  }

  // 7. PSU (wattage-derived: ≥ 1.25 × draw)
  const partsMapForWattage = { cpu: selectedCpu, gpu: selectedGpu };
  const estWattage = estimateBuildWattage(partsMapForWattage);
  const minPsuWatts = Math.round(estWattage * 1.25);

  const psus = [...(candidatesMap.psu || [])]
    .filter((p) => !isRejected("psu", p))
    .sort((a, b) => {
      const wA = extractPsuWattage(a);
      const wB = extractPsuWattage(b);
      const fitA = wA >= minPsuWatts ? 1 : 0;
      const fitB = wB >= minPsuWatts ? 1 : 0;
      if (fitB !== fitA) return fitB - fitA;
      const sA = scoreCandidate(a, subBudgets.psu?.target || 7000, purpose);
      const sB = scoreCandidate(b, subBudgets.psu?.target || 7000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
  const selectedPsu = psus[0] || null;

  // 8. Case (form-factor matched)
  const cases = [...(candidatesMap.case || [])]
    .filter((c) => !isRejected("case", c) && caseAccommodatesMobo(moboFF, extractFormFactor(c)))
    .sort((a, b) => {
      const sA = scoreCandidate(a, subBudgets.case?.target || 6000, purpose);
      const sB = scoreCandidate(b, subBudgets.case?.target || 6000, purpose);
      if (sB !== sA) return sB - sA;
      return String(a.id).localeCompare(String(b.id));
    });
  const selectedCase = cases[0] || (candidatesMap.case || [])[0] || null;

  // Assemble initial build
  const parts = {};
  if (selectedCpu) parts.cpu = selectedCpu.id;
  if (selectedMobo) parts.motherboard = selectedMobo.id;
  if (selectedRam) parts.ram = selectedRam.id;
  if (selectedStorage) parts.storage = selectedStorage.id;
  if (selectedPsu) parts.psu = selectedPsu.id;
  if (selectedCase) parts.case = selectedCase.id;
  if (selectedGpu) parts.gpu = selectedGpu.id;
  if (selectedCooler) parts.cooler = selectedCooler.id;

  let totalBDT = 0;
  for (const id of Object.values(parts)) {
    if (candidateLookup[id]) totalBDT += candidateLookup[id].best_price;
  }

  const initialBuild = {
    parts,
    total_bdt: totalBDT,
    rationale: [
      { category: "cpu", why: `Selected ${selectedCpu?.name || "CPU"} with ${cpuSocket || "matching"} socket.` },
      { category: "motherboard", why: `Paired with ${selectedMobo?.name || "Motherboard"} (${moboRamType || "compatible"} support).` }
    ],
    alternatives: []
  };

  // Run post-assembly downgrade pass to land on or under the budget ceiling
  const enforced = enforceBudgetCeiling(initialBuild, candidatesMap, candidateLookup, targetBudget);

  const finalBuild = enforced.build;
  const finalValidation = enforced.validation;

  // Set budget status and shortfall
  if (targetBudget > 0) {
    if (finalBuild.total_bdt > targetBudget) {
      finalBuild.budget_status = "over";
      finalBuild.budget_shortfall_bdt = finalBuild.total_bdt - targetBudget;
    } else if (finalBuild.total_bdt === targetBudget) {
      finalBuild.budget_status = "met";
      finalBuild.budget_shortfall_bdt = 0;
    } else {
      finalBuild.budget_status = "under";
      finalBuild.budget_shortfall_bdt = 0;
    }
  } else {
    finalBuild.budget_status = "met";
    finalBuild.budget_shortfall_bdt = 0;
  }

  return {
    parts: finalBuild.parts,
    total_bdt: finalBuild.total_bdt,
    validation: finalValidation,
    rationale: finalBuild.rationale,
    alternatives: finalBuild.alternatives,
    swaps: enforced.swaps,
    budget_status: finalBuild.budget_status,
    budget_shortfall_bdt: finalBuild.budget_shortfall_bdt
  };
}

/**
 * Plans a compatible PC build using model reasoning with algorithmic compatibility enforcement.
 *
 * @param {import("./schemas.js").BuildRequest} req
 * @param {Record<string, Array<import("./schemas.js").Candidate>>>} candidatesMap
 * @param {Array<{ rule: string, detail: string }>} [initialViolations=[]]
 * @returns {Promise<{ build: import("./schemas.js").Build, validation: any, tokensIn: number, tokensOut: number, model: string }>}
 */
export async function planBuild(req, candidatesMap, initialViolations = []) {
  const candidateLookup = buildCandidateLookup(candidatesMap);
  const targetBudget = req.budget_bdt > 0 ? req.budget_bdt : 150000;
  const subBudgets = allocateSubBudgets(req.purpose || "general", targetBudget, req.constraints);
  const compactCandidates = summarizeCandidatesForPrompt(candidatesMap, subBudgets);

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let chosenModel = MODELS.OPEN;

  const messages = [
    { role: "system", content: PLANNER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `REQUEST:\n${JSON.stringify(req, null, 2)}\n\nCANDIDATES AVAILABLE (Use ONLY these exact IDs):\n${JSON.stringify(compactCandidates, null, 2)}`
    }
  ];

  try {
    const { data, model, tokensIn, tokensOut } = await groqJson(messages, {
      model: MODELS.OPEN,
      temperature: 0.1,
      max_tokens: 1000,
      timeoutMs: 8000
    });

    totalTokensIn += tokensIn;
    totalTokensOut += tokensOut;
    if (model) chosenModel = model;

    if (data && data.parts && typeof data.parts === "object") {
      const verifiedParts = {};
      for (const [cat, candidateId] of Object.entries(data.parts)) {
        if (candidateLookup[candidateId]) {
          verifiedParts[cat] = candidateId;
        } else if (candidatesMap[cat] && candidatesMap[cat].length > 0) {
          verifiedParts[cat] = candidatesMap[cat][0].id;
        }
      }

      let totalBDT = 0;
      for (const cId of Object.values(verifiedParts)) {
        if (candidateLookup[cId]) {
          totalBDT += candidateLookup[cId].best_price;
        }
      }

      const candidateBuild = {
        parts: verifiedParts,
        total_bdt: totalBDT,
        rationale: Array.isArray(data.rationale) ? data.rationale : [],
        alternatives: Array.isArray(data.alternatives) ? data.alternatives : []
      };

      // Run post-assembly budget enforcement on LLM build
      const enforced = enforceBudgetCeiling(candidateBuild, candidatesMap, candidateLookup, targetBudget);

      if (enforced.validation.ok && enforced.fits) {
        const finalBuild = enforced.build;
        if (targetBudget > 0) {
          if (finalBuild.total_bdt > targetBudget) {
            finalBuild.budget_status = "over";
            finalBuild.budget_shortfall_bdt = finalBuild.total_bdt - targetBudget;
          } else if (finalBuild.total_bdt === targetBudget) {
            finalBuild.budget_status = "met";
            finalBuild.budget_shortfall_bdt = 0;
          } else {
            finalBuild.budget_status = "under";
            finalBuild.budget_shortfall_bdt = 0;
          }
        } else {
          finalBuild.budget_status = "met";
          finalBuild.budget_shortfall_bdt = 0;
        }

        return {
          build: finalBuild,
          validation: enforced.validation,
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          model: chosenModel
        };
      }
    }
  } catch (err) {
    console.warn("[Planner LLM Note]:", err.message);
  }

  // Fallback to fast, deterministic staged algorithmic optimizer
  const optimized = optimizePlanAlgorithmically(req, candidatesMap, candidateLookup);

  return {
    build: {
      parts: optimized.parts,
      total_bdt: optimized.total_bdt,
      rationale: optimized.rationale,
      alternatives: optimized.alternatives,
      swaps: optimized.swaps,
      budget_status: optimized.budget_status,
      budget_shortfall_bdt: optimized.budget_shortfall_bdt
    },
    validation: optimized.validation,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    model: chosenModel
  };
}
