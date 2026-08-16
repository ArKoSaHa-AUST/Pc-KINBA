import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from './utils';

export interface CardProps extends HTMLMotionProps<'div'> {
  /** Apply the glassmorphism surface treatment. @default true */
  glass?: boolean;
  /** Add a subtle lift + glow on hover. @default false */
  interactive?: boolean;
}

/**
 * Themed surface container matching the site's glassmorphism language.
 * Content and any copy are provided by the caller (i18n-ready).
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { glass = true, interactive = false, className, children, ...props },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'rounded-[20px] p-6',
        glass
          ? 'bg-glass border border-border backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
          : 'bg-bg-surface border border-border',
        interactive &&
          'transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_12px_48px_rgba(0,0,0,0.28)] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});
