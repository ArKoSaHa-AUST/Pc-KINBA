import { useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, type MotionStyle } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  BUDGET_MIN,
  BUDGET_MAX,
  BUDGET_STEP,
  BUILD_PURPOSES,
  formatTaka,
  type BuildPurpose,
} from './buildConfig';
import './BuilderHero.css';

interface BuilderHeroProps {
  budget: [number, number];
  onBudgetChange: (budget: [number, number]) => void;
  purpose: BuildPurpose;
  onPurposeChange: (purpose: BuildPurpose) => void;
  onStartBuilding: () => void;
}

const RIG_PARTS = [
  { id: 'mobo', label: 'Motherboard' },
  { id: 'cpu', label: 'CPU' },
  { id: 'gpu', label: 'GPU' },
  { id: 'ram-a', label: 'RAM' },
  { id: 'ram-b', label: 'RAM' },
  { id: 'cooler', label: 'Cooling' },
] as const;

export default function BuilderHero({
  budget,
  onBudgetChange,
  purpose,
  onPurposeChange,
  onStartBuilding,
}: BuilderHeroProps) {
  // Parallax mouse tracking (springed for smoothness)
  const pointerX = useSpring(0, { stiffness: 60, damping: 16 });
  const pointerY = useSpring(0, { stiffness: 60, damping: 16 });
  const rigRotateY = useTransform(pointerX, [-1, 1], [-32, -4]);
  const rigRotateX = useTransform(pointerY, [-1, 1], [62, 46]);

  // Scroll-down collapse: exploded (1) -> assembled (0)
  const { scrollY } = useScroll();
  const explode = useTransform(scrollY, [0, 520], [1, 0]);
  const titleOpacity = useTransform(scrollY, [0, 380], [1, 0]);
  const titleScale = useTransform(scrollY, [0, 380], [1, 0.92]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
      pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
    },
    [pointerX, pointerY],
  );

  const handleMouseLeave = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  const [minBudget, maxBudget] = budget;
  const range = BUDGET_MAX - BUDGET_MIN;
  const minPct = ((minBudget - BUDGET_MIN) / range) * 100;
  const maxPct = ((maxBudget - BUDGET_MIN) / range) * 100;

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(event.target.value), maxBudget - BUDGET_STEP);
    onBudgetChange([value, maxBudget]);
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(event.target.value), minBudget + BUDGET_STEP);
    onBudgetChange([minBudget, value]);
  };

  // Cast needed: MotionStyle does not type CSS custom properties
  const rigStyle = {
    rotateX: rigRotateX,
    rotateY: rigRotateY,
    '--explode': explode,
  } as MotionStyle;

  return (
    <section className="builder-hero" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="builder-hero-orbs" aria-hidden="true">
        <div className="hero-orb hero-orb-accent" />
        <div className="hero-orb hero-orb-purple" />
        <div className="hero-orb hero-orb-green" />
      </div>

      <div className="builder-hero-inner container">
        <motion.div
          className="builder-hero-copy"
          style={{ opacity: titleOpacity, scale: titleScale }}
        >
          <h1 className="builder-hero-title">
            Build Your Dream <span className="gradient-text">Rig</span>
          </h1>
          <p className="builder-hero-subtitle">
            Select components, visualize in 3D, and optimize with AI — all in real time.
          </p>

          <div className="builder-budget glass-card">
            <div className="builder-budget-header">
              <span className="builder-budget-label">Budget</span>
              <span className="builder-budget-value gradient-text-alt">
                {formatTaka(minBudget)} — {formatTaka(maxBudget)}
              </span>
            </div>
            <div className="builder-budget-track">
              <div
                className="builder-budget-fill"
                style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
              />
              <input
                type="range"
                className="builder-budget-thumb"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={minBudget}
                onChange={handleMinChange}
                aria-label="Minimum budget"
              />
              <input
                type="range"
                className="builder-budget-thumb"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={maxBudget}
                onChange={handleMaxChange}
                aria-label="Maximum budget"
              />
            </div>
          </div>

          <div className="builder-purpose" role="radiogroup" aria-label="Build purpose">
            {BUILD_PURPOSES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={purpose === item}
                className={`builder-purpose-pill${purpose === item ? ' is-active' : ''}`}
                onClick={() => onPurposeChange(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="button-primary builder-hero-cta"
            onClick={onStartBuilding}
          >
            Start Building <ArrowRight size={18} />
          </button>
        </motion.div>

        <div className="builder-hero-stage" aria-hidden="true">
          <motion.div className="builder-rig" style={rigStyle}>
            {RIG_PARTS.map((part) => (
              <div key={part.id} className={`rig-part rig-part-${part.id}`}>
                <div className="rig-part-body">
                  <span className="rig-part-label">{part.label}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="builder-hero-scroll-hint">Scroll to assemble</div>
    </section>
  );
}
