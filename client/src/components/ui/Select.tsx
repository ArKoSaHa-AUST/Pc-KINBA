import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from './utils';

export interface SelectOption {
  value: string;
  /** Pre-translated, human-readable label. */
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  /** Options to render. Labels must be pre-translated. */
  options: SelectOption[];
  /** Optional label rendered above the control. */
  label?: string;
  /** Error message; when present the control shows a danger state. */
  error?: string;
}

/**
 * Themed native select with a custom chevron. i18n-ready — option labels and
 * the field label are provided by the caller.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, label, error, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full appearance-none rounded-xl bg-glass border border-border text-text-primary px-4 py-3 pr-10 text-sm transition-colors focus:outline-none focus:border-accent cursor-pointer',
            error && 'border-danger focus:border-danger',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
          aria-hidden="true"
        />
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
});
