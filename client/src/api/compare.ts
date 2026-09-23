import { apiFetch } from './client';
import { HARDWARE_DATASET } from '../data/compareDataset';
import { sanitizeImageUrl } from '../utils/image';
import type { ComponentCategory, CompareProduct, RetailerPriceInfo } from '../types/compare';

const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800';

/** A single scraped/live retailer listing row, as returned by GET /api/search. */
export interface LiveListing {
  id: string;
  title: string;
  brand?: string;
  price: number;
  price_str?: string;
  retailer: string;
  product_url: string;
  image_url: string;
  last_scraped_at?: string;
  category?: string;
  is_call_for_price?: boolean;
  estimated_price?: number;
  /** FK into the curated `products` catalog table, when this listing is linked to one. */
  product_id?: string | null;
}

export interface LiveSearchResponse {
  query: string;
  detected_category: string;
  count: number;
  results: LiveListing[];
}

/** Maps this app's internal compare category to the label /api/search's `category` filter expects. */
const CATEGORY_TO_SEARCH_LABEL: Partial<Record<ComponentCategory, string>> = {
  gpu: 'Graphics Card',
  cpu: 'Processor',
  motherboard: 'Motherboard',
  ram: 'RAM Memory',
  storage: 'SSD Storage',
  psu: 'Power Supply',
  case: 'Casing',
};

function deriveComponentCategory(rawCategory: string | undefined): ComponentCategory {
  const c = (rawCategory || '').toLowerCase();
  if (c.includes('graphics') || c.includes('gpu')) return 'gpu';
  if (c.includes('processor') || c.includes('cpu')) return 'cpu';
  if (c.includes('motherboard')) return 'motherboard';
  if (c.includes('ram') || c.includes('memory')) return 'ram';
  if (c.includes('ssd') || c.includes('storage') || c.includes('pendrive') || c.includes('hdd'))
    return 'storage';
  if (c.includes('power supply') || c === 'psu') return 'psu';
  if (c.includes('casing') || c.includes('case')) return 'case';
  return 'other';
}

const KNOWN_VENDORS = ['nvidia', 'amd', 'intel', 'asus', 'msi', 'gigabyte', 'zotac', 'sapphire', 'pny'];

function deriveVendor(brand: string | undefined): CompareProduct['vendor'] {
  const b = (brand || '').toLowerCase();
  return (KNOWN_VENDORS.find((v) => b.includes(v)) as CompareProduct['vendor']) || 'other';
}

function deriveRetailerSlug(retailer: string | undefined): RetailerPriceInfo['retailerSlug'] {
  const r = (retailer || '').toLowerCase();
  if (r.includes('startech')) return 'startech';
  if (r.includes('ryans')) return 'ryans';
  if (r.includes('techland')) return 'techland';
  return 'other';
}

/**
 * Fetches live retailer listings for a search query, reusing the same backend endpoint
 * (and its automatic live-scraper fallback when the DB has too few matches) that the
 * main Search page uses.
 */
export async function fetchLiveListings(
  query: string,
  category: ComponentCategory | 'all',
  signal?: AbortSignal,
): Promise<LiveListing[]> {
  const categoryParam =
    category !== 'all' && CATEGORY_TO_SEARCH_LABEL[category]
      ? `&category=${encodeURIComponent(CATEGORY_TO_SEARCH_LABEL[category]!)}`
      : '';
  const data = await apiFetch<LiveSearchResponse>(
    `/search?q=${encodeURIComponent(query)}${categoryParam}`,
    { signal },
  );
  return data.results || [];
}

/** Maps one live/scraped listing row into the shape the compare slots/table expect. */
export function mapListingToCompareProduct(listing: LiveListing): CompareProduct {
  const category = deriveComponentCategory(listing.category);
  const rawPrice = listing.price > 0 ? listing.price : listing.estimated_price || null;
  const priceBDT = listing.is_call_for_price ? null : rawPrice;
  const retailer: RetailerPriceInfo = {
    retailerName: listing.retailer || 'Retailer',
    retailerSlug: deriveRetailerSlug(listing.retailer),
    priceBDT,
    inStock: true,
    stockStatus: priceBDT ? 'in_stock' : 'price_withheld',
    warranty: 'See retailer listing',
    productUrl: listing.product_url || '',
    lastSynced: listing.last_scraped_at || 'Live',
  };

  return {
    id: listing.id,
    name: listing.title,
    brand: listing.brand || 'Generic',
    category,
    vendor: deriveVendor(listing.brand),
    image: sanitizeImageUrl(listing.image_url) || FALLBACK_PRODUCT_IMAGE,
    basePriceBDT: priceBDT,
    retailers: [retailer],
    primarySource: listing.retailer || 'Live Retailer',
    priceLastSynced: 'Live',
    // Scraped listings only carry title/price/retailer — no structured spec sheet, so we
    // deliberately leave this empty rather than fabricate values; CompareTable already
    // renders "—" for any spec key it can't find. mergeCatalogDetailIntoProduct() below
    // fills in whatever real data the linked catalog record (if any) actually has.
    specs: {},
    catalogProductId: listing.product_id || null,
  };
}

export interface CatalogProductDetail {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  image: string | null;
  price: number;
  specs: { key: string; value: string }[];
  retailers: { name: string; price: number; inStock: boolean; url: string; warranty?: string }[];
}

/** Fetches the full catalog record (real specs + multi-retailer pricing) for a product. */
export async function fetchCatalogProductDetail(
  productId: string,
  signal?: AbortSignal,
): Promise<CatalogProductDetail> {
  return apiFetch<CatalogProductDetail>(`/catalog-product/${encodeURIComponent(productId)}`, {
    signal,
  });
}

/** A handful of the catalog's generic spec_key names that map cleanly onto our detailed
 * GPU/CPU spec taxonomy (see compareDataset.ts SPEC_CATEGORIES). Most catalog spec keys
 * (e.g. "cooling") have no equivalent row there and are kept as-is — harmless, just unused. */
const CATALOG_SPEC_KEY_MAP: Record<string, string> = {
  vram: 'vramCapacity',
  interface: 'pcieInterface',
};

function formatRetailerCellPrice(r?: RetailerPriceInfo): string | undefined {
  if (!r) return undefined;
  if (r.priceBDT) return `৳ ${r.priceBDT.toLocaleString('en-BD')}`;
  return r.inStock ? 'Price Withheld' : 'Price Unavailable (Out of Stock)';
}

/**
 * Merges a fetched catalog record into a (usually live/scraped) CompareProduct: adds any
 * real specs the catalog has recorded, and any additional real retailer listings beyond
 * the one the product was originally found through. Never fabricates data — a retailer or
 * spec simply isn't added if the catalog doesn't have it.
 */
export function mergeCatalogDetailIntoProduct(
  base: CompareProduct,
  detail: CatalogProductDetail,
): CompareProduct {
  const specs: Record<string, string | number | boolean | null> = { ...base.specs };
  for (const { key, value } of detail.specs) {
    const mappedKey = CATALOG_SPEC_KEY_MAP[key] || key;
    if (mappedKey === 'vramCapacity') {
      const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
      specs[mappedKey] = isNaN(num) ? value : num;
    } else {
      specs[mappedKey] = value;
    }
  }

  const additionalRetailers: RetailerPriceInfo[] = detail.retailers
    .filter((r) => !base.retailers.some((br) => br.retailerName === r.name))
    .map((r) => ({
      retailerName: r.name,
      retailerSlug: deriveRetailerSlug(r.name),
      priceBDT: r.price > 0 ? r.price : null,
      inStock: r.inStock,
      stockStatus: r.price > 0 ? 'in_stock' : 'price_withheld',
      warranty: r.warranty || 'See retailer listing',
      productUrl: r.url || '',
      lastSynced: 'Live',
    }));
  const retailers = [...base.retailers, ...additionalRetailers];

  const validPrices = retailers
    .map((r) => r.priceBDT)
    .filter((p): p is number => p !== null && p > 0);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : base.basePriceBDT;
  const lowestRetailer = retailers.find((r) => r.priceBDT === lowestPrice);

  const startechCell = formatRetailerCellPrice(retailers.find((r) => r.retailerSlug === 'startech'));
  const ryansCell = formatRetailerCellPrice(retailers.find((r) => r.retailerSlug === 'ryans'));
  const techlandCell = formatRetailerCellPrice(retailers.find((r) => r.retailerSlug === 'techland'));
  if (startechCell) specs.startechPrice = startechCell;
  if (ryansCell) specs.ryansPrice = ryansCell;
  if (techlandCell) specs.techlandPrice = techlandCell;
  if (lowestPrice) {
    specs.lowestPrice = `৳ ${lowestPrice.toLocaleString('en-BD')}${
      lowestRetailer ? ` (${lowestRetailer.retailerName})` : ''
    }`;
  }

  return {
    ...base,
    image: base.image && base.image !== FALLBACK_PRODUCT_IMAGE
      ? base.image
      : sanitizeImageUrl(detail.image) || base.image,
    basePriceBDT: lowestPrice ?? base.basePriceBDT,
    retailers,
    specs,
  };
}

export interface LivePricePayload {
  canonical_sku: string;
  last_synced_at: string;
  retailers: RetailerPriceInfo[];
  lowest_price_bdt: number | null;
  lowest_price_retailer: string | null;
}

// In-memory SWR Cache for live prices (TTL: 10 minutes)
const priceCache: Record<string, { data: LivePricePayload; timestamp: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Normalizes raw retailer hardware titles into canonical SKU IDs
 * (Per taisha4.md §3 Alias Resolution Specification)
 */
export function normalizeSku(rawName: string): string {
  return rawName
    .toLowerCase()
    .replace(/graphics\s+card|desktop|gaming|edition|gddr6x|gddr6|processor|cpu/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetches live retailer pricing from the backend API with SWR cache fallback
 */
export async function fetchLiveRetailerPrices(
  skus: string[],
): Promise<Record<string, LivePricePayload>> {
  const result: Record<string, LivePricePayload> = {};
  const missingSkus: string[] = [];
  const now = Date.now();

  // Check in-memory cache
  skus.forEach((sku) => {
    const cached = priceCache[sku];
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      result[sku] = cached.data;
    } else {
      missingSkus.push(sku);
    }
  });

  if (missingSkus.length === 0) {
    return result;
  }

  try {
    const query = missingSkus.join(',');
    const response = await apiFetch<LivePricePayload[]>(
      `/compare/live-prices?skus=${encodeURIComponent(query)}`,
    );

    if (Array.isArray(response)) {
      response.forEach((item) => {
        priceCache[item.canonical_sku] = { data: item, timestamp: now };
        result[item.canonical_sku] = item;
      });
    }
  } catch {
    // Graceful fallback to verified reference dataset when offline or backend in development
    missingSkus.forEach((sku) => {
      const fallbackItem = HARDWARE_DATASET.find(
        (p) => p.id === sku || normalizeSku(p.name) === sku,
      );

      if (fallbackItem) {
        const prices = fallbackItem.retailers
          .map((r) => r.priceBDT)
          .filter((p): p is number => p !== null && p > 0);

        const lowest = prices.length > 0 ? Math.min(...prices) : null;
        const lowestRetailer =
          fallbackItem.retailers.find((r) => r.priceBDT === lowest)?.retailerName || null;

        const payload: LivePricePayload = {
          canonical_sku: fallbackItem.id,
          last_synced_at: fallbackItem.priceLastSynced,
          retailers: fallbackItem.retailers,
          lowest_price_bdt: lowest,
          lowest_price_retailer: lowestRetailer,
        };

        priceCache[sku] = { data: payload, timestamp: now };
        result[sku] = payload;
      }
    });
  }

  return result;
}
