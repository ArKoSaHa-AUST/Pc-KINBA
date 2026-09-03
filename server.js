import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "./mailer.js";
import { extractAttributes, generateFingerprint, isSameProductVariant, group5StoreOffers } from "./lib/normalizer.js";
import { getGroqSuggestions } from "./lib/groq.js";

dotenv.config();

/**
 * Sanitizes input string to prevent log injection vulnerabilities.
 * @param {string} str 
 * @returns {string}
 */
const sanitizeLog = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, " ").slice(0, 100);
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

const DB_PATH = path.join(process.cwd(), "pcbuilder.db");

function getSqliteDb() {
  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    return db;
  } catch (err) {
    console.error("[SQLite Connect Error]:", err.message);
    return null;
  }
}

/**
 * Normalizes query string into useful search tokens for any tech category.
 * E.g., "16 gb ram" -> clean: "16 gb ram", norm: "16gb ram", tokens: ["16", "gb", "ram", "16gb"]
 * E.g., "1000va ups" -> clean: "1000va ups", norm: "1000 va ups", tokens: ["1000", "va", "ups", "1000va"]
 */
function getQueryVariations(rawQuery) {
  const cleanQ = rawQuery.trim();
  const normalized = cleanQ.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const rawWords = normalized.split(/\s+/).filter(w => w.length > 0);

  // Natural search tokens from the user's actual typed words
  const tokens = rawWords.filter(w => w.length >= 2 || (w.length === 1 && /\d/.test(w)));

  // Useful variations for full phrase matching (e.g. 16 gb <-> 16gb)
  const normQ = cleanQ.replace(/(\d+)\s+([a-zA-Z]+)/gi, "$1$2");
  const splitQ = cleanQ.replace(/([a-zA-Z]+)(\d+)/gi, "$1 $2").replace(/(\d+)([a-zA-Z]+)/gi, "$1 $2");

  return { cleanQ, normQ, splitQ, tokens };
}

function detectSearchIntent(query = "") {
  const q = query.toLowerCase().trim();

  // 1. Explicit Laptop query
  if (/\b(laptop|notebook|macbook|zenbook|ideapad|thinkpad|legion|victus|tuf gaming)\b/.test(q)) {
    return { type: "laptop", category: "Laptop", excludes: [] };
  }

  // 2. Explicit PC Build / Combo query
  if (/\b(desktop pc|gaming pc|budget pc|pc build|combo|prebuilt|all-in-one|aio pc)\b/.test(q)) {
    return { type: "pc_build", category: "Desktop PC", excludes: [] };
  }

  // 3. Motherboard query (checked before CPU so 'amd b650' or 'intel b760' is Motherboard)
  if (/\b(motherboard|mainboard|b650|b760|z790|b550|x670|z890|a620|b450|h610)\b/.test(q)) {
    return {
      type: "motherboard",
      category: "Motherboard",
      excludes: ["desktop pc", "gaming pc", "laptop", "combo", "pc-deal", "budget pc", "pc build"]
    };
  }

  // 4. GPU / Graphics Card query (e.g. rtx 4060, rtx 5060, gtx 1650, rx 7600, graphics card, gpu, geforce, radeon)
  if (/\b(rtx|gtx|rx\s*\d{4}|graphics\s*card|gpu|geforce|radeon|arc\s*a\d{3})\b/.test(q)) {
    return {
      type: "gpu",
      category: "Graphics Card",
      excludes: ["laptop", "notebook", "desktop pc", "gaming pc", "pc build", "budget pc", "combo", "custom pc", "prebuilt", "all-in-one"]
    };
  }

  // 5. CPU / Processor query (e.g. ryzen, core i3/i5/i7/i9, amd 7 7700, processor, cpu, intel, threadripper)
  if (/\b(ryzen|processor|cpu|threadripper|pentium|celeron)\b/.test(q) ||
      /\b(core\s*i[3579]|intel\s*i[3579]|i[3579][\s-]\d{4,5}[a-z]?)\b/.test(q) ||
      /\b(amd\s*(ryzen\s*)?[3579]|\b7700\b|\b7600\b|\b7800x3d\b|\b5600\b|\b5700\b|\b5800\b|\b9800x3d\b|\b9700\b|\b9600\b)/.test(q)) {
    return {
      type: "cpu",
      category: "Processor",
      excludes: ["laptop", "notebook", "desktop pc", "gaming pc", "budget pc", "pc build", "combo", "bundle", "ram", "motherboard", "cooler", "casing"]
    };
  }

  // 6. RAM Memory query
  if (/\b(ram|ddr4|ddr5|sodimm|memory)\b/.test(q)) {
    return {
      type: "ram",
      category: "RAM Memory",
      excludes: ["desktop pc", "gaming pc", "combo"]
    };
  }

  // 7. SSD Storage query
  if (/\b(ssd|nvme|m\.2|sata ssd)\b/.test(q)) {
    return {
      type: "ssd",
      category: "SSD Storage",
      excludes: ["desktop pc", "gaming pc", "laptop", "notebook", "combo"]
    };
  }

  // 8. UPS & Power query
  if (/\b(ups|ips|voltage regulator|stabilizer)\b/.test(q)) {
    return { type: "ups", category: "UPS & Power", excludes: [] };
  }

  // 9. Pendrive / Flash drive query
  if (/\b(pendrive|pen drive|flash drive|usb drive|thumb drive)\b/.test(q)) {
    return { type: "pendrive", category: "Pendrive / Storage", excludes: [] };
  }

  // 10. Monitor query
  if (/\b(monitor|display)\b/.test(q)) {
    return { type: "monitor", category: "Monitor", excludes: ["laptop"] };
  }

  // 11. Casing query
  if (/\b(casing|chassis)\b/.test(q)) {
    return { type: "casing", category: "Casing", excludes: ["desktop pc", "gaming pc"] };
  }

  // 12. Power Supply query
  if (/\b(power supply|psu)\b/.test(q)) {
    return { type: "power_supply", category: "Power Supply", excludes: ["desktop pc", "gaming pc"] };
  }

  // 13. Cooler query
  if (/\b(cooler|liquid cooler|aio)\b/.test(q)) {
    return { type: "cooler", category: "Cooler", excludes: ["desktop pc", "gaming pc"] };
  }

  return { type: "general", category: "All", excludes: [] };
}

function deriveCategory(title = "") {
  const t = title.toLowerCase();
  // Check composite/full systems first so they don't get misclassified by component keywords
  if (t.includes("laptop") || t.includes("notebook") || t.includes("macbook") || t.includes("zenbook") || t.includes("ideapad")) return "Laptop";
  if (t.includes("gaming pc") || t.includes("desktop pc") || t.includes("budget pc") || t.includes("pc build") || t.includes("combo offer") || t.includes("all-in-one") || t.includes("aio pc")) return "Desktop PC";
  if (t.includes("motherboard") || t.includes("mainboard")) return "Motherboard";
  if (t.includes("rtx") || t.includes("gtx") || t.includes("rx ") || t.includes("graphics card") || t.includes("graphics") || t.includes("gpu") || t.includes("geforce") || t.includes("radeon")) return "Graphics Card";
  if (t.includes("processor") || t.includes("cpu") || t.includes("ryzen") || t.includes("core i") || t.includes("threadripper") || t.includes("intel") || t.includes("amd")) return "Processor";
  if (t.includes("ssd") || t.includes("nvme") || t.includes("m.2")) return "SSD Storage";
  if (t.includes("ram") || t.includes("ddr4") || t.includes("ddr5") || t.includes("memory")) return "RAM Memory";
  if (t.includes("casing") || t.includes("chassis")) return "Casing";
  if (t.includes("power supply") || t.includes("psu")) return "Power Supply";
  if (t.includes("cooler") || t.includes("liquid cooler") || t.includes("fan")) return "Cooler";
  if (t.includes("monitor")) return "Monitor";
  if (t.includes("ups") || t.includes("ips")) return "UPS & Power";
  if (t.includes("pendrive") || t.includes("pen drive") || t.includes("flash drive") || t.includes("usb drive")) return "Pendrive / Storage";
  if (t.includes("keyboard")) return "Keyboard";
  if (t.includes("mouse")) return "Mouse";
  if (t.includes("headphone") || t.includes("headset") || t.includes("speaker")) return "Audio";
  if (t.includes("router")) return "Networking";
  return "Components";
}

function searchSqliteListings(query, requestedCategory = null) {
  const db = getSqliteDb();
  if (!db) return [];

  const { cleanQ, normQ, tokens } = getQueryVariations(query);
  const intent = detectSearchIntent(query);
  let whereParams = [];
  let conds = [];

  // 1. Full title/brand match
  conds.push("(l.title LIKE ? OR l.title LIKE ? OR l.brand LIKE ? OR p.canonical_name LIKE ? OR a.alias_text LIKE ?)");
  whereParams.push(`%${cleanQ}%`, `%${normQ}%`, `%${cleanQ}%`, `%${cleanQ}%`, `%${cleanQ}%`);

  // 2. Individual key tokens match
  if (tokens.length > 0) {
    const tokenSql = tokens.map(t => {
      whereParams.push(`%${t}%`);
      return "l.title LIKE ?";
    }).join(" AND ");
    conds.push(`(${tokenSql})`);
  }

  // 3. Category & Negative Exclusion Filters
  let extraFilters = [];

  if (requestedCategory && requestedCategory !== "All") {
    if (requestedCategory === "Graphics Card") {
      extraFilters.push("LOWER(l.title) NOT LIKE '%laptop%' AND LOWER(l.title) NOT LIKE '%notebook%' AND LOWER(l.title) NOT LIKE '%desktop pc%' AND LOWER(l.title) NOT LIKE '%gaming pc%' AND LOWER(l.title) NOT LIKE '%combo%'");
    } else if (requestedCategory === "Processor") {
      extraFilters.push("LOWER(l.title) NOT LIKE '%laptop%' AND LOWER(l.title) NOT LIKE '%desktop pc%' AND LOWER(l.title) NOT LIKE '%gaming pc%' AND LOWER(l.title) NOT LIKE '%budget pc%' AND LOWER(l.title) NOT LIKE '%pc build%' AND LOWER(l.title) NOT LIKE '%combo%' AND LOWER(l.title) NOT LIKE '%ram%' AND LOWER(l.title) NOT LIKE '%motherboard%'");
    } else if (requestedCategory === "Motherboard") {
      extraFilters.push("LOWER(l.title) NOT LIKE '%laptop%' AND LOWER(l.title) NOT LIKE '%desktop pc%' AND LOWER(l.title) NOT LIKE '%gaming pc%' AND LOWER(l.title) NOT LIKE '%combo%'");
    } else if (requestedCategory === "Laptop") {
      extraFilters.push("(LOWER(l.title) LIKE '%laptop%' OR LOWER(l.title) LIKE '%notebook%' OR LOWER(l.title) LIKE '%macbook%')");
    } else if (requestedCategory === "RAM Memory") {
      extraFilters.push("(LOWER(l.title) LIKE '%ram%' OR LOWER(l.title) LIKE '%ddr%') AND LOWER(l.title) NOT LIKE '%desktop pc%' AND LOWER(l.title) NOT LIKE '%gaming pc%'");
    } else if (requestedCategory === "SSD Storage") {
      extraFilters.push("(LOWER(l.title) LIKE '%ssd%' OR LOWER(l.title) LIKE '%nvme%') AND LOWER(l.title) NOT LIKE '%laptop%'");
    } else if (requestedCategory === "UPS & Power") {
      extraFilters.push("(LOWER(l.title) LIKE '%ups%' OR LOWER(l.title) LIKE '%ips%')");
    } else if (requestedCategory === "Pendrive / Storage") {
      extraFilters.push("(LOWER(l.title) LIKE '%pendrive%' OR LOWER(l.title) LIKE '%pen drive%' OR LOWER(l.title) LIKE '%flash drive%' OR LOWER(l.title) LIKE '%usb%')");
    } else if (requestedCategory === "Monitor") {
      extraFilters.push("(LOWER(l.title) LIKE '%monitor%' OR LOWER(l.title) LIKE '%display%') AND LOWER(l.title) NOT LIKE '%laptop%'");
    }
  } else if (intent.excludes && intent.excludes.length > 0) {
    // Automatically apply negative exclusions from detected intent!
    const negativeSql = intent.excludes.map(e => `LOWER(l.title) NOT LIKE '%${e}%'`).join(" AND ");
    extraFilters.push(`(${negativeSql})`);
  }

  const whereClause = conds.join(" OR ");
  const filterClause = extraFilters.length > 0 ? ` AND ${extraFilters.join(" AND ")}` : "";

  // Dynamic ranking: boost actual component names
  let bonusRankSql = "3";
  if (intent.type === "gpu") {
    bonusRankSql = `CASE 
      WHEN LOWER(l.title) LIKE '%graphics card%' OR LOWER(l.title) LIKE '%gddr%' OR LOWER(l.title) LIKE '%oc edition%' THEN 0
      WHEN LOWER(l.title) LIKE '%graphics%' OR LOWER(l.title) LIKE '%edition%' THEN 1
      ELSE 2
    END`;
  } else if (intent.type === "cpu") {
    bonusRankSql = `CASE 
      WHEN LOWER(l.title) LIKE '%processor%' OR LOWER(l.title) LIKE '%cpu%' THEN 0
      WHEN LOWER(l.title) LIKE '%tray%' OR LOWER(l.title) LIKE '%am5%' OR LOWER(l.title) LIKE '%am4%' THEN 1
      ELSE 2
    END`;
  } else if (intent.type === "motherboard") {
    bonusRankSql = `CASE 
      WHEN LOWER(l.title) LIKE '%motherboard%' OR LOWER(l.title) LIKE '%mainboard%' THEN 0
      ELSE 1
    END`;
  } else if (intent.type === "ups") {
    bonusRankSql = `CASE 
      WHEN LOWER(l.title) LIKE '%ups%' OR LOWER(l.title) LIKE '%ips%' THEN 0
      ELSE 1
    END`;
  } else if (intent.type === "pendrive") {
    bonusRankSql = `CASE 
      WHEN LOWER(l.title) LIKE '%pendrive%' OR LOWER(l.title) LIKE '%flash drive%' THEN 0
      ELSE 1
    END`;
  }

  const sql = `
    SELECT DISTINCT
      l.id, 
      l.title, 
      l.brand, 
      l.price, 
      l.price_str, 
      l.retailer, 
      l.product_url, 
      l.image_url, 
      l.last_scraped_at,
      p.canonical_name as base_product_name,
      p.fingerprint,
      p.category,
      CASE 
        WHEN LOWER(l.title) = LOWER(?) THEN 0
        WHEN LOWER(l.title) LIKE ? THEN 1
        WHEN LOWER(l.title) LIKE ? THEN 2
        ELSE 3
      END as match_rank,
      ${bonusRankSql} as category_priority
    FROM listings l
    LEFT JOIN products p ON l.product_id = p.id
    LEFT JOIN product_aliases a ON a.product_id = p.id
    WHERE (${whereClause}) ${filterClause}
    ORDER BY match_rank ASC, category_priority ASC, l.price ASC
  `;

  // Prepend match_rank ordering parameters to align with SELECT clause
  const allParams = [
    cleanQ,
    `${cleanQ.toLowerCase()}%`,
    `%${cleanQ.toLowerCase()}%`,
    ...whereParams
  ];

  try {
    const rows = db.prepare(sql).all(...allParams);
    db.close();
    console.log(`[SQLite Search] Found ${rows.length} listings for "${query}" (Intent: ${intent.category})`);
    return rows.map(r => ({
      ...r,
      category: deriveCategory(r.title)
    }));
  } catch (err) {
    console.error("[SQLite Search Error]:", err.message);
    try { db.close(); } catch (_) {}
    return [];
  }
}

async function searchSupabaseListings(query) {
  const { cleanQ, normQ } = getQueryVariations(query);
  try {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id, 
        title, 
        brand, 
        price, 
        price_str, 
        retailer, 
        product_url, 
        image_url, 
        last_scraped_at,
        product_id,
        products ( name, category )
      `)
      .or(`title.ilike.%${cleanQ}%,title.ilike.%${normQ}%,brand.ilike.%${cleanQ}%`)
      .order("price", { ascending: true });

    if (!error && data && data.length > 0) {
      console.log(`[Supabase Search] Found ${data.length} listings for "${query}"`);
      return data.map(item => ({
        id: item.id,
        title: item.title,
        brand: item.brand,
        price: item.price,
        price_str: item.price_str,
        retailer: item.retailer,
        product_url: item.product_url,
        image_url: item.image_url,
        last_scraped_at: item.last_scraped_at,
        base_product_name: item.products?.name || item.brand,
        category: item.products?.category || deriveCategory(item.title)
      }));
    }
  } catch (err) {
    console.warn("[Supabase Search Warning]:", err.message);
  }
  return [];
}

const app = express();
app.use(cors());
app.use(express.json());

// Feature 1: Search Autosuggest Endpoint (Combines SQLite DB & Groq AI Key-Rotation)
app.get("/api/search/suggest", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query || query.length < 1) {
    return res.json({ suggestions: [] });
  }

  const { cleanQ, normQ } = getQueryVariations(query);
  const set = new Set();

  // 1. Fetch DB product & listing titles
  try {
    const db = getSqliteDb();
    if (db) {
      const listingRows = db.prepare(`
        SELECT DISTINCT title FROM listings 
        WHERE title LIKE ? OR title LIKE ? OR brand LIKE ?
        ORDER BY 
          CASE WHEN LOWER(title) LIKE ? THEN 0 ELSE 1 END,
          title ASC 
        LIMIT 6
      `).all(`%${cleanQ}%`, `%${normQ}%`, `%${cleanQ}%`, `${cleanQ.toLowerCase()}%`);

      const productRows = db.prepare(`
        SELECT DISTINCT name FROM products 
        WHERE name LIKE ? OR name LIKE ?
        ORDER BY name ASC 
        LIMIT 4
      `).all(`%${cleanQ}%`, `%${normQ}%`);

      db.close();

      listingRows.forEach(r => {
        if (set.size < 6) set.add(r.title);
      });
      productRows.forEach(r => {
        if (set.size < 8) set.add(r.name);
      });
    }
  } catch (err) {
    console.error("[Autosuggest SQLite Error]:", err.message);
  }

  // 2. Complement with Groq AI suggestions (fast sub-second LLM inference with 17-key pool)
  try {
    const groqSuggestions = await getGroqSuggestions(query);
    if (Array.isArray(groqSuggestions)) {
      groqSuggestions.forEach(s => {
        if (set.size < 10) set.add(s);
      });
    }
  } catch (err) {
    console.warn("[Autosuggest Groq Warning]:", err.message);
  }

  return res.json({
    query,
    suggestions: Array.from(set).slice(0, 8)
  });
});

// Feature 2: Search Results Endpoint
app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  const category = (req.query.category || "").toString().trim();
  if (!query) {
    return res.json({ query: "", count: 0, detected_category: "All", results: [] });
  }

  const intent = detectSearchIntent(query);
  console.log(`[API Search] Executing search for query: "${query}" (Intent: ${intent.category}, Filter: ${category || 'Auto'})`);

  let results = searchSqliteListings(query, category);

  if (results.length === 0) {
    results = await searchSupabaseListings(query);
  }

  // If fewer than 2 results found in DB, auto-trigger live scrapers across all 12 retailers
  if (results.length < 2) {
    console.log(`[Auto-Scraper] Insufficient DB results (${results.length}) for query "${query}". Triggering live scraper on 12 retailers...`);
    try {
      const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
      const runScriptPath = path.join(process.cwd(), "scrapers/run_scrapers.py");
      const safeQuery = query.replace(/["\\]/g, "");
      
      execSync(`"${pythonPath}" "${runScriptPath}" --query "${safeQuery}"`, {
        timeout: 45000,
        stdio: "inherit"
      });

      results = searchSqliteListings(query, category);
      if (results.length === 0) {
        results = await searchSupabaseListings(query);
      }
    } catch (err) {
      console.error("[Auto-Scraper Error]:", err.message);
    }
  }

  return res.json({
    query,
    detected_category: intent.category,
    count: results.length,
    results
  });
});

// Feature 2b: Parallel Live Scraping + Matching Endpoint
app.get("/api/search/live", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  console.log(`[API Live Search] Running parallel Google web search & live scraper for: "${query}"`);

  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scriptPath = path.join(process.cwd(), "scrapers/parallel_engine.py");
    const safeQuery = query.replace(/["\\]/g, "");

    const stdout = execSync(`PYTHONPATH=. "${pythonPath}" "${scriptPath}" "${safeQuery}"`, {
      timeout: 30000,
      encoding: "utf-8"
    });

    const jsonStart = stdout.indexOf("{");
    if (jsonStart !== -1) {
      const parsed = JSON.parse(stdout.slice(jsonStart));
      return res.json(parsed);
    }
    
    return res.status(500).json({ error: "Failed to parse parallel engine output" });
  } catch (err) {
    console.error("[Live Search API Error]:", err.message);
    return res.status(500).json({ error: "Live search failed", details: err.message });
  }
});

// Feature 3: Dynamic Product Details Endpoint with 5-Store Comparison & Normalization
app.get("/api/product/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  console.log(`[API Product] Fetching dynamic product details for ID: ${id}`);

  let item = null;

  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) {
      item = data;
    }
  } catch (err) {
    console.warn("[Product Details Supabase Warning]:", err.message);
  }

  // 2. Fallback SQLite
  if (!item) {
    try {
      const db = getSqliteDb();
      if (db) {
        item = db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
        db.close();
      }
    } catch (err) {
      console.error("[Product Details SQLite Error]:", err.message);
    }
  }

  if (!item) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Extract canonical attributes & fingerprint
  const { fingerprint, canonical_name, attributes } = generateFingerprint(item.title, item.brand);
  const category = deriveCategory(item.title);

  // Search candidate matching listings across DB
  const titleWords = item.title.split(/\s+/).filter(w => w.length > 2);
  const mainKeywords = titleWords.slice(0, 3).join(" ");

  let rawCandidates = await searchSupabaseListings(mainKeywords);
  if (rawCandidates.length === 0) {
    rawCandidates = searchSqliteListings(mainKeywords);
  }

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
      console.log(`[API Product] Running Google Live Scanner for "${item.title}"...`);
      const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
      const scannerScript = path.join(process.cwd(), "scrapers/google_live_scanner.py");
      const safeTitle = (item.title || item.canonical_name || "").replace(/["\\]/g, "");

      const stdout = execSync(`PYTHONPATH=. "${pythonPath}" "${scannerScript}" "${safeTitle}"`, {
        timeout: 35000,
        encoding: "utf-8"
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
      console.warn("[Live Scanner Auto-Trigger Warning]:", e.message);
    }
  }

  // Construct dynamic key features
  const keyFeatures = [
    { label: "Brand", value: attributes.brand || item.brand || "Generic" },
    { label: "Model", value: attributes.model || item.title },
    { label: "Capacity / Storage", value: attributes.capacity || "N/A" },
    { label: "Spec / Type", value: attributes.type || "Standard" },
    { label: "Speed / Clock", value: attributes.speed || "Standard" },
    { label: "Canonical Key", value: fingerprint },
    { label: "Category", value: category },
    { label: "Last Verified Price", value: item.price_str }
  ];

  const responsePayload = {
    id: item.id,
    title: item.title,
    canonical_name: canonical_name,
    fingerprint: fingerprint,
    brand: attributes.brand || item.brand || "Generic",
    price: item.price,
    price_str: item.price_str,
    best_price: groupedResult.best_price,
    best_price_str: groupedResult.best_price_str,
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

// Dedicated On-Demand Live Google Price Scan Endpoint
app.get("/api/product/:id/live-prices", async (req, res) => {
  const { id } = req.params;
  let item = null;

  try {
    const db = getSqliteDb();
    if (db) {
      item = db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
      db.close();
    }
  } catch (err) {
    console.error("[Live Scan API Error]:", err.message);
  }

  if (!item) {
    return res.status(404).json({ error: "Product not found" });
  }

  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scannerScript = path.join(process.cwd(), "scrapers/google_live_scanner.py");
    const safeTitle = (item.title || item.canonical_name || "").replace(/["\\]/g, "");

    const stdout = execSync(`PYTHONPATH=. "${pythonPath}" "${scannerScript}" "${safeTitle}"`, {
      timeout: 45000,
      encoding: "utf-8"
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const liveData = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, ...liveData });
    }
    return res.status(500).json({ error: "Failed to parse live scanner output" });
  } catch (err) {
    console.error("[Live Scan Error]:", err.message);
    return res.status(500).json({ error: "Live scan failed", details: err.message });
  }
});

// Standalone Live Market Scan Endpoint (search any product on demand)
app.get("/api/live-scan", async (req, res) => {
  const query = req.query.q || req.query.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scannerScript = path.join(process.cwd(), "scrapers/google_live_scanner.py");
    const safeTitle = query.replace(/["\\]/g, "");

    const stdout = execSync(`PYTHONPATH=. "${pythonPath}" "${scannerScript}" "${safeTitle}"`, {
      timeout: 45000,
      encoding: "utf-8"
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const liveData = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, ...liveData });
    }
    return res.status(500).json({ error: "Failed to parse live scanner output" });
  } catch (err) {
    console.error("[Live Scan Error]:", err.message);
    return res.status(500).json({ error: "Live scan failed", details: err.message });
  }
});

app.post("/api/reconcile", (req, res) => {
  console.log("[Reconcile API] Triggering background product reconciliation job...");
  try {
    const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
    const scriptPath = path.join(process.cwd(), "scrapers/reconcile.py");
    
    execSync(`PYTHONPATH=. "${pythonPath}" "${scriptPath}"`, {
      timeout: 60000,
      stdio: "inherit"
    });

    return res.json({ success: true, message: "Reconciliation sweep completed successfully." });
  } catch (err) {
    console.error("[Reconcile API Error]:", err.message);
    return res.status(500).json({ error: "Reconciliation failed", details: err.message });
  }
});

app.post("/api/send-welcome", async (req, res) => {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 PC Kinba Backend Server running on http://localhost:${PORT}`);
});
