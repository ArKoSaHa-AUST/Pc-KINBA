import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Globe2, Info, Layers, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPublicBuilds } from '../api/builds';
import BuildDetailsModal, { type BuildDetails } from '../components/builder/BuildDetailsModal';
import { BUILD_PURPOSES, formatTaka } from '../components/builder/buildConfig';
import { BUILD_PRESETS, resolvePreset } from '../components/builder/buildPresets';
import type { BuilderProduct } from '../components/builder/builderCatalog';
import { partIdsOf, totalPriceOf } from '../components/builder/compatibility';
import { Badge } from '../components/ui/Badge';
import { useBuilderCatalog } from '../hooks/useBuilderCatalog';

interface BuildCardProps {
  build: BuildDetails;
  byId: Map<string, BuilderProduct>;
  onDetails: (build: BuildDetails) => void;
  delay?: number;
}

function BuildCard({ build, byId, onDetails, delay = 0 }: BuildCardProps) {
  const navigate = useNavigate();
  const { name, purpose, total, partIds, meta } = build;
  const parts = partIds.map((id) => byId.get(id)).filter((p): p is BuilderProduct => !!p);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay }}
      className="glass-card p-6 flex flex-col gap-4 hover:border-accent/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-text-primary truncate">{name}</h3>
          <p className="text-xs text-text-muted mt-1">{meta}</p>
        </div>
        {purpose && <Badge variant="accent">{purpose}</Badge>}
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {parts.slice(0, 5).map((p) => (
          <li
            key={p.id}
            className="px-2 py-0.5 rounded-md bg-fill-subtle border border-border text-[11px] text-text-muted"
          >
            {p.name}
          </li>
        ))}
        {parts.length > 5 && (
          <li className="px-2 py-0.5 text-[11px] text-text-muted">+{parts.length - 5} more</li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-border">
        <div>
          <div className="text-[11px] text-text-muted">Total</div>
          <div className="text-xl font-black text-accent">{formatTaka(total)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="button-secondary text-sm py-2.5 px-4"
            onClick={() => onDetails(build)}
          >
            <Info size={15} /> Details
          </button>
          <button
            type="button"
            className="button-primary text-sm py-2 px-5"
            onClick={() => navigate(`/pc-builder?parts=${partIds.join(',')}`)}
          >
            <span className="leading-tight text-left whitespace-nowrap">
              Start from
              <br />
              this build
            </span>
            <ArrowRight size={16} className="shrink-0" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function BuildLibraryPage() {
  const [purposeFilter, setPurposeFilter] = useState<string>('All');
  const [details, setDetails] = useState<BuildDetails | null>(null);
  const catalog = useBuilderCatalog();
  const { data: community = [], isLoading } = useQuery({
    queryKey: ['public-builds'],
    queryFn: () => listPublicBuilds(),
    staleTime: 60_000,
  });

  // Templates resolve to the cheapest live matches, so their totals track the market.
  const presets = useMemo(
    () =>
      BUILD_PRESETS.map((preset) => {
        const selection = resolvePreset(preset, catalog.products, catalog.byId);
        return {
          id: preset.id,
          details: {
            name: preset.name,
            purpose: preset.purpose,
            total: totalPriceOf(selection),
            partIds: partIdsOf(selection),
            meta: preset.tagline,
          } satisfies BuildDetails,
        };
      }),
    [catalog],
  );

  const filtered =
    purposeFilter === 'All' ? community : community.filter((b) => b.purpose === purposeFilter);

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      <section className="pt-10 pb-12">
        <div className="container">
          <Link
            to="/pc-builder"
            className="text-sm text-text-muted hover:text-accent transition-colors"
          >
            ← Back to PC Builder
          </Link>
          <h1 className="builder-section-title mt-3 mb-2">
            Build <span className="gradient-text">Library</span>
          </h1>
          <p className="builder-section-subtitle">
            Start from a curated template or a build shared by the community, then customise every
            part in the builder.
          </p>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <Sparkles className="w-5 h-5 text-accent" /> Starter Templates
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {presets.map((preset, i) => (
              <BuildCard
                key={preset.id}
                build={preset.details}
                byId={catalog.byId}
                onDetails={setDetails}
                delay={i * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="pb-32">
        <div className="container">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Globe2 className="w-5 h-5 text-purple" /> Community Builds
            </h2>
            <div className="flex flex-wrap gap-2">
              {['All', ...BUILD_PURPOSES].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurposeFilter(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    purposeFilter === p
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'border-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-text-muted">Loading community builds…</p>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
              <Layers className="w-8 h-8 text-text-muted" />
              <p className="text-sm text-text-muted max-w-md">
                No public builds {purposeFilter !== 'All' ? `for ${purposeFilter} ` : ''}yet. Save a
                build in the PC Builder, then publish it from your profile to share it here.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((b, i) => (
                <BuildCard
                  key={b.id}
                  build={{
                    name: b.name,
                    purpose: b.purpose,
                    total: b.totalPrice,
                    partIds: b.partIds,
                    meta: `${b.authorName || 'PC Kinba builder'} · ${new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
                  }}
                  byId={catalog.byId}
                  onDetails={setDetails}
                  delay={Math.min(i, 8) * 0.04}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <BuildDetailsModal build={details} onClose={() => setDetails(null)} />
    </div>
  );
}
