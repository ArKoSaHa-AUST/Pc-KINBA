import dotenv from "dotenv";

dotenv.config();

/**
 * Professional Groq API Key Manager
 * Handles multi-key pool parsing (GROQ_API_KEYS="key1,key2,key3..."),
 * tracks exhausted/rate-limited keys, and seamlessly rotates to the next
 * healthy key when tokens or quotas are exhausted.
 */
class GroqKeyPoolManager {
  constructor() {
    this.keys = this.loadKeys();
    this.currentIndex = 0;
    // Map of key -> cooldown expiry timestamp (ms)
    this.cooldowns = new Map();
  }

  /**
   * Parses and returns all available Groq API keys from .env
   */
  loadKeys() {
    const keys = [];

    // Parse comma-separated GROQ_API_KEYS (Standard professional notation: "key1,key2,key3...")
    const rawKeysEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
    if (rawKeysEnv) {
      const parsed = rawKeysEnv
        .split(",")
        .map(k => k.trim().replace(/^["']|["']$/g, ""))
        .filter(k => k.length > 0 && (k.startsWith("gsk_") || k.length > 20));

      for (const k of parsed) {
        if (!keys.includes(k)) {
          keys.push(k);
        }
      }
    }

    return keys;
  }

  /**
   * Returns current list of keys (reloads if empty)
   */
  getKeys() {
    if (this.keys.length === 0) {
      this.keys = this.loadKeys();
    }
    return this.keys;
  }

  /**
   * Total number of configured keys
   */
  get size() {
    return this.getKeys().length;
  }

  /**
   * Gets the current active API key that is not cooling down.
   */
  getActiveKey() {
    const pool = this.getKeys();
    if (pool.length === 0) return "";

    const now = Date.now();

    // Clean up expired cooldowns
    for (const [key, expireTime] of this.cooldowns.entries()) {
      if (now >= expireTime) {
        this.cooldowns.delete(key);
      }
    }

    // Find the first non-cooldown key starting from currentIndex
    for (let i = 0; i < pool.length; i++) {
      const idx = (this.currentIndex + i) % pool.length;
      const key = pool[idx];
      if (!this.cooldowns.has(key)) {
        this.currentIndex = idx;
        return key;
      }
    }

    // If all keys are currently in cooldown, reset cooldowns and use the current key
    this.cooldowns.clear();
    return pool[this.currentIndex % pool.length];
  }

  /**
   * Marks a key as exhausted (token limit, 429, quota) and immediately rotates to the next key.
   * @param {string} key - The exhausted API key
   * @param {number} cooldownMs - Cooldown duration in milliseconds (default 60s)
   */
  markExhausted(key, cooldownMs = 60000) {
    if (!key) return;
    const pool = this.getKeys();
    console.warn(`[Groq Key Manager] Active key #${this.currentIndex + 1}/${pool.length} reached token/rate limit. Rotating to next key.`);

    this.cooldowns.set(key, Date.now() + cooldownMs);

    if (pool.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % pool.length;
    }
  }

  /**
   * Manually rotate to next key
   */
  rotateNext() {
    const pool = this.getKeys();
    if (pool.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % pool.length;
    }
    return this.getActiveKey();
  }
}

export const groqPool = new GroqKeyPoolManager();

/**
 * Returns the next available Groq API key from the pool.
 */
export function getNextGroqKey() {
  return groqPool.getActiveKey();
}

/**
 * Returns array of all loaded Groq API keys.
 */
export function getGroqKeyPool() {
  return groqPool.getKeys();
}

/**
 * Executes a chat completion against Groq API with automatic token-exhaustion
 * failover across all keys in the pool.
 */
export async function callGroqWithRotation(messages, options = {}) {
  const model = options.model || "qwen/qwen3.8-27b";
  const poolKeys = groqPool.getKeys();
  const maxAttempts = Math.max(poolKeys.length, 3);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = groqPool.getActiveKey();
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
        signal: AbortSignal.timeout(options.timeoutMs || 4000)
      });

      // 429: Rate limit / Token limit reached
      // 401: Invalid / Expired key
      // 402 / 403: Quota exhausted
      if (response.status === 429 || response.status === 401 || response.status === 402 || response.status === 403) {
        const errText = await response.text().catch(() => "");
        console.warn(`[Groq Token Limit] HTTP ${response.status} returned by Groq API: ${errText.slice(0, 100)}`);
        groqPool.markExhausted(apiKey, 60000);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(`[Groq Error ${response.status}]: ${errText.slice(0, 150)}`);
        if (/token|rate.?limit|quota|tpm|tpd|rpm|rpd|exceeded/i.test(errText)) {
          groqPool.markExhausted(apiKey, 60000);
        } else {
          groqPool.rotateNext();
        }
        continue;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.warn(`[Groq Attempt ${attempt + 1}/${maxAttempts} Warning]:`, err.message);
      if (err.name === "TimeoutError" || err.name === "AbortError" || /fetch failed/i.test(err.message)) {
        groqPool.rotateNext();
      }
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
    const raw = await callGroqWithRotation(messages, { timeoutMs: 2500, model: "qwen/qwen3.8-27b" });
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

