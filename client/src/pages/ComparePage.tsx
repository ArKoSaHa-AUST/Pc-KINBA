import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Lenis from 'lenis';
import { CompareHero } from '../components/compare/CompareHero';
import { SlotCard } from '../components/compare/SlotCard';
import { CompareTable } from '../components/compare/CompareTable';
import { AddComponentModal } from '../components/compare/AddComponentModal';
import { HolographicInspector3D } from '../components/compare/HolographicInspector3D';
import { PerformanceRadarChart } from '../components/compare/PerformanceRadarChart';
import { AICalloutAuditor } from '../components/compare/AICalloutAuditor';
import { FloatingActionBar } from '../components/compare/FloatingActionBar';
import { ShareModal } from '../components/compare/ShareModal';
import { HARDWARE_DATASET, SPEC_CATEGORIES } from '../data/compareDataset';
import type { CompareProduct } from '../types/compare';
import '../components/compare/ComparePage.css';

export default function ComparePage() {
  const { t } = useTranslation('compare');
  const [searchParams, setSearchParams] = useSearchParams();

  // Slots state (up to 4 slots)
  const [slots, setSlots] = useState<(CompareProduct | null)[]>([
    HARDWARE_DATASET[0], // ZOTAC RTX 4070 Ti Trinity
    HARDWARE_DATASET[1], // Sapphire Pulse RX 7900 XT
    null,
  ]);

  const [diffOnly, setDiffOnly] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0);
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [swapSourceIndex, setSwapSourceIndex] = useState<number>(0);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inspectProduct, setInspectProduct] = useState<CompareProduct | null>(null);

  // Initialize Lenis Inertial Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Show Toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Initialize from URL query parameters
  useEffect(() => {
    const slotsParam = searchParams.get('slots');
    const diffParam = searchParams.get('diff');

    if (diffParam === 'true') {
      setDiffOnly(true);
    }

    if (slotsParam) {
      const ids = slotsParam.split(',');
      const loadedSlots: (CompareProduct | null)[] = ids.map((id) => {
        const found = HARDWARE_DATASET.find((p) => p.id === id);
        return found || null;
      });

      // Ensure at least 3 slot spots
      while (loadedSlots.length < 3) {
        loadedSlots.push(null);
      }
      setSlots(loadedSlots.slice(0, 4));
    }
  }, [searchParams]);

  // Sync state to URL query parameters
  const syncToUrl = (newSlots: (CompareProduct | null)[], isDiff: boolean) => {
    const activeIds = newSlots.filter((p): p is CompareProduct => p !== null).map((p) => p.id);
    const params: Record<string, string> = {};
    if (activeIds.length > 0) {
      params.slots = activeIds.join(',');
    }
    if (isDiff) {
      params.diff = 'true';
    }
    setSearchParams(params, { replace: true });
  };

  // Add Product to Slot
  const handleSelectProduct = (product: CompareProduct) => {
    setSlots((prev) => {
      const next = [...prev];
      next[targetSlotIndex] = product;
      syncToUrl(next, diffOnly);
      return next;
    });
  };

  // Remove Slot
  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      syncToUrl(next, diffOnly);
      return next;
    });
    showToast(
      t('toast.slotCleared', { index: index + 1, defaultValue: `Slot ${index + 1} cleared.` }),
    );
  };

  // Clear All
  const handleClearAll = () => {
    const empty = [null, null, null];
    setSlots(empty);
    syncToUrl(empty, diffOnly);
    showToast(t('actions.clearAll', 'All slots cleared.'));
  };

  // Open Modal for specific Slot
  const handleOpenAddModal = (slotIndex: number) => {
    setTargetSlotIndex(slotIndex);
    setModalOpen(true);
  };

  // Add a 4th slot if allowed
  const handleAddFourthSlot = () => {
    if (slots.length < 4) {
      setSlots((prev) => [...prev, null]);
      handleOpenAddModal(slots.length);
    }
  };

  // Open Swap Modal
  const handleOpenSwapModal = (slotIndex: number = 0) => {
    setSwapSourceIndex(slotIndex);
    setSwapModalOpen(true);
  };

  // Execute Swap
  const handleExecuteSwap = (targetIndex: number) => {
    setSlots((prev) => {
      const next = [...prev];
      const temp = next[swapSourceIndex];
      next[swapSourceIndex] = next[targetIndex];
      next[targetIndex] = temp;
      syncToUrl(next, diffOnly);
      return next;
    });
    setSwapModalOpen(false);
    showToast(
      t('toast.slotsSwapped', {
        from: swapSourceIndex + 1,
        to: targetIndex + 1,
        defaultValue: `Swapped Slot ${swapSourceIndex + 1} with Slot ${targetIndex + 1}.`,
      }),
    );
  };

  // Toggle Differences Only
  const handleToggleDiffOnly = () => {
    const nextDiff = !diffOnly;
    setDiffOnly(nextDiff);
    syncToUrl(slots, nextDiff);
  };

  // Scroll to AI Auditor
  const handleScrollToAuditor = () => {
    const el = document.getElementById('ai-auditor-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    window.print();
  };

  // Count active products
  const activeProducts = useMemo(
    () => slots.filter((p): p is CompareProduct => p !== null),
    [slots],
  );

  // Compute hidden specs count when in diffOnly mode
  const hiddenDiffCount = useMemo(() => {
    if (activeProducts.length < 2) return 0;
    let count = 0;
    SPEC_CATEGORIES.forEach((cat) => {
      cat.specs.forEach((spec) => {
        const firstVal = activeProducts[0].specs[spec.key];
        const isIdentical = activeProducts.every((p) => {
          const v = p.specs[spec.key];
          if (firstVal === undefined || firstVal === null || firstVal === '—') {
            return v === undefined || v === null || v === '—';
          }
          return String(firstVal).trim().toLowerCase() === String(v).trim().toLowerCase();
        });
        if (isIdentical) count++;
      });
    });
    return count;
  }, [activeProducts]);

  return (
    <div className="compare-page-container bg-bg-primary text-text-primary min-h-screen pb-24 pt-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-accent/40 text-accent text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-accent" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <CompareHero
        diffOnly={diffOnly}
        onToggleDiffOnly={handleToggleDiffOnly}
        hiddenDiffCount={hiddenDiffCount}
        onExportPdf={handleExportPdf}
        onShareLink={() => setShareModalOpen(true)}
        onClearAll={handleClearAll}
        activeCount={activeProducts.length}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {/* Component Header Slots Grid (with 3D Parallax & Physics) */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-6">
            {slots.slice(0, 3).map((product, idx) => (
              <SlotCard
                key={idx}
                slotIndex={idx}
                product={product}
                onAddClick={handleOpenAddModal}
                onRemoveClick={handleRemoveSlot}
                onSwapClick={handleOpenSwapModal}
                onInspect3DClick={(prod) => setInspectProduct(prod)}
                totalSlots={slots.length}
              />
            ))}
          </div>

          {/* 4th Slot Expansion Trigger */}
          {slots.length < 4 && (
            <div className="flex justify-center">
              <button
                onClick={handleAddFourthSlot}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 text-text-secondary hover:text-white transition-all shadow-lg"
              >
                <Plus className="w-4 h-4 text-accent" />
                <span>{t('actions.addSlot', 'Add 4th Slot for 4-Way Comparison')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 6-Axis Interactive Performance Radar Chart */}
        {activeProducts.length > 0 && <PerformanceRadarChart slots={slots} />}

        {/* AI Bottleneck & Compatibility Auditor */}
        {activeProducts.length > 0 && <AICalloutAuditor slots={slots} />}

        {/* Detailed Spec Comparison Table */}
        <CompareTable slots={slots} diffOnly={diffOnly} />
      </div>

      {/* Floating Quick Action Bar */}
      <FloatingActionBar
        diffOnly={diffOnly}
        onToggleDiffOnly={handleToggleDiffOnly}
        hiddenDiffCount={hiddenDiffCount}
        onOpenSwapModal={() => handleOpenSwapModal(0)}
        onScrollToAuditor={handleScrollToAuditor}
        onExportPdf={handleExportPdf}
        onOpenShareModal={() => setShareModalOpen(true)}
      />

      {/* Share Modal with QR Code */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onCopiedToast={() =>
          showToast(t('toast.linkCopied', 'Comparison link copied to clipboard!'))
        }
      />

      {/* Add Component Modal */}
      <AddComponentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectProduct={handleSelectProduct}
        targetSlotIndex={targetSlotIndex}
        currentProductIds={activeProducts.map((p) => p.id)}
      />

      {/* Holographic 3D Component Inspector Modal */}
      <HolographicInspector3D
        isOpen={!!inspectProduct}
        onClose={() => setInspectProduct(null)}
        product={inspectProduct}
      />

      {/* Swap Slots Modal */}
      <AnimatePresence>
        {swapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwapModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
            >
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-accent" />
                <span>Swap Slot {swapSourceIndex + 1} with:</span>
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Choose the destination slot to interchange positions.
              </p>
              <div className="space-y-2">
                {slots.map((prod, idx) => {
                  if (idx === swapSourceIndex) return null;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleExecuteSwap(idx)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-accent/10 border border-white/5 hover:border-accent/30 text-left transition-all group"
                    >
                      <div>
                        <div className="text-xs font-bold text-accent">Slot {idx + 1}</div>
                        <div className="text-xs text-white truncate max-w-[200px]">
                          {prod ? prod.name : 'Empty Slot'}
                        </div>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-text-muted group-hover:text-accent" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
