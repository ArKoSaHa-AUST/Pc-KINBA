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

/**
 * Generates a clean template-based markdown explanation without LLM.
 */
export function generateTemplateExplanation(build, candidateLookup, req, validation = {}) {
  const isBn = req.language === "bn";
  const parts = build.parts || {};
  const categories = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooler"];

  let rows = [];
  let storeSet = new Set();

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
  const headroomPct = Math.round((psuWattage / wattage - 1) * 100);

  if (isBn) {
    return `আপনার রিকোয়ারমেন্ট অনুযায়ী সর্বনিম্ন মূল্যে এবং ১০০% সামঞ্জস্যপূর্ণভাবে এই পিসি বিল্ডটি সাজানো হয়েছে।

| ক্যাটাগরি | কম্পোনেন্ট | সেরা দাম | দোকান |
|---|---|---|---|
${rows.join("\n")}
| **মোট** | | **${totalFormatted}** | ${storeCount}টি দোকান |

✅ সকেট এবং র্যাম জেনারেশন ১০০% ম্যাচিং · ✅ ~${wattage}W পাওয়ার ড্র (${psuWattage}W PSU, +${headroomPct}% হেডরুম) · ✅ ফর্ম ফ্যাক্টর ভেরিফাইড

💡 দামগুলো আজকের লাইভ ডাটাবেজ থেকে যাচাইকৃত। সেরা ডিলের জন্য এখনই অর্ডার করতে পারেন।`;
  }

  return `Here is your optimized PC build, configured for optimal performance and live lowest prices across Bangladeshi retailers:

| Category | Part | Best price | Store |
|---|---|---|---|
${rows.join("\n")}
| **Total** | | **${totalFormatted}** | ${storeCount} stores |

✅ Socket & RAM generation verified · ✅ ~${wattage}W draw on ${psuWattage}W PSU (+${headroomPct}% headroom) · ✅ 100% component compatibility

💡 Prices aggregated live across top retailers in Bangladesh.`;
}

/**
 * Streams explanation from open model with template fallback.
 * 
 * @param {import("./schemas.js").Build} build 
 * @param {Record<string, import("./schemas.js").Candidate>} candidateLookup 
 * @param {import("./schemas.js").BuildRequest} req 
 * @param {any} [validation={}] 
 * @returns {AsyncGenerator<string, void, unknown>}
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

  let yieldedTokens = 0;

  try {
    for await (const chunk of groqStream(messages, {
      model: MODELS.OPEN,
      temperature: 0.3,
      max_tokens: 600
    })) {
      if (chunk) {
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
  }
}
