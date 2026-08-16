import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { cn } from './utils';

export interface TabItem {
  value: string;
  /** Pre-translated tab label. */
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  /** Currently selected tab value (controlled). */
  value: string;
  /** Called with the newly selected tab value. */
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Controlled, accessible tab strip with an animated active indicator
 * (framer-motion shared layout). Labels are provided by the caller for i18n.
 */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  const layoutId = useId();

  return (
    <div role="tablist" className={cn('inline-flex gap-1 p-1 rounded-full bg-glass border border-border', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              active ? 'text-text-primary' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-full bg-border"
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
