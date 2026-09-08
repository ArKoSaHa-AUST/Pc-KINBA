import { allocateSubBudgets } from "./budget.js";
import { findBenchmark } from "./benchmarksData.js";
import { deriveBuySignal, getQuickBuySignal } from "../priceInsights.js";

/**
 * Normalizes category names into canonical keys
 */
export function normalizeCategoryKey(catName = "") {
  const c = catName.toLowerCase();
  if (c.includes("cpu") || c.includes("processor")) return "cpu";
  if (c.includes("gpu") || c.includes("graphics card")) return "gpu";
  if (c.includes("motherboard") || c.includes("mainboard")) return "motherboard";
  if (c.includes("ram") || c.includes("memory")) return "ram";
  if (c.includes("storage") || c.includes("ssd") || c.includes("hard drive") || c.includes("hdd")) return "storage";
  if (c.includes("power supply") || c.includes("psu")) return "psu";
  if (c.includes("case") || c.includes("casing") || c.includes("chassis")) return "case";
  if (c.includes("cooler") || c.includes("cooling") || c.includes("fan")) return "cooler";
  return "other";
}

/**
 * Parses technical specs array/records into a normalized spec dictionary
 */
export function formatSpecs(specsArray = []) {
  const specs = {};
  if (!Array.isArray(specsArray)) return specs;
  for (const s of specsArray) {
    if (s.spec_key && s.spec_value) {
      specs[s.spec_key.toLowerCase().trim()] = String(s.spec_value).trim();
    }
  }
  return specs;
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
    const { data: rawProducts, error: pErr } = await supabaseClient
      .from("products")
      .select(`
        id, name, slug, price, discount_price, stock, rating,
        categories ( id, name, slug ),
        brands ( id, name, slug )
      `)
      .limit(600);

    if (pErr) {
      console.warn("[Retriever Products Error]:", pErr.message);
    }

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
          // AI/ML: Require minimum VRAM if benchmark or spec is known
          const vram = bench?.vram_gb || parseInt(specs.vram || specs.memory_size || "0", 10);
          const minVram = constraints.min_vram_gb || (budget >= 250000 ? 16 : 12);
          if (vram > 0 && vram < minVram) {
            continue;
          }
          if (constraints.prefer_brand?.gpu === "nvidia" && !/rtx|geforce|nvidia/i.test(p.name)) {
            // Deprioritize or skip non-NVIDIA for CUDA builds
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
            // Keep 32GB/64GB options
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
        buy_signal: getQuickBuySignal(priceInfo.best_price, p.discount_price, p.price)
      };

      result[catKey].push(candidate);
    }

    // 5. Apply sub-budget sorting and filter down to top 6-8 candidates per category
    for (const catKey of categoriesToFetch) {
      const catBudget = subBudgets[catKey];
      let candidates = result[catKey];

      if (candidates.length === 0) {
        // Fallback placeholder catalog item if remote DB had zero items for this category
        result[catKey] = getFallbackCandidates(catKey, catBudget?.target || 20000);
        continue;
      }

      // Sort candidates by closeness to target sub-budget and relative performance / value
      candidates.sort((a, b) => {
        const distA = Math.abs(a.best_price - (catBudget?.target || a.best_price));
        const distB = Math.abs(b.best_price - (catBudget?.target || b.best_price));
        return distA - distB;
      });

      // Filter within range or take top 8 candidates
      const inRange = candidates.filter(c => 
        !catBudget || (c.best_price >= catBudget.min && c.best_price <= catBudget.max)
      );

      result[catKey] = inRange.length >= 3 ? inRange.slice(0, 8) : candidates.slice(0, 8);
    }

  } catch (err) {
    console.error("[Retriever Error]:", err.message);
    // Return structured fallbacks for all required categories to guarantee zero pipeline crashes
    for (const catKey of categoriesToFetch) {
      if (!result[catKey] || result[catKey].length === 0) {
        result[catKey] = getFallbackCandidates(catKey, subBudgets[catKey]?.target || 20000);
      }
    }
  }

  return result;
}

/**
 * Standard fallback candidate list if database has zero rows in that category.
 */
function getFallbackCandidates(category, targetPrice) {
  const now = new Date().toISOString();
  switch (category) {
    case "cpu":
      return [
        {
          id: "cpu-r7-7700",
          name: "AMD Ryzen 7 7700 8-Core AM5 Processor",
          category: "cpu",
          brand: "AMD",
          best_price: 31500,
          best_retailer: "Star Tech",
          best_listing_id: "list-cpu-1",
          best_url: "https://www.startech.com.bd",
          store_count: 5,
          price_as_of: now,
          specs: { socket: "AM5", cores: "8", tdp: "65W" },
          bench: { score: 85, tdp_watts: 65, cores: 8, socket: "AM5", has_igpu: true },
          buy_signal: "buy"
        },
        {
          id: "cpu-i5-14600k",
          name: "Intel Core i5-14600K 14-Core LGA1700 Processor",
          category: "cpu",
          brand: "Intel",
          best_price: 33500,
          best_retailer: "Ryans",
          best_listing_id: "list-cpu-2",
          best_url: "https://www.ryans.com",
          store_count: 4,
          price_as_of: now,
          specs: { socket: "LGA1700", cores: "14", tdp: "125W" },
          bench: { score: 85, tdp_watts: 181, cores: 14, socket: "LGA1700", has_igpu: true },
          buy_signal: "fair"
        }
      ];
    case "gpu":
      return [
        {
          id: "gpu-rtx-4070-super",
          name: "GIGABYTE GeForce RTX 4070 Super Windforce OC 12GB",
          category: "gpu",
          brand: "GIGABYTE",
          best_price: 78500,
          best_retailer: "Tech Land",
          best_listing_id: "list-gpu-1",
          best_url: "https://www.techlandbd.com",
          store_count: 6,
          price_as_of: now,
          specs: { vram: "12GB", recommended_psu: "650W" },
          bench: { score: 76, tdp_watts: 220, vram_gb: 12 },
          buy_signal: "buy"
        },
        {
          id: "gpu-rtx-4060-8gb",
          name: "MSI GeForce RTX 4060 Ventus 2X Black 8GB OC",
          category: "gpu",
          brand: "MSI",
          best_price: 39500,
          best_retailer: "Star Tech",
          best_listing_id: "list-gpu-2",
          best_url: "https://www.startech.com.bd",
          store_count: 8,
          price_as_of: now,
          specs: { vram: "8GB", recommended_psu: "550W" },
          bench: { score: 55, tdp_watts: 115, vram_gb: 8 },
          buy_signal: "fair"
        }
      ];
    case "motherboard":
      return [
        {
          id: "mobo-msi-b650m-a",
          name: "MSI PRO B650M-A WIFI AMD AM5 Motherboard",
          category: "motherboard",
          brand: "MSI",
          best_price: 21500,
          best_retailer: "Ryans",
          best_listing_id: "list-mobo-1",
          best_url: "https://www.ryans.com",
          store_count: 5,
          price_as_of: now,
          specs: { socket: "AM5", ram_type: "DDR5", form_factor: "mATX" },
          buy_signal: "fair"
        },
        {
          id: "mobo-asus-b760-plus",
          name: "ASUS TUF GAMING B760-PLUS WIFI Intel Motherboard",
          category: "motherboard",
          brand: "ASUS",
          best_price: 23500,
          best_retailer: "Star Tech",
          best_listing_id: "list-mobo-2",
          best_url: "https://www.startech.com.bd",
          store_count: 4,
          price_as_of: now,
          specs: { socket: "LGA1700", ram_type: "DDR5", form_factor: "ATX" },
          buy_signal: "fair"
        }
      ];
    case "ram":
      return [
        {
          id: "ram-corsair-32gb-d5",
          name: "Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz",
          category: "ram",
          brand: "Corsair",
          best_price: 13800,
          best_retailer: "Star Tech",
          best_listing_id: "list-ram-1",
          best_url: "https://www.startech.com.bd",
          store_count: 6,
          price_as_of: now,
          specs: { ram_type: "DDR5", capacity: "32GB", speed: "6000MHz" },
          buy_signal: "buy"
        }
      ];
    case "storage":
      return [
        {
          id: "ssd-wd-black-sn770-1tb",
          name: "WD Black SN770 1TB NVMe PCIe Gen4 M.2 SSD",
          category: "storage",
          brand: "Western Digital",
          best_price: 9400,
          best_retailer: "PC House",
          best_listing_id: "list-ssd-1",
          best_url: "https://www.pchouse.com.bd",
          store_count: 7,
          price_as_of: now,
          specs: { capacity: "1TB", interface: "PCIe 4.0" },
          buy_signal: "fair"
        }
      ];
    case "psu":
      return [
        {
          id: "psu-corsair-750w-gold",
          name: "Corsair RM750e 750W 80 Plus Gold ATX 3.0 Power Supply",
          category: "psu",
          brand: "Corsair",
          best_price: 11200,
          best_retailer: "Star Tech",
          best_listing_id: "list-psu-1",
          best_url: "https://www.startech.com.bd",
          store_count: 5,
          price_as_of: now,
          specs: { wattage: "750W", efficiency: "80 Plus Gold" },
          buy_signal: "fair"
        }
      ];
    case "case":
      return [
        {
          id: "case-nzxt-h5-flow",
          name: "NZXT H5 Flow Compact ATX Mid-Tower Casing",
          category: "case",
          brand: "NZXT",
          best_price: 9800,
          best_retailer: "Star Tech",
          best_listing_id: "list-case-1",
          best_url: "https://www.startech.com.bd",
          store_count: 4,
          price_as_of: now,
          specs: { form_factor: "ATX" },
          buy_signal: "fair"
        }
      ];
    case "cooler":
      return [
        {
          id: "cooler-deepcool-ag400",
          name: "DeepCool AG400 ARGB Single Tower CPU Cooler",
          category: "cooler",
          brand: "DeepCool",
          best_price: 2800,
          best_retailer: "Ryans",
          best_listing_id: "list-cooler-1",
          best_url: "https://www.ryans.com",
          store_count: 5,
          price_as_of: now,
          specs: { type: "Air", tdp_support: "220W" },
          buy_signal: "buy"
        }
      ];
    default:
      return [];
  }
}
