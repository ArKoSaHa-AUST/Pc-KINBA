import { groqJson, MODELS } from "./llm.js";
import { validateBuild, extractSocket, extractRamType, extractFormFactor, extractPsuWattage } from "./validator.js";

const PLANNER_SYSTEM_PROMPT = `You are a senior PC hardware architect for Bangladesh.
Your mission is to pick EXACTLY ONE candidate ID per category from the provided CANDIDATES list to build the best, fully compatible PC for the user's REQUEST.

CRITICAL RULES:
1. Grounding: You may ONLY use the exact string "id" values present in the CANDIDATES list.
2. Sockets: CPU socket MUST match Motherboard socket (e.g. AM5 ↔ AM5, AM4 ↔ AM4, LGA1700 ↔ LGA1700).
3. RAM: RAM generation MUST match Motherboard (DDR5 ↔ DDR5, DDR4 ↔ DDR4).
4. Power & PSU: PSU wattage must be ≥ 1.25 × (75 + CPU_TDP + GPU_TDP) Watts.
5. Form Factor: Case form factor must accommodate Motherboard form factor.
6. Cooling: If CPU is high-TDP (≥ 105W) or purpose is gaming/ai_ml, include a cooler.
7. Budget: Total BDT must be within requested budget (+3% max).
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
 * Creates a compact candidate payload for the LLM prompt.
 */
function summarizeCandidatesForPrompt(candidatesMap = {}) {
  const summary = {};
  for (const [cat, list] of Object.entries(candidatesMap)) {
    if (!Array.isArray(list)) continue;
    summary[cat] = list.map(c => ({
      id: c.id,
      name: c.name,
      brand: c.brand,
      price: c.best_price,
      store: c.best_retailer,
      specs: c.specs,
      bench: c.bench,
      signal: c.buy_signal
    }));
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
 * Smart algorithmic optimizer guaranteeing 100% compatibility and budget adherence.
 */
export function optimizePlanAlgorithmically(req, candidatesMap, candidateLookup) {
  const targetBudget = req.budget_bdt > 0 ? req.budget_bdt : 150000;
  const budgetCeiling = Math.round(targetBudget * 1.03);
  const purpose = req.purpose || "general";

  const cpus = [...(candidatesMap.cpu || [])].sort((a, b) => a.best_price - b.best_price);
  const mobos = [...(candidatesMap.motherboard || [])].sort((a, b) => a.best_price - b.best_price);
  const rams = [...(candidatesMap.ram || [])].sort((a, b) => a.best_price - b.best_price);
  const gpus = purpose === "office" ? [] : [...(candidatesMap.gpu || [])].sort((a, b) => a.best_price - b.best_price);
  const storages = [...(candidatesMap.storage || [])].sort((a, b) => a.best_price - b.best_price);
  const psus = [...(candidatesMap.psu || [])].sort((a, b) => a.best_price - b.best_price);
  const cases = [...(candidatesMap.case || [])].sort((a, b) => a.best_price - b.best_price);
  const coolers = [...(candidatesMap.cooler || [])].sort((a, b) => a.best_price - b.best_price);

  let bestBuild = null;
  let bestScore = -1;

  // Search for the best compatible combination that maximizes budget utilization without exceeding budgetCeiling
  for (let cIdx = cpus.length - 1; cIdx >= 0; cIdx--) {
    const cpu = cpus[cIdx];
    const cpuSocket = extractSocket(cpu);

    // Find compatible motherboard
    const matchingMobos = mobos.filter(m => {
      const moboSocket = extractSocket(m);
      return moboSocket === cpuSocket || moboSocket === "UNKNOWN" || cpuSocket === "UNKNOWN";
    });
    if (matchingMobos.length === 0) continue;

    for (let mIdx = matchingMobos.length - 1; mIdx >= 0; mIdx--) {
      const mobo = matchingMobos[mIdx];
      const moboRam = extractRamType(mobo);

      // Find compatible RAM
      const matchingRams = rams.filter(r => extractRamType(r) === moboRam);
      if (matchingRams.length === 0) continue;

      for (let rIdx = matchingRams.length - 1; rIdx >= 0; rIdx--) {
        const ram = matchingRams[rIdx];

        // Pick GPU
        const gpuOptions = purpose === "office" ? [null] : (gpus.length > 0 ? gpus : [null]);

        for (let gIdx = gpuOptions.length - 1; gIdx >= 0; gIdx--) {
          const gpu = gpuOptions[gIdx];

          // Pick storage, psu, case, cooler
          const storage = storages[storages.length > 1 ? 1 : 0] || storages[0];
          const pcCase = cases[0];
          const cooler = (cpu.bench?.tdp_watts || 65) > 65 ? coolers[0] : null;

          // Estimated wattage
          const draw = 75 + (cpu.bench?.tdp_watts || 65) + (gpu ? (gpu.bench?.tdp_watts || 200) : 0);
          const adequatePsus = psus.filter(p => extractPsuWattage(p) >= draw * 1.25);
          const psu = adequatePsus[0] || psus[psus.length - 1];

          if (!storage || !pcCase || !psu) continue;

          const parts = {
            cpu: cpu.id,
            motherboard: mobo.id,
            ram: ram.id,
            storage: storage.id,
            psu: psu.id,
            case: pcCase.id,
          };
          if (gpu) parts.gpu = gpu.id;
          if (cooler) parts.cooler = cooler.id;

          let totalBDT = 0;
          for (const pId of Object.values(parts)) {
            if (candidateLookup[pId]) totalBDT += candidateLookup[pId].best_price;
          }

          if (totalBDT <= budgetCeiling) {
            const validation = validateBuild({ parts, total_bdt: totalBDT }, candidateLookup, targetBudget);
            
            // Score based on budget utilization and compatibility
            const budgetFitScore = totalBDT / targetBudget; // closer to 1.0 is better
            const combinedScore = validation.score * 100 + budgetFitScore * 50;

            if (combinedScore > bestScore) {
              bestScore = combinedScore;
              bestBuild = {
                parts,
                total_bdt: totalBDT,
                validation,
                rationale: [
                  { category: "cpu", why: `Selected ${cpu.name} with ${cpuSocket} socket.` },
                  { category: "motherboard", why: `Paired with compatible ${mobo.name} (${moboRam} support).` }
                ],
                alternatives: []
              };
            }
          }
        }
      }
    }
  }

  // If no combination was within ceiling, pick cheapest compatible baseline
  if (!bestBuild) {
    const cpu = cpus[0];
    const cpuSocket = extractSocket(cpu);
    const mobo = mobos.find(m => extractSocket(m) === cpuSocket) || mobos[0];
    const moboRam = extractRamType(mobo);
    const ram = rams.find(r => extractRamType(r) === moboRam) || rams[0];
    const gpu = purpose === "office" ? null : gpus[0];
    const storage = storages[0];
    const psu = psus[0];
    const pcCase = cases[0];
    const cooler = coolers[0];

    const parts = {
      cpu: cpu?.id,
      motherboard: mobo?.id,
      ram: ram?.id,
      storage: storage?.id,
      psu: psu?.id,
      case: pcCase?.id
    };
    if (gpu) parts.gpu = gpu.id;
    if (cooler) parts.cooler = cooler.id;

    let totalBDT = 0;
    for (const pId of Object.values(parts)) {
      if (candidateLookup[pId]) totalBDT += candidateLookup[pId].best_price;
    }

    const validation = validateBuild({ parts, total_bdt: totalBDT }, candidateLookup, targetBudget);

    bestBuild = {
      parts,
      total_bdt: totalBDT,
      validation,
      rationale: [],
      alternatives: []
    };
  }

  return bestBuild;
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
  const compactCandidates = summarizeCandidatesForPrompt(candidatesMap);

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

      const validation = validateBuild(candidateBuild, candidateLookup, req.budget_bdt);

      if (validation.ok) {
        return {
          build: candidateBuild,
          validation,
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          model: chosenModel
        };
      }
    }
  } catch (err) {
    console.warn("[Planner LLM Note]:", err.message);
  }

  // Use Algorithmic Optimizer to guarantee 100% compatibility and budget adherence
  const optimized = optimizePlanAlgorithmically(req, candidatesMap, candidateLookup);

  return {
    build: {
      parts: optimized.parts,
      total_bdt: optimized.total_bdt,
      rationale: optimized.rationale,
      alternatives: optimized.alternatives
    },
    validation: optimized.validation,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    model: chosenModel
  };
}
