import { parseIntent } from "./intent.js";
import { retrieveCandidates } from "./retriever.js";
import { planBuild } from "./planner.js";
import { streamExplanation, verifyExplainerText, generateTemplateExplanation } from "./explainer.js";
import { applyRefinement } from "./refiner.js";
import { groqStream, MODELS } from "./llm.js";
import {
  createMemory,
  appendTurn,
  getPromptHistory,
  getPinnedConstraints,
  updatePinnedConstraints,
  summariseOlderTurns,
  sweepActiveSessions
} from "./memory.js";
import { randomUUID } from "crypto";

// 15-Minute in-memory cache for anonymous identical build requests
const IN_MEMORY_CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// In-memory active sessions store
export const ACTIVE_SESSIONS = new Map();

// Phrases that mean "throw the current machine away and spec a new one" rather than
// "adjust one part of it". Used to route follow-up turns that parse as `build`.
const NEW_BUILD_RE = /\b(build|rebuild|re-?spec|make|create|design|assemble|suggest|recommend|need|want|new\s+(pc|build|rig|setup|config)|start\s+over|reset)\b|বানাও|বানিয়ে|নতুন|দরকার|চাই/i;

/**
 * Sanitizes log output to prevent log injection.
 */
function sanitizeLog(msg) {
  if (!msg) return "";
  return String(msg).replace(/[\r\n\x00-\x1f]/g, " ").slice(0, 300);
}

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
async function* streamGeneralChatResponse(userMessage, req, history = []) {
  const isBn = req.language === "bn";
  const systemPrompt = `You are Tonima AI, a friendly, expert AI PC Architect in Bangladesh.
Your role: Answer the user's PC hardware or tech question accurately and concisely with Bangladesh tech market context. Mention relevant stores (Star Tech, Ryans, Tech Land, etc.) or pricing in BDT if asked. Offer to generate a complete compatible build if they want.
Language: ${isBn ? "Bengali (বাংলা)" : "English"}.
Max length: 150 words. Use clear markdown formatting with bold points.`;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  if (history && history.length > 0) {
    for (const h of history) {
      if (h && h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });

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
    console.warn("[General Chat Stream Warning]:", sanitizeLog(err.message));
  }

  if (yielded === 0) {
    yield isBn
      ? "আমি পিসি বিল্ড, কম্পোনেন্ট কম্প্যাটিবিলিটি এবং বাংলাদেশের লাইভ দাম সংক্রান্ত যেকোনো প্রশ্নে সহায়তা করতে প্রস্তুত। আপনার বাজেট বা কাজের ধরন জানান!"
      : "I am ready to help with PC component specs, compatibility, and real-time prices across Bangladesh. Let me know your budget or workflow!";
  }
}

/**
 * Streams an answer to a question asked about an existing build.
 *
 * A follow-up question ("what is the total price now?", "how much power does it draw?")
 * must be answered from the verified build, not from the model's imagination. The parts,
 * their real prices and their retailers go into the prompt, and the finished answer is
 * run through the same grounding check the explainer uses — an invented figure is
 * replaced with the deterministic template, exactly as on the build path.
 */
async function* streamGroundedChatResponse(userMessage, req, history, session) {
  const build = session?.build;
  const candidateLookup = session?.candidateLookup || {};
  const validation = session?.validation || {};

  if (!build || !build.parts || Object.keys(build.parts).length === 0) {
    yield* streamGeneralChatResponse(userMessage, req, history);
    return;
  }

  const isBn = req.language === "bn";
  const partsSummary = [];
  for (const [cat, id] of Object.entries(build.parts)) {
    const c = candidateLookup[id];
    if (c) {
      partsSummary.push({
        category: cat,
        name: c.name,
        price_bdt: c.best_price,
        store: c.best_retailer,
        specs: c.specs
      });
    }
  }

  const systemPrompt = `You are Tonima AI, an expert PC Architect in Bangladesh, answering a question about the user's CURRENT build.
Grounding rules (mandatory):
- Every price figure you write must be copied verbatim from the build data given to you. Never estimate, round or invent a number.
- Only name a retailer that appears in the build data.
- This is a question, not a change request: describe the build, do not swap any component.
Language: ${isBn ? "Bengali (বাংলা)" : "English"}.
Max length: 160 words. Use clear markdown with bold key points.`;

  const messages = [{ role: "system", content: systemPrompt }];

  if (history && history.length > 0) {
    for (const h of history) {
      if (h && h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  const buildContext = {
    purpose: req.purpose,
    budget_bdt: req.budget_bdt || null,
    total_bdt: build.total_bdt,
    estimated_wattage: validation.wattage || null,
    psu_wattage: validation.psuWattage || null,
    compatibility_score: validation.score || null,
    parts: partsSummary
  };

  messages.push({
    role: "user",
    content: `Current verified build:
${JSON.stringify(buildContext, null, 2)}

Question: ${userMessage}`
  });

  let accumulatedText = "";
  let yieldedTokens = 0;

  try {
    for await (const chunk of groqStream(messages, {
      model: MODELS.OPEN,
      temperature: 0.3,
      max_tokens: 450
    })) {
      if (chunk) {
        accumulatedText += chunk;
        yield chunk;
        yieldedTokens++;
      }
    }
  } catch (err) {
    console.warn("[Grounded Chat Stream Warning]:", sanitizeLog(err.message));
  }

  if (yieldedTokens === 0) {
    yield generateTemplateExplanation(build, candidateLookup, req, validation);
    return;
  }

  const verification = verifyExplainerText(accumulatedText, build, candidateLookup);
  if (!verification.valid) {
    console.warn(`[Grounded Chat Verification Rejected]: ${sanitizeLog(verification.reason)}`);
    yield {
      event: "correction",
      data: {
        text: generateTemplateExplanation(build, candidateLookup, req, validation),
        reason: verification.reason,
        offendingToken: verification.offendingToken
      }
    };
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
export async function persistSessionToDb(sessionId, userId, request, build, supabaseClient, memory = null) {
  if (!supabaseClient) return;
  try {
    const payload = {
      id: String(sessionId),
      user_id: userId || null,
      request,
      build,
      summary: memory?.summary ? { text: memory.summary } : {},
      pinned_constraints: memory?.pinnedConstraints || {},
      updated_at: new Date().toISOString()
    };
    await supabaseClient
      .from("ai_sessions")
      .upsert(payload);
  } catch (err) {
    console.warn("[AI Session Persist Warning]:", sanitizeLog(err?.message || err));
  }
}

/**
 * Persists chat message telemetry to Supabase.
 */
export async function persistMessageToDb(sessionId, role, content, tokensIn, tokensOut, model, supabaseClient) {
  if (!supabaseClient) return;
  try {
    await supabaseClient
      .from("ai_messages")
      .insert({
        session_id: String(sessionId),
        role,
        content: typeof content === "string" ? content : JSON.stringify(content),
        tokens_in: tokensIn || 0,
        tokens_out: tokensOut || 0,
        model: model || "qwen/qwen3.8-27b",
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.warn("[AI Message Persist Warning]:", sanitizeLog(err?.message || err));
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
  const budgetOverride = Number(sessionContext.budgetBDT) > 0 ? Number(sessionContext.budgetBDT) : null;

  // Retrieve or initialize conversation memory
  let activeSession = ACTIVE_SESSIONS.get(sessionId);
  let memory = activeSession?.memory || createMemory(sessionId);

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

  const history = getPromptHistory(memory);
  const pinned = getPinnedConstraints(memory);

  // A caller that already parsed the intent (the refine route) hands it over so the
  // LLM intent pass is not paid for twice on the same turn.
  let parsedReq = sessionContext.parsedRequest || null;
  let intentTokensIn = 0;
  let intentTokensOut = 0;
  if (!parsedReq) {
    ({ request: parsedReq, tokensIn: intentTokensIn, tokensOut: intentTokensOut } =
      await parseIntent(userMessage, history, pinned));
  }

  totalTokensIn += intentTokensIn;
  totalTokensOut += intentTokensOut;

  if (langOverride && (langOverride === "en" || langOverride === "bn")) {
    parsedReq.language = langOverride;
  }

  // The UI budget slider is only authoritative when the user did not state a budget
  // in this turn and none is pinned from an earlier one. A budget is never invented:
  // with no slider value and nothing said, budget_bdt stays 0 and the planner picks
  // a sensible tier from the purpose instead of silently defaulting to 1.5 lakh.
  if (budgetOverride && !parsedReq.budget_bdt) {
    parsedReq.budget_bdt = budgetOverride;
  }

  // Update pinned constraints
  updatePinnedConstraints(memory, {
    budget_bdt: parsedReq.budget_bdt,
    purpose: parsedReq.purpose,
    language: parsedReq.language,
    constraints: parsedReq.constraints
  });

  // Branch 1: Greeting Intent
  if (parsedReq.type === "greeting") {
    let fullGreeting = "";
    for await (const token of streamGreetingResponse(parsedReq)) {
      fullGreeting += token;
      yield { event: "token", data: { token } };
    }

    appendTurn(memory, "user", userMessage);
    appendTurn(memory, "assistant", fullGreeting);

    persistSessionToDb(sessionId, userId, parsedReq, activeSession?.build || null, supabaseClient, memory);
    persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
    persistMessageToDb(sessionId, "assistant", fullGreeting, 50, 100, "tonima-greeting", supabaseClient);

    ACTIVE_SESSIONS.set(sessionId, {
      ...(activeSession || {}),
      id: sessionId,
      user_id: userId,
      request: parsedReq,
      memory,
      updated_at: Date.now(),
      lastAccessed: Date.now()
    });
    sweepActiveSessions(ACTIVE_SESSIONS);

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
    for await (const token of streamGeneralChatResponse(userMessage, parsedReq, getPromptHistory(memory))) {
      fullChat += token;
      yield { event: "token", data: { token } };
    }

    appendTurn(memory, "user", userMessage);
    appendTurn(memory, "assistant", fullChat);

    persistSessionToDb(sessionId, userId, parsedReq, activeSession?.build || null, supabaseClient, memory);
    persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
    persistMessageToDb(sessionId, "assistant", fullChat, 100, 200, "qwen/qwen3.8-27b", supabaseClient);

    ACTIVE_SESSIONS.set(sessionId, {
      ...(activeSession || {}),
      id: sessionId,
      user_id: userId,
      request: parsedReq,
      memory,
      updated_at: Date.now(),
      lastAccessed: Date.now()
    });
    sweepActiveSessions(ACTIVE_SESSIONS);

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
        budget_status: cached.build.budget_status || "met",
        budget_shortfall_bdt: cached.build.budget_shortfall_bdt || 0,
        purpose: parsedReq.purpose,
        budgetBDT: parsedReq.budget_bdt || null,
        alternatives: cached.build.alternatives || [],
        swaps: cached.build.swaps || []
      }
    };

    let fullExplanation = "";
    for await (const chunk of streamExplanation(cached.build, cached.candidateLookup, parsedReq, cached.validation)) {
      if (typeof chunk === "object" && chunk.event === "correction") {
        fullExplanation = chunk.data.text;
        yield { event: "correction", data: chunk.data };
      } else {
        fullExplanation += chunk;
        yield { event: "token", data: { token: chunk } };
      }
    }

    appendTurn(memory, "user", userMessage);
    appendTurn(memory, "assistant", fullExplanation);

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
        // products.id — the same key /api/builder/catalog serves, so the PC Builder
        // handoff resolves these parts by id instead of guessing from the name.
        productId: c.id,
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
    memory,
    updated_at: Date.now(),
    lastAccessed: Date.now()
  });
  sweepActiveSessions(ACTIVE_SESSIONS);

  // Save to cache
  IN_MEMORY_CACHE.set(cacheKey, {
    build,
    candidateLookup,
    validation,
    partsList,
    timestamp: Date.now()
  });

  // Step 4: Emit structured BUILD event
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
      budget_status: build.budget_status || "met",
      budget_shortfall_bdt: build.budget_shortfall_bdt || 0,
      purpose: parsedReq.purpose,
      budgetBDT: parsedReq.budget_bdt || null,
      alternatives: build.alternatives || [],
      swaps: build.swaps || []
    }
  };

  // Step 5: Explainer Streaming tokens
  let fullExplanation = "";
  for await (const chunk of streamExplanation(build, candidateLookup, parsedReq, validation)) {
    if (typeof chunk === "object" && chunk.event === "correction") {
      fullExplanation = chunk.data.text;
      yield { event: "correction", data: chunk.data };
    } else {
      fullExplanation += chunk;
      yield { event: "token", data: { token: chunk } };
    }
  }

  // Record turns in memory and compact older turns
  appendTurn(memory, "user", userMessage);
  appendTurn(memory, "assistant", fullExplanation);
  await summariseOlderTurns(memory);

  // Step 6: Telemetry & Done event
  persistSessionToDb(sessionId, userId, parsedReq, build, supabaseClient, memory);
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
        // Re-retrieve candidates to populate candidateLookup
        const restoredMap = await retrieveCandidates(data.request || { budget_bdt: 150000 }, supabaseClient);
        const restoredLookup = {};
        for (const list of Object.values(restoredMap)) {
          for (const c of list) {
            restoredLookup[c.id] = c;
          }
        }

        const restoredMemory = createMemory(sessionId);
        if (data.summary && data.summary.text) {
          restoredMemory.summary = data.summary.text;
        }
        if (data.pinned_constraints) {
          restoredMemory.pinnedConstraints = { ...restoredMemory.pinnedConstraints, ...data.pinned_constraints };
        }

        // Fetch past messages to restore verbatim turns
        try {
          const { data: dbMessages } = await supabaseClient
            .from("ai_messages")
            .select("role, content")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })
            .limit(10);
          if (dbMessages && Array.isArray(dbMessages)) {
            for (const m of dbMessages) {
              appendTurn(restoredMemory, m.role, m.content);
            }
          }
        } catch {
          // Non-fatal
        }

        session = {
          id: data.id,
          user_id: data.user_id,
          request: data.request,
          build: data.build,
          candidateLookup: restoredLookup,
          memory: restoredMemory,
          pinnedConstraints: restoredMemory.pinnedConstraints,
          updated_at: Date.now(),
          lastAccessed: Date.now()
        };
        ACTIVE_SESSIONS.set(sessionId, session);
      }
    } catch (err) {
      console.warn("[AI Session Restore Warning]:", sanitizeLog(err?.message || err));
    }
  }

  if (!session) {
    // If session doesn't exist, treat as a fresh build
    yield* runBuildOrchestrator(
      userMessage,
      { sessionId, language: options.language, budgetBDT: options.budgetBDT },
      supabaseClient
    );
    return;
  }

  const memory = session.memory || createMemory(sessionId);
  session.memory = memory;
  session.pinnedConstraints = getPinnedConstraints(memory);

  // A live build in the session is NOT a licence to treat every following message as a
  // part swap. "hi", "what is DDR5?" and "build me a 2 lakh AI rig" each used to fall
  // through to applyRefinement(), whose `custom` fallback defaults to category "gpu" and
  // swapped the graphics card for an unrelated one. Classify first, refine only on refine.
  yield {
    event: "thinking",
    data: {
      phase: "intent",
      message: "Tonima is reading your follow-up..."
    }
  };

  const { request: followUpReq } = await parseIntent(
    userMessage,
    getPromptHistory(memory),
    session.pinnedConstraints
  );

  if (options.language === "en" || options.language === "bn") {
    followUpReq.language = options.language;
  }

  if (followUpReq.type === "greeting" || followUpReq.type === "chat") {
    let fullReply = "";
    const stream = followUpReq.type === "greeting"
      ? streamGreetingResponse(followUpReq)
      : streamGroundedChatResponse(userMessage, followUpReq, getPromptHistory(memory), session);

    for await (const chunk of stream) {
      if (typeof chunk === "object" && chunk.event === "correction") {
        fullReply = chunk.data.text;
        yield { event: "correction", data: chunk.data };
      } else {
        fullReply += chunk;
        yield { event: "token", data: { token: chunk } };
      }
    }

    appendTurn(memory, "user", userMessage);
    appendTurn(memory, "assistant", fullReply);
    session.lastAccessed = Date.now();
    ACTIVE_SESSIONS.set(sessionId, session);

    persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
    persistMessageToDb(sessionId, "assistant", fullReply, 0, 0, `tonima-${followUpReq.type}`, supabaseClient);

    yield { event: "done", data: { sessionId, type: followUpReq.type } };
    return;
  }

  // An explicit request for a whole new machine replaces the build rather than nudging
  // one component of the old one.
  if (followUpReq.type === "build" && NEW_BUILD_RE.test(userMessage)) {
    yield* runBuildOrchestrator(
      userMessage,
      {
        sessionId,
        userId: session.user_id,
        language: options.language,
        budgetBDT: options.budgetBDT,
        parsedRequest: followUpReq
      },
      supabaseClient
    );
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
        // products.id — the same key /api/builder/catalog serves, so the PC Builder
        // handoff resolves these parts by id instead of guessing from the name.
        productId: c.id,
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
  session.lastAccessed = Date.now();
  ACTIVE_SESSIONS.set(sessionId, session);
  sweepActiveSessions(ACTIVE_SESSIONS);

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
      budget_status: newBuild.budget_status || "met",
      budget_shortfall_bdt: newBuild.budget_shortfall_bdt || 0,
      purpose: session.request?.purpose || "general",
      budgetBDT: session.request?.budget_bdt || null,
      diff: diff ? {
        category: diff.category,
        priceDelta: diff.priceDelta,
        newPartName: diff.newPart?.name
      } : undefined,
      alternatives: newBuild.alternatives || [],
      swaps: newBuild.swaps || []
    }
  };

  let fullExplanation = "";
  for await (const chunk of streamExplanation(newBuild, candidateLookup, session.request, validation)) {
    if (typeof chunk === "object" && chunk.event === "correction") {
      fullExplanation = chunk.data.text;
      yield { event: "correction", data: chunk.data };
    } else {
      fullExplanation += chunk;
      yield { event: "token", data: { token: chunk } };
    }
  }

  appendTurn(memory, "user", userMessage);
  appendTurn(memory, "assistant", fullExplanation);
  await summariseOlderTurns(memory);

  persistSessionToDb(sessionId, session.user_id, session.request, newBuild, supabaseClient, memory);
  persistMessageToDb(sessionId, "user", userMessage, 0, 0, "client", supabaseClient);
  persistMessageToDb(sessionId, "assistant", fullExplanation, 100, 200, "qwen/qwen3.8-27b", supabaseClient);

  yield {
    event: "done",
    data: {
      sessionId
    }
  };
}
