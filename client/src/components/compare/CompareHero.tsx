import { motion } from 'framer-motion';
import { SlidersHorizontal, Share2, FileDown, Trash2, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CompareHeroProps {
  diffOnly: boolean;
  onToggleDiffOnly: () => void;
  hiddenDiffCount: number;
  onExportPdf: () => void;
  onShareLink: () => void;
  onClearAll: () => void;
  activeCount: number;
}

export const CompareHero: React.FC<CompareHeroProps> = ({
  diffOnly,
  onToggleDiffOnly,
  hiddenDiffCount,
  onExportPdf,
  onShareLink,
  onClearAll,
  activeCount,
}) => {
  const { t } = useTranslation('compare');

  return (
    <div className="relative pt-6 pb-8 border-b border-white/10 overflow-hidden">
      {/* Background ambient lighting glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Header Title & Subtitle */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 border border-accent/30 text-accent mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>{t('heroBadge', 'Taisha Component Compare')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {t('title', 'Hardware Battleground')}{' '}
              <span className="bg-gradient-to-r from-accent via-cyan-400 to-purple bg-clip-text text-transparent">
                Matrix
              </span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-text-muted leading-relaxed">
              {t(
                'subtitle',
                'Compare up to 4 components side-by-side with live Bangladeshi retail pricing, detailed architectural specs, and real-time compatibility metrics.',
              )}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toggle Differences Only */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onToggleDiffOnly}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                diffOnly
                  ? 'bg-accent/20 border-accent text-accent shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                  : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
              }`}
              title={
                diffOnly
                  ? t('actions.filterAll', 'All Specifications')
                  : t('actions.filterDiffOnly', 'Highlight Differences Only')
              }
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>
                {diffOnly
                  ? t('actions.filterAll', 'All Specs')
                  : t('actions.filterDiffOnly', 'Diff Only')}
              </span>
              {diffOnly && hiddenDiffCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[11px] bg-accent/30 text-accent font-bold">
                  -{hiddenDiffCount}
                </span>
              )}
            </motion.button>

            {/* Export PDF */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onExportPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:text-white transition-all"
              title={t('actions.exportPdf', 'Export PDF')}
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">{t('actions.exportPdf', 'Export PDF')}</span>
            </motion.button>

            {/* Share Link */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onShareLink}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:text-white transition-all"
              title={t('actions.share', 'Share Link')}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('actions.share', 'Share')}</span>
            </motion.button>

            {/* Clear Selection */}
            {activeCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClearAll}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-all"
                title={t('actions.clearAll', 'Clear All')}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('actions.clearAll', 'Clear All')}</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
