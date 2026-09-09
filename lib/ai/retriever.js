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
        buy_signal: getQuickBuySignal(priceInfo.best_price, p.discount_price, p.price)
      };

      result[catKey].push(candidate);
    }

    // 5. If any category has fewer than 2 candidates, inject tier-matched fallbacks
    for (const catKey of categoriesToFetch) {
      const catBudget = subBudgets[catKey];
      const targetP = catBudget?.target || 20000;
      const fallbacks = getFallbackCandidates(catKey, targetP, req);

      if (!result[catKey] || result[catKey].length < 2) {
        result[catKey] = [...(result[catKey] || []), ...fallbacks];
      } else {
        // Also append relevant fallbacks to ensure socket pairs exist
        result[catKey].push(...fallbacks.slice(0, 2));
      }

      // Deduplicate by ID
      const seen = new Set();
      result[catKey] = result[catKey].filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      // Sort candidates by closeness to target sub-budget
      result[catKey].sort((a, b) => {
        const distA = Math.abs(a.best_price - targetP);
        const distB = Math.abs(b.best_price - targetP);
        return distA - distB;
      });

      result[catKey] = result[catKey].slice(0, 8);
    }

  } catch (err) {
    console.error("[Retriever Error]:", err.message);
    for (const catKey of categoriesToFetch) {
      if (!result[catKey] || result[catKey].length === 0) {
        result[catKey] = getFallbackCandidates(catKey, subBudgets[catKey]?.target || 20000, req);
      }
    }
  }

  return result;
}

/**
 * Budget-aware tier-matched fallback candidates.
 */
function getFallbackCandidates(category, targetPrice, req = {}) {
  const now = new Date().toISOString();
  const purpose = req.purpose || "general";
  const p = targetPrice || 20000;

  switch (category) {
    case "cpu":
      if (p < 15000) {
        return [
          {
            id: "cpu-i3-12100",
            name: "Intel Core i3-12100 4-Core LGA1700 Processor",
            category: "cpu",
            brand: "Intel",
            best_price: 11200,
            best_retailer: "Star Tech",
            best_listing_id: "list-cpu-i3-12100",
            best_url: "https://www.startech.com.bd",
            store_count: 5,
            price_as_of: now,
            specs: { socket: "LGA1700", cores: "4", tdp: "60W" },
            bench: { score: 48, tdp_watts: 60, cores: 4, socket: "LGA1700", has_igpu: true },
            buy_signal: "buy"
          },
          {
            id: "cpu-r5-5600g",
            name: "AMD Ryzen 5 5600G 6-Core AM4 APU with Radeon Graphics",
            category: "cpu",
            brand: "AMD",
            best_price: 13500,
            best_retailer: "Ryans",
            best_listing_id: "list-cpu-r5-5600g",
            best_url: "https://www.ryans.com",
            store_count: 6,
            price_as_of: now,
            specs: { socket: "AM4", cores: "6", tdp: "65W" },
            bench: { score: 62, tdp_watts: 65, cores: 6, socket: "AM4", has_igpu: true },
            buy_signal: "fair"
          }
        ];
      }
      if (p < 28000) {
        return [
          {
            id: "cpu-i5-12400f",
            name: "Intel Core i5-12400F 6-Core LGA1700 Processor",
            category: "cpu",
            brand: "Intel",
            best_price: 13800,
            best_retailer: "Star Tech",
            best_listing_id: "list-cpu-i5-12400f",
            best_url: "https://www.startech.com.bd",
            store_count: 6,
            price_as_of: now,
            specs: { socket: "LGA1700", cores: "6", tdp: "65W" },
            bench: { score: 62, tdp_watts: 65, cores: 6, socket: "LGA1700", has_igpu: false },
            buy_signal: "buy"
          },
          {
            id: "cpu-r5-7600",
            name: "AMD Ryzen 5 7600 6-Core AM5 Processor",
            category: "cpu",
            brand: "AMD",
            best_price: 21500,
            best_retailer: "Tech Land",
            best_listing_id: "list-cpu-r5-7600",
            best_url: "https://www.techlandbd.com",
            store_count: 5,
            price_as_of: now,
            specs: { socket: "AM5", cores: "6", tdp: "65W" },
            bench: { score: 78, tdp_watts: 65, cores: 6, socket: "AM5", has_igpu: true },
            buy_signal: "fair"
          }
        ];
      }
      return [
        {
          id: "cpu-r7-7700",
          name: "AMD Ryzen 7 7700 8-Core AM5 Processor",
          category: "cpu",
          brand: "AMD",
          best_price: 31500,
          best_retailer: "Star Tech",
          best_listing_id: "list-cpu-r7-7700",
          best_url: "https://www.startech.com.bd",
          store_count: 7,
          price_as_of: now,
          specs: { socket: "AM5", cores: "8", tdp: "65W" },
          bench: { score: 85, tdp_watts: 65, cores: 8, socket: "AM5", has_igpu: true },
          buy_signal: "buy"
        },
        {
          id: "cpu-r7-7800x3d",
          name: "AMD Ryzen 7 7800X3D Gaming Processor",
          category: "cpu",
          brand: "AMD",
          best_price: 46500,
          best_retailer: "Star Tech",
          best_listing_id: "list-cpu-r7-7800x3d",
          best_url: "https://www.startech.com.bd",
          store_count: 8,
          price_as_of: now,
          specs: { socket: "AM5", cores: "8", tdp: "120W" },
          bench: { score: 95, tdp_watts: 120, cores: 8, socket: "AM5", has_igpu: true },
          buy_signal: "fair"
        },
        {
          id: "cpu-i7-14700k",
          name: "Intel Core i7-14700K 20-Core LGA1700 Processor",
          category: "cpu",
          brand: "Intel",
          best_price: 47500,
          best_retailer: "Ryans",
          best_listing_id: "list-cpu-i7-14700k",
          best_url: "https://www.ryans.com",
          store_count: 5,
          price_as_of: now,
          specs: { socket: "LGA1700", cores: "20", tdp: "253W" },
          bench: { score: 92, tdp_watts: 253, cores: 20, socket: "LGA1700", has_igpu: true },
          buy_signal: "fair"
        }
      ];

    case "gpu":
      if (p < 30000) {
        return [
          {
            id: "gpu-rx-6600-8gb",
            name: "Sapphire Pulse AMD Radeon RX 6600 8GB",
            category: "gpu",
            brand: "Sapphire",
            best_price: 24500,
            best_retailer: "Ryans",
            best_listing_id: "list-gpu-rx-6600",
            best_url: "https://www.ryans.com",
            store_count: 6,
            price_as_of: now,
            specs: { vram: "8GB", recommended_psu: "500W" },
            bench: { score: 44, tdp_watts: 132, vram_gb: 8 },
            buy_signal: "buy"
          },
          {
            id: "gpu-rtx-3050-8gb",
            name: "ZOTAC Gaming GeForce RTX 3050 Twin Edge 8GB",
            category: "gpu",
            brand: "ZOTAC",
            best_price: 25500,
            best_retailer: "Star Tech",
            best_listing_id: "list-gpu-rtx-3050",
            best_url: "https://www.startech.com.bd",
            store_count: 4,
            price_as_of: now,
            specs: { vram: "8GB", recommended_psu: "500W" },
            bench: { score: 35, tdp_watts: 130, vram_gb: 8 },
            buy_signal: "fair"
          }
        ];
      }
      if (p < 60000) {
        return [
          {
            id: "gpu-rtx-4060-8gb",
            name: "MSI GeForce RTX 4060 Ventus 2X Black 8GB OC",
            category: "gpu",
            brand: "MSI",
            best_price: 39500,
            best_retailer: "Star Tech",
            best_listing_id: "list-gpu-rtx-4060",
            best_url: "https://www.startech.com.bd",
            store_count: 8,
            price_as_of: now,
            specs: { vram: "8GB", recommended_psu: "550W" },
            bench: { score: 55, tdp_watts: 115, vram_gb: 8 },
            buy_signal: "buy"
          },
          {
            id: "gpu-rtx-4060-ti-16gb",
            name: "Palit GeForce RTX 4060 Ti JetStream 16GB",
            category: "gpu",
            brand: "Palit",
            best_price: 58500,
            best_retailer: "Tech Land",
            best_listing_id: "list-gpu-rtx-4060-ti-16gb",
            best_url: "https://www.techlandbd.com",
            store_count: 5,
            price_as_of: now,
            specs: { vram: "16GB", recommended_psu: "600W" },
            bench: { score: 65, tdp_watts: 165, vram_gb: 16 },
            buy_signal: "fair"
          }
        ];
      }
      return [
        {
          id: "gpu-rtx-4070-super",
          name: "GIGABYTE GeForce RTX 4070 Super Windforce OC 12GB",
          category: "gpu",
          brand: "GIGABYTE",
          best_price: 78500,
          best_retailer: "Tech Land",
          best_listing_id: "list-gpu-rtx-4070-super",
          best_url: "https://www.techlandbd.com",
          store_count: 6,
          price_as_of: now,
          specs: { vram: "12GB", recommended_psu: "650W" },
          bench: { score: 76, tdp_watts: 220, vram_gb: 12 },
          buy_signal: "buy"
        },
        {
          id: "gpu-rtx-4070-ti-super-16gb",
          name: "MSI GeForce RTX 4070 Ti Super 16GB Gaming X Slim",
          category: "gpu",
          brand: "MSI",
          best_price: 98500,
          best_retailer: "Star Tech",
          best_listing_id: "list-gpu-rtx-4070-ti-super",
          best_url: "https://www.startech.com.bd",
          store_count: 5,
          price_as_of: now,
          specs: { vram: "16GB", recommended_psu: "750W" },
          bench: { score: 82, tdp_watts: 285, vram_gb: 16 },
          buy_signal: "fair"
        },
        {
          id: "gpu-rtx-4080-super-16gb",
          name: "ZOTAC Gaming GeForce RTX 4080 Super Trinity OC 16GB",
          category: "gpu",
          brand: "ZOTAC",
          best_price: 125000,
          best_retailer: "Star Tech",
          best_listing_id: "list-gpu-rtx-4080-super",
          best_url: "https://www.startech.com.bd",
          store_count: 4,
          price_as_of: now,
          specs: { vram: "16GB", recommended_psu: "750W" },
          bench: { score: 88, tdp_watts: 320, vram_gb: 16 },
          buy_signal: "fair"
        }
      ];

    case "motherboard":
      return [
        {
          id: "mobo-msi-h610m-e",
          name: "MSI PRO H610M-E DDR4 Intel Motherboard",
          category: "motherboard",
          brand: "MSI",
          best_price: 8200,
          best_retailer: "Star Tech",
          best_listing_id: "list-mobo-h610m",
          best_url: "https://www.startech.com.bd",
          store_count: 5,
          price_as_of: now,
          specs: { socket: "LGA1700", ram_type: "DDR4", form_factor: "mATX" },
          buy_signal: "buy"
        },
        {
          id: "mobo-msi-a520m-a",
          name: "MSI A520M-A PRO AMD AM4 Motherboard",
          category: "motherboard",
          brand: "MSI",
          best_price: 7800,
          best_retailer: "Ryans",
          best_listing_id: "list-mobo-a520m",
          best_url: "https://www.ryans.com",
          store_count: 6,
          price_as_of: now,
          specs: { socket: "AM4", ram_type: "DDR4", form_factor: "mATX" },
          buy_signal: "fair"
        },
        {
          id: "mobo-msi-b650m-a",
          name: "MSI PRO B650M-A WIFI AMD AM5 Motherboard",
          category: "motherboard",
          brand: "MSI",
          best_price: 21500,
          best_retailer: "Ryans",
          best_listing_id: "list-mobo-b650m",
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
          best_listing_id: "list-mobo-b760",
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
          id: "ram-corsair-16gb-d4",
          name: "Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz",
          category: "ram",
          brand: "Corsair",
          best_price: 4800,
          best_retailer: "Star Tech",
          best_listing_id: "list-ram-16gb-d4",
          best_url: "https://www.startech.com.bd",
          store_count: 7,
          price_as_of: now,
          specs: { ram_type: "DDR4", capacity: "16GB", speed: "3200MHz" },
          buy_signal: "buy"
        },
        {
          id: "ram-corsair-32gb-d5",
          name: "Corsair Vengeance 32GB (2x16GB) DDR5 6000MHz",
          category: "ram",
          brand: "Corsair",
          best_price: 13500,
          best_retailer: "Star Tech",
          best_listing_id: "list-ram-32gb-d5",
          best_url: "https://www.startech.com.bd",
          store_count: 6,
          price_as_of: now,
          specs: { ram_type: "DDR5", capacity: "32GB", speed: "6000MHz" },
          buy_signal: "buy"
        },
        {
          id: "ram-gskill-64gb-d5",
          name: "G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6000MHz",
          category: "ram",
          brand: "G.Skill",
          best_price: 24500,
          best_retailer: "Ryans",
          best_listing_id: "list-ram-64gb-d5",
          best_url: "https://www.ryans.com",
          store_count: 4,
          price_as_of: now,
          specs: { ram_type: "DDR5", capacity: "64GB", speed: "6000MHz" },
          buy_signal: "fair"
        }
      ];

    case "storage":
      return [
        {
          id: "ssd-kingston-nv2-500gb",
          name: "Kingston NV2 500GB PCIe 4.0 NVMe M.2 SSD",
          category: "storage",
          brand: "Kingston",
          best_price: 4200,
          best_retailer: "Star Tech",
          best_listing_id: "list-ssd-500gb",
          best_url: "https://www.startech.com.bd",
          store_count: 8,
          price_as_of: now,
          specs: { capacity: "500GB", interface: "PCIe 4.0" },
          buy_signal: "buy"
        },
        {
          id: "ssd-wd-black-sn770-1tb",
          name: "WD Black SN770 1TB NVMe PCIe Gen4 M.2 SSD",
          category: "storage",
          brand: "Western Digital",
          best_price: 9400,
          best_retailer: "PC House",
          best_listing_id: "list-ssd-1tb",
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
          id: "psu-corsair-cv550-550w",
          name: "Corsair CV550 550W 80 Plus Bronze Power Supply",
          category: "psu",
          brand: "Corsair",
          best_price: 4800,
          best_retailer: "Star Tech",
          best_listing_id: "list-psu-550w",
          best_url: "https://www.startech.com.bd",
          store_count: 6,
          price_as_of: now,
          specs: { wattage: "550W", efficiency: "80 Plus Bronze" },
          buy_signal: "buy"
        },
        {
          id: "psu-corsair-750w-gold",
          name: "Corsair RM750e 750W 80 Plus Gold ATX 3.0 Power Supply",
          category: "psu",
          brand: "Corsair",
          best_price: 11200,
          best_retailer: "Star Tech",
          best_listing_id: "list-psu-750w",
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
          id: "case-revenger-base",
          name: "Revenger Base RGB Mid-Tower Micro-ATX Casing",
          category: "case",
          brand: "Revenger",
          best_price: 3200,
          best_retailer: "Ryans",
          best_listing_id: "list-case-micro",
          best_url: "https://www.ryans.com",
          store_count: 5,
          price_as_of: now,
          specs: { form_factor: "ATX" },
          buy_signal: "buy"
        },
        {
          id: "case-nzxt-h5-flow",
          name: "NZXT H5 Flow Compact ATX Mid-Tower Casing",
          category: "case",
          brand: "NZXT",
          best_price: 9800,
          best_retailer: "Star Tech",
          best_listing_id: "list-case-nzxt",
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
          best_price: 2400,
          best_retailer: "Ryans",
          best_listing_id: "list-cooler-ag400",
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
