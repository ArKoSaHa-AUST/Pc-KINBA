export interface PriceAlert {
  id: string;
  /** Listing id — product pages are addressed by listing id. */
  product_id: string;
  product_title: string | null;
  product_image: string | null;
  current_price: number | null;
  target_price: number | null;
  status: 'active' | 'paused' | 'triggered' | 'cancelled';
  created_at: string;
}

export async function getUserPriceAlerts(email: string): Promise<PriceAlert[]> {
  const res = await fetch(`/api/user/price-alerts?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error('Failed to load price alerts');
  const data = (await res.json()) as { alerts?: PriceAlert[] };
  return data.alerts ?? [];
}

export async function unsubscribePriceAlert(listingId: string, email: string): Promise<void> {
  const res = await fetch(`/api/product/${encodeURIComponent(listingId)}/price-alert`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Failed to cancel price alert');
}
