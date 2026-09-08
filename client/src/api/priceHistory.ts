export type BuySignalKind = 'buy' | 'fair' | 'wait' | 'neutral';

export interface BuySignal {
  signal: BuySignalKind;
  reason: string;
  days: number;
}

/** Buy-timing verdict for a listing (the server scopes to its canonical product when linked). */
export async function fetchBuySignal(listingId: string, days = 30): Promise<BuySignal> {
  const res = await fetch(
    `/api/product/${encodeURIComponent(listingId)}/price-history?days=${days}`,
  );
  if (!res.ok) throw new Error('Failed to load price history');
  const json = (await res.json()) as { days: number; buy_signal: Omit<BuySignal, 'days'> };
  return { ...json.buy_signal, days: json.days };
}
