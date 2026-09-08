import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface PickerOption {
  id: string;
  label: string;
}

export interface PickerGroup {
  label: string;
  options: PickerOption[];
}

interface BuildPickerProps {
  groups: PickerGroup[];
  value?: string;
  /** Shown when `value` matches no option (e.g. a custom part list). */
  valueLabel?: string;
  placeholder?: string;
  ariaLabel: string;
  onChange: (id: string) => void;
}

/** Themed dropdown for choosing a build; the panel is exactly as wide as the trigger. */
export default function BuildPicker({
  groups,
  value,
  valueLabel,
  placeholder = 'Pick a build…',
  ariaLabel,
  onChange,
}: BuildPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = groups.flatMap((g) => g.options).find((o) => o.id === value);
  const label = selected?.label ?? valueLabel;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-bg-primary px-3 py-2 text-[13px] font-semibold normal-case tracking-normal transition-colors cursor-pointer ${
          open ? 'border-accent' : 'border-border hover:border-accent/50'
        } ${label ? 'text-text-primary' : 'text-text-muted'}`}
      >
        <span className="truncate">{label ?? placeholder}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            role="listbox"
            aria-label={ariaLabel}
            data-lenis-prevent
            className="absolute left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto custom-scrollbar rounded-2xl bg-bg-surface border border-border shadow-[0_16px_48px_rgba(0,0,0,0.3)] p-2 text-left normal-case tracking-normal"
          >
            {groups
              .filter((g) => g.options.length > 0)
              .map((g) => (
                <li key={g.label} role="presentation">
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                    {g.label}
                  </div>
                  <ul role="group">
                    {g.options.map((o) => {
                      const active = o.id === value;
                      return (
                        <li key={o.id} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              onChange(o.id);
                              setOpen(false);
                            }}
                            className={`w-full flex items-start justify-between gap-3 px-3 py-2 rounded-lg text-[13px] font-medium leading-snug text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-accent/10 text-accent'
                                : 'text-text-primary hover:bg-fill-subtle'
                            }`}
                          >
                            <span className="min-w-0 break-words">{o.label}</span>
                            {active && <Check size={14} className="shrink-0 mt-0.5" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
