import dotenv from "dotenv";

dotenv.config();

/**
 * Parses and initializes the pool of Groq API keys from .env
 */
function getGroqKeyPool() {
  const keys = [];

  // Check GROQ_API_KEYS (comma separated)
  if (process.env.GROQ_API_KEYS) {
    const rawKeys = process.env.GROQ_API_KEYS.split(",")
      .map(k => k.trim().replace(/^["']|["']$/g, ""))
      .filter(k => k.startsWith("gsk_"));
    keys.push(...rawKeys);
  }

  // Check individual GROQ_API_KEY_1 ... GROQ_API_KEY_30
  for (let i = 1; i <= 30; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k && k.startsWith("gsk_") && !keys.includes(k)) {
      keys.push(k.trim());
    }
  }

  // Check single GROQ_API_KEY
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith("gsk_") && !keys.includes(process.env.GROQ_API_KEY)) {
    keys.unshift(process.env.GROQ_API_KEY.trim());
  }

  return keys;
}

const keyPool = getGroqKeyPool();
let currentKeyIndex = 0;

/**
 * Returns next API key from pool using round-robin rotation.
 */
export function getNextGroqKey() {
  if (keyPool.length === 0) {
    return process.env.GROQ_API_KEY || "";
  }
  const key = keyPool[currentKeyIndex % keyPool.length];
  currentKeyIndex = (currentKeyIndex + 1) % keyPool.length;
  return key;
}

/**
 * Executes a chat completion against Groq API with automatic key rotation on failure or 429.
 */
export async function callGroqWithRotation(messages, options = {}) {
  const model = options.model || "qwen/qwen3.8-27b";
  const maxRetries = Math.min(keyPool.length || 3, 5);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextGroqKey();
    if (!apiKey) break;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.max_tokens ?? 256
        }),
        signal: AbortSignal.timeout(options.timeoutMs || 3500)
      });

      if (response.status === 429 || response.status === 401) {
        console.warn(`[Groq Rotation] Key ...${apiKey.slice(-6)} returned ${response.status}. Rotating to next key.`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Groq Error ${response.status}]: ${errText.slice(0, 150)}`);
        continue;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.warn(`[Groq Attempt ${attempt + 1} Error]:`, err.message);
    }
  }

  return null;
}

/**
 * Uses Groq LLM to generate instant, context-aware hardware search suggestions for a user query.
 * @param {string} query - user input prefix or query
 * @returns {Promise<string[]>}
 */
export async function getGroqSuggestions(query) {
  if (!query || query.trim().length < 2) return [];

  const messages = [
    {
      role: "system",
      content: `You are a real-time PC hardware search autocomplete engine for computer components in Bangladesh (GPU, CPU, RAM, SSD, Motherboard, Monitor, Laptop, UPS).
Given a partial search query, return a JSON array containing up to 5 exact, popular computer component search phrases matching the user's intent.
Rules:
- Only return valid JSON array of strings: ["phrase 1", "phrase 2", ...]
- Do NOT include markdown code fences, greetings, or extra explanations.
- Keep suggestions focused on real tech models (e.g. RTX 5060, RTX 5060 Ti, Ryzen 7 7800X3D, Core i5-13400F, Samsung 990 Pro).`
    },
    {
      role: "user",
      content: `Query: "${query}"`
    }
  ];

  try {
    const raw = await callGroqWithRotation(messages, { timeoutMs: 2000, model: "qwen/qwen3.8-27b" });
    if (!raw) return [];

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === "string" && item.trim().length > 0).slice(0, 5);
      }
    }
  } catch (err) {
    console.warn("[Groq Suggestions Parse Warning]:", err.message);
  }

  return [];
}
