import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "./mailer.js";

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
  // Join number and unit (e.g. "16 gb" -> "16gb", "1 tb" -> "1tb", "65 w" -> "65w")
  const normQ = cleanQ.replace(/(\d+)\s+([a-zA-Z]+)/gi, "$1$2");
  // Separate number and unit (e.g. "16gb" -> "16 gb", "1000va" -> "1000 va")
  const splitQ = cleanQ.replace(/(\d+)([a-zA-Z]+)/gi, "$1 $2");

  const words = cleanQ.split(/\s+/).concat(normQ.split(/\s+/)).concat(splitQ.split(/\s+/));
  const tokens = Array.from(new Set(words.map(w => w.toLowerCase()))).filter(t => t.length >= 2);
  return { cleanQ, normQ, splitQ, tokens };
}

function searchSqliteListings(query) {
  const db = getSqliteDb();
  if (!db) return [];

  const { cleanQ, normQ, tokens } = getQueryVariations(query);
  let params = [];
  let conds = [];

  // 1. Full string match
  conds.push("(l.title LIKE ? OR l.title LIKE ? OR l.brand LIKE ?)");
  params.push(`%${cleanQ}%`, `%${normQ}%`, `%${cleanQ}%`);

  // 2. Individual key tokens match
  if (tokens.length > 0) {
    const tokenSql = tokens.map(t => {
      params.push(`%${t}%`);
      return "l.title LIKE ?";
    }).join(" AND ");
    conds.push(`(${tokenSql})`);
  }

  const sql = `
    SELECT 
      l.id, 
      l.title, 
      l.brand, 
      l.price, 
      l.price_str, 
      l.retailer, 
      l.product_url, 
      l.image_url, 
      l.last_scraped_at,
      p.name as base_product_name,
      p.category
    FROM listings l
    LEFT JOIN products p ON l.product_id = p.id
    WHERE ${conds.join(" OR ")}
    ORDER BY l.price ASC
  `;

  try {
    const rows = db.prepare(sql).all(...params);
    db.close();
    console.log(`[SQLite Search] Found ${rows.length} listings for "${query}"`);
    return rows;
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
        category: item.products?.category || "Component"
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

// Feature 1: Search Autosuggest Endpoint
app.get("/api/search/suggest", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query || query.length < 1) {
    return res.json({ suggestions: [] });
  }

  const { cleanQ, normQ } = getQueryVariations(query);
  const set = new Set();

  // 1. Try Supabase
  try {
    const { data: prodData } = await supabase
      .from("products")
      .select("name")
      .or(`name.ilike.%${cleanQ}%,name.ilike.%${normQ}%`)
      .limit(5);

    if (prodData) prodData.forEach(r => set.add(r.name));

    const { data: listData } = await supabase
      .from("listings")
      .select("title")
      .or(`title.ilike.%${cleanQ}%,title.ilike.%${normQ}%`)
      .limit(5);

    if (listData) {
      listData.forEach(r => {
        if (set.size < 8) set.add(r.title);
      });
    }
  } catch (err) {
    console.warn("[Autosuggest Supabase Warning]:", err.message);
  }

  // 2. Fallback SQLite
  if (set.size === 0) {
    try {
      const db = getSqliteDb();
      if (db) {
        const productRows = db.prepare(`
          SELECT DISTINCT name FROM products 
          WHERE name LIKE ? OR name LIKE ?
          ORDER BY name ASC 
          LIMIT 5
        `).all(`%${cleanQ}%`, `%${normQ}%`);
        
        const listingRows = db.prepare(`
          SELECT DISTINCT title FROM listings 
          WHERE title LIKE ? OR title LIKE ? OR brand LIKE ?
          ORDER BY title ASC 
          LIMIT 5
        `).all(`%${cleanQ}%`, `%${normQ}%`, `%${cleanQ}%`);

        db.close();

        productRows.forEach(r => set.add(r.name));
        listingRows.forEach(r => {
          if (set.size < 8) set.add(r.title);
        });
      }
    } catch (err) {
      console.error("[Autosuggest SQLite Fallback Error]:", err.message);
    }
  }

  return res.json({
    query,
    suggestions: Array.from(set).slice(0, 8)
  });
});

// Feature 2: Search Results Endpoint (Database Search + Live On-Demand Scraper Trigger)
app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query) {
    return res.json({ query: "", count: 0, results: [] });
  }

  console.log(`[API Search] Executing search for query: "${query}"`);

  // 1. Check Supabase
  let results = await searchSupabaseListings(query);

  // 2. Check SQLite if Supabase returns 0
  if (results.length === 0) {
    results = searchSqliteListings(query);
  }

  // 3. If still 0 results in DB, trigger live scraper on-demand
  if (results.length === 0) {
    console.log(`[Auto-Scraper] 0 DB results found for query "${query}". Triggering live scraper on StarTech & Ryans...`);
    try {
      const pythonPath = path.join(process.cwd(), "scrapers/venv/bin/python");
      const runScriptPath = path.join(process.cwd(), "scrapers/run_scrapers.py");
      const safeQuery = query.replace(/["\\]/g, "");
      
      execSync(`"${pythonPath}" "${runScriptPath}" --query "${safeQuery}"`, {
        timeout: 45000,
        stdio: "inherit"
      });

      // Re-search database after live scrape completes
      results = await searchSupabaseListings(query);
      if (results.length === 0) {
        results = searchSqliteListings(query);
      }
    } catch (err) {
      console.error("[Auto-Scraper Error]:", err.message);
    }
  }

  return res.json({
    query,
    count: results.length,
    results
  });
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
