if (!globalThis.WebSocket) {
  globalThis.WebSocket = class WebSocket {};
}

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { execFileSync } from "child_process";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail, sendPriceAlertConfirmationEmail, sendPriceDropAlertEmail } from "./mailer.js";
import { extractAttributes, generateFingerprint, isSameProductVariant, group5StoreOffers } from "./lib/normalizer.js";
import { getGroqSuggestions } from "./lib/groq.js";
import { buildProductAlternatives, deriveCategory, getCategoryFallbackImage } from "./lib/alternatives.js";
import { batchEnrichCallForPrice, enrichGroupedShops, estimateSingleProductPrice } from "./lib/priceEstimator.js";

dotenv.config();

/**
 * Sanitizes input string to prevent log injection vulnerabilities.
 * @param {string} str 
 * @returns {string}
 */
const sanitizeLog = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, " ").slice(0, 100).trim();
};

/**
 * Sanitizes input string strictly for command line execution to prevent shell/command injection.
 * @param {string} str 
 * @returns {string}
 */
const sanitizeCliArg = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[^a-zA-Z0-9\s.\-_+]/g, " ").replace(/\s+/g, " ").slice(0, 100).trim();
};

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://jkooxrfapqvwmoygswjv.supabase.co";
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY || 
  "sb_publishable_WYWNQjk1XWmjAol57TY98A_9MGQNB7C"
);

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Normalizes query string into useful search tokens for any tech category.
 */
function getQueryVariations(rawQuery) {
  if (!rawQuery || typeof rawQuery !== "string") {
    return { cleanQ: "", normQ: "", tokens: [] };
  }

  const cleanQ = rawQuery.replace(/[^a-zA-Z0-9\s.\-_+]/g, " ").replace(/\s+/g, " ").trim();
  const lower = cleanQ.toLowerCase();

  let normQ = lower
    .replace(/(\d+)\s*gb\b/g, "$1gb")
    .replace(/(\d+)\s*tb\b/g, "$1tb")
    .replace(/(\d+)\s*va\b/g, "$1va")
    .replace(/(\d+)\s*w\b/g, "$1w")
    .replace(/(\d+)\s*hz\b/g, "$1hz")
    .replace(/(\d+)\s*ghz\b/g, "$1ghz")
    .replace(/(\d+)\s*mhz\b/g, "$1mhz")
    .replace(/(\d+)\s*pin\b/g, "$1pin")
    .replace(/(\d+)\s*fan\b/g, "$1fan")
    .replace(/(\d+)\s*port\b/g, "$1port")
    .replace(/\s+/g, " ")
    .trim();

  const rawTokens = Array.from(new Set([
    ...lower.split(/\s+/),
    ...normQ.split(/\s+/)
  ])).filter(t => t.length > 0);

  const noiseWords = new Set([
    "pc", "bd", "price", "in", "bangladesh", "buy", "online", "shop", "store",
    "best", "cheap", "good", "latest", "new", "original", "official", "edition"
  ]);

  const tokens = rawTokens.filter(t => !noiseWords.has(t));

  return { cleanQ, normQ, tokens };
}

/**
 * Detects user search intent to prioritize true components, extract exact model codes,
 * and prevent cross-category bleed-through (e.g. laptops/prebuilts showing up for standalone GPU searches).
 */
function detectSearchIntent(query) {
  const q = (query || "").toLowerCase().trim();
  
  // 1. Check if user explicitly requested a laptop or prebuilt system
  const isLaptopQuery = q.includes("laptop") || q.includes("notebook") || q.includes("macbook") || q.includes("zenbook") || q.includes("ideapad");
  const isPcQuery = q.includes("desktop pc") || q.includes("gaming pc") || q.includes("prebuilt") || q.includes("budget pc") || q.includes("pc build") || q.includes("all-in-one") || q.includes("aio pc");

  if (isLaptopQuery) {
    return { category: "Laptop", type: "laptop", modelCode: null, isExplicitSystem: true, excludes: [] };
  }
  if (isPcQuery) {
    return { category: "Desktop PC", type: "pc", modelCode: null, isExplicitSystem: true, excludes: [] };
  }

  // 2. Extract GPU Model Code (e.g. 4060, 4060 Ti, 4070, 4080, 4090, 5060, 3060, 7600, 7800, 6600)
  const gpuModelMatch = q.match(/\b(rtx\s*)?(\d{4}(?:\s*ti|\s*super)?)\b/i) || q.match(/\b(rx\s*)(\d{4}(?:\s*xt)?)\b/i) || q.match(/\b(gtx\s*)(\d{4}(?:\s*ti)?)\b/i);
  let gpuModelCode = null;
  if (gpuModelMatch) {
    gpuModelCode = (gpuModelMatch[2] || gpuModelMatch[0]).replace(/\s+/g, " ").trim();
  }

  // 3. GPU Intent
  if (q.includes("rtx") || q.includes("gtx") || q.includes("rx ") || q.includes("graphics card") || q.includes("gpu") || q.includes("radeon") || q.includes("geforce") || gpuModelMatch) {
    return {
      category: "Graphics Card",
      type: "gpu",
      modelCode: gpuModelCode,
      isExplicitSystem: false,
      excludes: ["laptop", "notebook", "desktop pc", "gaming pc", "combo offer", "budget pc", "casing", "chassis", "motherboard", "processor"]
    };
  }

  // 4. CPU Intent (e.g. Ryzen 7 7700, Core i5 13400, 7800X3D, 14700K)
  const cpuModelMatch = q.match(/\b(\d{4,5}[xX3dDkKfF]*)\b/i) || q.match(/\b(i[3579]-?\d{4,5}[kKfF]*)\b/i) || q.match(/\b(ryzen\s*[3579]\s*\d{4}[xX3dD]*)\b/i);
  let cpuModelCode = cpuModelMatch ? cpuModelMatch[0].trim() : null;

  if (q.includes("ryzen") || q.includes("core i") || q.includes("processor") || q.includes("cpu") || q.includes("threadripper") || cpuModelMatch) {
    return {
      category: "Processor",
      type: "cpu",
      modelCode: cpuModelCode,
      isExplicitSystem: false,
      excludes: ["laptop", "notebook", "desktop pc", "gaming pc", "budget pc", "pc build", "combo offer", "motherboard", "cooler", "casing"]
    };
  }

  // 5. Motherboard Intent
  if (q.includes("motherboard") || q.includes("mainboard") || q.includes("b650") || q.includes("b760") || q.includes("z790") || q.includes("x670") || q.includes("b550") || q.includes("a620") || q.includes("z890") || q.includes("x870")) {
    const mbMatch = q.match(/\b([abxzABXZ]\d{3}[mMeE]?)\b/);
    return {
      category: "Motherboard",
      type: "motherboard",
      modelCode: mbMatch ? mbMatch[0].trim() : null,
      isExplicitSystem: false,
      excludes: ["laptop", "desktop pc", "gaming pc", "combo offer"]
    };
  }

  // 6. UPS & Power
  if (q.includes("ups") || q.includes("ips") || q.includes("voltage") || q.includes("offline ups") || q.includes("online ups")) {
    return { category: "UPS & Power", type: "ups", modelCode: null, isExplicitSystem: false, excludes: ["mouse", "keyboard", "headphone"] };
  }

  // 7. Pendrive / Flash Storage
  if (q.includes("pendrive") || q.includes("pen drive") || q.includes("flash drive") || q.includes("thumb drive") || q.includes("usb drive")) {
    return { category: "Pendrive / Storage", type: "pendrive", modelCode: null, isExplicitSystem: false, excludes: ["mouse", "keyboard", "cable", "laptop"] };
  }

  // 8. Monitor Intent
  if (q.includes("monitor") || q.includes("display")) {
    return { category: "Monitor", type: "monitor", modelCode: null, isExplicitSystem: false, excludes: ["laptop", "notebook"] };
  }

  // 9. SSD Storage Intent
  if (q.includes("ssd") || q.includes("nvme") || q.includes("m.2") || q.includes("990 pro") || q.includes("980 pro") || q.includes("sn850x") || q.includes("sn770")) {
    const ssdMatch = q.match(/\b(990\s*pro|980\s*pro|sn850x|sn770|p3\s*plus|kc3000|nv2)\b/i);
    return {
      category: "SSD Storage",
      type: "ssd",
      modelCode: ssdMatch ? ssdMatch[0].trim() : null,
      isExplicitSystem: false,
      excludes: ["laptop", "desktop pc"]
    };
  }

  // 10. RAM Memory Intent
  if (q.includes("ram") || q.includes("ddr4") || q.includes("ddr5") || q.includes("desktop memory")) {
    return { category: "RAM Memory", type: "ram", modelCode: null, isExplicitSystem: false, excludes: ["desktop pc", "gaming pc", "motherboard"] };
  }

  // 11. Power Supply Intent
  if (q.includes("power supply") || q.includes("psu") || q.includes("80 plus") || q.includes("80+")) {
    return { category: "Power Supply", type: "psu", modelCode: null, isExplicitSystem: false, excludes: ["laptop", "desktop pc"] };
  }

  // 12. Cooler Intent
  if (q.includes("cooler") || q.includes("liquid cooler") || q.includes("cpu cooler") || q.includes("aio cooler")) {
    return { category: "Cooler", type: "cooler", modelCode: null, isExplicitSystem: false, excludes: ["laptop", "desktop pc"] };
  }

  // 13. Casing Intent
  if (q.includes("casing") || q.includes("chassis")) {
    return { category: "Casing", type: "casing", modelCode: null, isExplicitSystem: false, excludes: ["laptop", "desktop pc"] };
  }
  
  return { category: "All", type: "general", modelCode: null, isExplicitSystem: false, excludes: [] };
}

/**
 * Searches listings directly from Supabase with precision model gating, category enforcement,
 * and smart multi-tier ranking.
 */
async function searchSupabaseListings(query, requestedCategory = null) {
  if (!query) return [];
  const { cleanQ, normQ, tokens } = getQueryVariations(query);
  const intent = detectSearchIntent(query);

  const safeCleanQ = cleanQ.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const safeNormQ = normQ.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const qLower = query.toLowerCase().trim();

  try {
    let baseQuery = supabase
      .from("listings")
      .select("id, title, brand, price, price_str, retailer, product_url, image_url, last_scraped_at, product_id");

    // Build targeted query conditions based on intent and model codes
    const orConditions = [];

    // 1. Full clean query match
    if (safeCleanQ) {
      orConditions.push(`title.ilike.%${safeCleanQ}%`);
    }
    if (safeNormQ && safeNormQ !== safeCleanQ) {
      orConditions.push(`title.ilike.%${safeNormQ}%`);
    }

    // 2. Exact Model Code match (e.g. "4060", "7600", "b650", "990 pro")
    if (intent.modelCode) {
      const cleanModel = intent.modelCode.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      if (cleanModel) {
        orConditions.push(`title.ilike.%${cleanModel}%`);
      }
    }

    // 3. Significant tokens (length >= 3)
    for (const t of tokens.slice(0, 3)) {
      if (t.length >= 3 && !["rtx", "gtx", "amd", "intel", "asus", "msi"].includes(t)) {
        orConditions.push(`title.ilike.%${t}%`);
      }
    }

    // If no specific conditions, fallback to general tokens
    if (orConditions.length === 0) {
      for (const t of tokens.slice(0, 3)) {
        if (t.length >= 2) {
          orConditions.push(`title.ilike.%${t}%`);
        }
      }
    }

    if (orConditions.length > 0) {
      baseQuery = baseQuery.or(orConditions.join(","));
    }

    // Fetch up to 250 candidate records from Supabase
    const { data, error } = await baseQuery.limit(250);

    if (error || !data || data.length === 0) {
      return [];
    }

    // Precision Filtering
    const filtered = data.filter(item => {
      const title = item.title || "";
      const titleLower = title.toLowerCase();

      // 1. Strict Negative Category Exclusions (e.g. exclude laptops/prebuilt PCs for GPU searches)
      if (intent.excludes && intent.excludes.length > 0) {
        if (intent.excludes.some(exc => titleLower.includes(exc.toLowerCase()))) {
          return false;
        }
      }

      // 2. Strict Model Code Precision:
      // If user searched for a specific model (e.g. "4060"), reject completely different models (e.g. "3060", "4070", "4080", "4090", "3050")
      if (intent.modelCode) {
        const modelClean = intent.modelCode.toLowerCase().replace(/[^a-z0-9]/g, "");
        const titleNormalized = titleLower.replace(/[^a-z0-9]/g, "");
        
        // Ensure the title contains the model number
        if (!titleNormalized.includes(modelClean)) {
          return false;
        }

        // Specifically for GPU series: prevent "4070" matching when "4060" requested
        if (intent.type === "gpu") {
          const requestedNumMatch = intent.modelCode.match(/\d{4}/);
          if (requestedNumMatch) {
            const reqNum = requestedNumMatch[0];
            const titleGpuMatches = titleLower.match(/\b(rtx|gtx|rx)?\s*(\d{4})\b/i);
            if (titleGpuMatches && titleGpuMatches[2] && titleGpuMatches[2] !== reqNum) {
              return false;
            }
          }
        }
      }

      // 3. Category Validation via deriveCategory
      const derived = deriveCategory(title);
      if (intent.category && intent.category !== "All") {
        if (intent.category === "Graphics Card" && derived !== "Graphics Card") {
          return false;
        }
        if (intent.category === "Processor" && derived !== "Processor") {
          return false;
        }
        if (intent.category === "Motherboard" && derived !== "Motherboard") {
          return false;
        }
        if (intent.category === "Laptop" && derived !== "Laptop") {
          return false;
        }
      }

      // 4. Requested Category Filter Override (from UI category pills)
      if (requestedCategory && requestedCategory !== "All") {
        if (requestedCategory === "Graphics Card" && derived !== "Graphics Card") return false;
        if (requestedCategory === "Processor" && derived !== "Processor") return false;
        if (requestedCategory === "Motherboard" && derived !== "Motherboard") return false;
        if (requestedCategory === "Laptop" && derived !== "Laptop") return false;
        if (requestedCategory === "RAM Memory" && derived !== "RAM Memory") return false;
        if (requestedCategory === "SSD Storage" && derived !== "SSD Storage") return false;
      }

      return true;
    });

    // Score & Rank Candidates
    const scored = filtered.map(r => {
      const titleLower = (r.title || "").toLowerCase();
      let matchRank = 5;

      const isExactSearch = titleLower.includes(safeCleanQ.toLowerCase());
      const isTiVariant = qLower.includes("ti") ? titleLower.includes("ti") : !titleLower.includes("ti");

      if (titleLower === safeCleanQ.toLowerCase()) {
        matchRank = 0; // Exact full title
      } else if (isExactSearch && isTiVariant) {
        matchRank = 1; // Exact match on core model and Ti specification
      } else if (isExactSearch) {
        matchRank = 2; // Exact match on core model (e.g. RTX 4060 Ti when 4060 searched)
      } else if (intent.modelCode && titleLower.includes(intent.modelCode.toLowerCase())) {
        matchRank = 3; // Model code match
      } else {
        matchRank = 4;
      }

      // Prioritize in-stock / valid price items (> 0) over "Call for Price" (0)
      const stockPriority = (r.price && r.price > 0) ? 0 : 1;

      return {
        ...r,
        base_product_name: r.brand || "Hardware",
        category: deriveCategory(r.title),
        matchRank,
        stockPriority
      };
    });

    // Multi-tier sorting:
    // 1. Match rank (Exact > Variant > Model > General)
    // 2. Stock priority (in-stock price > 0 first)
    // 3. Price ascending
    scored.sort((a, b) => {
      if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
      if (a.stockPriority !== b.stockPriority) return a.stockPriority - b.stockPriority;
      if (a.price > 0 && b.price > 0) return a.price - b.price;
      return 0;
    });

    // Intelligent Call for Price Estimation (Historical -> DB KNN -> Groq LLM)
    const enrichedResults = await batchEnrichCallForPrice(scored, supabase);

    console.log(`[Supabase Precision Search] Found ${enrichedResults.length} verified listings for "${sanitizeLog(query)}" (Intent: ${intent.category}, Model: ${intent.modelCode || 'None'})`);
    return enrichedResults;
  } catch (err) {
    console.warn("[Supabase Search Warning]:", sanitizeLog(err.message));
    return [];
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

const commandLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for live scanning and background processes. Please try again later." }
});

const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email requests, please try again later." }
});

// Apply default API limiter to all API endpoints
app.use("/api/", apiLimiter);

// Root Status & Health Endpoint
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "PC Kinba API Server",
    frontend_url: "http://localhost:5173",
    message: "Backend API is running. Access the web app at http://localhost:5173 or use the /api endpoints.",
    endpoints: {
      search: "/api/search?q=",
      suggest: "/api/search/suggest?q=",
      categories: "/api/categories",
      products: "/api/products"
    }
  });
});

// Feature 1: Multi-Retailer Search Autosuggest Endpoint (StarTech, Ryans, Techland, Skyland, etc.)
app.get("/api/search/suggest", apiLimiter, async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query || query.length < 1) {
    return res.json({ suggestions: [], structured_suggestions: [], retailers_found: [] });
  }

  const { cleanQ } = getQueryVariations(query);
  const intent = detectSearchIntent(query);
  const uniqueTitles = new Set();
  const structuredSuggestions = [];
  const retailersFoundSet = new Set();

  try {
    // 1. Fetch relevant listings from Supabase with retailer attribution
    let listingQuery = supabase
      .from("listings")
      .select("id, title, brand, price, price_str, retailer, image_url, product_url")
      .ilike("title", `%${cleanQ}%`)
      .limit(30);

    const { data: listings } = await listingQuery;

    if (listings && listings.length > 0) {
      // Group & pick best items across diverse retailers (StarTech, Ryans, Techland, Skyland, etc.)
      const retailerMap = new Map();

      for (const item of listings) {
        const titleLower = (item.title || "").toLowerCase();

        // Enforce basic intent exclusions
        if (intent.excludes && intent.excludes.length > 0) {
          if (intent.excludes.some(exc => titleLower.includes(exc.toLowerCase()))) {
            continue;
          }
        }

        const retailer = item.retailer || "BD Retailer";
        retailersFoundSet.add(retailer);

        if (!retailerMap.has(retailer)) {
          retailerMap.set(retailer, []);
        }
        retailerMap.get(retailer).push(item);
      }

      // Round-robin selection to ensure diversity across StarTech, Ryans, Techland, etc.
      const retailerKeys = Array.from(retailerMap.keys());
      let added = 0;
      let round = 0;

      while (added < 10 && round < 5) {
        let anyAddedInRound = false;
        for (const ret of retailerKeys) {
          const items = retailerMap.get(ret);
          if (items && items[round]) {
            const item = items[round];
            if (!uniqueTitles.has(item.title)) {
              uniqueTitles.add(item.title);
              structuredSuggestions.push({
                id: item.id,
                title: item.title,
                retailer: item.retailer,
                price: item.price,
                price_str: item.price_str || (item.price > 0 ? `${item.price.toLocaleString()}৳` : 'Call for Price'),
                category: deriveCategory(item.title),
                image_url: item.image_url,
                product_url: item.product_url,
                type: 'retailer_listing'
              });
              added++;
              anyAddedInRound = true;
            }
          }
        }
        if (!anyAddedInRound) break;
        round++;
      }
    }

    // 2. Fetch canonical catalog products
    if (structuredSuggestions.length < 10) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price")
        .ilike("name", `%${cleanQ}%`)
        .limit(4);

      if (prods) {
        for (const prod of prods) {
          if (!uniqueTitles.has(prod.name)) {
            uniqueTitles.add(prod.name);
            structuredSuggestions.push({
              id: prod.id,
              title: prod.name,
              retailer: "Catalog",
              price: prod.price ? Number(prod.price) : 0,
              price_str: prod.price ? `${Number(prod.price).toLocaleString()}৳` : '',
              category: deriveCategory(prod.name),
              type: 'catalog_product'
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("[Autosuggest Supabase Error]:", sanitizeLog(err.message));
  }

  // 3. Fallback to Groq AI query completions if database has very few items
  if (structuredSuggestions.length < 3) {
    try {
      const groqSuggestions = await getGroqSuggestions(query);
      if (Array.isArray(groqSuggestions)) {
        for (const s of groqSuggestions) {
          if (!uniqueTitles.has(s) && uniqueTitles.size < 10) {
            uniqueTitles.add(s);
            structuredSuggestions.push({
              title: s,
              retailer: "Suggested Search",
              category: deriveCategory(s),
              type: 'keyword'
            });
          }
        }
      }
    } catch (err) {
      console.warn("[Autosuggest Groq Warning]:", sanitizeLog(err.message));
    }
  }

  // Quick query terms array (clean strings for keyboard navigation / fast chips)
  const suggestionsArray = Array.from(uniqueTitles).slice(0, 10);
  const enrichedSuggestions = await batchEnrichCallForPrice(structuredSuggestions.slice(0, 10), supabase);

  return res.json({
    query,
    suggestions: suggestionsArray,
    structured_suggestions: enrichedSuggestions,
    retailers_found: Array.from(retailersFoundSet)
  });
});

// Feature 2: Search Results Endpoint (100% Supabase)
app.get("/api/search", apiLimiter, async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  const category = (req.query.category || "").toString().trim();
  if (!query) {
    return res.json({ query: "", count: 0, detected_category: "All", results: [] });
  }

  const intent = detectSearchIntent(query);
  console.log(`[API Search] Executing precision search for query: "${sanitizeLog(query)}" (Intent: ${intent.category}, Model: ${intent.modelCode || 'None'}, Filter: ${category ? sanitizeLog(category) : 'Auto'})`);

  let results = await searchSupabaseListings(query, category);

  // If fewer than 2 results found in DB, auto-trigger live scrapers across all 12 retailers
  if (results.length < 2) {
    console.log(`[Auto-Scraper] Insufficient DB results (${results.length}) for query "${sanitizeLog(query)}". Triggering live scraper on 12 retailers...`);
    try {
      const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
      const runScriptPath = path.join(process.cwd(), "scrapers/run_scrapers.py");
      const safeQuery = sanitizeCliArg(query);
      
      execFileSync(pythonPath, [runScriptPath, "--query", safeQuery], {
        timeout: 45000,
        stdio: "inherit",
        env: { ...process.env, PYTHONPATH: "." }
      });

      results = await searchSupabaseListings(query, category);
      processPriceDropEvents().catch(err => console.error("[Price Drop Events Error]:", sanitizeLog(err.message)));
    } catch (err) {
      console.error("[Auto-Scraper Error]:", sanitizeLog(err.message));
    }
  }

  return res.json({
    query,
    detected_category: intent.category,
    detected_model: intent.modelCode || null,
    count: results.length,
    results
  });
});

// Feature 2b: Parallel Live Scraping + Matching Endpoint
app.get("/api/search/live", commandLimiter, async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  console.log(`[API Live Search] Running parallel Google web search & live scraper for: "${sanitizeLog(query)}"`);

  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scriptPath = path.join(process.cwd(), "scrapers/parallel_engine.py");
    const safeQuery = sanitizeCliArg(query);

    const stdout = execFileSync(pythonPath, [scriptPath, safeQuery], {
      timeout: 30000,
      encoding: "utf-8",
      env: { ...process.env, PYTHONPATH: "." }
    });

    const jsonStart = stdout.indexOf("{");
    if (jsonStart !== -1) {
      const parsed = JSON.parse(stdout.slice(jsonStart));
      return res.json(parsed);
    }
    
    return res.status(500).json({ error: "Failed to parse parallel engine output" });
  } catch (err) {
    console.error("[Live Search API Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Live search failed", details: err.message });
  }
});

// Feature 3: Dynamic Product Details Endpoint with 5-Store Comparison & Normalization (Supabase)
app.get("/api/product/:id", apiLimiter, async (req, res) => {
  const id = (req.params.id || "").trim();
  if (!id || !/^[a-zA-Z0-9\-_]{1,64}$/.test(id)) {
    return res.status(400).json({ error: "Valid product ID format required" });
  }

  console.log(`[API Product] Fetching dynamic product details for ID: ${sanitizeLog(id)}`);

  let item = null;

  try {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      item = data;
    }
  } catch (err) {
    console.warn("[Product Details Supabase Warning]:", sanitizeLog(err.message));
  }

  if (!item) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Extract canonical attributes & fingerprint
  const { fingerprint, canonical_name, attributes } = generateFingerprint(item.title, item.brand);
  const category = deriveCategory(item.title);

  // Search candidate matching listings across Supabase DB
  const titleWords = item.title.split(/\s+/).filter(w => w.length > 2);
  const mainKeywords = titleWords.slice(0, 3).join(" ");

  const rawCandidates = await searchSupabaseListings(mainKeywords);

  // Filter candidates using 85% fuzzy match & variant safety checks (prevent merging 8GB vs 16GB)
  const matchedListings = rawCandidates.filter((cand) => {
    if (cand.id === item.id) return false;
    return isSameProductVariant(item.title, cand.title, 0.85);
  });

  // Group offers across target stores
  let groupedResult = group5StoreOffers(item, matchedListings);

  // Automatic Real-Time Price Comparison: If fewer than 2 stores have prices or ?live=true, trigger live Google scanner
  const pricedShopsCount = groupedResult.shops.filter(s => s.price > 0).length;
  if (pricedShopsCount < 2 || req.query.live === 'true') {
    try {
      console.log(`[API Product] Running Google Live Scanner for "${sanitizeLog(item.title)}"...`);
      const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
      const scannerScript = path.join(process.cwd(), "scrapers/google_live_scanner.py");
      const safeTitle = sanitizeCliArg(item.title || item.canonical_name || "");

      const stdout = execFileSync(pythonPath, [scannerScript, safeTitle], {
        timeout: 35000,
        encoding: "utf-8",
        env: { ...process.env, PYTHONPATH: "." }
      });

      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const liveData = JSON.parse(jsonMatch[0]);
        if (liveData && Array.isArray(liveData.shops) && liveData.shops.length > 0) {
          groupedResult.shops = liveData.shops;
          if (liveData.best_price > 0) {
            groupedResult.best_price = liveData.best_price;
            groupedResult.best_price_str = liveData.best_price_str;
          }
        }
      }
    } catch (e) {
      console.warn("[Live Scanner Auto-Trigger Warning]:", sanitizeLog(e.message));
    }
  }

  // Intelligent Call for Price Estimation across all store offers (KNN / Historical / Groq)
  groupedResult.shops = await enrichGroupedShops(groupedResult.shops, item, supabase);
  const enrichedItem = await estimateSingleProductPrice(item, supabase, groupedResult.shops);

  // Construct dynamic key features
  const keyFeatures = [
    { label: "Brand", value: attributes.brand || item.brand || "Generic" },
    { label: "Model", value: attributes.model || item.title },
    { label: "Capacity / Storage", value: attributes.capacity || "N/A" },
    { label: "Spec / Type", value: attributes.type || "Standard" },
    { label: "Speed / Clock", value: attributes.speed || "Standard" },
    { label: "Canonical Key", value: fingerprint },
    { label: "Category", value: category },
    { label: "Last Verified Price", value: enrichedItem.price_str || item.price_str }
  ];

  const responsePayload = {
    id: item.id,
    product_id: item.product_id || null,
    title: item.title,
    canonical_name: canonical_name,
    fingerprint: fingerprint,
    brand: attributes.brand || item.brand || "Generic",
    price: enrichedItem.price,
    price_str: enrichedItem.price_str,
    is_call_for_price: enrichedItem.is_call_for_price,
    estimated_price: enrichedItem.estimated_price,
    estimation_source: enrichedItem.estimation_source,
    best_price: groupedResult.best_price || enrichedItem.price,
    best_price_str: groupedResult.best_price_str || enrichedItem.price_str,
    product: {
      id: item.id,
      canonical_name: canonical_name,
      fingerprint: fingerprint,
      manufacturer: attributes.manufacturer || "Generic",
      base_model: attributes.baseModel || attributes.model,
      type: attributes.type || "",
      capacity: attributes.capacity || "",
      speed: attributes.speed || "",
      mpn: attributes.mpn || ""
    },
    retailer: item.retailer,
    product_url: item.product_url,
    image_url: item.image_url,
    category: category,
    last_scraped_at: item.last_scraped_at,
    keyFeatures: keyFeatures,
    offers: groupedResult.shops,
    shops: groupedResult.shops
  };

  return res.json(responsePayload);
});

// Feature 3b: Dynamic Category-Aware Alternative Parts Endpoint (Supabase)
app.get("/api/product/:id/alternatives", apiLimiter, async (req, res) => {
  const id = (req.params.id || "").trim();
  if (!id || !/^[a-zA-Z0-9\-_]{1,64}$/.test(id)) {
    return res.status(400).json({ error: "Valid product ID format required" });
  }

  try {
    const { data: item } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    if (item) {
      const alternatives = await buildProductAlternatives(item, supabase);
      return res.json({
        success: true,
        target_id: id,
        target_product: item.title,
        target_category: deriveCategory(item.title),
        count: alternatives.length,
        alternatives
      });
    }
  } catch (err) {
    console.error("[Alternatives API Supabase Error]:", sanitizeLog(err.message));
  }

  return res.status(404).json({ error: "Target product not found" });
});

// Feature 3c: General Alternatives query endpoint (by category or query)
app.get("/api/alternatives", apiLimiter, async (req, res) => {
  const category = (req.query.category || "").trim();
  const q = (req.query.q || "").trim();
  const price = parseInt(req.query.price || "25000", 10);

  const mockTarget = {
    id: "query-target",
    title: q || category || "Component",
    category: category || deriveCategory(q),
    price: price > 0 ? price : 25000,
    brand: ""
  };

  const alternatives = await buildProductAlternatives(mockTarget, supabase);

  return res.json({
    success: true,
    count: alternatives.length,
    alternatives
  });
});

// Dedicated On-Demand Live Google Price Scan Endpoint
app.get("/api/product/:id/live-prices", commandLimiter, async (req, res) => {
  const id = (req.params.id || "").trim();
  if (!id || !/^[a-zA-Z0-9\-_]{1,64}$/.test(id)) {
    return res.status(400).json({ error: "Valid product ID format required" });
  }

  let item = null;

  try {
    const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
    item = data;
  } catch (err) {
    console.error("[Live Scan API Error]:", sanitizeLog(err.message));
  }

  if (!item) {
    return res.status(404).json({ error: "Product not found" });
  }

  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scannerScript = path.join(process.cwd(), "scrapers/google_live_scanner.py");
    const safeTitle = sanitizeCliArg(item.title || item.canonical_name || "");

    const stdout = execFileSync(pythonPath, [scannerScript, safeTitle], {
      timeout: 45000,
      encoding: "utf-8",
      env: { ...process.env, PYTHONPATH: "." }
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const liveData = JSON.parse(jsonMatch[0]);
      if (liveData && Array.isArray(liveData.shops)) {
        liveData.shops = await enrichGroupedShops(liveData.shops, item, supabase);
      }
      processPriceDropEvents().catch(err => console.error("[Price Drop Events Error]:", sanitizeLog(err.message)));
      return res.json({ success: true, ...liveData });
    }
    return res.status(500).json({ error: "Failed to parse live scanner output" });
  } catch (err) {
    console.error("[Live Scan Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Live scan failed", details: err.message });
  }
});

// Standalone Live Market Scan Endpoint (search any product on demand)
app.get("/api/live-scan", commandLimiter, async (req, res) => {
  const query = req.query.q || req.query.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scannerScript = path.join(process.cwd(), "scrapers/google_live_scanner.py");
    const safeTitle = sanitizeCliArg(query);

    const stdout = execFileSync(pythonPath, [scannerScript, safeTitle], {
      timeout: 45000,
      encoding: "utf-8",
      env: { ...process.env, PYTHONPATH: "." }
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const liveData = JSON.parse(jsonMatch[0]);
      if (liveData && Array.isArray(liveData.shops)) {
        liveData.shops = await enrichGroupedShops(liveData.shops, { title: query }, supabase);
      }
      return res.json({ success: true, ...liveData });
    }
    return res.status(500).json({ error: "Failed to parse live scanner output" });
  } catch (err) {
    console.error("[Live Scan Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Live scan failed", details: err.message });
  }
});

app.post("/api/reconcile", commandLimiter, (req, res) => {
  console.log("[Reconcile API] Triggering background product reconciliation job...");
  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scriptPath = path.join(process.cwd(), "scrapers/reconcile.py");
    
    execFileSync(pythonPath, [scriptPath], {
      timeout: 60000,
      stdio: "inherit",
      env: { ...process.env, PYTHONPATH: "." }
    });

    return res.json({ success: true, message: "Reconciliation sweep completed successfully." });
  } catch (err) {
    console.error("[Reconcile API Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Reconciliation failed", details: err.message });
  }
});

function formatReviewDate(isoString) {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    if (diffMonths < 12) return `${diffMonths} months ago`;
    const diffYears = Math.floor(diffDays / 365);
    return diffYears <= 1 ? "1 year ago" : `${diffYears} years ago`;
  } catch {
    return "Recently";
  }
}

// Feature: Dynamic Product Reviews - GET reviews & stats (Supabase)
app.get("/api/product/:id/reviews", apiLimiter, async (req, res) => {
  const id = (req.params.id || "").trim();
  if (!id || !/^[a-zA-Z0-9\-_]{1,64}$/.test(id)) {
    return res.status(400).json({ error: "Valid product ID format required" });
  }

  let reviews = [];

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      reviews = data;
    }
  } catch (err) {
    console.warn("[Reviews Supabase Fetch Warning]:", sanitizeLog(err.message));
  }

  // Format reviews
  const formattedReviews = reviews.map(r => {
    let pros = [];
    let cons = [];
    let images = [];
    try {
      pros = Array.isArray(r.pros) ? r.pros : JSON.parse(r.pros || "[]");
    } catch { pros = []; }
    try {
      cons = Array.isArray(r.cons) ? r.cons : JSON.parse(r.cons || "[]");
    } catch { cons = []; }
    try {
      images = Array.isArray(r.images) ? r.images : JSON.parse(r.images || "[]");
    } catch { images = []; }

    return {
      id: r.id,
      productId: r.product_id,
      user: {
        id: r.user_id,
        name: r.user_name || "Verified User",
        avatar: r.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(r.user_name || "User")}`,
        country: r.user_country || "Bangladesh",
        countryCode: r.user_country_code || "BD"
      },
      verified: Boolean(r.verified),
      date: formatReviewDate(r.created_at),
      createdAt: r.created_at,
      rating: Number(r.rating) || 5,
      title: r.title || "",
      content: r.content || "",
      pros,
      cons,
      images,
      helpfulCount: Number(r.helpful_count) || 0
    };
  });

  const totalReviews = formattedReviews.length;
  const averageRating = totalReviews > 0
    ? Number((formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  const recommendCount = formattedReviews.filter(r => r.rating >= 4).length;
  const recommendPercent = totalReviews > 0
    ? Math.round((recommendCount / totalReviews) * 100)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const count = formattedReviews.filter(r => Math.round(r.rating) === stars).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { stars, count, percentage };
  });

  const verifiedCount = formattedReviews.filter(r => r.verified).length;
  const helpfulCount = formattedReviews.reduce((sum, r) => sum + (r.helpfulCount || 0), 0);
  
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const reviewsThisMonth = formattedReviews.filter(r => new Date(r.createdAt) >= oneMonthAgo).length;

  return res.json({
    success: true,
    productId: id,
    reviews: formattedReviews,
    stats: {
      totalReviews,
      averageRating,
      recommendPercent,
      ratingDistribution,
      verifiedCount,
      helpfulCount,
      reviewsThisMonth
    }
  });
});

// Feature: Dynamic Product Reviews - POST new review (Supabase)
app.post("/api/product/:id/reviews", authActionLimiter, async (req, res) => {
  const productId = (req.params.id || "").trim();
  if (!productId || !/^[a-zA-Z0-9\-_]{1,64}$/.test(productId)) {
    return res.status(400).json({ error: "Valid product ID required" });
  }

  const { rating, title, content, pros, cons, images, userId, userName, userAvatar, userCountry, userCountryCode } = req.body || {};

  const numRating = parseInt(rating, 10);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Review title is required" });
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Review description is required" });
  }

  const cleanPros = Array.isArray(pros) ? pros.map(p => String(p).trim()).filter(Boolean) : [];
  const cleanCons = Array.isArray(cons) ? cons.map(c => String(c).trim()).filter(Boolean) : [];
  const cleanImages = Array.isArray(images) ? images.map(img => String(img).trim()).filter(Boolean) : [];

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const nowIso = new Date().toISOString();

  // Validate userId format for Postgres UUID if provided
  const validUserId = (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) ? userId : null;

  const newReview = {
    id: reviewId,
    product_id: productId,
    user_id: validUserId,
    user_name: (userName || "PC Kinba Builder").trim().slice(0, 100),
    user_avatar: userAvatar || null,
    user_country: (userCountry || "Bangladesh").trim().slice(0, 50),
    user_country_code: (userCountryCode || "BD").trim().slice(0, 5),
    rating: numRating,
    title: title.trim().slice(0, 200),
    content: content.trim().slice(0, 2000),
    pros: cleanPros,
    cons: cleanCons,
    images: cleanImages,
    verified: true,
    helpful_count: 0,
    created_at: nowIso,
    updated_at: nowIso
  };

  try {
    const { error: supaErr } = await supabase
      .from("reviews")
      .insert({
        ...newReview,
        pros: JSON.stringify(cleanPros),
        cons: JSON.stringify(cleanCons),
        images: JSON.stringify(cleanImages)
      });
    if (supaErr) {
      console.warn("[Reviews Supabase Insert Warning]:", sanitizeLog(supaErr.message));
    }
  } catch (err) {
    console.error("[Reviews Supabase Insert Error]:", sanitizeLog(err.message));
  }

  return res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    review: {
      id: newReview.id,
      productId: newReview.product_id,
      user: {
        id: newReview.user_id,
        name: newReview.user_name,
        avatar: newReview.user_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newReview.user_name)}`,
        country: newReview.user_country,
        countryCode: newReview.user_country_code
      },
      verified: newReview.verified,
      date: "Just now",
      createdAt: newReview.created_at,
      rating: newReview.rating,
      title: newReview.title,
      content: newReview.content,
      pros: newReview.pros,
      cons: newReview.cons,
      images: newReview.images,
      helpfulCount: 0
    }
  });
});

// Feature: Helpful Review Upvote (Supabase)
app.post("/api/reviews/:id/helpful", apiLimiter, async (req, res) => {
  const reviewId = (req.params.id || "").trim();
  if (!reviewId) {
    return res.status(400).json({ error: "Review ID is required" });
  }

  let newCount = 1;

  try {
    const { data } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .maybeSingle();
    if (data) {
      newCount = (data.helpful_count || 0) + 1;
      await supabase
        .from("reviews")
        .update({ helpful_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", reviewId);
    }
  } catch (err) {
    console.warn("[Helpful Supabase Warning]:", sanitizeLog(err.message));
  }

  return res.json({ success: true, helpfulCount: newCount });
});

// ==============================================================================
// Price Alert & Price Change Subscription Endpoints (100% Supabase)
// ==============================================================================

// 1. Check price alert status for a product & user
app.get("/api/product/:id/price-alert", apiLimiter, async (req, res) => {
  const productId = (req.params.id || "").trim();
  const email = (req.query.email || "").trim().toLowerCase();
  const userId = (req.query.userId || "").trim();

  if (!productId || (!email && !userId)) {
    return res.json({ subscribed: false, alert: null });
  }

  let alertData = null;

  try {
    let query = supabase.from("price_alerts").select("*").eq("product_id", productId).eq("status", "active");
    if (email) {
      query = query.eq("user_email", email);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      alertData = data;
    }
  } catch (err) {
    console.warn("[PriceAlert Supabase Query Warning]:", sanitizeLog(err.message));
  }

  return res.json({
    subscribed: !!alertData,
    alert: alertData ? {
      id: alertData.id,
      productId: alertData.product_id,
      productTitle: alertData.product_title,
      userEmail: alertData.user_email,
      initialPrice: alertData.initial_price,
      currentPrice: alertData.current_price,
      targetPrice: alertData.target_price,
      status: alertData.status,
      createdAt: alertData.created_at
    } : null
  });
});

// 2. Subscribe or update price alert (Supabase)
app.post("/api/product/:id/price-alert", apiLimiter, async (req, res) => {
  const productId = (req.params.id || "").trim();
  const {
    email,
    userId = null,
    userName = "PC Builder",
    productTitle = "Component",
    productImage = null,
    productUrl = null,
    currentPrice = null,
    targetPrice = null,
    notifyOnAnyChange = true
  } = req.body;

  if (!productId || !email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email address and product reference are required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const alertRecord = {
    id: alertId,
    product_id: productId,
    product_title: typeof productTitle === "string" ? productTitle.slice(0, 300) : "Component",
    product_image: productImage || null,
    product_url: productUrl || null,
    user_id: userId || null,
    user_email: cleanEmail,
    user_name: typeof userName === "string" ? userName.slice(0, 100) : "PC Builder",
    initial_price: Number(currentPrice) || null,
    current_price: Number(currentPrice) || null,
    target_price: Number(targetPrice) || null,
    notify_on_any_change: !!notifyOnAnyChange,
    status: "active",
    created_at: now,
    updated_at: now
  };

  try {
    const { error: supaErr } = await supabase
      .from("price_alerts")
      .upsert(alertRecord, { onConflict: "product_id,user_email" });
    if (supaErr) {
      console.warn("[PriceAlert Supabase Upsert Warning]:", sanitizeLog(supaErr.message));
    }
  } catch (err) {
    console.error("[PriceAlert Supabase Upsert Error]:", sanitizeLog(err.message));
  }

  // Send email confirmation asynchronously
  sendPriceAlertConfirmationEmail({
    rawEmail: alertRecord.user_email,
    rawName: alertRecord.user_name,
    productTitle: alertRecord.product_title,
    currentPrice: alertRecord.current_price,
    targetPrice: alertRecord.target_price,
    productId: alertRecord.product_id
  }).catch((err) => {
    console.error("[PriceAlert Email Error]:", sanitizeLog(err.message));
  });

  return res.status(201).json({
    success: true,
    subscribed: true,
    message: "Price alert activated! You will receive notifications on price changes.",
    alert: {
      id: alertRecord.id,
      productId: alertRecord.product_id,
      productTitle: alertRecord.product_title,
      userEmail: alertRecord.user_email,
      currentPrice: alertRecord.current_price,
      targetPrice: alertRecord.target_price,
      status: alertRecord.status,
      createdAt: alertRecord.created_at
    }
  });
});

// Test / Trigger endpoint to simulate a real price drop notification email
app.post("/api/test/price-drop-alert", authActionLimiter, async (req, res) => {
  const {
    email = "wastsonbd123@gmail.com",
    name = "Andrew",
    productTitle = "GIGABYTE GeForce RTX 5060 Ti Gaming OC 8GB GDDR7",
    oldPrice = 58000,
    newPrice = 52500,
    storeName = "StarTech BD",
    productId = "b76b4ba2-14a9-494c-b0f9-f367987ae826"
  } = req.body;

  try {
    const result = await sendPriceDropAlertEmail({
      rawEmail: email,
      rawName: name,
      productTitle,
      oldPrice,
      newPrice,
      storeName,
      productId
    });

    return res.json({
      success: true,
      message: `Price drop alert email sent successfully to ${email}`,
      result
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Unsubscribe from price alert (Supabase)
app.delete("/api/product/:id/price-alert", apiLimiter, async (req, res) => {
  const productId = (req.params.id || "").trim();
  const email = (req.body.email || req.query.email || "").trim().toLowerCase();
  const userId = (req.body.userId || req.query.userId || "").trim();

  if (!productId || (!email && !userId)) {
    return res.status(400).json({ error: "Product reference and email/userId are required" });
  }

  try {
    let query = supabase.from("price_alerts").delete().eq("product_id", productId);
    if (email) {
      query = query.eq("user_email", email);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }
    await query;
  } catch (err) {
    console.warn("[PriceAlert Supabase Delete Warning]:", sanitizeLog(err.message));
  }

  return res.json({
    success: true,
    subscribed: false,
    message: "Unsubscribed from price change notifications."
  });
});

// 4. Get all price alerts for a user (Supabase)
app.get("/api/user/price-alerts", apiLimiter, async (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();
  const userId = (req.query.userId || "").trim();

  if (!email && !userId) {
    return res.json({ success: true, alerts: [] });
  }

  let alerts = [];

  try {
    let query = supabase.from("price_alerts").select("*").order("created_at", { ascending: false });
    if (email) {
      query = query.eq("user_email", email);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query;
    if (!error && data) {
      alerts = data;
    }
  } catch (err) {
    console.warn("[User PriceAlerts Supabase Warning]:", sanitizeLog(err.message));
  }

  return res.json({ success: true, alerts });
});

// ==============================================================================
// Price History (populated by DB trigger on listings) & Price-Drop Processing
// ==============================================================================

const PRICE_HISTORY_WINDOWS = new Set([30, 90, 180, 365]);
// listings.id is text: scraper-issued numeric ids and UUIDs coexist.
const LISTING_ID_RE = /^[\w-]{1,64}$/;

// 5. Price trend for a listing (or its canonical product across all retailers)
app.get("/api/product/:id/price-history", apiLimiter, async (req, res) => {
  const id = (req.params.id || "").trim();
  if (!LISTING_ID_RE.test(id)) {
    return res.status(400).json({ error: "Valid product ID format required" });
  }
  const days = PRICE_HISTORY_WINDOWS.has(Number(req.query.days)) ? Number(req.query.days) : 30;

  try {
    const { data: listing } = await supabase
      .from("listings")
      .select("id, product_id, price")
      .eq("id", id)
      .maybeSingle();
    if (!listing) {
      return res.status(404).json({ error: "Product not found" });
    }

    const [scopeCol, scopeVal] = listing.product_id
      ? ["product_id", listing.product_id]
      : ["listing_id", listing.id];
    const { data: rows, error } = await supabase
      .from("price_history")
      .select("retailer, price, scraped_at")
      .eq(scopeCol, scopeVal)
      .order("scraped_at", { ascending: true })
      .limit(2000);
    if (error) throw error;

    const since = Date.now() - days * 86400000;
    const inWindow = rows.filter(r => Date.parse(r.scraped_at) >= since);
    // Carry the last known price from before the window so the trend has a starting point.
    const carry = rows.filter(r => Date.parse(r.scraped_at) < since).pop();
    if (carry) inWindow.unshift({ ...carry, scraped_at: new Date(since).toISOString() });

    // One point per day: the best (lowest) price observed that day.
    const daily = new Map();
    for (const r of inWindow) {
      const day = r.scraped_at.slice(0, 10);
      if (!daily.has(day) || r.price < daily.get(day).price) {
        daily.set(day, { date: day, price: r.price, retailer: r.retailer });
      }
    }
    const points = [...daily.values()];

    const current = listing.price > 0 ? listing.price : (points.at(-1)?.price ?? 0);
    const prices = points.map(p => p.price).concat(current > 0 ? [current] : []);
    const lowest = prices.length ? Math.min(...prices) : 0;
    const highest = prices.length ? Math.max(...prices) : 0;
    const first = points[0]?.price ?? current;

    return res.json({
      id,
      days,
      current_price: current,
      lowest_price: lowest,
      highest_price: highest,
      is_lowest: current > 0 && current <= lowest,
      change_pct: first > 0 ? Math.round(((current - first) / first) * 1000) / 10 : 0,
      buy_signal: deriveBuySignal(points, current, lowest, highest, days),
      points
    });
  } catch (err) {
    console.error("[Price History Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Failed to load price history" });
  }
});

/**
 * "Best time to buy" heuristic: where the current price sits in the window's range,
 * combined with the direction of the last 7 days.
 * @returns {{ signal: "buy"|"fair"|"wait"|"neutral", reason: string }}
 */
function deriveBuySignal(points, current, lowest, highest, days) {
  if (current <= 0 || points.length < 2) {
    return { signal: "neutral", reason: "Not enough price history yet to judge timing." };
  }
  const range = highest - lowest;
  const position = range > 0 ? (current - lowest) / range : 0;
  const weekAgo = Date.now() - 7 * 86400000;
  const ref = [...points].reverse().find(p => Date.parse(p.date) < weekAgo) ?? points[0];
  const trendPct = ref.price > 0 ? ((current - ref.price) / ref.price) * 100 : 0;

  if (position <= 0.1) {
    return { signal: "buy", reason: `At its lowest price in ${days} days — a strong time to buy.` };
  }
  if (trendPct <= -3) {
    return { signal: "wait", reason: `Down ${Math.abs(trendPct).toFixed(1)}% this week and still falling — it may drop further.` };
  }
  if (position >= 0.6) {
    return { signal: "wait", reason: `৳${(current - lowest).toLocaleString()} above its ${days}-day low — wait for a better deal.` };
  }
  return { signal: "fair", reason: "Close to its recent low with stable pricing — a fair time to buy." };
}

/**
 * Drains price_drop_events (enqueued by a DB trigger on price_history): emails price-alert
 * subscribers, notifies wishlist owners in-app (+ email unless opted out), marks events done.
 * Requires SUPABASE_SERVICE_ROLE_KEY — the queue and wishlists are not readable by anon.
 * @returns {Promise<number>} Number of notifications (email + in-app) produced.
 */
async function processPriceDropEvents() {
  const { data: events, error } = await supabase
    .from("price_drop_events")
    .select("*")
    .is("processed_at", null)
    .order("id", { ascending: true })
    .limit(200);
  if (error || !events?.length) return 0;

  const listingIds = [...new Set(events.map(e => e.listing_id))];
  const productIds = [...new Set(events.map(e => e.product_id).filter(Boolean))];

  const [{ data: listings }, { data: alerts }, { data: wishes }] = await Promise.all([
    supabase.from("listings").select("id, title").in("id", listingIds),
    supabase.from("price_alerts").select("*").eq("status", "active").in("product_id", listingIds),
    productIds.length
      ? supabase.from("wishlists").select("user_id, product_id").in("product_id", productIds)
      : Promise.resolve({ data: [] })
  ]);

  const wishUserIds = [...new Set((wishes || []).map(w => w.user_id))];
  const { data: profiles } = wishUserIds.length
    ? await supabase.from("profiles").select("id, email, full_name, notification_prefs").in("id", wishUserIds)
    : { data: [] };

  const titleById = new Map((listings || []).map(l => [l.id, l.title]));
  const profileById = new Map((profiles || []).map(p => [p.id, p]));
  const now = new Date().toISOString();
  const notifications = [];
  const seen = new Set();
  let count = 0;

  const email = (payload) =>
    sendPriceDropAlertEmail(payload)
      .then(() => { count++; })
      .catch(err => console.error("[Price Drop Email Error]:", sanitizeLog(err.message)));

  for (const ev of events) {
    const productTitle = titleById.get(ev.listing_id) || "Tracked component";
    const dropPct = Math.round(((ev.old_price - ev.new_price) / ev.old_price) * 100);
    const base = { productTitle, oldPrice: ev.old_price, newPrice: ev.new_price, storeName: ev.retailer, productId: ev.listing_id };

    for (const alert of (alerts || []).filter(a => a.product_id === ev.listing_id)) {
      const hitTarget = alert.target_price != null && ev.new_price <= Number(alert.target_price);
      if (!alert.notify_on_any_change && !hitTarget) continue;
      await email({ ...base, rawEmail: alert.user_email, rawName: alert.user_name || "PC Builder" });
      await supabase
        .from("price_alerts")
        .update({ current_price: ev.new_price, status: hitTarget ? "triggered" : "active", updated_at: now })
        .eq("id", alert.id);
    }

    for (const wish of (wishes || []).filter(w => w.product_id === ev.product_id)) {
      const key = `${wish.user_id}:${ev.product_id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      notifications.push({
        user_id: wish.user_id,
        type: "price_drop",
        title: `Price drop: ${productTitle}`,
        body: `${ev.retailer} lowered the price from ৳${ev.old_price.toLocaleString()} to ৳${ev.new_price.toLocaleString()} (-${dropPct}%).`,
        link: `/product/${ev.listing_id}`
      });

      const profile = profileById.get(wish.user_id);
      if (profile?.email && profile.notification_prefs?.emailPriceDrops !== false) {
        await email({ ...base, rawEmail: profile.email, rawName: profile.full_name || "PC Builder" });
      }
    }
  }

  if (notifications.length) {
    const { error: notifErr } = await supabase.from("notifications").insert(notifications);
    if (notifErr) console.error("[Notifications Insert Error]:", sanitizeLog(notifErr.message));
    else count += notifications.length;
  }
  await supabase.from("price_drop_events").update({ processed_at: now }).in("id", events.map(e => e.id));

  if (count) console.log(`[Price Drop Events] Processed ${events.length} event(s), sent ${count} notification(s).`);
  return count;
}

// 6. Manual / cron trigger to drain the price-drop event queue
app.post("/api/price-alerts/process", commandLimiter, async (req, res) => {
  try {
    const notified = await processPriceDropEvents();
    return res.json({ success: true, notified });
  } catch (err) {
    console.error("[Price Alerts Process Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Failed to process price alerts" });
  }
});

// ==============================================================================
// PC Builder live catalog: builder-category products that have ≥1 priced listing,
// with every retailer offer attached. Heavy join done once and cached in memory.
// ==============================================================================

const BUILDER_CATEGORY_BY_SLUG = {
  cpu: "cpu", gpu: "gpu", motherboard: "motherboard", ram: "ram", storage: "storage",
  psu: "psu", case: "case", cooler: "cooling", monitor: "monitor", keyboard: "keyboard", mouse: "mouse"
};
const BUILDER_CATALOG_TTL_MS = 5 * 60 * 1000;
let builderCatalogCache = { at: 0, data: null };

async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function loadBuilderCatalog() {
  const { data: cats, error: catErr } = await supabase.from("categories").select("id, slug, parent_id");
  if (catErr) throw catErr;
  const catById = new Map(cats.map(c => [c.id, c]));
  const builderCategoryOf = (id) => {
    const cat = catById.get(id);
    if (!cat) return null;
    const rootSlug = cat.parent_id ? catById.get(cat.parent_id)?.slug : cat.slug;
    return BUILDER_CATEGORY_BY_SLUG[rootSlug] || null;
  };
  const categoryIds = cats.filter(c => builderCategoryOf(c.id)).map(c => c.id);

  const [products, listings] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from("products")
        .select("id, name, category_id, brands:brand_id ( name ), product_specs ( spec_key, spec_value ), product_images ( image_url, is_primary )")
        .in("category_id", categoryIds)
    ),
    fetchAllRows(() =>
      supabase
        .from("listings")
        .select("id, product_id, retailer, price, product_url, last_scraped_at")
        .not("product_id", "is", null)
        .gt("price", 0)
        .order("id")
    )
  ]);

  const listingsByProduct = new Map();
  for (const l of listings) {
    if (!listingsByProduct.has(l.product_id)) listingsByProduct.set(l.product_id, []);
    listingsByProduct.get(l.product_id).push(l);
  }

  return products
    .filter(p => listingsByProduct.has(p.id))
    .map(p => {
      const offers = listingsByProduct.get(p.id).sort((a, b) => a.price - b.price);
      const images = p.product_images || [];
      return {
        id: p.id,
        name: p.name,
        brand: p.brands?.name || "",
        category: builderCategoryOf(p.category_id),
        price: offers[0].price,
        image: (images.find(i => i.is_primary) || images[0])?.image_url || null,
        specs: Object.fromEntries((p.product_specs || []).map(s => [s.spec_key, s.spec_value])),
        listings: offers.map(l => ({
          id: l.id, retailer: l.retailer, price: l.price, url: l.product_url, scrapedAt: l.last_scraped_at
        }))
      };
    });
}

app.get("/api/builder/catalog", apiLimiter, async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=300");
    return res.json({ success: true, generatedAt: builderCatalogCache.at, products: await getBuilderCatalog() });
  } catch (err) {
    console.error("[Builder Catalog Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Failed to load builder catalog" });
  }
});

async function getBuilderCatalog() {
  if (!builderCatalogCache.data || Date.now() - builderCatalogCache.at > BUILDER_CATALOG_TTL_MS) {
    builderCatalogCache = { at: Date.now(), data: await loadBuilderCatalog() };
  }
  return builderCatalogCache.data;
}

// ==============================================================================
// Short build links: /b/:code renders OG tags for crawlers and bounces humans
// to the builder. The image is SVG rendered to PNG (sharp), SVG if sharp is absent.
// ==============================================================================

const SHARE_CODE_RE = /^[0-9a-f]{7}$/i;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtTaka = (n) => `৳${Number(n || 0).toLocaleString("en-IN")}`;

async function resolveSharedBuild(code) {
  const { data, error } = await supabase.rpc("shared_build", { p_code: code }).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const byId = new Map((await getBuilderCatalog()).map((p) => [p.id, p]));
  const parts = data.part_ids.map((id) => byId.get(id)).filter(Boolean);
  return { name: data.name, partIds: data.part_ids, total: data.total_price, purpose: data.purpose, parts };
}

function ogImageSvg(build) {
  const rows = build.parts.slice(0, 8).map((p, i) => {
    const y = 210 + i * 46;
    return `<text x="72" y="${y}" class="cat">${escapeHtml(p.category.toUpperCase())}</text>
      <text x="230" y="${y}" class="part">${escapeHtml(p.name.length > 58 ? p.name.slice(0, 57) + "…" : p.name)}</text>
      <text x="1128" y="${y}" class="price" text-anchor="end">${fmtTaka(p.price)}</text>`;
  });
  const hidden = build.partIds.length - Math.min(build.parts.length, 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#141a33"/></linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
    <style>
      text { font-family: Inter, 'Segoe UI', Roboto, Arial, sans-serif; fill: #e5e7eb; }
      .brand { font-size: 30px; font-weight: 800; fill: url(#a); }
      .title { font-size: 40px; font-weight: 800; }
      .cat { font-size: 20px; font-weight: 700; fill: #22d3ee; letter-spacing: 1px; }
      .part { font-size: 24px; }
      .price { font-size: 24px; font-weight: 700; fill: #f3f4f6; }
      .total { font-size: 34px; font-weight: 800; fill: url(#a); }
      .muted { font-size: 20px; fill: #9ca3af; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#a)"/>
  <text x="72" y="84" class="brand">PC KINBA</text>
  <text x="1128" y="84" class="muted" text-anchor="end">${escapeHtml(build.host)}/b/${escapeHtml(build.code)}</text>
  <text x="72" y="146" class="title">${escapeHtml(build.name.length > 44 ? build.name.slice(0, 43) + "…" : build.name)}</text>
  ${rows.join("\n")}
  ${hidden > 0 ? `<text x="230" y="${210 + Math.min(build.parts.length, 8) * 46}" class="muted">+${hidden} more part${hidden > 1 ? "s" : ""}</text>` : ""}
  <line x1="72" y1="566" x2="1128" y2="566" stroke="#374151"/>
  <text x="72" y="606" class="muted">${build.partIds.length} parts${build.purpose ? ` · ${escapeHtml(build.purpose)}` : ""}</text>
  <text x="1128" y="608" class="total" text-anchor="end">${fmtTaka(build.total)}</text>
</svg>`;
}

app.get("/api/builds/:code/og.png", apiLimiter, async (req, res) => {
  const code = req.params.code.toLowerCase();
  if (!SHARE_CODE_RE.test(code)) return res.status(400).end();
  try {
    const build = await resolveSharedBuild(code);
    if (!build) return res.status(404).end();
    const svg = ogImageSvg({ ...build, code, host: req.get("x-forwarded-host") || req.get("host") });
    res.set("Cache-Control", "public, max-age=86400");
    const sharp = await import("sharp").then((m) => m.default).catch(() => null);
    if (!sharp) return res.type("image/svg+xml").send(svg);
    return res.type("image/png").send(await sharp(Buffer.from(svg)).png().toBuffer());
  } catch (err) {
    console.error("[OG Image Error]:", sanitizeLog(err.message));
    return res.status(500).end();
  }
});

app.get("/b/:code", apiLimiter, async (req, res) => {
  const code = req.params.code.toLowerCase();
  const origin = `${req.get("x-forwarded-proto") || req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`;
  if (!SHARE_CODE_RE.test(code)) return res.redirect(302, `${origin}/pc-builder`);
  try {
    const build = await resolveSharedBuild(code);
    if (!build) return res.redirect(302, `${origin}/pc-builder`);
    const target = `${origin}/pc-builder?parts=${encodeURIComponent(build.partIds.join(","))}`;
    const title = `${build.name} — ${fmtTaka(build.total)} | PC KINBA`;
    const description = build.parts.length
      ? build.parts.map((p) => p.name).join(" · ")
      : `${build.partIds.length}-part PC build on PC KINBA`;
    res.set("Cache-Control", "public, max-age=300");
    return res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PC KINBA">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(`${origin}/b/${code}`)}">
<meta property="og:image" content="${escapeHtml(`${origin}/api/builds/${code}/og.png`)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${escapeHtml(target)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}">
</head><body><p>Opening <a href="${escapeHtml(target)}">${escapeHtml(build.name)}</a>…</p></body></html>`);
  } catch (err) {
    console.error("[Share Link Error]:", sanitizeLog(err.message));
    return res.redirect(302, `${origin}/pc-builder`);
  }
});

app.post("/api/send-welcome", authActionLimiter, async (req, res) => {
  const { email, name } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Valid email is required" });
  }

  const safeLogEmail = sanitizeLog(email);
  const safeLogName = sanitizeLog(name || "User");

  console.log("[Signup Event] Triggering welcome email for: %s (%s)", safeLogEmail, safeLogName);

  try {
    const result = await sendWelcomeEmail(email, name);
    return res.json({ success: true, result });
  } catch (error) {
    const safeErrorMsg = sanitizeLog(error.message || "");
    console.error("[Signup Event Error] Email sending failed: %s", safeErrorMsg);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PC Components Marketplace Supabase Routes
// ==========================================

// 1. Get Products with joined specs & images
app.get("/api/products", apiLimiter, async (req, res) => {
  try {
    const { 
      category, 
      subcategory, 
      brand, 
      brands, 
      retailer, 
      retailers, 
      min_price, 
      max_price, 
      in_stock, 
      on_sale, 
      search, 
      sort, 
      limit = 100, 
      page = 1 
    } = req.query;

    // 1. Resolve Category IDs
    let categoryIds = null;
    if (category && category !== "all") {
      const { data: catRows } = await supabase
        .from("categories")
        .select("id, slug, parent_id")
        .or(`slug.eq.${category},slug.like.${category}-%`);

      if (catRows && catRows.length > 0) {
        if (subcategory && subcategory !== "all") {
          const matchedSub = catRows.find((c) => c.slug === subcategory);
          if (matchedSub) {
            categoryIds = [matchedSub.id];
          }
        }
        if (!categoryIds) {
          categoryIds = catRows.map((c) => c.id);
        }
      }
    }

    let query = supabase.from("products").select(`
      id,
      name,
      slug,
      category_id,
      brand_id,
      price,
      discount_price,
      stock,
      rating,
      review_count,
      is_featured,
      is_new_arrival,
      created_at,
      categories:category_id ( id, name, slug, parent_id ),
      brands:brand_id ( id, name, slug ),
      product_images ( id, image_url, is_primary, display_order ),
      product_specs ( id, spec_key, spec_value, spec_group )
    `, { count: "exact" });

    if (categoryIds && categoryIds.length > 0) {
      query = query.in("category_id", categoryIds);
    }
    if (in_stock === "true") {
      query = query.gt("stock", 0);
    }
    if (on_sale === "true") {
      query = query.not("discount_price", "is", null);
    }
    if (min_price) {
      query = query.gte("price", Number(min_price));
    }
    if (max_price) {
      query = query.lte("price", Number(max_price));
    }
    if (search && search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    // Brands filter
    const brandList = (brands || brand || "").split(",").map(b => b.trim()).filter(Boolean);

    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (sort === "rating") {
      query = query.order("rating", { ascending: false });
    } else if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("is_featured", { ascending: false }).order("rating", { ascending: false });
    }

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data: rawProducts, count, error } = await query;
    if (error) throw error;

    let products = rawProducts || [];

    // Filter by brands if requested
    if (brandList.length > 0) {
      products = products.filter(p => p.brands && brandList.includes(p.brands.name));
    }

    // Fetch listings for these products to attach authentic multi-store offers
    const productIds = products.map(p => p.id);
    let listingsMap = {};
    if (productIds.length > 0) {
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, product_id, retailer, title, price, price_str, product_url, image_url")
        .in("product_id", productIds);

      if (listingsData) {
        listingsData.forEach(l => {
          if (!listingsMap[l.product_id]) {
            listingsMap[l.product_id] = [];
          }
          listingsMap[l.product_id].push(l);
        });
      }
    }

    // Attach retailers and calculate lowest price
    const enrichedProducts = products.map(p => {
      const pListings = listingsMap[p.id] || [];
      const validPrices = pListings.map(l => Number(l.price)).filter(pr => pr > 0);
      const lowestListingPrice = validPrices.length > 0 ? Math.min(...validPrices) : (p.discount_price || p.price);

      const retailerOffers = pListings.length > 0
        ? pListings.map(l => ({
            name: l.retailer,
            price: Number(l.price) || (p.discount_price || p.price),
            inStock: true,
            url: l.product_url || "https://www.startech.com.bd",
            badge: Number(l.price) === lowestListingPrice ? "Lowest Price" : (l.retailer.includes("StarTech") || l.retailer.includes("Ryans") ? "Official Distributor" : "Verified Dealer"),
            warranty: "3 Years Official Warranty"
          }))
        : [
            {
              name: "StarTech BD",
              price: p.discount_price || p.price,
              inStock: true,
              url: "https://www.startech.com.bd",
              badge: "Official Distributor",
              warranty: "3 Years Official Warranty"
            },
            {
              name: "Ryans Computers",
              price: (p.discount_price || p.price) + 200,
              inStock: true,
              url: "https://www.ryanscomputers.com",
              badge: "Verified Dealer",
              warranty: "3 Years Official Warranty"
            },
            {
              name: "Techland BD",
              price: (p.discount_price || p.price),
              inStock: true,
              url: "https://www.techlandbd.com",
              badge: "Hot Deal",
              warranty: "2 Years Support"
            }
          ];

      return {
        ...p,
        best_price: lowestListingPrice,
        retailers: retailerOffers
      };
    });

    // Retailer filtering
    const retailerFilterList = (retailers || retailer || "").split(",").map(r => r.trim()).filter(Boolean);
    let finalProducts = enrichedProducts;
    if (retailerFilterList.length > 0) {
      finalProducts = enrichedProducts.filter(p => 
        p.retailers.some(r => retailerFilterList.some(rf => r.name.toLowerCase().includes(rf.toLowerCase())))
      );
    }

    return res.json({
      success: true,
      products: finalProducts,
      totalCount: retailerFilterList.length > 0 ? finalProducts.length : (count || finalProducts.length),
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    console.error("[GET /api/products Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Failed to fetch products", details: err.message });
  }
});

// 2. Get Categories Tree
app.get("/api/categories", apiLimiter, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;
    return res.json({ success: true, categories: data || [] });
  } catch (err) {
    console.error("[GET /api/categories Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Failed to fetch categories", details: err.message });
  }
});

// 3. Get Filters Configuration
app.get("/api/filters", apiLimiter, async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = supabase.from("filters_config").select("*").order("display_order", { ascending: true });
    if (category_id) {
      query = query.eq("category_id", category_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, filters: data || [] });
  } catch (err) {
    console.error("[GET /api/filters Error]:", sanitizeLog(err.message));
    return res.status(500).json({ error: "Failed to fetch filters", details: err.message });
  }
});

// 4. Cart API
app.get("/api/cart", apiLimiter, async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { data, error } = await supabase
      .from("cart")
      .select(`
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        products (
          id, name, slug, price, discount_price, stock, rating,
          brands:brand_id ( name ),
          categories:category_id ( name, slug ),
          product_images ( image_url, is_primary )
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return res.json({ success: true, cart: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Compare API
app.get("/api/compare", apiLimiter, async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const { data, error } = await supabase
      .from("compare_list")
      .select(`
        id,
        user_id,
        product_id,
        created_at,
        products (
          id, name, slug, price, rating,
          brands:brand_id ( name ),
          categories:category_id ( name, slug ),
          product_images ( image_url, is_primary ),
          product_specs ( spec_key, spec_value )
        )
      `)
      .eq("user_id", userId);

    if (error) throw error;
    return res.json({ success: true, compareList: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. User Avatar Cloud Storage Upload (Supabase Storage with ImageKit Fallback/Direct Cloud Storage)
app.post("/api/upload/avatar", authActionLimiter, async (req, res) => {
  const { file, fileName, userId } = req.body || {};

  if (!file || typeof file !== "string") {
    return res.status(400).json({ error: "Image file data is required (base64 or data URL)" });
  }

  console.log(`[Avatar Upload] Processing photo upload for user ${sanitizeLog(userId || 'anonymous')}...`);

  let uploadedUrl = null;
  let provider = null;

  // Step 1: Attempt upload to Supabase Storage if configured
  try {
    const rawBase64 = file.replace(/^data:image\/\w+;base64,/, "");
    const fileBuffer = Buffer.from(rawBase64, "base64");
    const mimeMatch = file.match(/^data:image\/(\w+);base64,/);
    const ext = mimeMatch ? mimeMatch[1] : "jpg";
    const safePath = `avatar_${sanitizeCliArg(userId || 'user')}_${Date.now()}.${ext}`;

    const { data: sData, error: sErr } = await supabase.storage
      .from("avatars")
      .upload(safePath, fileBuffer, {
        contentType: `image/${ext}`,
        upsert: true
      });

    if (!sErr && sData) {
      const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(safePath);
      if (pubData && pubData.publicUrl) {
        uploadedUrl = pubData.publicUrl;
        provider = "supabase";
        console.log(`[Avatar Upload] Successfully uploaded to Supabase Storage: ${uploadedUrl}`);
      }
    } else if (sErr) {
      console.warn(`[Avatar Upload] Supabase storage note: ${sErr.message}. Falling back to ImageKit...`);
    }
  } catch (sError) {
    console.warn(`[Avatar Upload] Supabase storage exception: ${sanitizeLog(sError.message)}. Using ImageKit...`);
  }

  // Step 2: If Supabase Storage is not available or failed, upload to ImageKit CDN
  if (!uploadedUrl) {
    try {
      const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY || "private_glm5kvVJU62iywKFJ6UCpf2VObc=";
      const authHeader = `Basic ${Buffer.from(imagekitPrivateKey + ":").toString("base64")}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", fileName || `avatar_${sanitizeCliArg(userId || 'user')}_${Date.now()}.jpg`);
      formData.append("folder", "/avatars/");
      formData.append("useUniqueFileName", "true");

      const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        headers: {
          Authorization: authHeader
        },
        body: formData
      });

      if (ikRes.ok) {
        const ikData = await ikRes.json();
        uploadedUrl = ikData.url;
        provider = "imagekit";
        console.log(`[Avatar Upload] Successfully uploaded to ImageKit CDN: ${uploadedUrl}`);
      } else {
        const errText = await ikRes.text();
        console.error(`[Avatar Upload] ImageKit upload error:`, sanitizeLog(errText));
        throw new Error(`ImageKit upload failed: ${errText}`);
      }
    } catch (ikErr) {
      console.error(`[Avatar Upload Error]:`, sanitizeLog(ikErr.message));
      return res.status(500).json({ error: "Failed to upload image to cloud storage", details: ikErr.message });
    }
  }

  // Step 3: Automatically sync new avatar URL to Supabase profiles DB
  if (userId && uploadedUrl && !userId.startsWith("user_")) {
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: uploadedUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (profileErr) {
        console.warn(`[Avatar Upload] Profile DB update note:`, sanitizeLog(profileErr.message));
      }
    } catch (dbErr) {
      console.warn(`[Avatar Upload] Profile DB update exception:`, sanitizeLog(dbErr.message));
    }
  }

  return res.json({
    success: true,
    url: uploadedUrl,
    provider,
    message: `Photo stored securely in ${provider === 'supabase' ? 'Supabase Storage' : 'ImageKit Cloud CDN'}`
  });
});

// 7. General Media Upload Endpoint (ImageKit)
app.post("/api/upload/imagekit", authActionLimiter, async (req, res) => {
  const { file, fileName, folder } = req.body || {};

  if (!file || typeof file !== "string") {
    return res.status(400).json({ error: "Image file data is required" });
  }

  try {
    const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY || "private_glm5kvVJU62iywKFJ6UCpf2VObc=";
    const authHeader = `Basic ${Buffer.from(imagekitPrivateKey + ":").toString("base64")}`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", fileName || `media_${Date.now()}.jpg`);
    formData.append("folder", folder || "/media/");
    formData.append("useUniqueFileName", "true");

    const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader
      },
      body: formData
    });

    if (ikRes.ok) {
      const ikData = await ikRes.json();
      return res.json({ success: true, ...ikData });
    }
    const errText = await ikRes.text();
    return res.status(500).json({ error: "ImageKit upload failed", details: errText });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PC Kinba Backend Server running on http://localhost:${PORT}`);
});
