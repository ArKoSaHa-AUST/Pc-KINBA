import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Zap,
  HardDrive,
  BatteryCharging,
  Monitor,
  Sparkles,
  Tag,
  Trophy,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SPEC_CATEGORIES } from '../../data/compareDataset';
import type { CompareProduct, SpecItem } from '../../types/compare';

interface CompareTableProps {
  slots: (CompareProduct | null)[];
  diffOnly: boolean;
}

export const CompareTable: React.FC<CompareTableProps> = ({ slots, diffOnly }) => {
  const { i18n } = useTranslation('compare');
  const isBn = i18n.language.startsWith('bn');

  // Map icon name to Lucide Component
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-accent" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'HardDrive':
        return <HardDrive className="w-4 h-4 text-cyan-400" />;
      case 'BatteryCharging':
        return <BatteryCharging className="w-4 h-4 text-red-400" />;
      case 'Monitor':
        return <Monitor className="w-4 h-4 text-purple" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
      case 'Tag':
        return <Tag className="w-4 h-4 text-emerald-400" />;
      default:
        return <Cpu className="w-4 h-4 text-accent" />;
    }
  };

  const activeProducts = slots.filter((p): p is CompareProduct => p !== null);

  // Check if all populated slots have identical values for a spec
  const isRowIdentical = (specKey: string) => {
    if (activeProducts.length < 2) return false;
    const firstVal = activeProducts[0].specs[specKey];
    return activeProducts.every((p) => {
      const v = p.specs[specKey];
      if (firstVal === undefined || firstVal === null || firstVal === '—') {
        return v === undefined || v === null || v === '—';
      }
      return String(firstVal).trim().toLowerCase() === String(v).trim().toLowerCase();
    });
  };

  // Determine winner for numerical specs
  const getWinnerInfo = (spec: SpecItem) => {
    if (activeProducts.length < 2 || spec.higherIsBetter === undefined) return null;

    const numericEntries = activeProducts.map((p, idx) => {
      const val = p.specs[spec.key];
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
      return { idx, num: isNaN(num) ? null : num };
    });

    const validEntries = numericEntries.filter(
      (e): e is { idx: number; num: number } => e.num !== null,
    );
    if (validEntries.length < 2) return null;

    const bestVal = spec.higherIsBetter
      ? Math.max(...validEntries.map((e) => e.num))
      : Math.min(...validEntries.map((e) => e.num));

    const winners = validEntries.filter((e) => e.num === bestVal).map((e) => e.idx);
    if (winners.length === validEntries.length) return null; // Tie

    return { winners, bestVal };
  };

  // Calculate percentage difference relative to Slot 1 (if exactly 2 products)
  const getDeltaBadge = (spec: SpecItem, slotIdx: number) => {
    if (activeProducts.length !== 2 || slotIdx !== 1 || spec.higherIsBetter === undefined)
      return null;

    const val0 = activeProducts[0].specs[spec.key];
    const val1 = activeProducts[1].specs[spec.key];

    const num0 =
      typeof val0 === 'number' ? val0 : parseFloat(String(val0).replace(/[^0-9.-]+/g, ''));
    const num1 =
      typeof val1 === 'number' ? val1 : parseFloat(String(val1).replace(/[^0-9.-]+/g, ''));

    if (isNaN(num0) || isNaN(num1) || num0 === 0) return null;

    const diffPercent = ((num1 - num0) / num0) * 100;
    if (Math.abs(diffPercent) < 0.5) return null;

    const isPositive = diffPercent > 0;
    const isAdvantage = spec.higherIsBetter ? isPositive : !isPositive;

    return (
      <span
        className={`ml-2 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
          isAdvantage
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-danger/10 text-danger border border-danger/20'
        }`}
      >
        {isPositive ? `+${diffPercent.toFixed(0)}%` : `${diffPercent.toFixed(0)}%`}
      </span>
    );
  };

  return (
    <div className="w-full border border-white/10 rounded-2xl bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
      {SPEC_CATEGORIES.map((category) => {
        // Filter visible specs based on diffOnly
        const visibleSpecs = category.specs.filter((spec) => {
          if (!diffOnly) return true;
          return !isRowIdentical(spec.key);
        });

        if (visibleSpecs.length === 0) return null;

        return (
          <div key={category.id} className="border-b border-white/10 last:border-b-0">
            {/* Category Header Row */}
            <div className="sticky top-[80px] z-30 flex items-center gap-2.5 px-6 py-3.5 bg-slate-950/90 backdrop-blur-md border-b border-white/10">
              {getCategoryIcon(category.iconName)}
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                {isBn ? category.titleBn || category.title : category.title}
              </h3>
            </div>

            {/* Spec Rows */}
            <div className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {visibleSpecs.map((spec) => {
                  const winnerInfo = getWinnerInfo(spec);

                  return (
                    <motion.div
                      key={spec.key}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Column 0: Metric Label */}
                      <div className="py-3.5 px-6 text-xs font-semibold text-text-muted flex items-center justify-between border-b md:border-b-0 md:border-r border-white/5 bg-slate-950/20">
                        <span>{isBn ? spec.labelBn || spec.label : spec.label}</span>
                        {spec.unit && (
                          <span className="text-[10px] font-mono text-text-muted/60 lowercase ml-1">
                            ({spec.unit})
                          </span>
                        )}
                      </div>

                      {/* Columns 1–4: Slot Values */}
                      {slots.slice(0, 3).map((prod, slotIdx) => {
                        if (!prod) {
                          return (
                            <div
                              key={slotIdx}
                              className="py-3.5 px-6 text-xs text-text-muted/40 font-mono text-center md:border-r border-white/5 last:border-r-0"
                            >
                              —
                            </div>
                          );
                        }

                        const rawVal = prod.specs[spec.key];
                        const isWinner = winnerInfo?.winners.includes(slotIdx);
                        const deltaBadge = getDeltaBadge(spec, slotIdx);

                        return (
                          <div
                            key={slotIdx}
                            className={`py-3.5 px-6 text-xs md:text-sm font-medium flex items-center justify-between md:border-r border-white/5 last:border-r-0 transition-colors ${
                              isWinner ? 'bg-emerald-500/[0.04]' : ''
                            }`}
                          >
                            <div className="flex items-center flex-wrap gap-1.5 text-text-primary">
                              <span className={typeof rawVal === 'number' ? 'font-mono' : ''}>
                                {rawVal !== undefined && rawVal !== null && rawVal !== ''
                                  ? String(rawVal)
                                  : '—'}
                              </span>
                              {deltaBadge}
                            </div>

                            {/* Winner Badge */}
                            {isWinner && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                <Trophy className="w-3 h-3 text-emerald-400" />
                                <span>Winner</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};
