import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/useTheme';
import type { Theme } from '../theme/theme-context';

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
};

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Compact icon button that cycles through light -> dark with an
 * animated icon swap consistent with the site's framer-motion easing.
 */
export default function ThemeSwitcher({ className = '' }: ThemeSwitcherProps) {
  const { theme, cycleTheme } = useTheme();
  const { t } = useTranslation('nav');
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-border transition-colors relative overflow-hidden ${className}`}
      aria-label={t('theme.toggle', { theme: t(`theme.${theme}`) })}
      title={t(`theme.${theme}`)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="block"
        >
          <Icon className="w-5 h-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
