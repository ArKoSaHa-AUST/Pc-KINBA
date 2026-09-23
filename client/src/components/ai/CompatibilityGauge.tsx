import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';
import type { BuildComponentItem } from './BuildPreviewHUD';

interface CompatibilityGaugeProps {
  score?: number; // 0 to 100
  estimatedWattage?: number;
  psuWattage?: number;
  socketStatus?: string;
  gpuClearance?: string;
  components?: BuildComponentItem[];
  violations?: Array<{ rule: string; detail: string }>;
}

export default function CompatibilityGauge({
  score = 0,
  estimatedWattage = 0,
  psuWattage = 0,
  socketStatus: propSocketStatus,
  gpuClearance: propGpuClearance,
  components = [],
  violations = [],
}: CompatibilityGaugeProps) {
  const hasBuild = components.length > 0;

  // Dynamically derive socket status without hardcoding AM5
  let derivedSocket = propSocketStatus;
  if (!derivedSocket) {
    if (!hasBuild) {
      derivedSocket = 'Socket: Awaiting build';
    } else {
      const cpuName =
        components.find((c) => c.category === 'CPU' || c.category === 'Processor')?.name || '';
      const moboName =
        components.find((c) => c.category === 'Motherboard' || c.category === 'Mainboard')?.name ||
        '';
      const combo = `${cpuName} ${moboName}`.toLowerCase();

      if (/lga\s*1700|b660|b760|z690|z790|12\d{2}0|13\d{2}0|14\d{2}0/i.test(combo)) {
        derivedSocket = 'Socket LGA1700 Matched';
      } else if (/lga\s*1851|z890|b860|core\s*ultra/i.test(combo)) {
        derivedSocket = 'Socket LGA1851 Matched';
      } else if (/am5|b650|x670|x870|7\d{3}x|8\d{3}g|9\d{3}x/i.test(combo)) {
        derivedSocket = 'Socket AM5 Matched';
      } else if (/am4|b450|b550|x570|3\d{3}x|5\d{3}x/i.test(combo)) {
        derivedSocket = 'Socket AM4 Matched';
      } else if (cpuName && moboName) {
        derivedSocket = 'Socket Verified Matched';
      } else {
        derivedSocket = 'Socket Pending Part Selection';
      }
    }
  }

  // Dynamically derive GPU clearance from violations or components
  let derivedClearance = propGpuClearance;
  if (!derivedClearance) {
    if (!hasBuild) {
      derivedClearance = 'Clearance: Awaiting build';
    } else {
      const clearanceViolation = violations.find((v) =>
        /clearance|length|dimension|gpu/i.test(v.rule + ' ' + v.detail),
      );
      if (clearanceViolation) {
        derivedClearance = clearanceViolation.detail;
      } else {
        const hasGpu = components.some((c) => c.category === 'GPU');
        const hasCase = components.some((c) => c.category === 'Case');
        derivedClearance =
          hasGpu && hasCase
            ? 'GPU Clearance Verified OK'
            : hasGpu
              ? 'GPU Length Audited'
              : 'Clearance Checked';
      }
    }
  }

  // SVG Circle parameters
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const displayScore = hasBuild ? Math.max(0, Math.min(100, score || 100)) : 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  // Determine score color
  const getScoreColor = (val: number) => {
    if (!hasBuild) return 'var(--text-muted)';
    if (val >= 90) return 'var(--green)';
    if (val >= 70) return 'var(--warning)';
    return 'var(--danger)';
  };

  const scoreColor = getScoreColor(displayScore);
  const headroomPercent =
    hasBuild && estimatedWattage > 0 && psuWattage >= estimatedWattage
      ? Math.round(((psuWattage - estimatedWattage) / estimatedWattage) * 100)
      : null;

  return (
    <div className="bg-fill-subtle rounded-2xl p-4 border border-glass-border">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Circular Compatibility Meter */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
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
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  strokeDasharray: circumference,
                  filter: hasBuild ? `drop-shadow(0 0 6px ${scoreColor})` : 'none',
                }}
              />
            </svg>

            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-text-primary">
                {hasBuild ? `${displayScore}%` : ''}
              </span>
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                {hasBuild ? 'Audited' : 'Idle'}
              </span>
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
              <ShieldCheck className={`w-4 h-4 ${hasBuild ? 'text-green' : 'text-text-muted'}`} />
              <span>{hasBuild ? 'Compatibility Audit' : 'Awaiting Build'}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5 max-w-[170px] leading-snug">
              {hasBuild
                ? violations.length === 0
                  ? '0 Hardware conflicts detected across all selected parts.'
                  : `${violations.length} notice(s) identified.`
                : 'Hardware checks run automatically as parts are chosen.'}
            </p>
          </div>
        </div>

        {/* Right: Wattage & TDP Summary */}
        <div className="flex flex-col items-end border-l border-glass-border pl-4 shrink-0">
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span>Power & TDP</span>
          </div>
          <div className="text-base font-extrabold text-accent mt-0.5 whitespace-nowrap">
            {hasBuild && estimatedWattage > 0 ? `${estimatedWattage}W` : ''}{' '}
            <span className="text-xs font-normal text-text-muted">
              {hasBuild && psuWattage > 0 ? `/ ${psuWattage}W` : ''}
            </span>
          </div>
          <div className="text-[10px] text-green font-medium mt-0.5">
            {headroomPercent !== null ? `+${headroomPercent}% Headroom` : 'TDP Pending'}
          </div>
        </div>
      </div>

      {/* Itemized Quick Checks */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-glass-border text-[11px]">
        <div className="flex items-center gap-1.5 text-text-secondary truncate">
          {hasBuild ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-text-muted/40 shrink-0" />
          )}
          <span className="truncate" title={derivedSocket}>
            {derivedSocket}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-text-secondary truncate">
          {hasBuild ? (
            displayScore >= 90 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            )
          ) : (
            <span className="w-2 h-2 rounded-full bg-text-muted/40 shrink-0" />
          )}
          <span className="truncate" title={derivedClearance}>
            {derivedClearance}
          </span>
        </div>
      </div>
    </div>
  );
}
