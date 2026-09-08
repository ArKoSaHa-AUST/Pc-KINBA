/**
 * PC Kinba - Intelligent "Call for Price" Estimation Engine
 * 
 * Accurately recovers and predicts prices for "Call for Price" / unpriced hardware via:
 * 1. Historical DB Prices (price_history & prior snapshots)
 * 2. Multi-Store KNN & Weighted Probability (cross-store median & catalog neighbors)
 * 3. Groq LLM Market Pricing (with automatic token-key rotation & memory cache)
 */

import { callGroqWithRotation } from "./groq.js";
import { deriveCategory } from "./alternatives.js";

// Fast in-memory cache for estimations (Title -> Result)
const estimationCache = new Map();

/**
 * Normalizes title into alphanumeric model and feature tokens for KNN distance calculation
 */
function extractModelTokens(title = "") {
  const clean = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = clean.split(/\s+/).filter(t => t.length >= 2);
  const models = tokens.filter(t => 
    /\d{3,5}/.test(t) || 
    /^(i3|i5|i7|i9|ryzen|r3|r5|r7|r9|rtx|gtx|rx|b650|b760|z790|x670|b550|a620|ddr4|ddr5|nvme|gen4|gen5|ti|super|xt|xtx)$/.test(t)
  );
  return { allTokens: new Set(tokens), modelTokens: models };
}

/**
 * Calculates similarity metric (0.0 to 1.0) between target product and a candidate
 */
function calculateKnnSimilarity(targetTitle, candTitle, targetCategory, candCategory) {
  if (targetCategory && candCategory && targetCategory !== candCategory) {
    return 0;
  }

  const targetTokens = extractModelTokens(targetTitle);
  const candTokens = extractModelTokens(candTitle);

  let score = 0;

  // 1. Model token match (e.g. "4060", "7800x3d", "13400f", "990")
  const targetModels = targetTokens.modelTokens;
  const candModels = candTokens.modelTokens;
  if (targetModels.length > 0 && candModels.length > 0) {
    const commonModels = targetModels.filter(m => candModels.includes(m));
    if (commonModels.length > 0) {
      score += 0.6 * (commonModels.length / Math.max(targetModels.length, candModels.length));
    }
  }

  // 2. Token overlap (Jaccard similarity)
  let intersection = 0;
  for (const t of targetTokens.allTokens) {
    if (candTokens.allTokens.has(t)) intersection++;
  }
  const union = new Set([...targetTokens.allTokens, ...candTokens.allTokens]).size;
  if (union > 0) {
    score += 0.4 * (intersection / union);
  }

  return score;
}

/**
 * Estimates price using Groq AI Cloud with multi-key failover
 */
export async function estimatePriceWithGroq(title, category = "Hardware", brand = "") {
  const cacheKey = `groq_${title.toLowerCase().trim()}`;
  if (estimationCache.has(cacheKey)) {
    return estimationCache.get(cacheKey);
  }

  const messages = [
    {
      role: "system",
      content: `You are a Bangladeshi PC hardware pricing expert.
Estimate the realistic retail price in Bangladeshi Taka (BDT) for this computer component in Bangladesh.
Rules:
- Return ONLY a valid JSON object: {"estimated_price": <number_in_BDT>, "confidence": 0.85}
- No markdown code fences, no greetings, no extra text.
- Estimated price MUST be a realistic positive integer in BDT (e.g. RTX 4060 is ~38000-45000 BDT, Ryzen 5 7600 is ~20000-24000 BDT, 16GB DDR5 is ~6000-9000 BDT, 1TB NVMe is ~7500-11000 BDT, B650 motherboard is ~15000-22000 BDT).`
    },
    {
      role: "user",
      content: `Product: "${title}" | Category: "${category}" | Brand: "${brand || 'Generic'}"`
    }
  ];

  try {
    const raw = await callGroqWithRotation(messages, { timeoutMs: 3000, model: "qwen/qwen3.8-27b", temperature: 0.1 });
    if (raw) {
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && typeof parsed.estimated_price === 'number' && parsed.estimated_price > 500) {
          const result = {
            estimated_price: Math.round(parsed.estimated_price / 50) * 50,
            confidence: parsed.confidence || 0.8,
            source: 'groq'
          };
          estimationCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn("[Groq Price Estimator Warning]:", err.message);
  }

  return null;
}

/**
 * Resolves or estimates a single listing/product price
 */
export async function estimateSingleProductPrice(item, supabase, knownPricedNeighbors = []) {
  if (!item) return item;

  const currentPrice = typeof item.price === 'number' && item.price > 0 ? item.price : null;
  const isCallForPrice = !currentPrice || item.price_str === 'Call for Price' || item.price <= 0;

  if (!isCallForPrice) {
    return {
      ...item,
      is_call_for_price: false
    };
  }

  const title = item.title || item.name || '';
  const category = item.category || deriveCategory(title);
  const cacheKey = `est_${title.toLowerCase().trim()}`;

  if (estimationCache.has(cacheKey)) {
    const cached = estimationCache.get(cacheKey);
    return {
      ...item,
      price: cached.estimated_price,
      price_str: `${cached.estimated_price.toLocaleString()}৳`,
      estimated_price: cached.estimated_price,
      is_call_for_price: true,
      call_for_price_estimated: true,
      estimation_source: cached.source,
      estimation_confidence: cached.confidence,
      original_price_str: item.price_str || 'Call for Price'
    };
  }

  let finalPrice = null;
  let source = 'unknown';
  let confidence = 0.5;

  // 1. Check known priced neighbors (e.g. from same search batch or same product offers)
  if (knownPricedNeighbors && knownPricedNeighbors.length > 0) {
    const scoredNeighbors = knownPricedNeighbors
      .map(n => ({
        price: n.price,
        sim: calculateKnnSimilarity(title, n.title || n.name || '', category, n.category || deriveCategory(n.title || ''))
      }))
      .filter(n => n.price > 0 && n.sim >= 0.45)
      .sort((a, b) => b.sim - a.sim);

    if (scoredNeighbors.length > 0) {
      const topK = scoredNeighbors.slice(0, 5);
      const totalWeight = topK.reduce((sum, n) => sum + n.sim, 0);
      const weightedPrice = topK.reduce((sum, n) => sum + (n.price * n.sim), 0) / totalWeight;
      finalPrice = Math.round(weightedPrice / 50) * 50;
      source = 'knn';
      confidence = topK[0].sim;
    }
  }

  // 2. Check Historical Price from price_history table in Supabase
  if (!finalPrice && supabase && (item.id || item.product_id)) {
    try {
      let query = supabase
        .from('price_history')
        .select('price, scraped_at')
        .gt('price', 0)
        .order('scraped_at', { ascending: false })
        .limit(1);

      if (item.id) {
        query = query.eq('listing_id', item.id);
      } else if (item.product_id) {
        query = query.eq('product_id', item.product_id);
      }

      const { data: histData } = await query;
      if (histData && histData.length > 0 && histData[0].price > 0) {
        finalPrice = histData[0].price;
        source = 'history';
        confidence = 0.95;
      }
    } catch (e) {
      console.warn('[Price History Fetch Warning]:', e.message);
    }
  }

  // 3. Check Supabase DB KNN (Find similar listings in DB with valid price)
  if (!finalPrice && supabase) {
    try {
      const tokens = extractModelTokens(title).modelTokens;
      let dbQuery = supabase
        .from('listings')
        .select('title, price, brand')
        .gt('price', 0)
        .limit(40);

      if (tokens.length > 0) {
        dbQuery = dbQuery.ilike('title', `%${tokens[0]}%`);
      }

      const { data: candData } = await dbQuery;
      if (candData && candData.length > 0) {
        const scored = candData
          .map(c => ({
            price: c.price,
            sim: calculateKnnSimilarity(title, c.title, category, deriveCategory(c.title))
          }))
          .filter(c => c.price > 0 && c.sim >= 0.5)
          .sort((a, b) => b.sim - a.sim);

        if (scored.length > 0) {
          const topK = scored.slice(0, 5);
          const totalWeight = topK.reduce((sum, n) => sum + n.sim, 0);
          const weightedPrice = topK.reduce((sum, n) => sum + (n.price * n.sim), 0) / totalWeight;
          finalPrice = Math.round(weightedPrice / 50) * 50;
          source = 'knn';
          confidence = topK[0].sim;
        }
      }
    } catch (e) {
      console.warn('[DB KNN Price Estimation Warning]:', e.message);
    }
  }

  // 4. Groq LLM AI Fallback
  if (!finalPrice) {
    const groqEst = await estimatePriceWithGroq(title, category, item.brand);
    if (groqEst) {
      finalPrice = groqEst.estimated_price;
      source = 'groq';
      confidence = groqEst.confidence;
    }
  }

  // Safe fallback if all estimators yielded 0
  if (!finalPrice || finalPrice <= 0) {
    finalPrice = 15000;
    source = 'fallback';
    confidence = 0.3;
  }

  const estResult = {
    estimated_price: finalPrice,
    source,
    confidence
  };
  estimationCache.set(cacheKey, estResult);

  return {
    ...item,
    price: finalPrice,
    price_str: `${finalPrice.toLocaleString()}৳`,
    estimated_price: finalPrice,
    is_call_for_price: true,
    call_for_price_estimated: true,
    estimation_source: source,
    estimation_confidence: confidence,
    original_price_str: item.price_str || 'Call for Price'
  };
}

/**
 * Enriches an array of search results / products with estimated prices for any "Call for Price" item
 */
export async function batchEnrichCallForPrice(items, supabase) {
  if (!Array.isArray(items) || items.length === 0) return items;

  // Split into already priced vs unpriced
  const pricedItems = items.filter(i => typeof i.price === 'number' && i.price > 0 && i.price_str !== 'Call for Price');
  const unpricedItems = items.filter(i => !i.price || i.price <= 0 || i.price_str === 'Call for Price');

  if (unpricedItems.length === 0) {
    return items.map(i => ({ ...i, is_call_for_price: false }));
  }

  // Process unpriced items concurrently
  const enrichedUnpriced = await Promise.all(
    unpricedItems.map(item => estimateSingleProductPrice(item, supabase, pricedItems))
  );

  const unpricedMap = new Map();
  enrichedUnpriced.forEach(item => {
    if (item.id) unpricedMap.set(item.id, item);
  });

  return items.map(orig => {
    if (orig.id && unpricedMap.has(orig.id)) {
      return unpricedMap.get(orig.id);
    }
    const isCallForPrice = !orig.price || orig.price <= 0 || orig.price_str === 'Call for Price';
    if (isCallForPrice) {
      const match = enrichedUnpriced.find(u => u.title === orig.title);
      return match || { ...orig, is_call_for_price: true };
    }
    return { ...orig, is_call_for_price: false };
  });
}

/**
 * Enriches multi-store comparison shop offers (e.g. 12 retailer rows)
 * If some stores have real in-stock prices, uses KNN median to estimate for "Call for Price" stores.
 * If no store has a price, runs historical/DB-KNN/Groq estimation.
 */
export async function enrichGroupedShops(shops, primaryItem, supabase) {
  if (!Array.isArray(shops) || shops.length === 0) return shops;

  const validPricedShops = shops.filter(s => typeof s.price === 'number' && s.price > 0 && s.price_str !== 'Call for Price');

  let baseEstimate = null;

  if (validPricedShops.length > 0) {
    // KNN Median calculation from verified stores selling this exact component
    const prices = validPricedShops.map(s => s.price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const medianPrice = prices.length % 2 !== 0 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
    baseEstimate = {
      estimated_price: Math.round(medianPrice / 50) * 50,
      source: 'knn',
      confidence: 0.9
    };
  } else {
    // Run full pipeline on the primary product
    const est = await estimateSingleProductPrice(primaryItem || { title: 'Hardware' }, supabase);
    baseEstimate = {
      estimated_price: est.price || est.estimated_price || 15000,
      source: est.estimation_source || 'groq',
      confidence: est.estimation_confidence || 0.75
    };
  }

  return shops.map(shop => {
    const isCallForPrice = !shop.price || shop.price <= 0 || shop.price_str === 'Call for Price' || shop.price === null;
    if (!isCallForPrice) {
      return {
        ...shop,
        is_call_for_price: false
      };
    }

    const estPrice = baseEstimate.estimated_price;
    return {
      ...shop,
      price: estPrice,
      price_str: `${estPrice.toLocaleString()}৳`,
      estimated_price: estPrice,
      is_call_for_price: true,
      call_for_price_estimated: true,
      estimation_source: baseEstimate.source,
      estimation_confidence: baseEstimate.confidence,
      original_price_str: 'Call for Price'
    };
  });
}
