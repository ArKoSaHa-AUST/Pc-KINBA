/**
 * PC-KINBA Price Insights & Buy Signal Heuristics
 * Calculates best time to buy based on historical price ranges and short-term trends.
 */

/**
 * Derives a buy signal ('buy' | 'fair' | 'wait' | 'neutral') and plain-language reason.
 * 
 * @param {Array<{ date: string, price: number }>} points - Historical price points
 * @param {number} current - Current lowest price
 * @param {number} lowest - Window's lowest price
 * @param {number} highest - Window's highest price
 * @param {number} [days=30] - History window in days
 * @returns {{ signal: "buy" | "fair" | "wait" | "neutral", reason: string }}
 */
export function deriveBuySignal(points = [], current = 0, lowest = 0, highest = 0, days = 30) {
  if (current <= 0 || !Array.isArray(points) || points.length < 2) {
    return { signal: "neutral", reason: "Not enough price history yet to judge timing." };
  }

  const range = highest - lowest;
  const position = range > 0 ? (current - lowest) / range : 0;
  const weekAgo = Date.now() - 7 * 86400000;
  const ref = [...points].reverse().find(p => Date.parse(p.date) < weekAgo) ?? points[0];
  const trendPct = ref && ref.price > 0 ? ((current - ref.price) / ref.price) * 100 : 0;

  if (position <= 0.1) {
    return { signal: "buy", reason: `At its lowest price in ${days} days — a strong time to buy.` };
  }
  if (trendPct <= -3) {
    return { signal: "wait", reason: `Down ${Math.abs(trendPct).toFixed(1)}% this week and still falling — it may drop further.` };
  }
  if (position >= 0.6) {
    return { signal: "wait", reason: `৳${Math.round(current - lowest).toLocaleString("en-IN")} above its ${days}-day low — wait for a better deal.` };
  }
  return { signal: "fair", reason: "Close to its recent low with stable pricing — a fair time to buy." };
}

/**
 * Calculates a quick buy signal for a candidate product when full history array is not loaded.
 * 
 * @param {number} currentPrice 
 * @param {number|null} [discountPrice] 
 * @param {number|null} [originalPrice] 
 * @returns {"buy" | "fair" | "wait" | "neutral"}
 */
export function getQuickBuySignal(currentPrice, discountPrice, originalPrice) {
  if (!currentPrice || currentPrice <= 0) return "neutral";
  if (discountPrice && discountPrice < currentPrice) {
    return "buy";
  }
  if (originalPrice && originalPrice > currentPrice * 1.05) {
    return "buy";
  }
  return "fair";
}
