import { useState } from 'react';
import { Sparkles, TrendingUp, Coins, AlertTriangle, Zap, type LucideIcon } from 'lucide-react';
import { BUILDER_CATALOG, type BuilderProduct } from './builderCatalog';
import { estimatePowerDraw, type BuildSelection } from './compatibility';
import { formatTaka } from './buildConfig';

interface Suggestion {
  id: string;
  icon: LucideIcon;
  message: string;
  apply: BuilderProduct;
}

function cheapest(products: BuilderProduct[]): BuilderProduct | undefined {
  return [...products].sort((a, b) => a.price - b.price)[0];
}

function getSuggestions(build: BuildSelection): Suggestion[] {
  const { cpu, gpu, ram, psu, cooling, motherboard } = build;
  const suggestions: Suggestion[] = [];

  // Bottleneck detection: GPU far ahead of CPU
  if (cpu && gpu && gpu.performanceScore - cpu.performanceScore >= 20) {
    const upgrade = cheapest(
      BUILDER_CATALOG.filter(
        (p) =>
          p.category === 'cpu' &&
          p.id !== cpu.id &&
          p.performanceScore >= gpu.performanceScore - 10 &&
          (!motherboard || p.socket === motherboard.socket),
      ),
    );
    if (upgrade) {
      suggestions.push({
        id: `bottleneck-${upgrade.id}`,
        icon: TrendingUp,
        message: `Your ${cpu.name} may bottleneck the ${gpu.name}. Consider upgrading to the ${upgrade.name}.`,
        apply: upgrade,
      });
    }
  }

  // Value optimization: cheaper RAM with near-identical performance
  if (ram) {
    const alt = cheapest(
      BUILDER_CATALOG.filter(
        (p) =>
          p.category === 'ram' &&
          p.ramType === ram.ramType &&
          p.price < ram.price &&
          p.performanceScore >= ram.performanceScore - 10,
      ),
    );
    if (alt) {
      suggestions.push({
        id: `value-${alt.id}`,
        icon: Coins,
        message: `Switching to ${alt.name} saves ${formatTaka(ram.price - alt.price)} with minimal performance difference.`,
        apply: alt,
      });
    }
  }

  // Missing component: high-TDP CPU without a cooler
  if (cpu && (cpu.tdp ?? 0) > 105 && !cooling) {
    const cooler = cheapest(
      BUILDER_CATALOG.filter(
        (p) => p.category === 'cooling' && p.performanceScore >= ((cpu.tdp ?? 0) > 200 ? 75 : 50),
      ),
    );
    if (cooler) {
      suggestions.push({
        id: `cooler-${cooler.id}`,
        icon: AlertTriangle,
        message: `Add a CPU cooler — the ${cpu.name} runs at ${cpu.tdp}W. The ${cooler.name} is a solid fit.`,
        apply: cooler,
      });
    }
  }

  // Missing component: no PSU for a power-hungry build
  if ((cpu || gpu) && !psu) {
    const draw = estimatePowerDraw(build);
    const unit = cheapest(
      BUILDER_CATALOG.filter((p) => p.category === 'psu' && (p.wattage ?? 0) >= draw * 1.3),
    );
    if (unit) {
      suggestions.push({
        id: `psu-${unit.id}`,
        icon: Zap,
        message: `Your build draws ~${draw}W but has no PSU yet. The ${unit.name} gives comfortable headroom.`,
        apply: unit,
      });
    }
  }

  return suggestions.slice(0, 3);
}

interface AIOptimizerProps {
  build: BuildSelection;
  onApply: (product: BuilderProduct) => void;
}

export default function AIOptimizer({ build, onApply }: AIOptimizerProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const suggestions = getSuggestions(build).filter((s) => !dismissed.has(s.id));

  return (
    <div className="glass-card ai-optimizer">
      <div className="ai-optimizer-header">
        <Sparkles size={18} />
        <h3>AI Build Optimizer</h3>
      </div>

      {suggestions.length > 0 ? (
        <div className="ai-suggestions">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <div key={suggestion.id} className="ai-suggestion">
                <Icon size={18} className="ai-suggestion-icon" />
                <p className="ai-suggestion-message">{suggestion.message}</p>
                <div className="ai-suggestion-actions">
                  <button
                    type="button"
                    className="button-primary ai-suggestion-apply"
                    onClick={() => onApply(suggestion.apply)}
                  >
                    Apply
                  </button>
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
