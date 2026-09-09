import { parseIntent } from "./intent.js";
import { retrieveCandidates } from "./retriever.js";
import { planBuild } from "./planner.js";
import { streamExplanation } from "./explainer.js";
import { applyRefinement } from "./refiner.js";
import { groqStream, MODELS } from "./llm.js";
import { randomUUID } from "crypto";

// 15-Minute in-memory cache for anonymous identical build requests
const IN_MEMORY_CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// In-memory active sessions store
export const ACTIVE_SESSIONS = new Map();

/**
 * Streams a warm greeting introducing Tonima's capabilities.
 */
async function* streamGreetingResponse(req) {
  const isBn = req.language === "bn";
  if (isBn) {
    const greetingText = `হ্যালো! আমি **তনিমা এআই**, আপনার পার্সোনাল পিসি আর্কিটেক্ট।\n\nআমি আপনাকে যেভাবে সাহায্য করতে পারি:\n• **১০০% কম্প্যাটিবল পিসি কনফিগারেশন**: সকেট, র্যাম, ক্যাসিং ও থার্মাল অডিট।\n• **লাইভ সর্বনিম্ন দাম**: Star Tech, Ryans, Tech Land, Skyland সহ বাংলাদেশের শীর্ষ ১২টি দোকানের দাম তুলনা।\n• **বাজেট অপটিমাইজেশন**: গেমিং, এআই/এমএল, ভিডিও এডিটিং বা অফিসের জন্য বাজেট অনুযায়ী সেরা পার্টস নির্বাচন।\n\nআপনার বাজেট বা কেমন কাজের জন্য পিসি খুঁজছেন আমাকে জানান!`;
    const tokens = greetingText.split(/(?<=\s|•|\n)/);
    for (const tok of tokens) {
      yield tok;
      await new Promise((r) => setTimeout(r, 15));
    }
  } else {
    const greetingText = `Hello! I am **Tonima AI**, your next-generation PC Architect for Bangladesh.\n\nHere is what I can do for you:\n• **100% Hardware Compatibility**: Real-time auditing of CPU sockets, RAM generations, form factors, and power headroom.\n• **Real-Time Lowest Prices**: Live price comparison across 12 top Bangladeshi stores (Star Tech, Ryans, Tech Land, etc.).\n• **Custom Workload Blueprints**: Tailored builds for 1440p/4K Gaming, AI/Deep Learning, Video Editing, or Office setups.\n\nWhat kind of PC setup are you planning to build, or what is your target budget?`;
    const tokens = greetingText.split(/(?<=\s|•|\n)/);
    for (const tok of tokens) {
      yield tok;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

/**
 * Streams general hardware tech chat response.
 */
async function* streamGeneralChatResponse(userMessage, req) {
  const isBn = req.language === "bn";
  const systemPrompt = `You are Tonima AI, a friendly, expert AI PC Architect in Bangladesh.
Your role: Answer the user's PC hardware or tech question accurately and concisely with Bangladesh tech market context. Mention relevant stores (Star Tech, Ryans, Tech Land, etc.) or pricing in BDT if asked. Offer to generate a complete compatible build if they want.
Language: ${isBn ? "Bengali (বাংলা)" : "English"}.
Max length: 150 words. Use clear markdown formatting with bold points.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];

  let yielded = 0;
  try {
    for await (const chunk of groqStream(messages, {
      model: MODELS.OPEN,
      temperature: 0.4,
      max_tokens: 450
    })) {
      if (chunk) {
        yield chunk;
        yielded++;
      }
    }
  } catch (err) {
    console.warn("[General Chat Stream Warning]:", err.message);
  }

  if (yielded === 0) {
    yield isBn
      ? "আমি পিসি বিল্ড, কম্পোনেন্ট কম্প্যাটিবিলিটি এবং বাংলাদেশের লাইভ দাম সংক্রান্ত যেকোনো প্রশ্নে সহায়তা করতে প্রস্তুত। আপনার বাজেট বা কাজের ধরন জানান!"
      : "I am ready to help with PC component specs, compatibility, and real-time prices across Bangladesh. Let me know your budget or workflow!";
  }
}

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
        tokensOut: tokensOut || 0,
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

  // Branch 1: Greeting Intent
  if (parsedReq.type === "greeting") {
    let fullGreeting = "";
    for await (const token of streamGreetingResponse(parsedReq)) {
      fullGreeting += token;
      yield { event: "token", data: { token } };
    }

    persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
    persistMessageToDb(sessionId, "assistant", fullGreeting, 50, 100, "tonima-greeting", supabaseClient);

    yield {
      event: "done",
      data: {
        sessionId,
        type: "greeting"
      }
    };
    return;
  }

  // Branch 2: General Chat / Question Intent
  if (parsedReq.type === "chat") {
    yield {
      event: "thinking",
      data: {
        phase: "chat",
        message: "Tonima is analyzing your question..."
      }
    };

    let fullChat = "";
    for await (const token of streamGeneralChatResponse(userMessage, parsedReq)) {
      fullChat += token;
      yield { event: "token", data: { token } };
    }

    persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
    persistMessageToDb(sessionId, "assistant", fullChat, 100, 200, "qwen/qwen3.8-27b", supabaseClient);

    yield {
      event: "done",
      data: {
        sessionId,
        type: "chat"
      }
    };
    return;
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
