import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Check, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HARDWARE_DATASET } from '../../data/compareDataset';
import type { CompareProduct, ComponentCategory } from '../../types/compare';

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: CompareProduct) => void;
  targetSlotIndex: number;
  currentProductIds: string[];
}

export const AddComponentModal: React.FC<AddComponentModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  targetSlotIndex,
  currentProductIds,
}) => {
  const { t } = useTranslation('compare');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categories list
  const categories: { id: string; label: string }[] = [
    { id: 'all', label: t('modal.allCategories', 'All Categories') },
    { id: 'gpu', label: 'GPUs' },
    { id: 'cpu', label: 'CPUs' },
    { id: 'ram', label: 'RAM' },
    { id: 'storage', label: 'Storage' },
    { id: 'psu', label: 'PSU' },
    { id: 'case', label: 'Cases' },
  ];

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    return HARDWARE_DATASET.filter((prod) => {
      const matchesCategory =
        selectedCategory === 'all' || prod.category === (selectedCategory as ComponentCategory);
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.brand.toLowerCase().includes(query) ||
        prod.primarySource.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/60">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {t('modal.title', 'Choose a Component to Compare')}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {t('slots.slot', {
                    index: targetSlotIndex + 1,
                    defaultValue: `Slot ${targetSlotIndex + 1}`,
                  })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/80 flex flex-col gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(
                    'modal.searchPlaceholder',
                    'Search by GPU, CPU, brand, or model...',
                  )}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>
                    {t('modal.noResults', 'No hardware components found matching your search.')}
                  </p>
                </div>
              ) : (
                filteredProducts.map((item) => {
                  const isAlreadySelected = currentProductIds.includes(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        onSelectProduct(item);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isAlreadySelected
                          ? 'bg-accent/5 border-accent/30 hover:bg-accent/10'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center p-1 flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-text-muted">
                              {item.brand}
                            </span>
                            <span className="text-xs text-text-muted uppercase">
                              {item.category}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white truncate mt-0.5">
                            {item.name}
                          </h4>
                          <div className="text-xs text-text-muted">
                            Source: {item.primarySource}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-4 flex items-center gap-3">
                        <div>
                          {item.basePriceBDT ? (
                            <div className="text-sm font-mono font-bold text-accent">
                              ৳ {item.basePriceBDT.toLocaleString('en-BD')}
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-warning">
                              {t('slots.priceWithheld', 'Price Withheld')}
                            </div>
                          )}
                          <div className="text-[10px] text-text-muted">{item.priceLastSynced}</div>
                        </div>

                        {isAlreadySelected ? (
                          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-slate-950 hover:bg-accent/90 transition-colors">
                            {t('modal.select', 'Select')}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
