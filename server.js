import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";
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
    return null;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Feature 1: Search Autosuggest Endpoint (Strictly DB-only, no live scraping calls)
app.get("/api/search/suggest", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query || query.length < 1) {
    return res.json({ suggestions: [] });
  }

  const set = new Set();

  // 1. Try Supabase Queries
  try {
    const { data: prodData, error: prodErr } = await supabase
      .from("products")
      .select("name")
      .ilike("name", `%${query}%`)
      .limit(5);

    if (!prodErr && prodData) {
      prodData.forEach(r => set.add(r.name));
    }

    const { data: listData, error: listErr } = await supabase
      .from("listings")
      .select("title")
      .ilike("title", `%${query}%`)
      .limit(5);

    if (!listErr && listData) {
      listData.forEach(r => {
        if (set.size < 8) set.add(r.title);
      });
    }
  } catch (err) {
    console.warn("[Autosuggest Supabase Warning]:", err.message);
  }

  // 2. Fallback to local SQLite DB if Supabase returns 0 results
  if (set.size === 0) {
    try {
      const db = getSqliteDb();
      if (db) {
        const productRows = db.prepare(`
          SELECT DISTINCT name FROM products 
          WHERE name LIKE ? 
          ORDER BY name ASC 
          LIMIT 5
        `).all(`%${query}%`);
        
        const listingRows = db.prepare(`
          SELECT DISTINCT title FROM listings 
          WHERE title LIKE ? OR brand LIKE ? 
          ORDER BY title ASC 
          LIMIT 5
        `).all(`%${query}%`, `%${query}%`);

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

// Feature 2: Search Results Endpoint (Strictly DB-only, returns pre-scraped products from StarTech & Ryans)
app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  if (!query) {
    return res.json({ query: "", count: 0, results: [] });
  }

  let results = [];

  // 1. Try Supabase Postgres Query
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
      .or(`title.ilike.%${query}%,brand.ilike.%${query}%`)
      .order("price", { ascending: true });

    if (!error && data && data.length > 0) {
      results = data.map(item => ({
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
    console.warn("[Search Supabase Warning]:", err.message);
  }

  // 2. Fallback to local SQLite DB if Supabase returns 0 results
  if (results.length === 0) {
    try {
      const db = getSqliteDb();
      if (db) {
        const rows = db.prepare(`
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
          WHERE l.title LIKE ? OR l.brand LIKE ? OR p.name LIKE ?
          ORDER BY l.price ASC
        `).all(`%${query}%`, `%${query}%`, `%${query}%`);

        db.close();
        results = rows;
      }
    } catch (err) {
      console.error("[Search SQLite Fallback Error]:", err.message);
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
