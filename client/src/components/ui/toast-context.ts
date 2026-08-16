import { createContext } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  /** Pre-translated main message. */
  message: string;
  /** Optional pre-translated title. */
  title?: string;
  /** Semantic color. @default 'info' */
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. @default 4000 */
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
}

export interface ToastContextValue {
  /** Enqueue a toast; returns its generated id. */
  toast: (options: ToastOptions) => number;
  /** Dismiss a toast by id. */
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
