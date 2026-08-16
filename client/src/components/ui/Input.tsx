import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from './utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional label rendered above the field. Must be pre-translated. */
  label?: string;
  /** Error message; when present the field shows a danger state. */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  hint?: string;
  /** Icon rendered inside the field on the leading edge. */
  leftIcon?: ReactNode;
  /** For `type="password"`, show an eye button to reveal/hide the value. */
  revealToggle?: boolean;
  /** Accessible label for the reveal button (i18n). */
  revealLabel?: string;
}

/**
 * Themed text input with optional label, hint, error states and (for passwords)
 * a show/hide reveal toggle. All text is supplied by the caller for i18n.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, revealToggle, revealLabel, className, id, type, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const [revealed, setRevealed] = useState(false);
  const canReveal = revealToggle === true && type === 'password';
  const effectiveType = canReveal && revealed ? 'text' : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-text-muted pointer-events-none">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-xl bg-glass border border-border text-text-primary placeholder:text-text-muted px-4 py-3 text-sm transition-colors focus:outline-none focus:border-accent',
            leftIcon && 'pl-10',
            canReveal && 'pr-10',
            error && 'border-danger focus:border-danger',
            className,
          )}
          {...props}
        />
        {canReveal && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealLabel}
            aria-pressed={revealed}
            className="absolute right-3 text-text-muted hover:text-text-primary transition-colors"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
