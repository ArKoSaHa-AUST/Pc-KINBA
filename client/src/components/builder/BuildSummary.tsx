import { motion, useSpring, useTransform } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Gauge,
  ShieldCheck,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  estimateFps,
  GAME_BENCHMARKS,
  ML_WORKLOADS,
  MODE_FOR_PURPOSE,
  PERF_MODES,
  RENDER_WORKLOADS,
  RESOLUTIONS,
  renderTimeIndex,
  vramFit,
  type PerfMode,
  type Resolution,
  type VramFit,
} from './benchmarks';
import { formatTaka, type BuildPurpose } from './buildConfig';
import type { ComponentCategory } from './builderCatalog';
import {
  estimatePowerDraw,
  getBuildChecks,
  getCompatibilityScore,
  type BuildSelection,
} from './compatibility';
import MetricCard, { ProgressRing } from './MetricCard';
import PartsTable from './PartsTable';

interface BuildSummaryProps {
  build: BuildSelection;
  budget: [number, number];
  purpose: BuildPurpose;
  onOpenCategory: (category: ComponentCategory) => void;
  onRemove: (category: ComponentCategory) => void;
}

function fpsTone(fps: number) {
  return fps > 60 ? 'is-good' : fps >= 30 ? 'is-warn' : 'is-bad';
}

function renderTone(index: number) {
  return index <= 1.5 ? 'is-good' : index <= 2.5 ? 'is-warn' : 'is-bad';
}

const VRAM_FIT: Record<VramFit, { tone: string; label: string }> = {
  fits: { tone: 'is-good', label: 'Fits' },
  tight: { tone: 'is-warn', label: 'Tight' },
  no: { tone: 'is-bad', label: 'Too small' },
};

const PERF_NOTE: Record<PerfMode, string> = {
  gaming: 'Indicative — tier-based estimate, not a measured benchmark.',
  creator: 'Indicative — time vs. a flagship reference (1.0×), lower is better.',
  ml: 'Indicative — VRAM needed for quantised local inference / training.',
};

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
  purpose,
  onOpenCategory,
  onRemove,
}: BuildSummaryProps) {
  const [resolution, setResolution] = useState<Resolution>('1440p');
  // Purpose picks the default mode; a manual pick sticks until the purpose changes again.
  const [modeOverride, setModeOverride] = useState<{ purpose: BuildPurpose; mode: PerfMode }>();
  const mode = modeOverride?.purpose === purpose ? modeOverride.mode : MODE_FOR_PURPOSE[purpose];
  const perfTitle = PERF_MODES.find((m) => m.id === mode)!.title;
  const vramGb = build.gpu?.vramGb;

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

        <MetricCard icon={Gauge} title={perfTitle} className="metric-card-fps">
          <div className="fps-res-toggle">
            {PERF_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`builder-pill${mode === m.id ? ' is-active' : ''}`}
                onClick={() => setModeOverride({ purpose, mode: m.id })}
              >
                {m.label}
              </button>
            ))}
            {mode === 'gaming' && (
              <>
                <span className="builder-pill-divider" />
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
              </>
            )}
          </div>

          {mode === 'gaming' &&
            (build.gpu ? (
              <div className="fps-bars">
                {GAME_BENCHMARKS.map((game) => {
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
            ))}

          {mode === 'creator' &&
            (build.cpu || build.gpu ? (
              <div className="fps-bars">
                {RENDER_WORKLOADS.map((w) => {
                  const index = renderTimeIndex(build, w);
                  return (
                    <div key={w.title} className="fps-bar-row">
                      <span className="fps-game">{w.title}</span>
                      <div className="fps-bar-track">
                        {index > 0 && (
                          <div
                            className={`fps-bar-fill ${renderTone(index)}`}
                            style={{ width: `${Math.min(100, 100 / index)}%` }}
                          />
                        )}
                      </div>
                      <span className={`fps-value ${index > 0 ? renderTone(index) : ''}`}>
                        {index > 0 ? `${index}×` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="metric-subtitle">Select a CPU or GPU to estimate render times</span>
            ))}

          {mode === 'ml' &&
            (vramGb ? (
              <div className="fps-bars">
                {ML_WORKLOADS.map((w) => {
                  const fit = VRAM_FIT[vramFit(vramGb, w)];
                  return (
                    <div key={w.title} className="fps-bar-row">
                      <span className="fps-game">{w.title}</span>
                      <div className="fps-bar-track">
                        <div
                          className={`fps-bar-fill ${fit.tone}`}
                          style={{ width: `${Math.min(100, (vramGb / w.vramGb) * 100)}%` }}
                        />
                      </div>
                      <span className={`fps-value ${fit.tone}`}>{fit.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="metric-subtitle">
                {build.gpu ? 'VRAM unknown for this GPU' : 'Select a GPU to check VRAM fit'}
              </span>
            ))}

          <span className="metric-subtitle">
            {mode === 'ml' && vramGb ? `${vramGb} GB VRAM · ` : ''}
            {PERF_NOTE[mode]}
          </span>
        </MetricCard>

        <MetricCard icon={ShieldCheck} title="Compatibility Score" className="metric-card-compat">
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
