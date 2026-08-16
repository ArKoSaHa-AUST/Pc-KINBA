import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional footer content (e.g. links to other auth pages). */
  footer?: ReactNode;
}

/**
 * Centered, animated, themed shell shared by every auth page. Uses the site's
 * glass surface, gradient brand mark and motion easing — no one-off styling.
 */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation('common');

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-accent/20 to-purple/20 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative z-10 w-full max-w-md p-8"
      >
        <Link to="/" className="flex items-center gap-2 mb-6 w-fit">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
            <span className="font-black text-white text-sm">PC</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-text-primary">
            {t('brand', { defaultValue: 'KINBA' })}
          </span>
        </Link>

        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-text-muted">{subtitle}</p>}

        <div className="mt-7">{children}</div>

        {footer && <div className="mt-6 text-sm text-text-muted text-center">{footer}</div>}
      </motion.div>
    </div>
  );
}
