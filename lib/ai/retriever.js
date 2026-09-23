import { allocateSubBudgets } from "./budget.js";
import { findBenchmark } from "./benchmarksData.js";
import { deriveBuySignal, getQuickBuySignal } from "../priceInsights.js";

/**
 * How reliably a candidate can actually be bought — and, downstream, whether the PC
 * Builder can resolve it. Lower is better; used as the primary candidate sort key.
 *
 * SOURCING_REFERENCE previously marked a set of hardcoded specimen products this module
 * generated to fill a category the live catalog had nothing for — e.g. "Revenger Base RGB
 * Mid-Tower Micro-ATX Casing", a name that matches no product, no listing and no store.
 * That generator has been removed (retrieveCandidates() now simply leaves a category
 * empty rather than inventing a product for it): three independent consumers each built
 * their own ranking of whatever candidate list they were handed and had no idea what
 * `sourcing` meant, so tagging-and-sorting the fake parts last was never a real guarantee
 * against any of them picking one anyway — and each did, in turn, across three separate
 * incidents. The constant stays defined, and every downstream guard that checks it stays
 * in place, purely as a second line of defense should a future feature (e.g. a "similar
 * products" suggestion engine) ever introduce another non-purchasable candidate source.
 */
export const SOURCING_LISTED = 0;       // real product, >= 1 live retailer listing
export const SOURCING_CATALOG_ONLY = 1; // real product, priced from the catalog row only
export const SOURCING_REFERENCE = 2;    // a non-purchasable candidate — never generated here

/**
 * Normalizes category names into canonical keys
 */
export function normalizeCategoryKey(catName = "") {
  const c = catName.toLowerCase();

  // Accessory categories are tested FIRST, because their names contain the name of the
  // part they attach to. The seeded category "CPU Cooler" matched the `includes("cpu")`
  // test below and every cooler in the database was offered to the planner as a
  // processor, while the cooler pool was left empty.
  if (c.includes("cooler") || c.includes("cooling") || c.includes("heatsink") || c.includes("fan")) return "cooler";
  if (c.includes("case") || c.includes("casing") || c.includes("chassis")) return "case";
  if (c.includes("power supply") || c.includes("psu")) return "psu";
  if (c.includes("motherboard") || c.includes("mainboard")) return "motherboard";

  if (c.includes("cpu") || c.includes("processor")) return "cpu";
  if (c.includes("gpu") || c.includes("graphics card")) return "gpu";
  if (c.includes("ram") || c.includes("memory")) return "ram";
  if (c.includes("storage") || c.includes("ssd") || c.includes("hard drive") || c.includes("hdd")) return "storage";
  return "other";
}

/**
 * Retrieves best live price and retailer information for a product from listings.
 */
export function getProductPriceInfo(product, listings = []) {
  const productListings = listings.filter(l => l.product_id === product.id && l.price > 0);
  
  if (productListings.length > 0) {
    productListings.sort((a, b) => a.price - b.price);
    const best = productListings[0];
    return {
      best_price: best.price,
      best_retailer: best.retailer || "Tech Store",
      best_listing_id: String(best.id),
      best_url: best.product_url || "",
      store_count: productListings.length,
      freshest_at: best.last_scraped_at || new Date().toISOString()
    };
  }

  // Fallback to product catalog price
  const fallbackPrice = product.discount_price && product.discount_price > 0 
    ? product.discount_price 
    : (product.price || 0);

  return {
    best_price: fallbackPrice,
    best_retailer: "Retail Catalog",
    best_listing_id: "",
    best_url: "",
    store_count: 1,
    freshest_at: product.updated_at || new Date().toISOString()
  };
}

/**
 * Retrieves candidate hardware parts from database and enriches with specs, benchmarks, and live prices.
 * 
 * @param {import("./schemas.js").BuildRequest} req 
 * @param {any} supabaseClient 
 * @returns {Promise<Record<string, Array<import("./schemas.js").Candidate>>>}
 */
export async function retrieveCandidates(req, supabaseClient) {
  const purpose = req.purpose || "general";
  const budget = req.budget_bdt || 150000;
  const constraints = req.constraints || {};
  const subBudgets = allocateSubBudgets(purpose, budget, constraints);

  const categoriesToFetch = ["cpu", "motherboard", "ram", "storage", "psu", "case", "cooler"];
  if (purpose !== "office") {
    categoriesToFetch.push("gpu");
  }

  const result = {
    cpu: [],
    gpu: [],
    motherboard: [],
    ram: [],
    storage: [],
    psu: [],
    case: [],
    cooler: []
  };

  try {
    // 1. Fetch products with categories and brands
    const { data: rawProducts } = await supabaseClient
      .from("products")
      .select(`
        id, name, slug, price, discount_price, stock, rating,
        categories ( id, name, slug ),
        brands ( id, name, slug )
      `)
      .limit(600);

    const products = rawProducts || [];
    const productIds = products.map(p => p.id);

    // 2. Fetch technical specifications
    let specsMap = new Map();
    if (productIds.length > 0) {
      const { data: rawSpecs } = await supabaseClient
        .from("product_specs")
        .select("product_id, spec_key, spec_value")
        .in("product_id", productIds.slice(0, 500));
      
      if (rawSpecs) {
        for (const s of rawSpecs) {
          if (!specsMap.has(s.product_id)) {
            specsMap.set(s.product_id, {});
          }
          specsMap.get(s.product_id)[s.spec_key.toLowerCase().trim()] = String(s.spec_value).trim();
        }
      }
    }

    // 3. Fetch live retailer listings for best prices
    let listings = [];
    if (productIds.length > 0) {
      const { data: rawListings } = await supabaseClient
        .from("listings")
        .select("id, product_id, price, retailer, product_url, last_scraped_at")
        .in("product_id", productIds.slice(0, 500))
        .gt("price", 0);
      listings = rawListings || [];
    }

    // 4. Categorize, enrich and score candidates
    for (const p of products) {
      const catName = p.categories?.name || p.categories?.slug || "";
      const catKey = normalizeCategoryKey(catName);
      if (!categoriesToFetch.includes(catKey)) continue;

      const priceInfo = getProductPriceInfo(p, listings);
      if (priceInfo.best_price <= 0) continue;

      const specs = specsMap.get(p.id) || {};
      const bench = findBenchmark(p.name);

      // Category-specific constraint validations
      if (catKey === "gpu") {
        if (purpose === "ai_ml") {
          const vram = bench?.vram_gb || parseInt(specs.vram || specs.memory_size || "0", 10);
          const minVram = constraints.min_vram_gb || (budget >= 250000 ? 16 : 12);
          if (vram > 0 && vram < minVram) {
            continue;
          }
          if (constraints.prefer_brand?.gpu === "nvidia" && !/rtx|geforce|nvidia/i.test(p.name)) {
            if (budget > 100000 && /radeon|rx\s*\d/i.test(p.name)) continue;
          }
        }
      }

      if (catKey === "cpu") {
        if (purpose === "office") {
          const hasIgpu = bench ? bench.has_igpu : !/(\b[fF]\b|kf\b)/.test(p.name);
          if (hasIgpu === false) continue;
        }
        if (constraints.prefer_brand?.cpu === "intel" && !/intel|core/i.test(p.name)) {
          continue;
        }
        if (constraints.prefer_brand?.cpu === "amd" && !/amd|ryzen/i.test(p.name)) {
          continue;
        }
      }

      if (catKey === "ram") {
        if (purpose === "ai_ml" || purpose === "content_creation") {
          const minRam = constraints.min_ram_gb || 32;
          if (minRam >= 32 && !/32gb|64gb|2x16gb|2x32gb/i.test(p.name) && /16gb|8gb/i.test(p.name)) {
            continue;
          }
        }
      }

      const candidate = {
        id: String(p.id),
        name: p.name,
        category: catKey,
        brand: p.brands?.name || "",
        best_price: priceInfo.best_price,
        best_retailer: priceInfo.best_retailer,
        best_listing_id: priceInfo.best_listing_id,
        best_url: priceInfo.best_url,
        store_count: priceInfo.store_count,
        price_as_of: priceInfo.freshest_at,
        specs,
        bench: bench ? {
          score: bench.score,
          tdp_watts: bench.tdp_watts,
          vram_gb: bench.vram_gb,
          cores: bench.cores,
          socket: bench.socket,
          has_igpu: bench.has_igpu,
          generation: bench.generation
        } : undefined,
        buy_signal: getQuickBuySignal(priceInfo.best_price, p.discount_price, p.price),
        // 0 = a real product with at least one live retailer listing, 1 = a real product
        // priced only from the catalog row. See SOURCING_* below.
        sourcing: priceInfo.best_listing_id ? SOURCING_LISTED : SOURCING_CATALOG_ONLY
      };

      result[catKey].push(candidate);
    }

    // 5. Rank each category (no fabricated hardware — see the note above SOURCING_LISTED)
    for (const catKey of categoriesToFetch) {
      const catBudget = subBudgets[catKey];
      const targetP = catBudget?.target || 20000;

      // Deduplicate by ID
      const seen = new Set();
      result[catKey] = result[catKey].filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      // Rank by how real the part is first (belt-and-suspenders should any caller ever
      // mix a `sourcing`-tagged candidate from elsewhere into this list), closeness to
      // the sub-budget second.
      result[catKey].sort((a, b) => {
        const sourcingDelta = (a.sourcing ?? SOURCING_REFERENCE) - (b.sourcing ?? SOURCING_REFERENCE);
        if (sourcingDelta !== 0) return sourcingDelta;
        return Math.abs(a.best_price - targetP) - Math.abs(b.best_price - targetP);
      });

      result[catKey] = result[catKey].slice(0, 8);
    }

  } catch (err) {
    console.error("[Retriever Error]:", err.message);
    // A category the live database has nothing for is left empty, not filled with a
    // product that does not exist. The planner already treats a missing category as
    // "nothing selected" rather than crashing (see optimizePlanAlgorithmically), and the
    // HUD reports it honestly instead of showing a part the PC Builder can never resolve.
  }

  return result;
}
