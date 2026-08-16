import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ToastContext,
  type ToastItem,
  type ToastOptions,
  type ToastVariant,
} from './toast-context';

const ICONS: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const ACCENTS: Record<ToastVariant, string> = {
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provides `useToast()` and renders a fixed, animated toast viewport.
 * Toast copy is passed in by callers (i18n-ready).
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++counter.current;
      const item: ToastItem = { id, variant: 'info', duration: 4000, ...options };
      setToasts((current) => [...current, item]);
      if (item.duration && item.duration > 0) {
        window.setTimeout(() => dismiss(id), item.duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 w-[min(92vw,380px)]">
          <AnimatePresence initial={false}>
            {toasts.map((item) => {
              const Icon = ICONS[item.variant ?? 'info'];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="glass flex items-start gap-3 p-4"
                  role="status"
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ACCENTS[item.variant ?? 'info']}`} />
                  <div className="flex-1 min-w-0">
                    {item.title && (
                      <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                    )}
                    <p className="text-sm text-text-muted break-words">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-border transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
