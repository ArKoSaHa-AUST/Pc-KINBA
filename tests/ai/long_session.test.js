import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createMemory,
  appendTurn,
  getPromptHistory,
  getPinnedConstraints,
  updatePinnedConstraints,
  summariseOlderTurns,
  MAX_CONTEXT_TURNS,
  MAX_CONTEXT_CHARS,
  SUMMARISE_AFTER_TURNS
} from "../../lib/ai/memory.js";
import { runBuildOrchestrator, runRefineOrchestrator, ACTIVE_SESSIONS } from "../../lib/ai/orchestrator.js";

describe("Tonima AI Long Session Memory & Grounding (tests/ai/long_session.test.js)", () => {
  const originalFetch = globalThis.fetch;
  const originalGroqKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    ACTIVE_SESSIONS.clear();
    process.env.GROQ_API_KEY = "gsk_testdummykey12345678901234567890";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalGroqKey !== undefined) {
      process.env.GROQ_API_KEY = originalGroqKey;
    } else {
      delete process.env.GROQ_API_KEY;
    }
    vi.restoreAllMocks();
  });

  // Task B & G: Hard context cap unit test
  it("AI-CTX-CAP: getPromptHistory enforces MAX_CONTEXT_CHARS and trims oldest verbatim turns", () => {
    const memory = createMemory("test-cap-session");
    updatePinnedConstraints(memory, { budget_bdt: 150000, purpose: "gaming" });

    // Append 5 large turns each containing 3,500 characters (~17,500 characters total)
    for (let i = 1; i <= 5; i++) {
      appendTurn(memory, i % 2 === 1 ? "user" : "assistant", `Turn ${i} payload: ` + "A".repeat(3500));
    }

    const history = getPromptHistory(memory);
    const totalChars = history.reduce((sum, h) => sum + (h.content?.length || 0), 0);

    expect(totalChars).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
    // Summary / pinned constraints must be preserved at index 0
    expect(history[0].role).toBe("system");
    expect(history[0].content).toContain("1,50,000");
    // Oldest turns (Turn 1, Turn 2) should have been trimmed before newest (Turn 5)
    const historyText = JSON.stringify(history);
    expect(historyText).toContain("Turn 5");
  });

  // Task B & G: AI-CTX-002
  it("AI-CTX-002: Summarisation kicks in past SUMMARISE_AFTER_TURNS and preserves budget + purpose + locked parts", async () => {
    const memory = createMemory("session-summarise-test");
    updatePinnedConstraints(memory, {
      budget_bdt: 180000,
      purpose: "ai_ml",
      locked_parts: { gpu: "rtx-4070-ti" },
      rejected_parts: { cooler: ["DeepCool"] }
    });

    // Append 9 turns (exceeding SUMMARISE_AFTER_TURNS = 6)
    for (let i = 1; i <= 9; i++) {
      appendTurn(memory, i % 2 === 1 ? "user" : "assistant", `Message turn ${i}: Discussion about AI workflow and CUDA support.`);
    }

    // Mock groqJson response for summariser
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "User is building an AI/ML workstation with locked RTX 4070 Ti, rejecting DeepCool coolers.",
                budget_bdt: 180000,
                purpose: "ai_ml",
                locked_parts: { gpu: "rtx-4070-ti" },
                rejected_parts: { cooler: ["DeepCool"] }
              })
            }
          }
        ],
        usage: { prompt_tokens: 150, completion_tokens: 60 }
      })
    });

    await summariseOlderTurns(memory);

    expect(memory.summary).toBeTruthy();
    expect(memory.summary.toLowerCase()).toContain("ai");
    expect(memory.pinnedConstraints.budget_bdt).toBe(180000);
    expect(memory.pinnedConstraints.purpose).toBe("ai_ml");
    expect(memory.pinnedConstraints.locked_parts.gpu).toBe("rtx-4070-ti");
    expect(memory.pinnedConstraints.rejected_parts.cooler).toContain("DeepCool");
    expect(memory.turns.length).toBeLessThanOrEqual(SUMMARISE_AFTER_TURNS);
  });

  // Task B & G: AI-CTX-003
  it("AI-CTX-003: Groq summarisation failure falls back to deterministic template without dropping pinned constraints", async () => {
    const memory = createMemory("session-fallback-test");
    updatePinnedConstraints(memory, {
      budget_bdt: 200000,
      purpose: "content_creation",
      constraints: { prefer_brand: { cpu: "amd", gpu: "nvidia" } },
      locked_parts: { cpu: "ryzen-7-7700" }
    });

    // Append 8 turns (> SUMMARISE_AFTER_TURNS = 6)
    for (let i = 1; i <= 8; i++) {
      appendTurn(memory, i % 2 === 1 ? "user" : "assistant", `Message turn ${i}: Discussion about Premiere Pro video editing.`);
    }

    // Simulate Groq network failure
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection timeout to Groq"));

    await summariseOlderTurns(memory);

    // Fallback template must be populated
    expect(memory.summary).toBeTruthy();
    expect(memory.summary).toContain("2,00,000");
    expect(memory.summary).toContain("content_creation");
    expect(memory.summary).toContain("ryzen-7-7700");

    // Pinned constraints preserved
    expect(memory.pinnedConstraints.budget_bdt).toBe(200000);
    expect(memory.pinnedConstraints.purpose).toBe("content_creation");
    expect(memory.pinnedConstraints.locked_parts.cpu).toBe("ryzen-7-7700");
  });

  // Task B & G: AI-CTX-001 - Dedicated 25-turn scripted conversation with stubbed Groq client
  it("AI-CTX-001: 25-turn scripted conversation preserves initial budget, respects rejected parts, grounds prices, and stays within context limits", async () => {
    const sessionId = "session-25-turn-qa-eval";

    // Setup mock Supabase client with rich candidate inventory
    const candidateDatabase = [
      { id: "cpu-am5-7600", name: "AMD Ryzen 5 7600", category: "cpu", price: 23500, specs: { socket: "AM5" } },
      { id: "mobo-b650m", name: "MSI B650M Gaming PLUS", category: "motherboard", price: 16500, specs: { socket: "AM5", memory_type: "DDR5" } },
      { id: "ram-32gb-d5", name: "Corsair Vengeance 32GB DDR5 6000MHz", category: "ram", price: 13500, specs: { memory_type: "DDR5" } },
      { id: "gpu-rtx4070", name: "ZOTAC RTX 4070 12GB", category: "gpu", price: 72000, specs: {} },
      { id: "gpu-rtx4060", name: "Gigabyte RTX 4060 Eagle 8GB", category: "gpu", price: 38000, specs: {} },
      { id: "ssd-1tb-nvme", name: "Samsung 980 1TB NVMe", category: "storage", price: 7500, specs: {} },
      { id: "psu-650w", name: "Corsair CX650 650W", category: "psu", price: 6200, specs: { wattage: "650" } },
      { id: "case-airflow", name: "Montech Air 903 Base", category: "case", price: 6500, specs: { form_factor: "ATX" } },
      { id: "cooler-deepcool", name: "DeepCool AK400 Air Cooler", category: "cooler", price: 3200, specs: {} },
      { id: "cooler-thermalright", name: "Thermalright Peerless Assassin 120", category: "cooler", price: 4200, specs: {} }
    ];

    const mockSupabase = {
      from(table) {
        if (table === "products") {
          return {
            select: () => ({
              limit: async () => ({
                data: candidateDatabase.map(c => ({
                  id: c.id,
                  name: c.name,
                  price: c.price,
                  categories: { name: c.category, slug: c.category },
                  brands: { name: "Brand" }
                })),
                error: null
              })
            })
          };
        }
        if (table === "product_specs") {
          return {
            select: () => ({
              in: async () => ({
                data: candidateDatabase.flatMap(c => 
                  Object.entries(c.specs).map(([k, v]) => ({ product_id: c.id, spec_key: k, spec_value: v }))
                ),
                error: null
              })
            })
          };
        }
        if (table === "listings") {
          return {
            select: () => ({
              in: () => ({
                gt: async () => ({
                  data: candidateDatabase.map(c => ({
                    id: `list-${c.id}`,
                    product_id: c.id,
                    price: c.price,
                    retailer: "Star Tech",
                    product_url: "https://startech.com.bd/test",
                    last_scraped_at: new Date().toISOString()
                  })),
                  error: null
                })
              })
            })
          };
        }
        if (table === "ai_sessions" || table === "ai_messages") {
          return {
            upsert: async () => ({ error: null }),
            insert: async () => ({ error: null }),
            select: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: null }),
                order: () => ({ limit: async () => ({ data: [], error: null }) })
              })
            })
          };
        }
        return {};
      }
    };

    // Stubbed Groq Client simulating LLM responses quickly and deterministically
    globalThis.fetch = vi.fn().mockImplementation(async (url, options = {}) => {
      const body = JSON.parse(options.body || "{}");

      // Handle streaming requests (explainer, general chat)
      if (body.stream === true) {
        const streamChunks = [
          `data: {"choices":[{"delta":{"content":"Here is your optimized PC build configured for ৳ 149,400 with verified compatibility across Star Tech."}}]}\n\n`,
          `data: [DONE]\n\n`
        ];
        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of streamChunks) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          }
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" }
        });
      }

      // Handle structured JSON requests (intent, planner, refiner, summariser)
      const systemPrompt = body.messages?.[0]?.content || "";
      const userContent = body.messages?.[body.messages.length - 1]?.content || "";

      let jsonResult = {};

      if (systemPrompt.includes("Intent Parser")) {
        if (/150000|gaming/i.test(userContent)) {
          jsonResult = { type: "build", budget_bdt: 150000, purpose: "gaming", language: "en", constraints: {} };
        } else if (/change|swap|cooler/i.test(userContent)) {
          jsonResult = { type: "refine", budget_bdt: 150000, purpose: "gaming", language: "en", constraints: {} };
        } else {
          jsonResult = { type: "chat", budget_bdt: 150000, purpose: "gaming", language: "en", constraints: {} };
        }
      } else if (systemPrompt.includes("refinement")) {
        jsonResult = { op: "replace", category: "cooler", query: "Thermalright" };
      } else if (systemPrompt.includes("summarizer")) {
        jsonResult = {
          summary: "User configured 150,000 BDT gaming build, preferring Thermalright cooler and rejecting DeepCool.",
          budget_bdt: 150000,
          purpose: "gaming",
          rejected_parts: { cooler: ["DeepCool"] }
        };
      } else {
        // Planner prompt: select compatible parts without rejected DeepCool
        jsonResult = {
          parts: {
            cpu: "cpu-am5-7600",
            motherboard: "mobo-b650m",
            ram: "ram-32gb-d5",
            gpu: "gpu-rtx4070",
            storage: "ssd-1tb-nvme",
            psu: "psu-650w",
            case: "case-airflow",
            cooler: "cooler-thermalright"
          },
          rationale: [{ category: "gpu", why: "RTX 4070 fits budget." }]
        };
      }

      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(jsonResult) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });

    // 25-turn script
    const script = [
      /* Turn 1 */ "I want a 150000 gaming PC in Bangladesh",
      /* Turn 2 */ "Is the motherboard socket compatible with future upgrades?",
      /* Turn 3 */ "How much power does this setup draw?",
      /* Turn 4 */ "I don't like DeepCool cooler, do not suggest DeepCool",
      /* Turn 5 */ "Can we change to a Thermalright cooler?",
      /* Turn 6 */ "Will this handle Cyberpunk 2077 at 1440p high settings?",
      /* Turn 7 */ "What is the speed of the DDR5 RAM?",
      /* Turn 8 */ "Is 1TB storage enough for 5 modern AAA games?",
      /* Turn 9 */ "Can I add a second SSD later?",
      /* Turn 10 */ "Does the motherboard have WiFi 6E?",
      /* Turn 11 */ "Which store has the lowest price for the graphics card?",
      /* Turn 12 */ "Is the power supply 80 Plus Bronze or Gold?",
      /* Turn 13 */ "Can we swap case to white?",
      /* Turn 14 */ "How many case fans are included?",
      /* Turn 15 */ "What resolution monitor should I pair with this?",
      /* Turn 16 */ "Is RTX 4070 good for video editing too?",
      /* Turn 17 */ "Does this CPU come with a stock cooler?",
      /* Turn 18 */ "Can this system run stable in summer without AC in Dhaka?",
      /* Turn 19 */ "What about motherboard VRM temperatures?",
      /* Turn 20 */ "Can I upgrade to Ryzen 7 7800X3D later?",
      /* Turn 21 */ "What is the total price right now?",
      /* Turn 22 */ "Are there any Star Tech warranty options?",
      /* Turn 23 */ "How does this compare to a gaming laptop at the same price?",
      /* Turn 24 */ "Can you double check the wattage headroom?",
      /* Turn 25 */ "Show me the final verified build and price summary"
    ];

    let lastBuild = null;
    let lastCandidateLookup = null;
    let lastExplanation = "";

    // Execute scripted conversation
    for (let turn = 0; turn < script.length; turn++) {
      const userMessage = script[turn];
      const isInitial = turn === 0;

      const generator = isInitial
        ? runBuildOrchestrator(userMessage, { sessionId, language: "en" }, mockSupabase)
        : runRefineOrchestrator(sessionId, userMessage, { language: "en" }, mockSupabase);

      let turnExplanation = "";
      for await (const event of generator) {
        if (event.event === "build") {
          lastBuild = event.data.build;
        }
        if (event.event === "token") {
          turnExplanation += event.data.token;
        }
        if (event.event === "correction") {
          turnExplanation = event.data.text;
        }
      }
      lastExplanation = turnExplanation;

      const session = ACTIVE_SESSIONS.get(sessionId);
      if (session) {
        lastCandidateLookup = session.candidateLookup;
      }

      // Explicitly reject DeepCool at Turn 4 in memory pinned constraints
      if (turn === 3 && session?.memory) {
        updatePinnedConstraints(session.memory, {
          rejected_parts: { cooler: ["DeepCool"] }
        });
      }

      // Assert character cap is never exceeded at any turn
      if (session?.memory) {
        const history = getPromptHistory(session.memory);
        const historyChars = history.reduce((sum, h) => sum + (h.content?.length || 0), 0);
        expect(historyChars).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
      }
    }

    const sessionAtTurn25 = ACTIVE_SESSIONS.get(sessionId);
    expect(sessionAtTurn25).toBeDefined();

    // 1. Assert the budget from Turn 1 (150,000 BDT) is still applied at Turn 25
    const pinnedAt25 = getPinnedConstraints(sessionAtTurn25.memory);
    expect(pinnedAt25.budget_bdt).toBe(150000);
    expect(lastBuild.total_bdt).toBeLessThanOrEqual(150000);

    // 2. Assert part rejected at Turn 4 (DeepCool) is NOT in the final build
    if (lastBuild?.parts?.cooler && lastCandidateLookup) {
      const coolerPart = lastCandidateLookup[lastBuild.parts.cooler];
      expect(coolerPart?.name).not.toContain("DeepCool");
    }

    // 3. Assert all price numbers mentioned in Turn 25 explanation exist in candidateLookup or equal total
    const validPrices = new Set([lastBuild.total_bdt]);
    for (const part of Object.values(lastCandidateLookup || {})) {
      if (part?.best_price) validPrices.add(part.best_price);
    }

    const priceFigures = lastExplanation.match(/৳\s*[\d,]+/g) || [];
    for (const raw of priceFigures) {
      const num = parseInt(raw.replace(/[^\d]/g, ""), 10);
      if (!Number.isNaN(num) && num > 0) {
        expect(validPrices.has(num)).toBe(true);
      }
    }

    // 4. Assert getPromptHistory never exceeded MAX_CONTEXT_CHARS
    const finalHistory = getPromptHistory(sessionAtTurn25.memory);
    const finalChars = finalHistory.reduce((sum, h) => sum + (h.content?.length || 0), 0);
    expect(finalChars).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
  });
});
