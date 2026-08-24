import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ArrowLeftRight, Bot, FileDown, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FloatingActionBarProps {
  diffOnly: boolean;
  onToggleDiffOnly: () => void;
  hiddenDiffCount: number;
  onOpenSwapModal: () => void;
  onScrollToAuditor: () => void;
  onExportPdf: () => void;
  onOpenShareModal: () => void;
}

export const FloatingActionBar = ({
  diffOnly,
  onToggleDiffOnly,
  hiddenDiffCount,
  onOpenSwapModal,
  onScrollToAuditor,
  onExportPdf,
  onOpenShareModal,
}: FloatingActionBarProps) => {
  const { t } = useTranslation('compare');
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 320);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-none"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-accent/30 shadow-[0_10px_35px_rgba(0,0,0,0.7)] text-white">
            {/* Diff Toggle */}
            <button
              onClick={onToggleDiffOnly}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                diffOnly
                  ? 'bg-accent text-slate-950 shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white'
              }`}
              title={
                diffOnly
                  ? t('actions.filterAll', 'All Specs')
                  : t('actions.filterDiffOnly', 'Diff Only')
              }
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{diffOnly ? 'All' : 'Diff Only'}</span>
              {diffOnly && hiddenDiffCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-950 font-black">
                  -{hiddenDiffCount}
                </span>
              )}
            </button>

            {/* Swap Slots */}
            <button
              onClick={onOpenSwapModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-all"
              title="Swap Slots"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">Swap</span>
            </button>

            {/* AI Auditor */}
            <button
              onClick={onScrollToAuditor}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple/20 hover:bg-purple/30 text-purple-300 border border-purple/40 transition-all"
              title="AI Verdict"
            >
              <Bot className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">AI Auditor</span>
            </button>

            <div className="h-5 w-px bg-white/10 mx-0.5" />

            {/* Export PDF */}
            <button
              onClick={onExportPdf}
              className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              title={t('actions.exportPdf', 'Export PDF')}
            >
              <FileDown className="w-4 h-4" />
            </button>

            {/* Share */}
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 transition-all"
              title={t('actions.share', 'Share')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('actions.share', 'Share')}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
