import { useState } from 'react';
import { Store, ExternalLink, RefreshCw, Clock, ShieldCheck, Tag, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CompareProduct } from '../../types/compare';

interface RetailerPriceMatrixProps {
  slots: (CompareProduct | null)[];
  onRefreshPrices?: () => void;
  isRefreshing?: boolean;
}

export const RetailerPriceMatrix = ({
  slots,
  onRefreshPrices,
  isRefreshing = false,
}: RetailerPriceMatrixProps) => {
  const { t } = useTranslation('compare');
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const activeProducts = slots.filter((p): p is CompareProduct => p !== null);

  if (activeProducts.length === 0) return null;

  const handleRefresh = () => {
    if (onRefreshPrices) {
      onRefreshPrices();
      setLastRefreshed('Just now');
    }
  };

  const formatPrice = (val: number | null) => {
    if (val === null) return null;
    return `৳ ${val.toLocaleString('en-BD')}`;
  };

  const retailersList: {
    name: string;
    slug: 'startech' | 'ryans' | 'techland';
    website: string;
  }[] = [
    { name: 'Star Tech', slug: 'startech', website: 'startech.com.bd' },
    { name: 'Ryans Computers', slug: 'ryans', website: 'ryans.com' },
    { name: 'Techland BD', slug: 'techland', website: 'techlandbd.com' },
  ];

  return (
    <div className="w-full rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>Bangladeshi Retailer Live Aggregator</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            Multi-Seller Price & Stock Matrix
          </h3>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Real-time price comparisons and live inventory status sourced from verified local
            retailers.
          </p>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span>Synced: {lastRefreshed}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/40 text-text-primary hover:text-accent transition-all disabled:opacity-50"
            title="Refresh Live Retailer Prices"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Prices'}</span>
          </button>
        </div>
      </div>

      {/* Retailers Table Grid */}
      <div className="overflow-x-auto custom-compare-scroll pb-2">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase font-bold text-text-muted">
              <th className="py-3 px-4 w-[240px]">Verified Retailer</th>
              {slots.slice(0, 3).map((prod, idx) => (
                <th key={idx} className="py-3 px-4">
                  {prod ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-accent">
                        Slot {idx + 1}
                      </span>
                      <span className="text-white truncate max-w-[200px]">{prod.name}</span>
                    </div>
                  ) : (
                    <span className="text-text-muted/40">Slot {idx + 1} (Empty)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {retailersList.map((retailer) => (
              <tr key={retailer.slug} className="hover:bg-white/[0.02] transition-colors">
                {/* Retailer Info */}
                <td className="py-4 px-4 align-top">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-accent font-bold text-xs">
                      {retailer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{retailer.name}</div>
                      <div className="text-xs text-text-muted">{retailer.website}</div>
                    </div>
                  </div>
                </td>

                {/* Product Slot Retailer Prices */}
                {slots.slice(0, 3).map((prod, pIdx) => {
                  if (!prod) {
                    return (
                      <td
                        key={pIdx}
                        className="py-4 px-4 text-xs font-mono text-text-muted/30 align-top"
                      >
                        —
                      </td>
                    );
                  }

                  const info = prod.retailers.find((r) => r.retailerSlug === retailer.slug);

                  // Calculate if this retailer has the lowest price
                  const validPrices = prod.retailers
                    .map((r) => r.priceBDT)
                    .filter((p): p is number => p !== null && p > 0);
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
                  const isLowest = info?.priceBDT && info.priceBDT === minPrice;

                  if (!info) {
                    return (
                      <td key={pIdx} className="py-4 px-4 text-xs text-text-muted/50 align-top">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-text-muted/40" />
                          <span>Not Cataloged</span>
                        </span>
                      </td>
                    );
                  }

                  return (
                    <td key={pIdx} className="py-4 px-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        {/* Price Row */}
                        <div className="flex items-baseline gap-2">
                          {info.priceBDT ? (
                            <span className="text-base font-black font-mono text-accent">
                              {formatPrice(info.priceBDT)}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-warning">
                              {t('slots.priceWithheld', 'Price Withheld')}
                            </span>
                          )}

                          {isLowest && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Lowest Price</span>
                            </span>
                          )}
                        </div>

                        {/* Stock & Warranty Row */}
                        <div className="flex items-center gap-2 text-xs">
                          {info.inStock ? (
                            <span className="text-[11px] font-semibold text-emerald-400">
                              ● In Stock
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-danger">
                              ● Out of Stock
                            </span>
                          )}

                          {info.warranty && (
                            <span className="text-[11px] text-text-muted flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-text-muted/60" />
                              <span>{info.warranty}</span>
                            </span>
                          )}
                        </div>

                        {/* Direct Store Link Button */}
                        <a
                          href={info.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-accent transition-colors mt-0.5"
                        >
                          <span>Visit Store Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
