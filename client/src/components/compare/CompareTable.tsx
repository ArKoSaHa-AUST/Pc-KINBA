import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, HardDrive, BatteryCharging, Monitor, Sparkles, Tag, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SPEC_CATEGORIES } from '../../data/compareDataset';
import type { CompareProduct, SpecItem } from '../../types/compare';

interface CompareTableProps {
  slots: (CompareProduct | null)[];
  diffOnly: boolean;
}

export const CompareTable = ({ slots, diffOnly }: CompareTableProps) => {
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
      if (firstVal === undefined || firstVal === null || firstVal === '') {
        return v === undefined || v === null || v === '';
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
        className={`ml-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
          isAdvantage
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-danger/10 text-danger border border-danger/20'
        }`}
      >
        {isPositive ? `+${diffPercent.toFixed(0)}%` : `${diffPercent.toFixed(0)}%`}
      </span>
    );
  };

  // Compute proportion bar width for numeric metrics
  const getMeterBarProportion = (spec: SpecItem, rawVal: unknown) => {
    if (typeof rawVal !== 'number' && typeof rawVal !== 'string') return null;
    const num =
      typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num) || num <= 0) return null;

    const allNums = activeProducts
      .map((p) => {
        const v = p.specs[spec.key];
        return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
      })
      .filter((n) => !isNaN(n) && n > 0);

    if (allNums.length === 0) return null;
    const maxVal = Math.max(...allNums);
    if (maxVal <= 0) return null;

    return Math.min(100, Math.max(10, (num / maxVal) * 100));
  };

  // Pre-filter so we know which category is first/last for corner-rounding — the container
  // no longer uses overflow-hidden (see note below), so rounding has to be applied directly.
  const visibleCategories = SPEC_CATEGORIES.map((category) => ({
    category,
    visibleSpecs: category.specs.filter((spec) => !diffOnly || !isRowIdentical(spec.key)),
  })).filter(({ visibleSpecs }) => visibleSpecs.length > 0);

  return (
    <div className="w-full border border-border rounded-3xl bg-glass backdrop-blur-2xl shadow-2xl print:shadow-none">
      {visibleCategories.map(({ category, visibleSpecs }, catIdx) => {
        const isFirstCategory = catIdx === 0;
        const isLastCategory = catIdx === visibleCategories.length - 1;

        return (
          <div key={category.id} className="border-b border-border last:border-b-0">
            {/* Category Header Row (Sticky Locking) */}
            {/* Note: this container intentionally has no overflow-hidden on any ancestor —
                overflow other than visible on an ancestor breaks position:sticky, which is
                what caused this header to render overlapping the row below it. Corners are
                rounded directly on the first header / last row instead of via clipping.
                print:static — sticky positioning doesn't paginate sensibly on paper.
                print:break-after-avoid — keeps the header from being the last thing on a
                page with its own rows pushed to the next one. The category as a whole is
                intentionally NOT break-inside-avoid (only individual rows are): a whole
                category can be taller than a full page's remaining space, and forcing it
                to stay together just pushes it onto a fresh page, wasting the rest of the
                previous one — the exact "empty page" problem this is fixing. */}
            <div
              className={`sticky top-[80px] print:static print:break-after-avoid z-30 flex items-center gap-2.5 px-6 py-3.5 bg-bg-surface backdrop-blur-md border-b border-border ${
                isFirstCategory ? 'rounded-t-3xl' : ''
              }`}
            >
              {getCategoryIcon(category.iconName)}
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                {isBn ? category.titleBn || category.title : category.title}
              </h3>
            </div>

            {/* Spec Rows */}
            <div className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {visibleSpecs.map((spec, sIdx) => {
                  const winnerInfo = getWinnerInfo(spec);
                  const isLastRow = isLastCategory && sIdx === visibleSpecs.length - 1;

                  return (
                    <motion.div
                      key={spec.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sIdx * 0.03, duration: 0.3, ease: 'easeOut' }}
                      className={`grid grid-cols-1 items-center hover:bg-fill-subtle transition-colors print:break-inside-avoid ${
                        slots.length >= 4
                          ? 'md:grid-cols-5 lg:grid-cols-5'
                          : 'md:grid-cols-4 lg:grid-cols-4'
                      } ${isLastRow ? 'rounded-b-3xl overflow-hidden' : ''}`}
                    >
                      {/* Column 0: Metric Label */}
                      <div className="py-4 px-6 text-xs font-semibold text-text-muted flex items-center justify-between border-b md:border-b-0 md:border-r border-border bg-fill-subtle">
                        <span>{isBn ? spec.labelBn || spec.label : spec.label}</span>
                        {spec.unit && (
                          <span className="text-[10px] font-mono text-text-muted/60 lowercase ml-1">
                            ({spec.unit})
                          </span>
                        )}
                      </div>

                      {/* Slot Value Columns */}
                      {slots.map((prod, slotIdx) => {
                        if (!prod) {
                          return (
                            <div
                              key={slotIdx}
                              className="py-4 px-6 text-xs text-text-muted/40 font-mono text-center md:border-r border-border last:border-r-0"
                            />
                          );
                        }

                        const rawVal = prod.specs[spec.key];
                        const isWinner = winnerInfo?.winners.includes(slotIdx);
                        const deltaBadge = getDeltaBadge(spec, slotIdx);
                        const barWidth = getMeterBarProportion(spec, rawVal);

                        return (
                          <div
                            key={slotIdx}
                            className={`py-4 px-6 text-xs md:text-sm font-medium flex flex-col justify-center gap-1 md:border-r border-border last:border-r-0 transition-colors ${
                              isWinner ? 'bg-emerald-500/[0.04]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-1.5 text-text-primary">
                              <div className="flex items-center flex-wrap gap-1">
                                <span className={typeof rawVal === 'number' ? 'font-mono' : ''}>
                                  {rawVal !== undefined && rawVal !== null && rawVal !== ''
                                    ? String(rawVal)
                                    : ''}
                                </span>
                                {deltaBadge}
                              </div>

                              {/* Winner Badge */}
                              {isWinner && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm">
                                  <Trophy className="w-3 h-3 text-emerald-400" />
                                  <span>Winner</span>
                                </span>
                              )}
                            </div>

                            {/* Animated Meter Progress Bar for numeric benchmarks & capacities */}
                            {barWidth !== null && typeof rawVal === 'number' && (
                              <div className="w-full h-1.5 rounded-full bg-fill-muted overflow-hidden mt-1">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${barWidth}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${
                                    isWinner
                                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                                      : 'bg-gradient-to-r from-accent to-purple'
                                  }`}
                                />
                              </div>
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
