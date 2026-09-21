import { describe, it, expect, afterAll } from "vitest";
import { parseIntentRegex, parseIntent } from "../../lib/ai/intent.js";
import { PURPOSE_BUDGET_WEIGHTS, allocateSubBudgets, getBudgetCeiling, BUDGET_TOLERANCE } from "../../lib/ai/budget.js";
import { optimizePlanAlgorithmically, planBuild, enforceBudgetCeiling, buildCandidateLookup } from "../../lib/ai/planner.js";
import { applyRefinement } from "../../lib/ai/refiner.js";
import { generateTemplateExplanation, verifyExplainerText, streamExplanation } from "../../lib/ai/explainer.js";
import { persistMessageToDb, persistSessionToDb } from "../../lib/ai/orchestrator.js";
import { captureEvidence, closeBrowser } from "../helpers/visualEvidence.js";

describe("Backend > Tonima AI PC Architect Pipeline (lib/ai/)", () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it("BE-AI-001: Intent Parser extracts budget and purpose from natural language (English & Bengali)", async () => {
    const enIntent = parseIntentRegex("I need an AI and machine learning workstation under 2 lakh taka");
    const bnIntent = parseIntentRegex("গেমিং পিসি বাজেট ১.৫ লাখ টাকা");

    expect(enIntent.type).toBe("build");
    expect(enIntent.purpose).toBe("ai_ml");
    expect(enIntent.budget_bdt).toBe(200000);

    expect(bnIntent.type).toBe("build");
    expect(bnIntent.purpose).toBe("gaming");
    expect(bnIntent.budget_bdt).toBe(150000);
    expect(bnIntent.language).toBe("bn");

    await captureEvidence({
      testId: "BE-AI-001",
      service: "backend",
      moduleName: "Tonima AI Intent Parser",
      description: "Parses English and Bengali natural language prompts into structured budget and purpose intent",
      steps: "parseIntentRegex() for English and Bengali budget prompts",
      expected: "EN: 200,000 BDT (ai_ml), BN: 150,000 BDT (gaming)",
      actual: `EN: ${enIntent.budget_bdt} BDT (${enIntent.purpose}), BN: ${bnIntent.budget_bdt} BDT (${bnIntent.purpose})`,
      status: "PASS",
      inputData: ["I need an AI and machine learning workstation under 2 lakh taka", "গেমিং পিসি বাজেট ১.৫ লাখ টাকা"],
      outputData: { enIntent, bnIntent }
    });
  });

  it("BE-AI-002: Budget Allocation Heuristics calculates archetype splits", async () => {
    const totalBudget = 150000;
    const gamingSplits = allocateSubBudgets("gaming", totalBudget);

    expect(gamingSplits.gpu.target).toBe(Math.round(totalBudget * PURPOSE_BUDGET_WEIGHTS.gaming.gpu));
    expect(gamingSplits.cpu.target).toBe(Math.round(totalBudget * PURPOSE_BUDGET_WEIGHTS.gaming.cpu));

    await captureEvidence({
      testId: "BE-AI-002",
      service: "backend",
      moduleName: "Budget Allocation Heuristics",
      description: "Calculates target sub-budgets and min/max bounds per component category based on archetype",
      steps: `allocateSubBudgets("gaming", ${totalBudget})`,
      expected: "GPU: ~40% (60,000 BDT), CPU: ~20% (30,000 BDT)",
      actual: `GPU Target: ${gamingSplits.gpu.target} BDT, CPU Target: ${gamingSplits.cpu.target} BDT`,
      status: "PASS",
      inputData: { totalBudget, purpose: "gaming" },
      outputData: gamingSplits
    });
  });

  it("BE-AI-003: Greeting and Refine Intent Classification", async () => {
    const greeting = parseIntentRegex("Hello Tonima!");
    const refinement = parseIntentRegex("swap GPU to RTX 4070 Super");

    expect(greeting.type).toBe("greeting");
    expect(refinement.type).toBe("refine");

    await captureEvidence({
      testId: "BE-AI-003",
      service: "backend",
      moduleName: "Conversational Turn Classifier",
      description: "Distinguishes between conversational greetings, refinements, and build requests",
      steps: "parseIntentRegex() for greeting and component swap",
      expected: 'greeting: "greeting", refinement: "refine"',
      actual: `greeting.type: "${greeting.type}", refinement.type: "${refinement.type}"`,
      status: "PASS",
      inputData: ["Hello Tonima!", "swap GPU to RTX 4070 Super"],
      outputData: { greeting, refinement }
    });
  });

  // Task A & G: AI-BUDGET-001
  it("AI-BUDGET-001: ৳150,000 budget with natural best build totaling ৳154,400 lands <= 150000 with non-empty swaps", async () => {
    expect(BUDGET_TOLERANCE).toBe(0);
    expect(getBudgetCeiling(150000)).toBe(150000);

    const candidatesMap = {
      cpu: [
        { id: "cpu-1", name: "AMD Ryzen 5 7600", best_price: 32000, best_retailer: "Star Tech", specs: {}, bench: { score: 85, socket: "AM5", tdp_watts: 65 } }
      ],
      motherboard: [
        { id: "mobo-1", name: "MSI PRO B650M-A WIFI", best_price: 18000, best_retailer: "Ryans", specs: {}, bench: { socket: "AM5" } }
      ],
      ram: [
        { id: "ram-1", name: "Corsair Vengeance 32GB DDR5-6000", best_price: 14000, best_retailer: "Tech Land", specs: {}, bench: {} }
      ],
      gpu: [
        { id: "gpu-1", name: "Gigabyte RTX 4070 Windforce 12GB", best_price: 65000, best_retailer: "Star Tech", specs: {}, bench: { score: 90, tdp_watts: 200 } }
      ],
      storage: [
        { id: "ssd-1", name: "Samsung 980 Pro 1TB NVMe", best_price: 8000, best_retailer: "Ryans", specs: {}, bench: {} },
        { id: "ssd-2", name: "Kingston NV2 1TB NVMe", best_price: 5500, best_retailer: "Star Tech", specs: {}, bench: {} }
      ],
      psu: [
        { id: "psu-1", name: "Corsair RM750e 750W", best_price: 8000, best_retailer: "Star Tech", specs: { wattage: "750" }, bench: {} }
      ],
      case: [
        { id: "case-1", name: "NZXT H5 Flow ATX", best_price: 6400, best_retailer: "Tech Land", specs: { form_factor: "ATX" }, bench: {} },
        { id: "case-2", name: "Antec NX200M mATX", best_price: 3200, best_retailer: "Star Tech", specs: { form_factor: "mATX" }, bench: {} }
      ],
      cooler: [
        { id: "cooler-1", name: "DeepCool AK400", best_price: 3000, best_retailer: "Ryans", specs: {}, bench: {} },
        { id: "cooler-2", name: "Thermalright Assassin X 120", best_price: 1800, best_retailer: "Star Tech", specs: {}, bench: {} }
      ]
    };
    // Natural combination: 32k + 18k + 14k + 65k + 8k + 8k + 6.4k + 3k = 154,400 BDT
    const candidateLookup = buildCandidateLookup(candidatesMap);

    const req = { budget_bdt: 150000, purpose: "gaming", language: "en" };
    const optimized = optimizePlanAlgorithmically(req, candidatesMap, candidateLookup);

    expect(optimized.total_bdt).toBeLessThanOrEqual(150000);
    expect(optimized.swaps.length).toBeGreaterThan(0);
    expect(["met", "under"]).toContain(optimized.budget_status);
    expect(optimized.validation.ok).toBe(true);
  });

  // Task A & G: AI-BUDGET-002
  it("AI-BUDGET-002: Bangla prompt ('১.৫ লাখ টাকার গেমিং পিসি') with ৳153,500 natural total lands <= 150000, request.language === 'bn'", async () => {
    const parsed = parseIntentRegex("১.৫ লাখ টাকার গেমিং পিসি");
    expect(parsed.language).toBe("bn");
    expect(parsed.budget_bdt).toBe(150000);
    expect(parsed.purpose).toBe("gaming");

    const candidatesMap = {
      cpu: [
        { id: "cpu-1", name: "Intel Core i5-13400F", best_price: 24000, best_retailer: "Star Tech", specs: {}, bench: { score: 80, socket: "LGA1700", tdp_watts: 65 } }
      ],
      motherboard: [
        { id: "mobo-1", name: "ASRock B760M-HDV", best_price: 13500, best_retailer: "Ryans", specs: {}, bench: { socket: "LGA1700" } }
      ],
      ram: [
        { id: "ram-1", name: "G.Skill Ripjaws S5 32GB DDR5", best_price: 12500, best_retailer: "Tech Land", specs: {}, bench: {} }
      ],
      gpu: [
        { id: "gpu-1", name: "ZOTAC RTX 4070 Twin Edge 12GB", best_price: 81000, best_retailer: "Star Tech", specs: {}, bench: { score: 88, tdp_watts: 200 } }
      ],
      storage: [
        { id: "ssd-1", name: "Samsung 980 1TB", best_price: 7500, best_retailer: "Ryans", specs: {}, bench: {} },
        { id: "ssd-2", name: "Lexar NM620 1TB", best_price: 5000, best_retailer: "Star Tech", specs: {}, bench: {} }
      ],
      psu: [
        { id: "psu-1", name: "DeepCool PK650D 650W", best_price: 6500, best_retailer: "Star Tech", specs: { wattage: "650" }, bench: {} }
      ],
      case: [
        { id: "case-1", name: "Montech Air 100", best_price: 5500, best_retailer: "Tech Land", specs: { form_factor: "mATX" }, bench: {} },
        { id: "case-2", name: "Value-Top VT-R8 mATX", best_price: 2500, best_retailer: "Star Tech", specs: { form_factor: "mATX" }, bench: {} }
      ],
      cooler: [
        { id: "cooler-1", name: "DeepCool AG400 ARGB", best_price: 3000, best_retailer: "Ryans", specs: {}, bench: {} }
      ]
    };
    // Natural total: 24k + 13.5k + 12.5k + 81k + 7.5k + 6.5k + 5.5k + 3k = 153,500 BDT
    const candidateLookup = buildCandidateLookup(candidatesMap);

    const optimized = optimizePlanAlgorithmically(parsed, candidatesMap, candidateLookup);
    expect(optimized.total_bdt).toBeLessThanOrEqual(150000);
    expect(optimized.swaps.length).toBeGreaterThan(0);
    expect(optimized.validation.ok).toBe(true);
  });

  // Task A & G: AI-BUDGET-003
  it("AI-BUDGET-003: Unmeetable budget reports budget_status === 'over', budget_shortfall_bdt > 0 and explanation contains shortfall", async () => {
    const candidatesMap = {
      cpu: [{ id: "cpu-1", name: "Core i3-12100", best_price: 12000, best_retailer: "Star Tech", specs: {}, bench: { socket: "LGA1700" } }],
      motherboard: [{ id: "mobo-1", name: "H610M", best_price: 9000, best_retailer: "Ryans", specs: {}, bench: { socket: "LGA1700" } }],
      ram: [{ id: "ram-1", name: "8GB DDR4", best_price: 2500, best_retailer: "Tech Land", specs: {}, bench: {} }],
      storage: [{ id: "ssd-1", name: "256GB SSD", best_price: 2500, best_retailer: "Star Tech", specs: {}, bench: {} }],
      psu: [{ id: "psu-1", name: "450W PSU", best_price: 3000, best_retailer: "Star Tech", specs: { wattage: "450" }, bench: {} }],
      case: [{ id: "case-1", name: "Basic Case", best_price: 2000, best_retailer: "Tech Land", specs: { form_factor: "ATX" }, bench: {} }]
    };
    // Minimum possible build total = 12k + 9k + 2.5k + 2.5k + 3k + 2k = 31,000 BDT
    const candidateLookup = buildCandidateLookup(candidatesMap);
    const unmeetableReq = { budget_bdt: 20000, purpose: "office", language: "en" };

    const optimized = optimizePlanAlgorithmically(unmeetableReq, candidatesMap, candidateLookup);

    expect(optimized.budget_status).toBe("over");
    expect(optimized.budget_shortfall_bdt).toBe(optimized.total_bdt - 20000);
    expect(optimized.budget_shortfall_bdt).toBeGreaterThan(0);

    const explanationEn = generateTemplateExplanation(optimized, candidateLookup, unmeetableReq);
    expect(explanationEn).toContain("above your budget");
    expect(explanationEn).toContain(optimized.budget_shortfall_bdt.toLocaleString("en-IN"));

    const bnReq = { budget_bdt: 20000, purpose: "office", language: "bn" };
    const explanationBn = generateTemplateExplanation(optimized, candidateLookup, bnReq);
    expect(explanationBn).toContain("বেশি");
    expect(explanationBn).toContain(optimized.budget_shortfall_bdt.toLocaleString("en-IN"));
  });

  // Task A & G: AI-BUDGET-004
  it("AI-BUDGET-004: Refinement that pushes the build over budget triggers enforcement", async () => {
    const candidatesMap = {
      cpu: [{ id: "cpu-1", name: "Ryzen 5 5600", best_price: 13000, best_retailer: "Star Tech", specs: {}, bench: { socket: "AM4" } }],
      motherboard: [{ id: "mobo-1", name: "B450M", best_price: 8000, best_retailer: "Ryans", specs: {}, bench: { socket: "AM4" } }],
      ram: [{ id: "ram-1", name: "16GB DDR4", best_price: 4500, best_retailer: "Tech Land", specs: {}, bench: {} }],
      gpu: [
        { id: "gpu-base", name: "RX 6600 8GB", best_price: 26000, best_retailer: "Star Tech", specs: {}, bench: {} },
        { id: "gpu-upgrade", name: "RTX 4060 8GB", best_price: 36000, best_retailer: "Ryans", specs: {}, bench: {} }
      ],
      storage: [
        { id: "ssd-1", name: "1TB NVMe", best_price: 7000, best_retailer: "Star Tech", specs: {}, bench: {} },
        { id: "ssd-cheap", name: "500GB NVMe", best_price: 4000, best_retailer: "Star Tech", specs: {}, bench: {} }
      ],
      psu: [{ id: "psu-1", name: "550W PSU", best_price: 4500, best_retailer: "Tech Land", specs: { wattage: "550" }, bench: {} }],
      case: [
        { id: "case-1", name: "Gaming Case", best_price: 4000, best_retailer: "Star Tech", specs: { form_factor: "mATX" }, bench: {} },
        { id: "case-cheap", name: "Standard Case", best_price: 2000, best_retailer: "Tech Land", specs: { form_factor: "mATX" }, bench: {} }
      ]
    };
    // Base total: 13k + 8k + 4.5k + 26k + 7k + 4.5k + 4k = 67,000 BDT (budget = 70,000)
    const candidateLookup = buildCandidateLookup(candidatesMap);

    const initialBuild = {
      parts: {
        cpu: "cpu-1",
        motherboard: "mobo-1",
        ram: "ram-1",
        gpu: "gpu-base",
        storage: "ssd-1",
        psu: "psu-1",
        case: "case-1"
      },
      total_bdt: 67000
    };

    // Swap GPU to RTX 4060 (36,000 BDT): new total without enforcement would be 77,000 (> 70,000 ceiling)
    const testOverBuild = {
      parts: {
        ...initialBuild.parts,
        gpu: "gpu-upgrade"
      },
      total_bdt: 77000
    };

    const enforced = enforceBudgetCeiling(testOverBuild, candidatesMap, candidateLookup, 70000);
    expect(enforced.build.total_bdt).toBeLessThanOrEqual(70000);
    expect(enforced.swaps.length).toBeGreaterThan(0);
    expect(enforced.fits).toBe(true);
  });

  // Task C & G: AI-PERSIST-001
  it("AI-PERSIST-001: persistMessageToDb sends tokens_out; persistSessionToDb accepts session- style IDs", async () => {
    const mockMessages = [];
    const mockSessions = [];

    const mockSupabase = {
      from(table) {
        if (table === "ai_messages") {
          return {
            insert: async (row) => {
              mockMessages.push(row);
              return { data: row, error: null };
            }
          };
        }
        if (table === "ai_sessions") {
          return {
            upsert: async (row) => {
              mockSessions.push(row);
              return { data: row, error: null };
            }
          };
        }
        return {};
      }
    };

    const testSessionId = "session-1789983163207";
    await persistMessageToDb(testSessionId, "user", "Hello Tonima", 12, 45, "qwen/qwen3.8-27b", mockSupabase);

    expect(mockMessages.length).toBe(1);
    expect(mockMessages[0].session_id).toBe(testSessionId);
    expect(mockMessages[0].tokens_out).toBe(45);
    expect(mockMessages[0].tokensOut).toBeUndefined(); // Verify fix: no camelCase tokensOut column

    await persistSessionToDb(
      testSessionId,
      null,
      { budget_bdt: 120000, purpose: "gaming" },
      { parts: { cpu: "cpu-1" }, total_bdt: 115000 },
      mockSupabase,
      { summary: "User requested 1.2L gaming PC", pinnedConstraints: { budget_bdt: 120000 } }
    );

    expect(mockSessions.length).toBe(1);
    expect(mockSessions[0].id).toBe(testSessionId);
    expect(mockSessions[0].summary).toEqual({ text: "User requested 1.2L gaming PC" });
    expect(mockSessions[0].pinned_constraints).toEqual({ budget_bdt: 120000 });
  });

  // Task E & G: AI-GROUND-001
  it("AI-GROUND-001: Stubbed explainer stream that invents ৳99,999 is rejected and flagged", async () => {
    const build = {
      parts: {
        cpu: "cpu-1",
        gpu: "gpu-1"
      },
      total_bdt: 75000
    };
    const candidateLookup = {
      "cpu-1": { id: "cpu-1", name: "Ryzen 5 7600", best_price: 25000, best_retailer: "Star Tech" },
      "gpu-1": { id: "gpu-1", name: "RTX 4060", best_price: 50000, best_retailer: "Ryans" }
    };

    // Text containing valid prices
    const validText = "This build totals ৳ 75,000 featuring a CPU for ৳ 25,000 from Star Tech and GPU for ৳ 50,000 from Ryans.";
    const validCheck = verifyExplainerText(validText, build, candidateLookup);
    expect(validCheck.valid).toBe(true);

    // Text containing hallucinated ৳99,999
    const hallucinatedText = "This build features a premium GPU for ৳ 99,999 from Star Tech.";
    const invalidCheck = verifyExplainerText(hallucinatedText, build, candidateLookup);
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.reason).toContain("Hallucinated price");

    // Text mentioning unselected retailer
    const unselectedStoreText = "You can purchase the CPU from Creatus Computer for ৳ 25,000.";
    const invalidStoreCheck = verifyExplainerText(unselectedStoreText, build, candidateLookup);
    expect(invalidStoreCheck.valid).toBe(false);
    expect(invalidStoreCheck.reason).toContain("retailer");
  });
});
