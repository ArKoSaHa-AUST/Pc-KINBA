import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { formatTaka } from '../components/builder/buildConfig';
import {
  ADDON_CATEGORIES,
  COMPONENT_CATEGORIES,
  type BuilderProduct,
} from '../components/builder/builderCatalog';
import {
  estimatePowerDraw,
  getBuildChecks,
  getCompatibilityScore,
  selectionFromPartIds,
  totalPriceOf,
} from '../components/builder/compatibility';
import { useBuilderCatalog } from '../hooks/useBuilderCatalog';
import { sanitizeHref } from '../utils/image';
import './BuildCheckoutPage.css';
import './BuildQuotePage.css';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Printable quotation: what a buyer takes to the shop. `?print=1` opens the print dialog on load. */
export default function BuildQuotePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const catalog = useBuilderCatalog();
  const partIds = params.get('parts') ?? '';

  const build = useMemo(() => selectionFromPartIds(partIds, catalog.byId), [partIds, catalog.byId]);
  const rows = [...COMPONENT_CATEGORIES, ...ADDON_CATEGORIES]
    .map((meta) => ({ meta, part: build[meta.id] }))
    .filter((r): r is { meta: (typeof r)['meta']; part: BuilderProduct } => !!r.part);

  useEffect(() => {
    if (!catalog.isLoading && rows.length && params.get('print')) window.print();
  }, [catalog.isLoading, rows.length, params]);

  if (catalog.isLoading) return <p className="checkout-loading">Preparing your quote…</p>;
  if (rows.length === 0) return <Navigate to="/pc-builder" replace />;

  const total = totalPriceOf(build);
  const score = getCompatibilityScore(getBuildChecks(build));
  const today = new Date();
  // Same parts → same quote number, so a re-printed sheet is recognisable.
  const hash = [...partIds].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const quoteNo = `PK-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${hash.toString(36).toUpperCase().slice(-5)}`;
  const retailers = new Set(rows.map((r) => r.part.listings?.[0]?.retailer).filter(Boolean));

  return (
    <div className="quote-page">
      <div className="quote-toolbar">
        <button type="button" className="button-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <button type="button" className="button-primary" onClick={() => window.print()}>
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      <article className="quote-sheet">
        <header className="quote-header">
          <div>
            <div className="quote-brand">PC KINBA</div>
            <div className="quote-tagline">AI-powered PC builder · Bangladesh</div>
          </div>
          <dl className="quote-meta">
            <dt>Quotation</dt>
            <dd>{quoteNo}</dd>
            <dt>Date</dt>
            <dd>{dateFmt.format(today)}</dd>
            <dt>Parts</dt>
            <dd>
              {rows.length} · {score}% compatible · ~{estimatePowerDraw(build)} W
            </dd>
          </dl>
        </header>

        <table className="quote-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Part</th>
              <th>Retailer</th>
              <th className="is-num">Price (BDT)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ meta, part }, i) => {
              const offer = part.listings?.[0];
              return (
                <tr key={meta.id}>
                  <td>{i + 1}</td>
                  <td className="quote-category">{meta.label}</td>
                  <td>
                    <div className="quote-part">{part.name}</div>
                    <div className="quote-spec">{part.keySpec}</div>
                  </td>
                  <td className="quote-retailer">
                    {offer ? (
                      <a href={sanitizeHref(offer.url)} target="_blank" rel="noopener noreferrer">
                        {offer.retailer}
                      </a>
                    ) : (
                      <span className="quote-muted">Reference price</span>
                    )}
                  </td>
                  <td className="is-num">{formatTaka(part.price)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total</td>
              <td className="is-num quote-total">{formatTaka(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="quote-footer">
          <p>
            <strong>Prices valid as of {dateFmt.format(today)}.</strong> Each price is the lowest
            live listing scraped from{' '}
            {retailers.size
              ? `${retailers.size} Bangladeshi retailer${retailers.size > 1 ? 's' : ''} (${[...retailers].join(', ')})`
              : 'Bangladeshi retailers'}
            ; parts without a live listing show a reference price. Retail prices change daily —
            confirm stock and price with the shop before paying. Warranty terms are set by the
            selling retailer.
          </p>
        </div>
      </article>
    </div>
  );
}
