import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Circle,
    ExternalLink,
    Printer,
    Share2,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import PartsTable from '../components/builder/PartsTable';
import { formatTaka } from '../components/builder/buildConfig';
import { COMPONENT_CATEGORIES, type ComponentCategory } from '../components/builder/builderCatalog';
import {
    getBuildChecks,
    getCompatibilityScore,
    selectionFromPartIds,
    type BuildCheckStatus,
    type BuildSelection,
} from '../components/builder/compatibility';
import { useToast } from '../components/ui/useToast';
import './BuildCheckoutPage.css';
import './PCBuilderPage.css';

const RETAILERS = [
  {
    name: 'Star Tech',
    searchUrl: (q: string) =>
      `https://www.startech.com.bd/product/search?search=${encodeURIComponent(q)}`,
  },
  {
    name: 'Ryans',
    searchUrl: (q: string) => `https://www.ryans.com/search?q=${encodeURIComponent(q)}`,
  },
];

const CHECK_ICONS: Record<BuildCheckStatus, React.ReactNode> = {
  compatible: <CheckCircle2 size={16} className="check-icon-good" />,
  warning: <AlertTriangle size={16} className="check-icon-warn" />,
  incompatible: <XCircle size={16} className="check-icon-bad" />,
  pending: <Circle size={16} className="check-icon-pending" />,
};

export default function BuildCheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [build, setBuild] = useState<BuildSelection>(() =>
    selectionFromPartIds(searchParams.get('parts')),
  );

  const parts = Object.values(build).filter((p) => p !== undefined);
  if (parts.length === 0) {
    return <Navigate to="/pc-builder" replace />;
  }

  const total = parts.reduce((sum, p) => sum + p.price, 0);
  const checks = getBuildChecks(build);
  const score = getCompatibilityScore(checks);
  const partIds = parts.map((p) => p.id).join(',');

  const goToBuilder = () => navigate(`/pc-builder?parts=${partIds}`);

  const handleRemove = (category: ComponentCategory) => {
    const next = { ...build };
    delete next[category];
    setBuild(next);
    const ids = Object.values(next)
      .filter((p) => p !== undefined)
      .map((p) => p.id);
    setSearchParams({ parts: ids.join(',') }, { replace: true });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pc-builder?parts=${partIds}`);
      toast({ message: 'Share link copied to clipboard!', variant: 'success' });
    } catch {
      toast({ message: 'Could not copy the link — clipboard unavailable.', variant: 'danger' });
    }
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
                {parts.length}/{COMPONENT_CATEGORIES.length} components ·{' '}
                <strong className="checkout-total">{formatTaka(total)}</strong>
              </p>
            </div>
            <div className="checkout-actions">
              <button type="button" className="button-secondary" onClick={goToBuilder}>
                <ArrowLeft size={16} /> Back to Builder
              </button>
              <button type="button" className="button-secondary" onClick={handleShare}>
                <Share2 size={16} /> Copy Share Link
              </button>
              <button type="button" className="button-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print Summary
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
              {checks.map((check) => (
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

          {/* Retailer handoff */}
          <div className="glass-card checkout-retailers">
            <h2>Where to Buy</h2>
            <p className="builder-section-subtitle">
              Search each part at Bangladesh's major retailers to complete your purchase.
            </p>
            <ul>
              {parts.map((part) => (
                <li key={part.id}>
                  <span className="checkout-retailer-part">{part.name}</span>
                  <span className="checkout-retailer-links">
                    {RETAILERS.map((retailer) => (
                      <a
                        key={retailer.name}
                        href={retailer.searchUrl(part.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {retailer.name} <ExternalLink size={12} />
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
