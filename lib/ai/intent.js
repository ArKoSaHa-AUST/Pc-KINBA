import { groqJson, MODELS } from "./llm.js";
import { BuildRequestSchema } from "./schemas.js";

const INTENT_SYSTEM_PROMPT = `You extract PC-build requirements for the Bangladesh market. Output ONLY JSON matching:
{
  "budget_bdt": number,
  "purpose": "ai_ml" | "gaming" | "content_creation" | "streaming" | "office" | "general",
  "constraints": {
    "min_vram_gb": number (optional),
    "min_ram_gb": number (optional),
    "min_storage_gb": number (optional),
    "prefer_brand": { "cpu": "amd"|"intel", "gpu": "nvidia"|"amd" } (optional),
    "form_factor": "ITX"|"mATX"|"ATX" (optional),
    "quiet": boolean (optional),
    "rgb": boolean (optional)
  },
  "include_peripherals": boolean,
  "language": "en" | "bn"
}
Rules:
- "lakh" / "lac" / "লাখ" = 100000; "k" / "হাজার" = 1000; "cr" / "crore" = 10000000. If no budget specified, use 0.
- Bengali input is supported. Set "language": "bn" if user writes in Bengali.
- Machine learning / deep learning / AI / LLM / CUDA / PyTorch / training -> "ai_ml".
- Video editing / Premiere / DaVinci / Blender / 3D animation / rendering -> "content_creation".
- Gaming / 1440p / 1080p / high fps / esports / গেমিং -> "gaming".
- Office / browsing / accounting / school / basic / no GPU -> "office".
- Streaming / OBS / Twitch / YouTube stream -> "streaming".
- For ai_ml: automatically set min_vram_gb: 12 (or 16 if budget >= 250000), min_ram_gb: 32, prefer_brand.gpu: "nvidia".`;

/**
 * Fallback deterministic regex intent parser if LLM is unavailable.
 */
export function parseIntentRegex(message = "") {
  const text = message.toLowerCase();
  const isBn = /[\u0980-\u09FF]/.test(message);

  // 1. Budget extraction
  let budget = 0;
  
  // English regexes
  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs|lakhs)\b/i);
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  const tkMatch = text.match(/(?:tk|bdt|৳|taka)\s*(\d[\d,]*)/i) || text.match(/(\d[\d,]*)\s*(?:tk|bdt|৳|taka)/i);

  // Bengali number converters
  const bnToEnDigits = (str) => str.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
  const bnLakhMatch = message.match(/([০-৯]+(?:\.[০-৯]+)?|\d+(?:\.\d+)?)\s*(?:লাখ|লাক)/);
  const bnHajarMatch = message.match(/([০-৯]+(?:\.[০-৯]+)?|\d+(?:\.\d+)?)\s*(?:হাজার)/);

  if (lakhMatch) {
    budget = Math.round(parseFloat(lakhMatch[1]) * 100000);
  } else if (bnLakhMatch) {
    budget = Math.round(parseFloat(bnToEnDigits(bnLakhMatch[1])) * 100000);
  } else if (kMatch) {
    budget = Math.round(parseFloat(kMatch[1]) * 1000);
  } else if (bnHajarMatch) {
    budget = Math.round(parseFloat(bnToEnDigits(bnHajarMatch[1])) * 1000);
  } else if (tkMatch) {
    const rawNum = tkMatch[1].replace(/,/g, "");
    budget = Math.round(parseFloat(rawNum));
  }

  // 2. Purpose extraction
  let purpose = "general";
  if (/machine learning|deep learning|\bai\b|\bml\b|llm|cuda|pytorch|tensorflow|neural/i.test(text)) {
    purpose = "ai_ml";
  } else if (/edit|video|premiere|davinci|blender|3d|render|after effects|photoshop|content/i.test(text)) {
    purpose = "content_creation";
  } else if (/gaming|game|1440p|1080p|4k|fps|esports|steam|গেমিং/i.test(text)) {
    purpose = "gaming";
  } else if (/stream|streaming|obs|twitch|live/i.test(text)) {
    purpose = "streaming";
  } else if (/office|school|browse|basic|word|excel|student|অফিস|নরমাল/i.test(text)) {
    purpose = "office";
  }

  // 3. Constraints
  const constraints = {};
  if (purpose === "ai_ml") {
    constraints.min_vram_gb = budget >= 250000 ? 16 : 12;
    constraints.min_ram_gb = 32;
    constraints.prefer_brand = { gpu: "nvidia" };
  } else if (purpose === "content_creation") {
    constraints.min_ram_gb = 32;
  }

  if (/\bwhite\b|সাদা/i.test(text)) constraints.rgb = true;
  if (/\bitx\b|\bmini\b|\bcompact\b/i.test(text)) constraints.form_factor = "ITX";
  if (/\bintel only\b|\bintel\b/i.test(text) && !/amd/i.test(text)) {
    constraints.prefer_brand = { ...(constraints.prefer_brand || {}), cpu: "intel" };
  } else if (/\bamd only\b|\bryzen\b/i.test(text) && !/intel/i.test(text)) {
    constraints.prefer_brand = { ...(constraints.prefer_brand || {}), cpu: "amd" };
  }

  return {
    budget_bdt: budget,
    purpose,
    constraints,
    include_peripherals: /monitor|keyboard|mouse|headphone|মনিটর/i.test(text),
    language: isBn ? "bn" : "en"
  };
}

/**
 * Parses user message into a validated BuildRequest.
 * 
 * @param {string} message - User natural language query
 * @param {Array<{ role: string, content: string }>} [history=[]] - Conversation context
 * @returns {Promise<{ request: import("./schemas.js").BuildRequest, tokensIn: number, tokensOut: number, model: string }>}
 */
export async function parseIntent(message, history = []) {
  if (!message || !message.trim()) {
    return {
      request: BuildRequestSchema.parse({}),
      tokensIn: 0,
      tokensOut: 0,
      model: "default"
    };
  }

  const messages = [
    { role: "system", content: INTENT_SYSTEM_PROMPT }
  ];

  // Include last 2 turns of conversation context if available
  if (history && history.length > 0) {
    const recent = history.slice(-2);
    for (const h of recent) {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: "user", content: message });

  try {
    const { data, model, tokensIn, tokensOut } = await groqJson(messages, {
      model: MODELS.OPEN,
      temperature: 0.1,
      max_tokens: 256,
      timeoutMs: 6000
    });

    if (data && typeof data === "object") {
      const validated = BuildRequestSchema.safeParse(data);
      if (validated.success) {
        return {
          request: validated.data,
          tokensIn,
          tokensOut,
          model
        };
      }
    }
  } catch (err) {
    console.warn("[Intent Parser LLM Warning]:", err.message);
  }

  // Fallback to deterministic regex parser
  const fallback = parseIntentRegex(message);
  return {
    request: BuildRequestSchema.parse(fallback),
    tokensIn: 0,
    tokensOut: 0,
    model: "regex-fallback"
  };
}
