import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

export default function MetricCard({ icon: Icon, title, children }: MetricCardProps) {
  return (
    <div className="glass-card metric-card">
      <div className="metric-card-header">
        <Icon size={16} />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

interface ProgressRingProps {
  value: number; // 0–1
  color: string;
  size?: number;
  label?: ReactNode;
}

export function ProgressRing({ value, color, size = 92, label }: ProgressRingProps) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--fill-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
        />
      </svg>
      {label && <div className="progress-ring-label">{label}</div>}
    </div>
  );
}
