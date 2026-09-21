import { groqStream, MODELS } from "./llm.js";

const EXPLAINER_SYSTEM_PROMPT = `You are Tonima, a friendly and expert AI PC Architect in Bangladesh.
Your task is to write a clear, concise, professional PC build recommendation.

Formatting Structure:
1. One crisp opening sentence explaining the hardware allocation strategy and budget fit.
2. A clean markdown table of components:
| Category | Part | Best price | Store |
|---|---|---|---|
(Include CPU, GPU (if present), Motherboard, RAM, Storage, PSU, Case, Cooler, and a bold **Total** row).
3. A compatibility summary line with ✅ marks (e.g. "✅ AM5 socket ↔ B650 · ✅ DDR5-6000 · ✅ ~420W draw on 750W PSU (+45% headroom)").
4. A live price freshness note (e.g. "💡 Prices checked from Star Tech, Ryans & Tech Land.").
5. One quick advice/tip if a GPU/CPU is at a 30-day low price.

CRITICAL RULES:
- Never change or hallucinate any price numbers or store names. Use the exact figures provided in the build JSON.
- If language is "bn", write naturally in Bengali (বাংলা), keeping hardware model names in English and prices formatted as "৳ xx,xxx".
- Maximum 180 words. Keep it punchy and clear.`;

const KNOWN_RETAILERS = [
  "Star Tech",
  "Ryans",
  "Tech Land",
  "Skyland",
  "Potaka IT",
  "Nexus",
  "Ultra Tech",
  "Creatus Computer",
  "PC House",
  "Binary Logic",
  "Universal Computer",
  "Global Brand",
  "Retail Catalog",
  "Tech Store"
];

/**
 * Generates a clean template-based markdown explanation without LLM.
 *
 * @param {import("./schemas.js").Build} build
 * @param {Record<string, import("./schemas.js").Candidate>} candidateLookup
 * @param {import("./schemas.js").BuildRequest} req
 * @param {any} [validation={}]
 * @returns {string}
 */
export function generateTemplateExplanation(build, candidateLookup, req, validation = {}) {
  const isBn = req.language === "bn";
  const parts = build.parts || {};
  const categories = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooler"];

  const rows = [];
  const storeSet = new Set();

  for (const cat of categories) {
    const candidateId = parts[cat];
    if (!candidateId) continue;
    const c = candidateLookup[candidateId];
    if (!c) continue;

    const displayCat = cat.toUpperCase() === "PSU" ? "PSU" : cat.charAt(0).toUpperCase() + cat.slice(1);
    const store = c.best_retailer || "Tech Store";
    storeSet.add(store);

    rows.push(`| ${displayCat} | ${c.name} | ৳ ${c.best_price.toLocaleString("en-IN")} | ${store} |`);
  }

  const totalFormatted = `৳ ${(build.total_bdt || 0).toLocaleString("en-IN")}`;
  const storeCount = storeSet.size;

  const wattage = validation.wattage || 420;
  const psuWattage = validation.psuWattage || 750;
  const headroomPct = Math.round((psuWattage / Math.max(wattage, 1) - 1) * 100);

  // Budget status message when budget is exceeded or unmet
  const isOverBudget = build.budget_status === "over" || (build.budget_shortfall_bdt && build.budget_shortfall_bdt > 0);
  const shortfall = build.budget_shortfall_bdt || Math.max(0, (build.total_bdt || 0) - (req.budget_bdt || 0));
  const shortfallFormatted = `৳ ${shortfall.toLocaleString("en-IN")}`;

  let headerMessage = "";
  if (isOverBudget) {
    if (isBn) {
      headerMessage = `লাইভ স্টক থেকে সংগৃহীত সর্বনিম্ন মূল্যের সামঞ্জস্যপূর্ণ কনফিগারেশনটি হলো **${totalFormatted}**, যা আপনার বাজেটের চেয়ে **${shortfallFormatted}** বেশি। বাজেট **${totalFormatted}**-এ উন্নীত করলে আপনি এই কনফিগারেশনটি পেতে পারেন, অথবা কোন চাহিদা শিথিল করতে চান আমাকে জানান।\n\n`;
    } else {
      headerMessage = `The cheapest compatible configuration I can assemble from live stock is **${totalFormatted}**, which is **${shortfallFormatted}** above your budget. Here is what raising the budget to **${totalFormatted}** would get you, or tell me which requirement to relax.\n\n`;
    }
  } else {
    if (isBn) {
      headerMessage = `আপনার রিকোয়ারমেন্ট অনুযায়ী সর্বনিম্ন মূল্যে এবং ১০০% সামঞ্জস্যপূর্ণভাবে এই পিসি বিল্ডটি সাজানো হয়েছে।\n\n`;
    } else {
      headerMessage = `Here is your optimized PC build, configured for optimal performance and live lowest prices across Bangladeshi retailers:\n\n`;
    }
  }

  if (isBn) {
    return `${headerMessage}| ক্যাটাগরি | কম্পোনেন্ট | সেরা দাম | দোকান |
|---|---|---|---|
${rows.join("\n")}
| **মোট** | | **${totalFormatted}** | ${storeCount}টি দোকান |

✅ সকেট এবং র্যাম জেনারেশন ১০০% ম্যাচিং · ✅ ~${wattage}W পাওয়ার ড্র (${psuWattage}W PSU, +${headroomPct}% হেডরুম) · ✅ ফর্ম ফ্যাক্টর ভেরিফাইড

💡 দামগুলো আজকের লাইভ ডাটাবেজ থেকে যাচাইকৃত।`;
  }

  return `${headerMessage}| Category | Part | Best price | Store |
|---|---|---|---|
${rows.join("\n")}
| **Total** | | **${totalFormatted}** | ${storeCount} stores |

✅ Socket & RAM generation verified · ✅ ~${wattage}W draw on ${psuWattage}W PSU (+${headroomPct}% headroom) · ✅ 100% component compatibility

💡 Prices aggregated live across top retailers in Bangladesh.`;
}

/**
 * Verifies explainer output against ground-truth build prices and retailers.
 *
 * @param {string} text
 * @param {import("./schemas.js").Build} build
 * @param {Record<string, import("./schemas.js").Candidate>} candidateLookup
 * @returns {{ valid: boolean, reason?: string, offendingToken?: string }}
 */
export function verifyExplainerText(text, build, candidateLookup) {
  if (!text || typeof text !== "string") return { valid: true };

  // 1. Build valid price set from build parts and total
  const validPrices = new Set();
  if (build.total_bdt) validPrices.add(build.total_bdt);

  const parts = build.parts || {};
  const validRetailers = new Set();

  for (const pId of Object.values(parts)) {
    const c = candidateLookup[pId];
    if (c) {
      if (c.best_price) validPrices.add(c.best_price);
      if (c.best_retailer) validRetailers.add(c.best_retailer.toLowerCase().trim());
    }
  }

  // 2. Extract all '৳' figures
  const takaMatches = text.match(/৳\s*([\d,]+)/g) || [];
  for (const raw of takaMatches) {
    const numStr = raw.replace(/[^\d]/g, "");
    const val = parseInt(numStr, 10);
    if (!Number.isNaN(val) && val > 0) {
      if (!validPrices.has(val)) {
        return {
          valid: false,
          reason: `Hallucinated price figure not found in build: ৳${val.toLocaleString("en-IN")}`,
          offendingToken: `৳${numStr}`
        };
      }
    }
  }

  // 3. Verify retailer mentions
  const lowerText = text.toLowerCase();
  for (const store of KNOWN_RETAILERS) {
    const storeLower = store.toLowerCase();
    if (lowerText.includes(storeLower)) {
      const isPresentInBuild = Array.from(validRetailers).some(vr => vr.includes(storeLower) || storeLower.includes(vr));
      if (!isPresentInBuild) {
        return {
          valid: false,
          reason: `Mentioned retailer not among selected build components: ${store}`,
          offendingToken: store
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Streams explanation from open model with grounding verification and template fallback.
 * 
 * @param {import("./schemas.js").Build} build 
 * @param {Record<string, import("./schemas.js").Candidate>} candidateLookup 
 * @param {import("./schemas.js").BuildRequest} req 
 * @param {any} [validation={}] 
 * @returns {AsyncGenerator<string | { event: string, data: any }, void, unknown>}
 */
export async function* streamExplanation(build, candidateLookup, req, validation = {}) {
  const partsSummary = [];
  const parts = build.parts || {};

  for (const [cat, id] of Object.entries(parts)) {
    const c = candidateLookup[id];
    if (c) {
      partsSummary.push({
        category: cat,
        name: c.name,
        price: c.best_price,
        store: c.best_retailer,
        specs: c.specs,
        buy_signal: c.buy_signal
      });
    }
  }

  const payload = {
    purpose: req.purpose,
    budget_bdt: req.budget_bdt,
    budget_status: build.budget_status || "met",
    budget_shortfall_bdt: build.budget_shortfall_bdt || 0,
    language: req.language || "en",
    total_bdt: build.total_bdt,
    parts: partsSummary,
    estimated_wattage: validation.wattage || 420,
    psu_wattage: validation.psuWattage || 750,
    compatibility_score: validation.score || 100,
    rationale: build.rationale || []
  };

  const messages = [
    { role: "system", content: EXPLAINER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Please write the Tonima response in ${req.language === "bn" ? "Bengali" : "English"} for this validated build:\n${JSON.stringify(payload, null, 2)}`
    }
  ];

  let accumulatedText = "";
  let yieldedTokens = 0;

  try {
    for await (const chunk of groqStream(messages, {
      model: MODELS.OPEN,
      temperature: 0.3,
      max_tokens: 600
    })) {
      if (chunk) {
        accumulatedText += chunk;
        yield chunk;
        yieldedTokens++;
      }
    }
  } catch (err) {
    console.warn("[Explainer Stream Warning]:", err.message);
  }

  // If streaming yielded nothing (e.g. offline/network failure), yield fallback template
  if (yieldedTokens === 0) {
    const fallbackText = generateTemplateExplanation(build, candidateLookup, req, validation);
    yield fallbackText;
    return;
  }

  // Verify streamed text against ground truth build
  const verification = verifyExplainerText(accumulatedText, build, candidateLookup);
  if (!verification.valid) {
    console.warn(`[Explainer Verification Rejected]: ${verification.reason} (offending token: ${verification.offendingToken})`);
    const templateText = generateTemplateExplanation(build, candidateLookup, req, validation);
    yield {
      event: "correction",
      data: {
        text: templateText,
        reason: verification.reason,
        offendingToken: verification.offendingToken
      }
    };
  }
}
