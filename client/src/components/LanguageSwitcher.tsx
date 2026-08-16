import { AnimatePresence, motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n';

const LABELS: Record<AppLanguage, string> = {
  en: 'EN',
  bn: 'বাং',
};

interface LanguageSwitcherProps {
  className?: string;
}

/**
 * Compact icon button that cycles through the supported languages (persisted
 * via i18next's localStorage detector) with an animated label swap consistent
 * with the site's easing, mirroring the theme switcher.
 */
export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('nav');
  const current = (i18n.language.startsWith('bn') ? 'bn' : 'en') as AppLanguage;

  const cycleLanguage = () => {
    const next =
      SUPPORTED_LANGUAGES[(SUPPORTED_LANGUAGES.indexOf(current) + 1) % SUPPORTED_LANGUAGES.length];
    void i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={cycleLanguage}
      className={`p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-border transition-colors flex items-center gap-1.5 ${className}`}
      aria-label={t('language.label')}
      title={t(`language.${current}`)}
    >
      <Languages className="w-5 h-5" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-xs font-semibold"
        >
          {LABELS[current]}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
