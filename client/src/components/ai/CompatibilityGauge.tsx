import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';

interface CompatibilityGaugeProps {
  score?: number; // 0 to 100
  estimatedWattage?: number;
  psuWattage?: number;
  socketStatus?: string;
  gpuClearance?: string;
}

export default function CompatibilityGauge({
  score = 98,
  estimatedWattage = 435,
  psuWattage = 750,
  socketStatus = 'Socket AM5 Matched',
  gpuClearance = 'GPU Clearance OK (340mm/400mm)',
}: CompatibilityGaugeProps) {
  // SVG Circle parameters
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine score color
  const getScoreColor = (val: number) => {
    if (val >= 90) return 'var(--green)';
    if (val >= 70) return 'var(--warning)';
    return 'var(--danger)';
  };

  const scoreColor = getScoreColor(score);
  const headroomPercent = Math.round(((psuWattage - estimatedWattage) / estimatedWattage) * 100);

  return (
    <div className="bg-fill-subtle rounded-2xl p-4 border border-glass-border">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Circular Compatibility Meter */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background track circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-border"
                strokeWidth="7"
                fill="none"
              />
              {/* Animated Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                stroke={scoreColor}
                strokeWidth="7"
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  strokeDasharray: circumference,
                  filter: `drop-shadow(0 0 6px ${scoreColor})`,
                }}
              />
            </svg>

            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-text-primary">{score}%</span>
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                Audited
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
              <ShieldCheck className="w-4 h-4 text-green" />
              <span>Full Compatibility</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 max-w-[170px] leading-snug">
              0 Hardware conflicts detected across all selected parts.
            </p>
          </div>
        </div>

        {/* Right: Wattage & TDP Summary */}
        <div className="flex flex-col items-end border-l border-glass-border pl-4">
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span>Power & TDP</span>
          </div>
          <div className="text-base font-extrabold text-accent mt-0.5">
            {estimatedWattage}W{' '}
            <span className="text-xs font-normal text-text-muted">/ {psuWattage}W</span>
          </div>
          <div className="text-[10px] text-green font-medium mt-0.5">
            +{headroomPercent}% Headroom
          </div>
        </div>
      </div>

      {/* Itemized Quick Checks */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-glass-border text-[11px]">
        <div className="flex items-center gap-1.5 text-text-secondary truncate">
          <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" />
          <span className="truncate">{socketStatus}</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary truncate">
          {score >= 90 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
          )}
          <span className="truncate">{gpuClearance}</span>
        </div>
      </div>
    </div>
  );
}
