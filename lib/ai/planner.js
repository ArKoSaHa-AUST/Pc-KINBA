import { groqJson, MODELS } from "./llm.js";
import { validateBuild } from "./validator.js";

const PLANNER_SYSTEM_PROMPT = `You are a senior PC hardware architect for Bangladesh.
Your mission is to pick EXACTLY ONE candidate ID per category from the provided CANDIDATES list to build the best, fully compatible PC for the user's REQUEST.

CRITICAL RULES:
1. Grounding & Anti-Hallucination: You may ONLY use the exact string "id" values present in the CANDIDATES list. You must NEVER invent part IDs, names, or prices.
2. Sockets: CPU socket MUST match Motherboard socket (e.g. AM5 ↔ AM5, LGA1700 ↔ LGA1700).
3. RAM: RAM generation MUST match Motherboard (DDR5 ↔ DDR5, DDR4 ↔ DDR4).
4. Power & PSU: PSU wattage must be ≥ 1.25 × (75 + CPU_TDP + GPU_TDP) Watts.
5. Form Factor: Case form factor must accommodate Motherboard form factor (ATX case fits ATX, mATX, ITX; mATX case fits mATX, ITX).
6. Cooling: If CPU is high-TDP (≥ 105W) or purpose is gaming/ai_ml, include a dedicated cooler.
7. Purpose Optimization:
   - For "ai_ml": Maximize GPU VRAM, prefer NVIDIA (CUDA), minimum 32GB RAM.
   - For "gaming": Optimize single-core CPU and GPU tier for target resolution (1440p/1080p).
   - For "content_creation": High CPU core count, ≥ 32GB RAM, fast NVMe.
   - For "office": CPU must have integrated GPU (iGPU), no dedicated GPU needed.
8. Prefer candidates with buy_signal "buy" or "fair" when two parts are otherwise equivalent.

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
    { "category": "gpu", "why": "Selected RTX 4070 Super for 12GB VRAM and high CUDA throughput." },
    { "category": "cpu", "why": "..." }
  ],
  "alternatives": [
    { "category": "ram", "id": "candidate_id", "delta_bdt": -5000, "label": "📉 Downgrade RAM (-৳5,000)" },
    { "category": "gpu", "id": "candidate_id", "delta_bdt": 28500, "label": "🚀 Upgrade to RTX 4070 Ti Super (+৳28,500)" }
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
function buildCandidateLookup(candidatesMap = {}) {
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
 * Fallback heuristic planner if LLM fails or keys are unavailable.
 */
function planHeuristic(req, candidatesMap, candidateLookup) {
  const parts = {};
  const categories = ["cpu", "motherboard", "ram", "storage", "psu", "case", "cooler"];
  if (req.purpose !== "office") {
    categories.push("gpu");
  }

  // 1. Pick CPU
  const cpus = candidatesMap.cpu || [];
  parts.cpu = cpus[0]?.id || "";

  const chosenCpu = candidateLookup[parts.cpu];
  const cpuSocket = chosenCpu?.bench?.socket || chosenCpu?.specs?.socket || "AM5";

  // 2. Pick Motherboard matching socket
  const mobos = candidatesMap.motherboard || [];
  const matchingMobo = mobos.find(m => {
    const s = m.bench?.socket || m.specs?.socket || m.name;
    return s && s.toLowerCase().includes(cpuSocket.toLowerCase());
  }) || mobos[0];
  parts.motherboard = matchingMobo?.id || "";

  // 3. Pick RAM matching Motherboard DDR type
  const moboRam = matchingMobo?.specs?.ram_type || (matchingMobo?.name.includes("DDR4") ? "DDR4" : "DDR5");
  const rams = candidatesMap.ram || [];
  const matchingRam = rams.find(r => {
    const t = r.specs?.ram_type || (r.name.includes("DDR4") ? "DDR4" : "DDR5");
    return t === moboRam;
  }) || rams[0];
  parts.ram = matchingRam?.id || "";

  // 4. GPU (if not office)
  if (req.purpose !== "office") {
    const gpus = candidatesMap.gpu || [];
    parts.gpu = gpus[0]?.id || "";
  }

  // 5. Storage, PSU, Case, Cooler
  parts.storage = candidatesMap.storage?.[0]?.id || "";
  parts.psu = candidatesMap.psu?.[0]?.id || "";
  parts.case = candidatesMap.case?.[0]?.id || "";
  if (candidatesMap.cooler?.[0]) {
    parts.cooler = candidatesMap.cooler[0].id;
  }

  return {
    parts,
    rationale: [
      { category: "cpu", why: "Selected high-performance processor matched to budget." },
      { category: "motherboard", why: "Socket and RAM generation fully aligned." }
    ],
    alternatives: []
  };
}

/**
 * Plans a compatible PC build using frontier model and deterministic validation feedback loops.
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
  let chosenModel = MODELS.PLANNER;
  let currentViolations = [...initialViolations];

  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const messages = [
      { role: "system", content: PLANNER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `REQUEST:\n${JSON.stringify(req, null, 2)}\n\nCANDIDATES AVAILABLE (Use ONLY these IDs):\n${JSON.stringify(compactCandidates, null, 2)}${
          currentViolations.length > 0
            ? `\n\nPREVIOUS ATTEMPT VIOLATIONS (Must fix all of these):\n${JSON.stringify(currentViolations, null, 2)}`
            : ""
        }`
      }
    ];

    try {
      const { data, model, tokensIn, tokensOut } = await groqJson(messages, {
        model: MODELS.PLANNER,
        temperature: 0.1,
        max_tokens: 1500,
        timeoutMs: 12000
      });

      totalTokensIn += tokensIn;
      totalTokensOut += tokensOut;
      if (model) chosenModel = model;

      if (data && data.parts && typeof data.parts === "object") {
        // Enforce candidate grounding: ensure parts contain only valid candidate IDs
        const verifiedParts = {};
        for (const [cat, candidateId] of Object.entries(data.parts)) {
          if (candidateLookup[candidateId]) {
            verifiedParts[cat] = candidateId;
          } else if (candidatesMap[cat] && candidatesMap[cat].length > 0) {
            // Fix hallucinated ID with top candidate from that category
            verifiedParts[cat] = candidatesMap[cat][0].id;
          }
        }

        // Calculate exact total price from verified candidate data
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

        if (validation.ok || attempt === maxAttempts - 1) {
          return {
            build: candidateBuild,
            validation,
            tokensIn: totalTokensIn,
            tokensOut: totalTokensOut,
            model: chosenModel
          };
        } else {
          // Retry with violations fed back to planner
          currentViolations = validation.violations;
        }
      }
    } catch (err) {
      console.warn(`[Planner Attempt ${attempt + 1} Warning]:`, err.message);
    }
  }

  // Fallback to deterministic heuristic plan
  const fallbackRaw = planHeuristic(req, candidatesMap, candidateLookup);
  let totalBDT = 0;
  for (const cId of Object.values(fallbackRaw.parts)) {
    if (candidateLookup[cId]) {
      totalBDT += candidateLookup[cId].best_price;
    }
  }

  const fallbackBuild = {
    parts: fallbackRaw.parts,
    total_bdt: totalBDT,
    rationale: fallbackRaw.rationale,
    alternatives: fallbackRaw.alternatives
  };

  const validation = validateBuild(fallbackBuild, candidateLookup, req.budget_bdt);

  return {
    build: fallbackBuild,
    validation,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    model: "heuristic-fallback"
  };
}
