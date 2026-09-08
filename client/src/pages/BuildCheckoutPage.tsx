import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Printer,
  Share2,
  ShieldCheck,
  Store,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import PartsTable from '../components/builder/PartsTable';
import { formatTaka } from '../components/builder/buildConfig';
import {
  COMPONENT_CATEGORIES,
  type BuilderProduct,
  type ComponentCategory,
} from '../components/builder/builderCatalog';
import {
  getBuildChecks,
  getCompatibilityScore,
  partIdsOf,
  selectionFromPartIds,
  totalPriceOf,
  type BuildCheckStatus,
  type BuildSelection,
} from '../components/builder/compatibility';
import { useShareLink } from '../components/builder/useShareLink';
import { useBuilderCatalog } from '../hooks/useBuilderCatalog';
import { sanitizeHref } from '../utils/image';
import './BuildCheckoutPage.css';
import './PCBuilderPage.css';

const CHECK_ICONS: Record<BuildCheckStatus, React.ReactNode> = {
  compatible: <CheckCircle2 size={16} className="check-icon-good" />,
  warning: <AlertTriangle size={16} className="check-icon-warn" />,
  incompatible: <XCircle size={16} className="check-icon-bad" />,
  pending: <Circle size={16} className="check-icon-pending" />,
};

const searchUrl = (q: string) =>
  `https://www.startech.com.bd/product/search?search=${encodeURIComponent(q)}`;

interface StorePlan {
  retailer: string;
  /** Parts this store stocks, at this store's price. */
  covered: { part: BuilderProduct; price: number; url: string }[];
  total: number;
}

/** Every retailer that stocks at least one part, with what buying everything possible there would cost. */
function storePlans(parts: BuilderProduct[]): StorePlan[] {
  const byStore = new Map<string, StorePlan>();
  for (const part of parts) {
    for (const l of part.listings ?? []) {
      const plan = byStore.get(l.retailer) ?? { retailer: l.retailer, covered: [], total: 0 };
      if (!plan.covered.some((c) => c.part.id === part.id)) {
        plan.covered.push({ part, price: l.price, url: l.url });
        plan.total += l.price;
      }
      byStore.set(l.retailer, plan);
    }
  }
  return [...byStore.values()].sort(
    (a, b) => b.covered.length - a.covered.length || a.total - b.total,
  );
}

export default function BuildCheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const catalog = useBuilderCatalog();
  const [build, setBuild] = useState<BuildSelection | null>(null);
  const handleShare = useShareLink(build ?? {});

  useEffect(() => {
    if (!catalog.isLoading && !build) {
      setBuild(selectionFromPartIds(searchParams.get('parts'), catalog.byId));
    }
  }, [catalog.isLoading, catalog.byId, searchParams, build]);

  const parts = useMemo(
    () => Object.values(build ?? {}).filter((p): p is BuilderProduct => !!p),
    [build],
  );
  const plans = useMemo(() => storePlans(parts), [parts]);

  if (!build) return <p className="checkout-loading">Loading your build…</p>;
  if (parts.length === 0) return <Navigate to="/pc-builder" replace />;

  const total = totalPriceOf(build);
  const checks = getBuildChecks(build);
  const score = getCompatibilityScore(checks);
  const partIds = partIdsOf(build).join(',');
  const livePartCount = parts.filter((p) => p.listings?.length).length;
  const singleStore = plans.find((p) => p.covered.length === parts.length);
  const storesInMix = new Set(parts.map((p) => p.listings?.[0]?.retailer).filter(Boolean)).size;

  const goToBuilder = () => navigate(`/pc-builder?parts=${partIds}`);

  const handleRemove = (slot: ComponentCategory) => {
    const next = { ...build };
    delete next[slot];
    setBuild(next);
    setSearchParams({ parts: partIdsOf(next).join(',') }, { replace: true });
  };

  return (
    <div className="pc-builder-page build-checkout-page">
      <section className="section builder-summary-section">
        <div className="container">
          <div className="checkout-header">
            <div>
              <h1 className="builder-section-title">
                Finalize Your <span className="gradient-text">Build</span>
              </h1>
              <p className="builder-section-subtitle">
                {parts.length}/{COMPONENT_CATEGORIES.length} core components ·{' '}
                <strong className="checkout-total">{formatTaka(total)}</strong>
                {livePartCount > 0 &&
                  ` · lowest live prices across ${storesInMix} store${storesInMix > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="checkout-actions">
              <button type="button" className="button-secondary" onClick={goToBuilder}>
                <ArrowLeft size={16} /> Back to Builder
              </button>
              <button type="button" className="button-secondary" onClick={handleShare}>
                <Share2 size={16} /> Copy Share Link
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={() => navigate(`/pc-builder/quote?parts=${partIds}`)}
              >
                <Printer size={16} /> Quote Sheet
              </button>
            </div>
          </div>

          {/* Readiness checklist */}
          <div className="glass-card checkout-checklist">
            <div className="checkout-checklist-header">
              <ShieldCheck size={18} />
              <h2>Build Readiness</h2>
              <span
                className={`compat-badge ${
                  score >= 80
                    ? 'compat-compatible'
                    : score >= 50
                      ? 'compat-warning'
                      : 'compat-incompatible'
                }`}
              >
                {score}% compatible
              </span>
            </div>
            <ul>
              {checks
                .filter((c) => c.status !== 'pending')
                .map((check) => (
                  <li key={check.id}>
                    {CHECK_ICONS[check.status]}
                    <span className="checkout-check-label">{check.label}</span>
                    <span className="checkout-check-detail">{check.detail}</span>
                  </li>
                ))}
            </ul>
          </div>

          {/* Build recap */}
          <PartsTable build={build} onOpenCategory={goToBuilder} onRemove={handleRemove} />

          {/* Store strategy: one store vs. cheapest per part */}
          {plans.length > 0 && (
            <div className="glass-card checkout-strategy">
              <h2>
                <Store size={18} /> Where to Buy
              </h2>
              <div className="checkout-strategy-grid">
                <div className="checkout-strategy-option is-best">
                  <span className="checkout-strategy-label">
                    Mix &amp; match (cheapest per part)
                  </span>
                  <span className="checkout-strategy-total">{formatTaka(total)}</span>
                  <span className="checkout-strategy-note">
                    {storesInMix} store{storesInMix > 1 ? 's' : ''} ·{' '}
                    {storesInMix > 1 ? `${storesInMix} deliveries / pickups` : 'single delivery'}
                  </span>
                </div>
                {singleStore ? (
                  <div className="checkout-strategy-option">
                    <span className="checkout-strategy-label">All from {singleStore.retailer}</span>
                    <span className="checkout-strategy-total">
                      {formatTaka(singleStore.total)}
                      {singleStore.total > total && (
                        <small> +{formatTaka(singleStore.total - total)}</small>
                      )}
                    </span>
                    <span className="checkout-strategy-note">
                      1 store · single delivery &amp; warranty contact
                    </span>
                  </div>
                ) : (
                  <div className="checkout-strategy-option">
                    <span className="checkout-strategy-label">Single store</span>
                    <span className="checkout-strategy-total">—</span>
                    <span className="checkout-strategy-note">
                      No single retailer stocks every part. Best coverage: {plans[0].retailer} (
                      {plans[0].covered.length}/{parts.length} parts, {formatTaka(plans[0].total)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Per-part retailer offers */}
          <div className="glass-card checkout-retailers">
            <h2>Retailer Offers</h2>
            <p className="builder-section-subtitle">
              Cheapest store first. Prices are live listings scraped from Bangladeshi retailers.
            </p>
            <ul>
              {parts.map((part) => {
                const offers = part.listings ?? [];
                return (
                  <li key={part.id}>
                    <span className="checkout-retailer-part">
                      {part.name}
                      {offers.length > 1 && (
                        <small>
                          {' '}
                          · saves {formatTaka(offers[offers.length - 1].price - offers[0].price)} vs
                          priciest store
                        </small>
                      )}
                    </span>
                    <span className="checkout-retailer-links">
                      {offers.length > 0 ? (
                        offers.slice(0, 4).map((l, i) => (
                          <a
                            key={l.id}
                            href={sanitizeHref(l.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={i === 0 ? 'is-cheapest' : undefined}
                          >
                            {l.retailer} · {formatTaka(l.price)} <ExternalLink size={12} />
                          </a>
                        ))
                      ) : (
                        <a href={searchUrl(part.name)} target="_blank" rel="noopener noreferrer">
                          Search Star Tech <ExternalLink size={12} />
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
