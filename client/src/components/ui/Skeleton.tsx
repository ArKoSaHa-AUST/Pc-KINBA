import type { HTMLAttributes } from 'react';
import { cn } from './utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as a circle (for avatars/icons). */
  circle?: boolean;
}

/**
 * Themed loading placeholder with a shimmer pulse. Purely presentational —
 * contains no text, so nothing to translate.
 */
export function Skeleton({ circle = false, className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-border', circle ? 'rounded-full' : 'rounded-lg', className)}
      {...props}
    />
  );
}
