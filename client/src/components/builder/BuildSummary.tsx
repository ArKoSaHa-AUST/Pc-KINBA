import { useEffect, useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import {
  Wallet,
  Zap,
  Gauge,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Circle,
} from 'lucide-react';
import type { ComponentCategory } from './builderCatalog';
import {
  estimatePowerDraw,
  getBuildChecks,
  getCompatibilityScore,
  type BuildSelection,
} from './compatibility';
import { formatTaka } from './buildConfig';
import MetricCard, { ProgressRing } from './MetricCard';
import PartsTable from './PartsTable';

interface BuildSummaryProps {
  build: BuildSelection;
  budget: [number, number];
  onOpenCategory: (category: ComponentCategory) => void;
  onRemove: (category: ComponentCategory) => void;
}

type Resolution = '1080p' | '1440p' | '4K';

const RESOLUTIONS: Resolution[] = ['1080p', '1440p', '4K'];
const RES_FACTOR: Record<Resolution, number> = { '1080p': 1, '1440p': 0.68, '4K': 0.42 };

// Baseline FPS for a 100-score GPU at 1080p
const GAMES = [
  { title: 'Cyberpunk 2077', base: 110 },
  { title: 'Valorant', base: 420 },
  { title: 'Elden Ring', base: 125 },
  { title: 'Fortnite', base: 240 },
];

function estimateFps(build: BuildSelection, game: (typeof GAMES)[number], res: Resolution) {
  const gpu = build.gpu;
  if (!gpu) return 0;
  const cpuFactor = build.cpu ? 0.6 + 0.4 * (build.cpu.performanceScore / 100) : 0.85;
  return Math.round(game.base * (gpu.performanceScore / 100) * RES_FACTOR[res] * cpuFactor);
}

function fpsTone(fps: number) {
  return fps > 60 ? 'is-good' : fps >= 30 ? 'is-warn' : 'is-bad';
}

const CHECK_ICONS = {
  compatible: <CheckCircle2 size={15} className="check-icon-good" />,
  warning: <AlertTriangle size={15} className="check-icon-warn" />,
  incompatible: <XCircle size={15} className="check-icon-bad" />,
  pending: <Circle size={15} className="check-icon-pending" />,
};

function AnimatedPrice({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => formatTaka(Math.round(v)));
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  return <motion.span className="gradient-text metric-price">{display}</motion.span>;
}

export default function BuildSummary({
  build,
  budget,
  onOpenCategory,
  onRemove,
}: BuildSummaryProps) {
  const [resolution, setResolution] = useState<Resolution>('1440p');

  const total = useMemo(
    () => Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0),
    [build],
  );
  const draw = estimatePowerDraw(build);
  const psuWattage = build.psu?.wattage ?? 0;
  const headroom = psuWattage > 0 ? (psuWattage - draw) / psuWattage : 0;
  const checks = useMemo(() => getBuildChecks(build), [build]);
  const score = getCompatibilityScore(checks);
  const withinBudget = total <= budget[1];

  return (
    <>
      <div className="metric-grid">
        <MetricCard icon={Wallet} title="Total Price">
          <div className="metric-price-row">
            <div className="metric-price-info">
              <AnimatedPrice value={total} />
              <span className={`metric-subtitle ${withinBudget ? 'is-good' : 'is-bad'}`}>
                {withinBudget ? 'within budget' : 'over budget'}
              </span>
            </div>
            <ProgressRing
              value={budget[1] > 0 ? total / budget[1] : 0}
              color={withinBudget ? 'var(--accent)' : 'var(--danger)'}
              size={84}
              label={<span>{Math.round((total / budget[1]) * 100)}%</span>}
            />
          </div>
        </MetricCard>

        <MetricCard icon={Zap} title="Power Consumption">
          <span className="metric-value">
            {draw} <small>W</small>
          </span>
          {psuWattage > 0 ? (
            <>
              <div className="headroom-bar">
                <div
                  className={`headroom-fill ${
                    headroom < 0 ? 'is-bad' : headroom < 0.2 ? 'is-warn' : 'is-good'
                  }`}
                  style={{ width: `${Math.min(100, (draw / psuWattage) * 100)}%` }}
                />
              </div>
              <span className="metric-subtitle">
                {headroom < 0
                  ? `PSU exceeded by ${draw - psuWattage}W`
                  : `${Math.round(headroom * 100)}% headroom on ${psuWattage}W PSU`}
              </span>
            </>
          ) : (
            <span className="metric-subtitle">Select a PSU to check headroom</span>
          )}
        </MetricCard>

        <MetricCard icon={Gauge} title="Estimated FPS">
          <div className="fps-res-toggle">
            {RESOLUTIONS.map((res) => (
              <button
                key={res}
                type="button"
                className={`builder-pill${resolution === res ? ' is-active' : ''}`}
                onClick={() => setResolution(res)}
              >
                {res}
              </button>
            ))}
          </div>
          {build.gpu ? (
            <div className="fps-bars">
              {GAMES.map((game) => {
                const fps = estimateFps(build, game, resolution);
                return (
                  <div key={game.title} className="fps-bar-row">
                    <span className="fps-game">{game.title}</span>
                    <div className="fps-bar-track">
                      <div
                        className={`fps-bar-fill ${fpsTone(fps)}`}
                        style={{ width: `${Math.min(100, (fps / 240) * 100)}%` }}
                      />
                    </div>
                    <span className={`fps-value ${fpsTone(fps)}`}>{fps}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="metric-subtitle">Select a GPU to estimate FPS</span>
          )}
        </MetricCard>

        <MetricCard icon={ShieldCheck} title="Compatibility Score">
          <div className="compat-score-row">
            <ProgressRing
              value={score / 100}
              color={`hsl(${score * 1.2}, 85%, 55%)`}
              size={84}
              label={<span>{score}%</span>}
            />
            <ul className="compat-checks">
              {checks.map((check) => (
                <li key={check.id} title={check.detail}>
                  {CHECK_ICONS[check.status]}
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </MetricCard>
      </div>

      <PartsTable build={build} onOpenCategory={onOpenCategory} onRemove={onRemove} />
    </>
  );
}
