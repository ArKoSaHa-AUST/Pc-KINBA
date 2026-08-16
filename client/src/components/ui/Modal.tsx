import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './utils';

export interface ModalProps {
  /** Whether the modal is visible. */
  open: boolean;
  /** Called when the user requests to close (overlay click, Esc, close button). */
  onClose: () => void;
  /** Pre-translated title rendered in the header. */
  title?: string;
  /** Accessible label for the close button (i18n). */
  closeLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible, animated modal dialog rendered in a portal. Closes on overlay
 * click and the Escape key. All copy is provided by the caller.
 */
export function Modal({ open, onClose, title, closeLabel, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 w-full max-w-lg rounded-[20px] bg-bg-surface border border-border shadow-[0_24px_80px_rgba(0,0,0,0.4)] p-6',
              className,
            )}
          >
            {(title || closeLabel) && (
              <div className="flex items-center justify-between mb-4">
                {title && <h3 className="text-card-title font-semibold text-text-primary">{title}</h3>}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="ml-auto p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-border transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
