import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  BadgeCheck,
  Coins,
  ExternalLink,
  Hourglass,
  Sparkles,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { fetchBuySignal } from '../../api/priceHistory';
import type { BuildPurpose } from './buildConfig';
import type { BuilderProduct, ComponentCategory } from './builderCatalog';
import type { BuildSelection } from './compatibility';
import { getSuggestions, type SuggestionKind } from './optimizerRules';

const ICONS: Record<SuggestionKind, LucideIcon> = {
  downgrade: TrendingDown,
  bottleneck: TrendingUp,
  missing: AlertTriangle,
  value: Coins,
  buy: BadgeCheck,
  wait: Hourglass,
};

/** Price history is only fetched for the priciest live parts — that's where timing matters. */
const SIGNAL_PARTS = 3;

interface AIOptimizerProps {
  build: BuildSelection;
  budget: number;
  purpose: BuildPurpose;
  catalog: BuilderProduct[];
  onApply: (slot: ComponentCategory, product: BuilderProduct) => void;
}

export default function AIOptimizer({
  build,
  budget,
  purpose,
  catalog,
  onApply,
}: AIOptimizerProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const liveParts = Object.values(build)
    .filter((p): p is BuilderProduct => !!p?.listings?.[0])
    .sort((a, b) => b.price - a.price)
    .slice(0, SIGNAL_PARTS);
  const signalQueries = useQueries({
    queries: liveParts.map((p) => ({
      queryKey: ['buy-signal', p.listings![0].id],
      queryFn: () => fetchBuySignal(p.listings![0].id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const signals = Object.fromEntries(liveParts.map((p, i) => [p.id, signalQueries[i].data]));

  const suggestions = getSuggestions({ build, budget, purpose, catalog, signals }).filter(
    (s) => !dismissed.has(s.id),
  );

  return (
    <div className="glass-card ai-optimizer">
      <div className="ai-optimizer-header">
        <Sparkles size={18} />
        <h3>AI Build Optimizer</h3>
      </div>

      {suggestions.length > 0 ? (
        <div className="ai-suggestions">
          {suggestions.map((suggestion) => {
            const Icon = ICONS[suggestion.kind];
            return (
              <div key={suggestion.id} className={`ai-suggestion is-${suggestion.kind}`}>
                <Icon size={18} className="ai-suggestion-icon" />
                <p className="ai-suggestion-message">{suggestion.message}</p>
                <div className="ai-suggestion-actions">
                  {suggestion.apply && (
                    <button
                      type="button"
                      className="button-primary ai-suggestion-apply"
                      onClick={() => onApply(suggestion.apply!.slot, suggestion.apply!.product)}
                    >
                      Apply
                    </button>
                  )}
                  {suggestion.href && (
                    <a
                      className="button-primary ai-suggestion-apply"
                      href={suggestion.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Buy now <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    type="button"
                    className="ai-suggestion-dismiss"
                    onClick={() => setDismissed(new Set([...dismissed, suggestion.id]))}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="ai-optimizer-empty">
          {Object.keys(build).length === 0
            ? 'Start picking parts and I’ll suggest optimizations in real time.'
            : 'Your build looks well balanced — no optimizations needed right now.'}
        </p>
      )}
    </div>
  );
}
