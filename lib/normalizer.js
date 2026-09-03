/**
 * PC Kinba - Production Product Matching & Normalization Engine (ES Module)
 * 
 * Rules:
 * 1. Extract manufacturer (NVIDIA, AMD, Intel, etc.) vs brand (ASUS, MSI, etc.)
 * 2. Strip noise words to isolate base_model
 * 3. Generate canonical fingerprint WITHOUT vendor brand (order-independent):
 *    fingerprint = sorted([manufacturer, base_model, type, capacity]).join("-")
 * 4. MPN / SKU extraction for exact matching
 * 5. Strict price normalization (0, "৳0", "Call for Price" -> null)
 * 6. Match confidence score (0.0 - 1.0)
 */

export const MANUFACTURERS = [
  { name: 'NVIDIA', keywords: ['NVIDIA', 'GeForce', 'RTX', 'GTX', 'QUADRO'] },
  { name: 'AMD', keywords: ['AMD', 'Radeon', 'Ryzen', 'RX', 'Threadripper'] },
  { name: 'Intel', keywords: ['Intel', 'Core', 'Arc', 'Xeon', 'Pentium', 'Celeron', 'i3', 'i5', 'i7', 'i9'] },
  { name: 'Samsung', keywords: ['Samsung', '990 Pro', '980 Pro', '870 EVO'] },
  { name: 'Corsair', keywords: ['Corsair', 'Vengeance', 'Dominator', 'MP600'] },
  { name: 'Kingston', keywords: ['Kingston', 'Fury', 'NV2', 'KC3000'] },
  { name: 'Western Digital', keywords: ['Western Digital', 'WD', 'SN850X', 'SN770', 'Blue', 'Black'] }
];

export const BRANDS_LIST = [
  'Corsair', 'Kingston', 'ASUS', 'MSI', 'Gigabyte', 'PNY', 'Zotac', 'Sapphire',
  'PowerColor', 'AMD', 'Intel', 'Samsung', 'Team', 'TeamGroup', 'Western Digital',
  'WD', 'G.Skill', 'Aorus', 'XPG', 'ADATA', 'DeepCool', 'Antec', 'Thermalright',
  'Colorful', 'Inno3D', 'Galax', 'Palit', 'Lian Li', 'Thermaltake', 'Crucial',
  'Transcend', 'Lexar', 'Noctua', 'Cougar', 'Fantech', 'Montech'
];

export const NOISE_WORDS = [
  /\bram\b/gi,
  /\bmemory\b/gi,
  /\bdesktop\b/gi,
  /\blaptop\b/gi,
  /\bgraphics\s*card\b/gi,
  /\bgpu\b/gi,
  /\bprocessor\b/gi,
  /\bcpu\b/gi,
  /\bmotherboard\b/gi,
  /\bcasing\b/gi,
  /\bcase\b/gi,
  /\bpower\s*supply\b/gi,
  /\bpsu\b/gi,
  /\bcooler\b/gi,
  /\bssd\b/gi,
  /\bhard\s*drive\b/gi,
  /\bhdd\b/gi,
  /\bkit\b/gi
];

export const EDITION_NOISE = [
  /\b(oc|edition|dual|gaming|pro|ultra|evo|ice|super|slim|windforce|tuf|strix|eagle|ventus|mech|shadow|shade|t-force|trident|aegis)\b/gi
];

export const TARGET_STORES = [
  { name: 'StarTech BD', logo: 'ST', color: '#ef4444', defaultUrl: 'https://www.startech.com.bd' },
  { name: 'Ryans Computers', logo: 'RY', color: '#10b981', defaultUrl: 'https://www.ryans.com' },
  { name: 'Global Brand', logo: 'GB', color: '#3b82f6', defaultUrl: 'https://www.globalbrand.com.bd' },
  { name: 'Techland BD', logo: 'TL', color: '#ec4899', defaultUrl: 'https://www.techlandbd.com' },
  { name: 'Skyland BD', logo: 'SK', color: '#6366f1', defaultUrl: 'https://www.skyland.com.bd' },
  { name: 'PCB Store', logo: 'PC', color: '#a855f7', defaultUrl: 'https://pcbstore.com.bd' },
  { name: 'Computer Mania BD', logo: 'CM', color: '#f59e0b', defaultUrl: 'https://computermania.com.bd' },
  { name: 'Binary Logic', logo: 'BL', color: '#14b8a6', defaultUrl: 'https://www.binarylogic.com.bd' },
  { name: 'Sell Tech BD', logo: 'ST', color: '#f97316', defaultUrl: 'https://www.selltech.com.bd' },
  { name: 'Computer Village', logo: 'CV', color: '#0ea5e9', defaultUrl: 'https://www.computervillage.com.bd' },
  { name: 'PC House BD', logo: 'PH', color: '#84cc16', defaultUrl: 'https://www.pchouse.com.bd' },
  { name: 'Ultra Technology', logo: 'UT', color: '#8b5cf6', defaultUrl: 'https://www.ultratech.com.bd' }
];

/**
 * Price Normalizer: Converts 0, "0", "৳0", "Call for Price" to null
 */
export function normalizePrice(rawPrice) {
  if (rawPrice === null || rawPrice === undefined) return null;
  let num = typeof rawPrice === 'number' ? rawPrice : parseInt(String(rawPrice).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Attribute Extraction (Manufacturer, Brand, Base Model, Type, Capacity, Speed, MPN)
 */
export function extractAttributes(rawTitle) {
  if (!rawTitle) {
    return { manufacturer: '', brand: '', capacity: '', type: '', speed: '', model: '', baseModel: '', mpn: '', raw: '' };
  }

  const title = rawTitle.trim();

  // 1. Manufacturer Detection
  let manufacturer = 'Generic';
  for (const m of MANUFACTURERS) {
    if (m.keywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(title))) {
      manufacturer = m.name;
      break;
    }
  }

  // 2. Vendor Brand Detection
  let brand = '';
  for (const b of BRANDS_LIST) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(title)) {
      brand = b;
      break;
    }
  }

  // 3. Capacity Extraction (8GB, 16GB, 32GB, 1TB, 512GB)
  let capacity = '';
  const capMatch = title.match(/\b(\d+)\s*(GB|G|TB)\b/i);
  if (capMatch) {
    const val = parseInt(capMatch[1], 10);
    const unit = capMatch[2].toUpperCase();
    if (unit === 'TB') capacity = `${val}TB`;
    else if (unit === 'G' || unit === 'GB') capacity = `${val}GB`;
  }

  // 4. Spec Type Extraction (DDR4, DDR5, GDDR6, GDDR7, NVMe, SATA)
  let type = '';
  const typeMatch = title.match(/\b(DDR5|DDR4|DDR3|GDDR7|GDDR6X|GDDR6|GDDR5|NVMe|SATA)\b/i);
  if (typeMatch) {
    type = typeMatch[1].toUpperCase();
  }

  // 5. Speed Extraction (3200MHz, 6000MHz)
  let speed = '';
  const speedMatch = title.match(/\b(\d{4})\s*(MHz|MHz\/s)\b/i);
  if (speedMatch) {
    speed = `${speedMatch[1]}MHz`;
  }

  // 6. MPN / SKU Extraction (Part number regex e.g. DUAL-RTX5060-O8G, CMK16GX4M2E3200C16)
  let mpn = '';
  const mpnMatch = title.match(/\b([A-Z0-9]{5,15}-[A-Z0-9]{3,10}|[A-Z0-9]{8,18})\b/);
  if (mpnMatch && !['GRAPHICS', 'DESKTOP', 'PROCESSOR', 'GEFORCE'].includes(mpnMatch[1])) {
    mpn = mpnMatch[1];
  }

  // 7. Base Model Extraction (GPU / CPU / RAM / SSD Series)
  let model = '';

  // GPU regex
  const gpuMatch = title.match(/\b(RTX\s*\d{4}(?:\s*Ti)?|RX\s*\d{4}(?:\s*XT)?|GTX\s*\d{4}(?:\s*Ti)?)\b/i);
  if (gpuMatch) {
    model = gpuMatch[1].replace(/\s+/g, ' ').toUpperCase();
  }

  // CPU regex
  if (!model) {
    const cpuMatch = title.match(/\b(Ryzen\s*[3579]\s*\d{4}[X3D]*|i[3579]-?\d{4,5}[KFX]*|Core\s*Ultra\s*[579]\s*\d+K?)\b/i);
    if (cpuMatch) {
      model = cpuMatch[1].replace(/\s+/g, ' ');
    }
  }

  // Storage / Memory series fallback
  if (!model) {
    const seriesMatch = title.match(/\b(Vengeance\s*LPX|Vengeance|Fury\s*Beast|T-Force\s*Delta|Dominator|990\s*Pro|980\s*Pro|SN850X|SN770|P3\s*Plus)\b/i);
    if (seriesMatch) {
      model = seriesMatch[1];
    }
  }

  if (!model) {
    let clean = title;
    if (brand) clean = clean.replace(new RegExp(`\\b${brand}\\b`, 'gi'), '');
    NOISE_WORDS.forEach(nw => { clean = clean.replace(nw, ''); });
    model = clean.trim().split(/\s+/).slice(0, 3).join(' ');
  }

  // Base model normalization (strip vendor edition noise)
  let baseModel = model;
  EDITION_NOISE.forEach(en => { baseModel = baseModel.replace(en, ''); });
  baseModel = baseModel.replace(/\s+/g, ' ').trim();

  return {
    manufacturer,
    brand,
    capacity,
    type,
    speed,
    model: model.trim(),
    baseModel: baseModel || model.trim(),
    mpn,
    raw: title
  };
}

/**
 * Order-Independent Canonical Fingerprint Generator
 * Note: Vendor brand (ASUS, MSI, Gigabyte) is NOT included so all vendor cards map to one comparison product!
 * fingerprint = sorted([manufacturer, base_model, type, capacity]).join("-")
 */
export function generateFingerprint(title, manufacturerHint = '') {
  const attrs = extractAttributes(title);
  const manufacturer = (attrs.manufacturer || manufacturerHint || 'generic').toLowerCase().replace(/[^a-z0-9]/g, '');
  const baseModel = attrs.baseModel.toLowerCase().replace(/[^a-z0-9]/g, '');
  const type = attrs.type.toLowerCase();
  const capacity = attrs.capacity.toLowerCase();

  // Order-independent sorting of core identity ONLY
  const parts = [manufacturer, baseModel, type, capacity]
    .filter(Boolean)
    .map(p => p.toLowerCase());

  const fingerprint = Array.from(new Set(parts)).sort().join('-');

  const canonical_name = `${attrs.manufacturer !== 'Generic' ? attrs.manufacturer : ''} ${attrs.baseModel} ${attrs.type} ${attrs.capacity}`
    .replace(/\s+/g, ' ')
    .trim();

  return {
    fingerprint,
    canonical_name,
    attributes: attrs
  };
}

/**
 * Jaccard Token Similarity Calculation
 */
export function calculateSimilarity(str1, str2) {
  const norm1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const norm2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  if (norm1 === norm2) return 1.0;

  const set1 = new Set(norm1.split(/\s+/).filter(Boolean));
  const set2 = new Set(norm2.split(/\s+/).filter(Boolean));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Match Confidence Score (0.0 to 1.0)
 * Step 1: MPN match -> 1.0
 * Step 2: Fingerprint match -> 0.95
 * Step 3: Fuzzy similarity -> score
 * Hard Constraints: capacity/type mismatch -> 0.0
 */
export function calculateMatchConfidence(title1, title2) {
  const attr1 = extractAttributes(title1);
  const attr2 = extractAttributes(title2);

  // Hard constraints
  if (attr1.capacity && attr2.capacity && attr1.capacity !== attr2.capacity) return 0.0;
  if (attr1.type && attr2.type && attr1.type !== attr2.type) return 0.0;

  // SKU / MPN exact match
  if (attr1.mpn && attr2.mpn && attr1.mpn === attr2.mpn) return 1.0;

  // Fingerprint match
  const fp1 = generateFingerprint(title1).fingerprint;
  const fp2 = generateFingerprint(title2).fingerprint;

  if (fp1 === fp2) return 0.95;

  const score = calculateSimilarity(title1, title2);
  return Math.round(score * 100) / 100;
}

/**
 * Check if two titles represent the same canonical product variant (threshold >= 0.75)
 */
export function isSameProductVariant(title1, title2, threshold = 0.75) {
  const confidence = calculateMatchConfidence(title1, title2);
  return confidence >= threshold;
}

/**
 * Group Offers Across All 5 Target Stores
 */
export function group5StoreOffers(primaryItem, matchingListings = []) {
  const storeMap = new Map();
  const allListings = [primaryItem, ...matchingListings].filter(Boolean);

  allListings.forEach((listing) => {
    const rawRetailer = listing.retailer || listing.source || '';
    let matchedStoreName = null;

    if (/startech/i.test(rawRetailer)) matchedStoreName = 'StarTech BD';
    else if (/ryans/i.test(rawRetailer)) matchedStoreName = 'Ryans Computers';
    else if (/global\s*brand/i.test(rawRetailer)) matchedStoreName = 'Global Brand';
    else if (/techland/i.test(rawRetailer)) matchedStoreName = 'Techland BD';
    else if (/skyland/i.test(rawRetailer)) matchedStoreName = 'Skyland BD';
    else if (/pcb/i.test(rawRetailer)) matchedStoreName = 'PCB Store';
    else if (/mania/i.test(rawRetailer)) matchedStoreName = 'Computer Mania BD';
    else if (/binary/i.test(rawRetailer)) matchedStoreName = 'Binary Logic';
    else if (/sell\s*tech/i.test(rawRetailer)) matchedStoreName = 'Sell Tech BD';
    else if (/village/i.test(rawRetailer)) matchedStoreName = 'Computer Village';
    else if (/house/i.test(rawRetailer)) matchedStoreName = 'PC House BD';
    else if (/ultra/i.test(rawRetailer)) matchedStoreName = 'Ultra Technology';
    else if (/ucc/i.test(rawRetailer)) matchedStoreName = 'UCC BD';

    const normP = normalizePrice(listing.price);

    if (matchedStoreName && (!storeMap.has(matchedStoreName) || normP !== null)) {
      storeMap.set(matchedStoreName, {
        store: matchedStoreName,
        name: matchedStoreName,
        price: normP,
        price_str: normP !== null ? `${normP.toLocaleString()}৳` : 'Call for Price',
        url: listing.product_url || listing.url || '',
        stock: normP !== null,
        availability: normP !== null ? 'In Stock' : 'Call for Price'
      });
    }
  });

  const finalShops = TARGET_STORES.map((target) => {
    if (storeMap.has(target.name)) {
      return {
        ...storeMap.get(target.name),
        logo: target.logo,
        color: target.color
      };
    } else {
      return {
        store: target.name,
        name: target.name,
        logo: target.logo,
        color: target.color,
        price: null,
        price_str: 'Call for Price',
        url: target.defaultUrl,
        stock: false,
        availability: 'Check Retailer'
      };
    }
  });

  const validPrices = finalShops
    .map(s => s.price)
    .filter(p => typeof p === 'number' && p > 0);

  const best_price = validPrices.length > 0 ? Math.min(...validPrices) : normalizePrice(primaryItem.price);

  return {
    best_price,
    best_price_str: best_price !== null ? `${best_price.toLocaleString()}৳` : 'Call for Price',
    shops: finalShops
  };
}
