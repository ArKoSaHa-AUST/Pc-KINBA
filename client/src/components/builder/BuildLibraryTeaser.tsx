import { ArrowRight, Library } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BuilderCatalog } from '../../hooks/useBuilderCatalog';
import { formatTaka } from './buildConfig';
import { BUILD_PRESETS, resolvePreset, type BuildPreset } from './buildPresets';
import { totalPriceOf } from './compatibility';

interface BuildLibraryTeaserProps {
  catalog: BuilderCatalog;
  onApplyPreset: (preset: BuildPreset) => void;
}

/** Quick-start templates plus the entry point to the full Build Library. */
export default function BuildLibraryTeaser({ catalog, onApplyPreset }: BuildLibraryTeaserProps) {
  const navigate = useNavigate();
  const totals = useMemo(
    () =>
      new Map(
        BUILD_PRESETS.map((p) => [
          p.id,
          totalPriceOf(resolvePreset(p, catalog.products, catalog.byId)),
        ]),
      ),
    [catalog],
  );

  return (
    <div className="glass-card p-6 md:p-8 mt-10 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-text-primary">
            <Library className="w-5 h-5 text-accent" /> Build Library
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            Not sure where to begin? Load a curated template below, or browse builds published by
            the community and customise any of them.
          </p>
        </div>
        <button
          type="button"
          className="button-secondary text-sm py-2 px-4"
          onClick={() => navigate('/pc-builder/library')}
        >
          Browse Build Library <ArrowRight size={15} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {BUILD_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset)}
            className="group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-fill-subtle hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer text-left"
          >
            <span className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
              {preset.name}
            </span>
            <span className="text-xs font-bold text-accent">
              {formatTaka(totals.get(preset.id) ?? 0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
