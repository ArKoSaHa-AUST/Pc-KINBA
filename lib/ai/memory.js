import { groqJson, MODELS } from "./llm.js";

export const MAX_CONTEXT_TURNS = 8;        // full-fidelity recent turns kept verbatim
export const MAX_CONTEXT_CHARS = 12000;    // hard cap on serialised history sent to any LLM call
export const SUMMARISE_AFTER_TURNS = 6;    // roll older turns into a running summary past this

/**
 * Creates an empty conversation memory instance.
 *
 * @param {string} sessionId
 * @returns {ConversationMemory}
 */
export function createMemory(sessionId) {
  return {
    sessionId,
    turns: [],
    summary: null,
    pinnedConstraints: {
      budget_bdt: 0,
      purpose: "general",
      constraints: {},
      locked_parts: {},
      rejected_parts: {},
      language: "en"
    },
    lastAccessed: Date.now()
  };
}

/**
 * Appends a conversation turn to memory.
 *
 * @param {ConversationMemory} memory
 * @param {'user'|'assistant'|'system'} role
 * @param {string} content
 */
export function appendTurn(memory, role, content) {
  if (!memory) return;
  if (!Array.isArray(memory.turns)) memory.turns = [];

  memory.turns.push({
    role,
    content: typeof content === "string" ? content : JSON.stringify(content),
    timestamp: Date.now()
  });
  memory.lastAccessed = Date.now();
}

/**
 * Returns the structured, never-summarised pinned constraints.
 *
 * @param {ConversationMemory} memory
 * @returns {Object}
 */
export function getPinnedConstraints(memory) {
  if (!memory || !memory.pinnedConstraints) {
    return {
      budget_bdt: 0,
      purpose: "general",
      constraints: {},
      locked_parts: {},
      rejected_parts: {},
      language: "en"
    };
  }
  return memory.pinnedConstraints;
}

/**
 * Updates pinned constraints with newly resolved preferences or requirements.
 *
 * @param {ConversationMemory} memory
 * @param {Object} updates
 */
export function updatePinnedConstraints(memory, updates = {}) {
  if (!memory) return;
  if (!memory.pinnedConstraints) memory.pinnedConstraints = getPinnedConstraints(memory);

  const pc = memory.pinnedConstraints;
  if (updates.budget_bdt && updates.budget_bdt > 0) {
    pc.budget_bdt = updates.budget_bdt;
  }
  if (updates.purpose && updates.purpose !== "general") {
    pc.purpose = updates.purpose;
  }
  if (updates.language && (updates.language === "en" || updates.language === "bn")) {
    pc.language = updates.language;
  }
  if (updates.constraints && typeof updates.constraints === "object") {
    pc.constraints = { ...pc.constraints, ...updates.constraints };
  }
  if (updates.locked_parts && typeof updates.locked_parts === "object") {
    pc.locked_parts = { ...pc.locked_parts, ...updates.locked_parts };
  }
  if (updates.rejected_parts && typeof updates.rejected_parts === "object") {
    for (const [cat, parts] of Object.entries(updates.rejected_parts)) {
      if (!Array.isArray(pc.rejected_parts[cat])) pc.rejected_parts[cat] = [];
      const list = Array.isArray(parts) ? parts : [parts];
      for (const p of list) {
        if (!pc.rejected_parts[cat].includes(p)) {
          pc.rejected_parts[cat].push(p);
        }
      }
    }
  }
  memory.lastAccessed = Date.now();
}

/**
 * Generates a deterministic fallback summary from pinned constraints.
 *
 * @param {Object} pinnedConstraints
 * @returns {string}
 */
export function generateDeterministicSummary(pinnedConstraints = {}) {
  const parts = [];
  if (pinnedConstraints.budget_bdt > 0) {
    parts.push(`Budget: ৳${pinnedConstraints.budget_bdt.toLocaleString("en-IN")}`);
  }
  if (pinnedConstraints.purpose && pinnedConstraints.purpose !== "general") {
    parts.push(`Purpose: ${pinnedConstraints.purpose}`);
  }
  if (pinnedConstraints.constraints?.prefer_brand?.cpu) {
    parts.push(`Preferred CPU brand: ${pinnedConstraints.constraints.prefer_brand.cpu}`);
  }
  if (pinnedConstraints.constraints?.prefer_brand?.gpu) {
    parts.push(`Preferred GPU brand: ${pinnedConstraints.constraints.prefer_brand.gpu}`);
  }
  if (pinnedConstraints.constraints?.form_factor) {
    parts.push(`Form factor: ${pinnedConstraints.constraints.form_factor}`);
  }
  if (pinnedConstraints.locked_parts && Object.keys(pinnedConstraints.locked_parts).length > 0) {
    const locked = Object.entries(pinnedConstraints.locked_parts).map(([k, v]) => `${k}:${v}`).join(", ");
    parts.push(`Locked parts: [${locked}]`);
  }
  if (pinnedConstraints.rejected_parts && Object.keys(pinnedConstraints.rejected_parts).length > 0) {
    const rejected = Object.entries(pinnedConstraints.rejected_parts)
      .filter(([, v]) => Array.isArray(v) && v.length > 0)
      .map(([k, v]) => `${k}: ${v.join(", ")}`)
      .join("; ");
    if (rejected) parts.push(`Rejected parts: [${rejected}]`);
  }
  return parts.length > 0 ? parts.join(" | ") : "User is configuring a custom PC build.";
}

/**
 * Compacts turns older than MAX_CONTEXT_TURNS into a single running summary.
 * Uses groqJson to extract only durable facts, falling back to a deterministic template.
 *
 * @param {ConversationMemory} memory
 * @returns {Promise<void>}
 */
export async function summariseOlderTurns(memory) {
  if (!memory || !Array.isArray(memory.turns)) return;
  if (memory.turns.length <= SUMMARISE_AFTER_TURNS) return;

  const turnsToCompactCount = Math.max(0, memory.turns.length - SUMMARISE_AFTER_TURNS);
  if (turnsToCompactCount === 0) return;

  const turnsToCompact = memory.turns.slice(0, turnsToCompactCount);
  const verbatimTurns = memory.turns.slice(turnsToCompactCount);

  const promptMessages = [
    {
      role: "system",
      content: `You are the conversation state summarizer for Tonima AI, a PC builder assistant in Bangladesh.
Extract ONLY durable user facts: budget, primary purpose/workload, brand/aesthetic/form-factor preferences, parts the user explicitly locked, and parts the user rejected or disliked.
Do NOT summarize prices or component specs (those are queried live).
Return valid JSON:
{
  "summary": "1-3 crisp sentences summarizing active user constraints and requirements",
  "budget_bdt": number (0 if unstated),
  "purpose": "gaming" | "ai_ml" | "content_creation" | "streaming" | "office" | "general",
  "locked_parts": { "category": "part_id" },
  "rejected_parts": { "category": ["part_name_or_keyword"] }
}`
    },
    {
      role: "user",
      content: `Prior Summary: ${memory.summary || "None"}\n\nOlder conversation turns to compact:\n${JSON.stringify(turnsToCompact, null, 2)}`
    }
  ];

  try {
    const { data } = await groqJson(promptMessages, {
      model: MODELS.OPEN,
      temperature: 0.1,
      max_tokens: 300,
      timeoutMs: 6000
    });

    if (data && typeof data === "object") {
      memory.summary = data.summary || generateDeterministicSummary(memory.pinnedConstraints);

      if (data.budget_bdt && data.budget_bdt > 0) {
        updatePinnedConstraints(memory, { budget_bdt: data.budget_bdt });
      }
      if (data.purpose && data.purpose !== "general") {
        updatePinnedConstraints(memory, { purpose: data.purpose });
      }
      if (data.locked_parts && typeof data.locked_parts === "object") {
        updatePinnedConstraints(memory, { locked_parts: data.locked_parts });
      }
      if (data.rejected_parts && typeof data.rejected_parts === "object") {
        updatePinnedConstraints(memory, { rejected_parts: data.rejected_parts });
      }
    } else {
      memory.summary = generateDeterministicSummary(memory.pinnedConstraints);
    }
  } catch (err) {
    console.warn("[Summarisation Fallback Note]:", err.message);
    memory.summary = generateDeterministicSummary(memory.pinnedConstraints);
  }

  memory.turns = verbatimTurns;
}

/**
 * Returns conversation history for an LLM call, guaranteed not to exceed MAX_CONTEXT_CHARS.
 * Trims from the oldest verbatim turn forward, never dropping the summary or pinned constraints.
 *
 * @param {ConversationMemory} memory
 * @returns {Array<{ role: string, content: string }>}
 */
export function getPromptHistory(memory) {
  if (!memory) return [];

  const history = [];

  // Pinned constraints and summary are anchored first
  const pinnedSummary = generateDeterministicSummary(memory.pinnedConstraints);
  const summaryContent = memory.summary ? `${memory.summary} (${pinnedSummary})` : pinnedSummary;

  if (summaryContent) {
    history.push({
      role: "system",
      content: `[Conversation Memory - Pinned Constraints & Context]: ${summaryContent}`
    });
  }

  // Add recent verbatim turns
  const verbatimTurns = Array.isArray(memory.turns) ? memory.turns.slice(-MAX_CONTEXT_TURNS) : [];
  for (const turn of verbatimTurns) {
    history.push({ role: turn.role, content: turn.content });
  }

  // Hard context character cap check
  const calcTotalChars = (items) => items.reduce((sum, item) => sum + (item.content?.length || 0), 0);

  let totalChars = calcTotalChars(history);
  if (totalChars <= MAX_CONTEXT_CHARS) {
    return history;
  }

  // Trim from oldest verbatim turn forward (keeping summary at index 0 if present)
  const hasSummary = history.length > 0 && history[0].role === "system";
  const trimStartIndex = hasSummary ? 1 : 0;

  while (totalChars > MAX_CONTEXT_CHARS && history.length > (hasSummary ? 2 : 1)) {
    // Remove oldest verbatim turn
    const removed = history.splice(trimStartIndex, 1)[0];
    totalChars -= (removed?.content?.length || 0);
  }

  // If still overflowing because a single verbatim turn is massive, truncate that turn
  if (totalChars > MAX_CONTEXT_CHARS && history.length > trimStartIndex) {
    const overflow = totalChars - MAX_CONTEXT_CHARS;
    const lastVerbatim = history[history.length - 1];
    if (lastVerbatim && lastVerbatim.content.length > overflow + 50) {
      lastVerbatim.content = lastVerbatim.content.slice(0, -overflow);
    }
  }

  return history;
}

/**
 * Bound an active sessions map with an LRU cap and TTL eviction.
 *
 * @param {Map<string, any>} sessionsMap
 * @param {number} [maxSessions=500]
 * @param {number} [ttlMs=7200000] 2 hours
 */
export function sweepActiveSessions(sessionsMap, maxSessions = 500, ttlMs = 2 * 60 * 60 * 1000) {
  if (!sessionsMap || !(sessionsMap instanceof Map)) return;

  const now = Date.now();

  // 1. Evict idle sessions exceeding TTL
  for (const [id, session] of sessionsMap.entries()) {
    const lastActive = session.lastAccessed || session.updated_at || 0;
    if (now - lastActive > ttlMs) {
      sessionsMap.delete(id);
    }
  }

  // 2. Enforce LRU capacity cap
  if (sessionsMap.size > maxSessions) {
    const entries = Array.from(sessionsMap.entries()).sort((a, b) => {
      const timeA = a[1].lastAccessed || a[1].updated_at || 0;
      const timeB = b[1].lastAccessed || b[1].updated_at || 0;
      return timeA - timeB; // oldest first
    });

    const toRemoveCount = sessionsMap.size - maxSessions;
    for (let i = 0; i < toRemoveCount; i++) {
      sessionsMap.delete(entries[i][0]);
    }
  }
}
