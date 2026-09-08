import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listBuilds } from '../api/builds';
import { useAuth } from '../auth/useAuth';
import { estimateFps, GAME_BENCHMARKS } from '../components/builder/benchmarks';
import { formatTaka } from '../components/builder/buildConfig';
import { BUILD_PRESETS, resolvePreset } from '../components/builder/buildPresets';
import {
  ADDON_CATEGORIES,
  COMPONENT_CATEGORIES,
  type ComponentCategory,
} from '../components/builder/builderCatalog';
import {
  estimatePowerDraw,
  getBuildChecks,
  getCompatibilityScore,
  partIdsOf,
  selectionFromPartIds,
  totalPriceOf,
  type BuildSelection,
} from '../components/builder/compatibility';
import { useBuilderCatalog } from '../hooks/useBuilderCatalog';
import './BuildCheckoutPage.css';
import './BuildComparePage.css';
import './PCBuilderPage.css';

interface Source {
  id: string;
  name: string;
  partIds: string[];
}

/** Key for matching a URL part list back to a named source; order-insensitive. */
const keyOf = (ids: string[]) => [...ids].sort().join(',');

interface Metric {
  label: string;
  value: (b: BuildSelection) => number;
  format: (n: number) => string;
  /** Whether a larger number is the better one (drives the delta colour). */
  higherIsBetter: boolean;
}

const METRICS: Metric[] = [
  { label: 'Total price', value: totalPriceOf, format: formatTaka, higherIsBetter: false },
  {
    label: 'Compatibility',
    value: (b) => getCompatibilityScore(getBuildChecks(b)),
    format: (n) => `${n}%`,
    higherIsBetter: true,
  },
  {
    label: 'Power draw',
    value: estimatePowerDraw,
    format: (n) => `${n} W`,
    higherIsBetter: false,
  },
  ...GAME_BENCHMARKS.map<Metric>((game) => ({
    label: `${game.title} · 1440p`,
    value: (b) => estimateFps(b, game, '1440p'),
    format: (n) => (n ? `${n} fps` : '—'),
    higherIsBetter: true,
  })),
];

function Delta({ a, b, metric }: { a: number; b: number; metric: Metric }) {
  const diff = b - a;
  if (!diff || !a || !b) return <span className="compare-delta">—</span>;
  const better = metric.higherIsBetter ? diff > 0 : diff < 0;
  return (
    <span className={`compare-delta ${better ? 'is-good' : 'is-bad'}`}>
      {diff > 0 ? '+' : '−'}
      {metric.format(Math.abs(diff))}
    </span>
  );
}

export default function BuildComparePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const catalog = useBuilderCatalog();
  const { status } = useAuth();
  const { data: saved = [] } = useQuery({
    queryKey: ['my-builds'],
    queryFn: listBuilds,
    enabled: status === 'authenticated',
  });

  const sources = useMemo<Source[]>(
    () => [
      ...BUILD_PRESETS.map((p) => ({
        id: `preset:${p.id}`,
        name: p.name,
        partIds: partIdsOf(resolvePreset(p, catalog.products, catalog.byId)),
      })),
      ...saved.map((b) => ({ id: `saved:${b.id}`, name: b.name, partIds: b.partIds })),
    ],
    [catalog, saved],
  );

  const sides = (['a', 'b'] as const).map((key) => {
    const ids = params.get(key)?.split(',').filter(Boolean) ?? [];
    const source = sources.find((s) => keyOf(s.partIds) === keyOf(ids));
    return {
      key,
      ids,
      source,
      build: selectionFromPartIds(ids.join(','), catalog.byId),
      name: source?.name ?? (ids.length ? 'Custom build' : 'Pick a build'),
    };
  });
  const [a, b] = sides;

  const setSide = (key: 'a' | 'b', sourceId: string) => {
    const src = sources.find((s) => s.id === sourceId);
    const next = new URLSearchParams(params);
    if (src) next.set(key, src.partIds.join(','));
    else next.delete(key);
    setParams(next, { replace: true });
  };

  if (catalog.isLoading) return <p className="checkout-loading">Loading builds…</p>;

  const ready = a.ids.length > 0 && b.ids.length > 0;
  const rows = [
    ...COMPONENT_CATEGORIES,
    ...ADDON_CATEGORIES.filter((m) => a.build[m.id] || b.build[m.id]),
  ];

  return (
    <div className="pc-builder-page build-checkout-page build-compare-page">
      <section className="section builder-summary-section">
        <div className="container">
          <div className="checkout-header">
            <div>
              <h1 className="builder-section-title">
                Compare <span className="gradient-text">Builds</span>
              </h1>
              <p className="builder-section-subtitle">
                Parts, price, compatibility, power and estimated FPS — side by side. Choose a
                template or one of your saved builds for either column.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                navigate(a.ids.length ? `/pc-builder?parts=${a.ids.join(',')}` : '/pc-builder')
              }
            >
              <ArrowLeft size={16} /> Back to Builder
            </button>
          </div>

          <div className="glass-card parts-table-card">
            <table className="parts-table compare-table">
              <thead>
                <tr>
                  <th />
                  {sides.map((side) => (
                    <th key={side.key}>
                      <select
                        className="compare-select"
                        value={side.source?.id ?? (side.ids.length ? 'custom' : '')}
                        onChange={(e) => setSide(side.key, e.target.value)}
                        aria-label={`Build ${side.key.toUpperCase()}`}
                      >
                        <option value="" disabled>
                          Pick a build…
                        </option>
                        {side.ids.length > 0 && !side.source && (
                          <option value="custom">Custom build (current)</option>
                        )}
                        <optgroup label="Templates">
                          {sources
                            .filter((s) => s.id.startsWith('preset:'))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </optgroup>
                        {saved.length > 0 && (
                          <optgroup label="My saved builds">
                            {sources
                              .filter((s) => s.id.startsWith('saved:'))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                    </th>
                  ))}
                  <th className="compare-delta-col">B vs A</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const va = metric.value(a.build);
                  const vb = metric.value(b.build);
                  return (
                    <tr key={metric.label} className="compare-metric-row">
                      <td className="parts-table-category">{metric.label}</td>
                      <td className="parts-table-price">
                        {a.ids.length ? metric.format(va) : '—'}
                      </td>
                      <td className="parts-table-price">
                        {b.ids.length ? metric.format(vb) : '—'}
                      </td>
                      <td className="compare-delta-col">
                        {ready && <Delta a={va} b={vb} metric={metric} />}
                      </td>
                    </tr>
                  );
                })}
                {rows.map((meta) => {
                  const pa = a.build[meta.id as ComponentCategory];
                  const pb = b.build[meta.id as ComponentCategory];
                  const same = pa?.id === pb?.id;
                  return (
                    <tr key={meta.id} className={same ? undefined : 'compare-diff'}>
                      <td className="parts-table-category">{meta.label}</td>
                      {[pa, pb].map((p, i) => (
                        <td key={i} className={p ? 'parts-table-name' : 'parts-table-empty'}>
                          {p ? (
                            <>
                              {p.name}
                              <small className="compare-part-price">{formatTaka(p.price)}</small>
                            </>
                          ) : (
                            'Not selected'
                          )}
                        </td>
                      ))}
                      <td className="compare-delta-col">
                        {ready && !same && (
                          <Delta a={pa?.price ?? 0} b={pb?.price ?? 0} metric={METRICS[0]} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ready && (
            <div className="compare-actions">
              {sides.map((side) => (
                <button
                  key={side.key}
                  type="button"
                  className="button-secondary"
                  onClick={() => navigate(`/pc-builder?parts=${side.ids.join(',')}`)}
                >
                  <ArrowLeftRight size={15} /> Continue with {side.key.toUpperCase()} · {side.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
