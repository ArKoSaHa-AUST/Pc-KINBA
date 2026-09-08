import dotenv from "dotenv";
import { groqPool } from "../groq.js";

dotenv.config();

export const MODELS = {
  PLANNER: process.env.AI_PLANNER_MODEL || "openai/gpt-oss-120b",
  PLANNER_FALLBACK: process.env.AI_PLANNER_FALLBACK || "openai/gpt-oss-20b",
  OPEN: process.env.AI_OPEN_MODEL || "qwen/qwen3.8-27b",
  OPEN_FALLBACK: "qwen/qwen3.6-27b"
};

/**
 * Calls Groq chat completions in structured JSON mode with automatic key rotation and model fallback.
 * 
 * @param {Array<{ role: string, content: string }>} messages 
 * @param {Object} [options]
 * @param {string} [options.model]
 * @param {number} [options.temperature=0.2]
 * @param {number} [options.max_tokens=2048]
 * @param {number} [options.timeoutMs=15000]
 * @returns {Promise<{ data: any|null, rawText: string, model: string, tokensIn: number, tokensOut: number }>}
 */
export async function groqJson(messages, options = {}) {
  const primaryModel = options.model || MODELS.OPEN;
  const modelsToTry = [primaryModel];
  
  if (primaryModel === MODELS.PLANNER) {
    modelsToTry.push(MODELS.PLANNER_FALLBACK, MODELS.OPEN);
  } else if (primaryModel === MODELS.OPEN) {
    modelsToTry.push(MODELS.OPEN_FALLBACK, MODELS.PLANNER_FALLBACK);
  }

  for (const model of modelsToTry) {
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
            response_format: { type: "json_object" },
            temperature: options.temperature ?? 0.2,
            max_tokens: options.max_tokens ?? 2048
          }),
          signal: AbortSignal.timeout(options.timeoutMs || 15000)
        });

        if (response.status === 429 || response.status === 401 || response.status === 402 || response.status === 403) {
          const errText = await response.text().catch(() => "");
          console.warn(`[Groq Rate/Token Limit ${response.status} on ${model}]: ${errText.slice(0, 100)}`);
          groqPool.markExhausted(apiKey, 60000);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.warn(`[Groq HTTP ${response.status} on ${model}]: ${errText.slice(0, 150)}`);
          if (/model_not_found|does not exist/i.test(errText)) {
            // Model not supported, break out of key loop and try fallback model
            break;
          }
          if (/token|rate.?limit|quota|tpm|tpd|rpm|rpd|exceeded/i.test(errText)) {
            groqPool.markExhausted(apiKey, 60000);
          } else {
            groqPool.rotateNext();
          }
          continue;
        }

        const resJson = await response.json();
        const rawContent = resJson.choices?.[0]?.message?.content || "{}";
        const tokensIn = resJson.usage?.prompt_tokens || 0;
        const tokensOut = resJson.usage?.completion_tokens || 0;

        let parsed = null;
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          // Extract JSON block if surrounded by markdown fences
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        }

        return {
          data: parsed,
          rawText: rawContent,
          model,
          tokensIn,
          tokensOut
        };
      } catch (err) {
        console.warn(`[Groq JSON Attempt ${attempt + 1}/${maxAttempts} Warning on ${model}]:`, err.message);
        if (err.name === "TimeoutError" || err.name === "AbortError" || /fetch failed/i.test(err.message)) {
          groqPool.rotateNext();
        }
      }
    }
  }

  // Final fallback: return empty object if all models and keys failed
  return {
    data: null,
    rawText: "",
    model: "none",
    tokensIn: 0,
    tokensOut: 0
  };
}

/**
 * Streams chat completions token-by-token using Groq SSE streaming with key rotation fallback.
 * 
 * @param {Array<{ role: string, content: string }>} messages 
 * @param {Object} [options]
 * @param {string} [options.model]
 * @param {number} [options.temperature=0.4]
 * @param {number} [options.max_tokens=1024]
 * @returns {AsyncGenerator<string, void, unknown>}
 */
export async function* groqStream(messages, options = {}) {
  const model = options.model || MODELS.OPEN;
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
          stream: true,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.max_tokens ?? 1024
        }),
        signal: AbortSignal.timeout(options.timeoutMs || 25000)
      });

      if (response.status === 429 || response.status === 401 || response.status === 402 || response.status === 403) {
        groqPool.markExhausted(apiKey, 60000);
        continue;
      }

      if (!response.ok) {
        groqPool.rotateNext();
        continue;
      }

      if (!response.body) {
        groqPool.rotateNext();
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") return;

          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const token = data.choices?.[0]?.delta?.content;
              if (token) {
                yield token;
              }
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      }

      return;
    } catch (err) {
      console.warn(`[Groq Stream Attempt ${attempt + 1}/${maxAttempts}]:`, err.message);
      groqPool.rotateNext();
    }
  }
}
