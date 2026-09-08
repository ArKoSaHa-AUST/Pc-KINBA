import { parseIntent } from "./intent.js";
import { retrieveCandidates } from "./retriever.js";
import { planBuild } from "./planner.js";
import { streamExplanation } from "./explainer.js";
import { applyRefinement } from "./refiner.js";
import { randomUUID } from "crypto";

// 15-Minute in-memory cache for anonymous identical build requests
const IN_MEMORY_CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// In-memory active sessions store
export const ACTIVE_SESSIONS = new Map();

/**
 * Builds a cache key for build requests.
 */
function getCacheKey(req) {
  const budgetBucket = Math.round((req.budget_bdt || 0) / 5000) * 5000;
  const purpose = req.purpose || "general";
  const constraintsHash = JSON.stringify(req.constraints || {});
  const lang = req.language || "en";
  return `${purpose}_${budgetBucket}_${lang}_${constraintsHash}`;
}

/**
 * Persists session state to Supabase.
 */
async function persistSessionToDb(sessionId, userId, request, build, supabaseClient) {
  if (!supabaseClient) return;
  try {
    await supabaseClient
      .from("ai_sessions")
      .upsert({
        id: sessionId,
        user_id: userId || null,
        request,
        build,
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    // Ignore DB telemetry write errors for non-blocking execution
  }
}

/**
 * Persists chat message telemetry to Supabase.
 */
async function persistMessageToDb(sessionId, role, content, tokensIn, tokensOut, model, supabaseClient) {
  if (!supabaseClient) return;
  try {
    await supabaseClient
      .from("ai_messages")
      .insert({
        session_id: sessionId,
        role,
        content,
        tokens_in: tokensIn || 0,
        tokens_out: tokensOut || 0,
        model: model || "qwen/qwen3.8-27b",
        created_at: new Date().toISOString()
      });
  } catch (err) {
    // Ignore DB telemetry write errors
  }
}

/**
 * Main AI Orchestrator executing the complete multi-model pipeline and yielding SSE events.
 * 
 * @param {string} userMessage - User's query
 * @param {Object} [sessionContext={}] - Session context { sessionId, userId, language }
 * @param {any} [supabaseClient] - Supabase client instance
 * @returns {AsyncGenerator<{ event: string, data: any }, void, unknown>}
 */
export async function* runBuildOrchestrator(userMessage, sessionContext = {}, supabaseClient) {
  const sessionId = sessionContext.sessionId || randomUUID();
  const userId = sessionContext.userId || null;
  const langOverride = sessionContext.language || null;

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let usedModel = "qwen/qwen3.8-27b";

  // Step 1: Thinking -> Intent
  yield {
    event: "thinking",
    data: {
      phase: "intent",
      message: "Tonima is analyzing hardware requirements and budget parameters..."
    }
  };

  const { request: parsedReq, tokensIn: intentTokensIn, tokensOut: intentTokensOut } = 
    await parseIntent(userMessage);

  totalTokensIn += intentTokensIn;
  totalTokensOut += intentTokensOut;

  if (langOverride && (langOverride === "en" || langOverride === "bn")) {
    parsedReq.language = langOverride;
  }

  // Check cache for identical requests
  const cacheKey = getCacheKey(parsedReq);
  const cached = IN_MEMORY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    yield {
      event: "build",
      data: {
        sessionId,
        build: cached.build,
        parts: cached.partsList,
        validation: cached.validation,
        totalBDT: cached.build.total_bdt,
        alternatives: cached.build.alternatives || []
      }
    };

    for await (const token of streamExplanation(cached.build, cached.candidateLookup, parsedReq, cached.validation)) {
      yield { event: "token", data: { token } };
    }

    yield {
      event: "done",
      data: {
        sessionId,
        cached: true,
        tokensIn: 0,
        tokensOut: 0
      }
    };
    return;
  }

  // Step 2: Thinking -> Retriever
  yield {
    event: "thinking",
    data: {
      phase: "retriever",
      message: "Scanning live product listings & prices across Star Tech, Ryans, Tech Land..."
    }
  };

  const candidatesMap = await retrieveCandidates(parsedReq, supabaseClient);

  // Build candidate lookup
  const candidateLookup = {};
  for (const list of Object.values(candidatesMap)) {
    for (const c of list) {
      candidateLookup[c.id] = c;
    }
  }

  // Step 3: Thinking -> Planner
  yield {
    event: "thinking",
    data: {
      phase: "planner",
      message: "Optimizing component pairings, socket clearances & thermal overhead..."
    }
  };

  const { build, validation, tokensIn: planTokensIn, tokensOut: planTokensOut, model: planModel } =
    await planBuild(parsedReq, candidatesMap);

  totalTokensIn += planTokensIn;
  totalTokensOut += planTokensOut;
  if (planModel) usedModel = planModel;

  // Format parts list for UI HUD
  const partsList = [];
  const parts = build.parts || {};
  for (const [cat, id] of Object.entries(parts)) {
    const c = candidateLookup[id];
    if (c) {
      const displayCat = cat.toUpperCase() === "PSU" ? "Power Supply" : cat.charAt(0).toUpperCase() + cat.slice(1);
      partsList.push({
        category: displayCat,
        name: c.name,
        priceBDT: c.best_price,
        retailer: c.best_retailer || "Tech Store",
        inStock: true,
        listingId: c.best_listing_id || "",
        productUrl: c.best_url || "",
        priceAsOf: c.price_as_of,
        buySignal: c.buy_signal || "fair"
      });
    }
  }

  // Save in active session
  ACTIVE_SESSIONS.set(sessionId, {
    id: sessionId,
    user_id: userId,
    request: parsedReq,
    build,
    candidateLookup,
    validation,
    partsList,
    updated_at: Date.now()
  });

  // Save to cache
  IN_MEMORY_CACHE.set(cacheKey, {
    build,
    candidateLookup,
    validation,
    partsList,
    timestamp: Date.now()
  });

  // Step 4: Emit structured BUILD event immediately for HUD (< 3 seconds)
  yield {
    event: "build",
    data: {
      sessionId,
      build,
      parts: partsList,
      validation: {
        score: validation.score,
        wattage: validation.wattage,
        psuWattage: validation.psuWattage,
        ok: validation.ok,
        violations: validation.violations
      },
      totalBDT: build.total_bdt,
      alternatives: build.alternatives || []
    }
  };

  // Step 5: Explainer Streaming tokens
  let fullExplanation = "";
  for await (const token of streamExplanation(build, candidateLookup, parsedReq, validation)) {
    fullExplanation += token;
    yield {
      event: "token",
      data: { token }
    };
  }

  // Step 6: Telemetry & Done event
  persistSessionToDb(sessionId, userId, parsedReq, build, supabaseClient);
  persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
  persistMessageToDb(sessionId, "assistant", fullExplanation, totalTokensIn, totalTokensOut, usedModel, supabaseClient);

  yield {
    event: "done",
    data: {
      sessionId,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      model: usedModel
    }
  };
}

/**
 * Handles refinement actions (follow-up turns) and yields SSE events.
 */
export async function* runRefineOrchestrator(sessionId, userMessage, options = {}, supabaseClient) {
  let session = ACTIVE_SESSIONS.get(sessionId);

  if (!session && supabaseClient) {
    // Attempt to restore session from Supabase
    try {
      const { data } = await supabaseClient
        .from("ai_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (data) {
        session = {
          id: data.id,
          user_id: data.user_id,
          request: data.request,
          build: data.build,
          candidateLookup: {},
          updated_at: Date.now()
        };
      }
    } catch {
      // Ignore
    }
  }

  if (!session) {
    // If session doesn't exist, treat as a fresh build
    yield* runBuildOrchestrator(userMessage, { sessionId }, supabaseClient);
    return;
  }

  yield {
    event: "thinking",
    data: {
      phase: "refine",
      message: "Adjusting configuration and checking compatibility delta..."
    }
  };

  const { newBuild, candidateLookup, validation, diff } =
    await applyRefinement(session, userMessage, supabaseClient);

  const partsList = [];
  for (const [cat, id] of Object.entries(newBuild.parts || {})) {
    const c = candidateLookup[id];
    if (c) {
      const displayCat = cat.toUpperCase() === "PSU" ? "Power Supply" : cat.charAt(0).toUpperCase() + cat.slice(1);
      partsList.push({
        category: displayCat,
        name: c.name,
        priceBDT: c.best_price,
        retailer: c.best_retailer || "Tech Store",
        inStock: true,
        listingId: c.best_listing_id || "",
        productUrl: c.best_url || "",
        priceAsOf: c.price_as_of,
        buySignal: c.buy_signal || "fair"
      });
    }
  }

  // Update session
  session.build = newBuild;
  session.candidateLookup = candidateLookup;
  session.validation = validation;
  session.partsList = partsList;
  session.updated_at = Date.now();
  ACTIVE_SESSIONS.set(sessionId, session);

  yield {
    event: "build",
    data: {
      sessionId,
      build: newBuild,
      parts: partsList,
      validation: {
        score: validation.score,
        wattage: validation.wattage,
        psuWattage: validation.psuWattage,
        ok: validation.ok,
        violations: validation.violations
      },
      totalBDT: newBuild.total_bdt,
      diff: diff ? {
        category: diff.category,
        priceDelta: diff.priceDelta,
        newPartName: diff.newPart?.name
      } : undefined,
      alternatives: newBuild.alternatives || []
    }
  };

  for await (const token of streamExplanation(newBuild, candidateLookup, session.request, validation)) {
    yield {
      event: "token",
      data: { token }
    };
  }

  yield {
    event: "done",
    data: {
      sessionId
    }
  };
}
