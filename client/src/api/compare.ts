import { apiFetch } from './client';
import { HARDWARE_DATASET } from '../data/compareDataset';
import type { RetailerPriceInfo } from '../types/compare';

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
