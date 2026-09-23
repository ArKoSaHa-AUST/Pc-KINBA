import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Check,
  Filter,
  RefreshCw,
  Lock,
  Zap,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HARDWARE_DATASET } from '../../data/compareDataset';
import {
  fetchLiveListings,
  mapListingToCompareProduct,
  fetchCatalogProductDetail,
  mergeCatalogDetailIntoProduct,
} from '../../api/compare';
import type { CompareProduct, ComponentCategory } from '../../types/compare';

/** Max time to wait for the catalog-enrichment fetch before selecting with what we have. */
const CATALOG_ENRICH_TIMEOUT_MS = 3500;

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: CompareProduct) => void;
  targetSlotIndex: number;
  currentProductIds: string[];
  currentSlotProductId: string | null;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  gpu: 'GPUs',
  cpu: 'CPUs',
  motherboard: 'Motherboards',
  ram: 'RAM',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Cases',
  other: 'Other',
};

const LIVE_RESULTS_PAGE_SIZE = 15;

export const AddComponentModal: React.FC<AddComponentModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  targetSlotIndex,
  currentProductIds,
  currentSlotProductId,
}) => {
  const { t } = useTranslation('compare');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<CompareProduct[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const [livePage, setLivePage] = useState(1);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset search/category/highlight state each time the modal opens for a (possibly new) slot
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setSelectedCategory('all');
      setHighlightedIndex(0);
      setIsSearching(false);
      setLiveResults([]);
      setLiveLoading(false);
      setLiveError(false);
      setLivePage(1);
    }
  }, [isOpen, targetSlotIndex]);

  // Debounce the query (~220ms) to mirror the live search page's search-as-you-type feel
  useEffect(() => {
    if (searchQuery === debouncedQuery) return;
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, 220);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Categories list — only categories actually present in the catalog, so filters never dead-end
  const categories: { id: string; label: string }[] = useMemo(() => {
    const present = Array.from(new Set(HARDWARE_DATASET.map((p) => p.category)));
    return [
      { id: 'all', label: t('modal.allCategories', 'All Categories') },
      ...present.map((cat) => ({ id: cat, label: CATEGORY_LABELS[cat] || cat })),
    ];
  }, [t]);

  // Filtered dataset (driven by the debounced query, like the site search)
  const filteredProducts = useMemo(() => {
    return HARDWARE_DATASET.filter((prod) => {
      const matchesCategory =
        selectedCategory === 'all' || prod.category === (selectedCategory as ComponentCategory);
      const query = debouncedQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.brand.toLowerCase().includes(query) ||
        prod.primarySource.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [debouncedQuery, selectedCategory]);

  // Live retailer search — reuses the same /api/search endpoint (and its automatic
  // live-scraper fallback) as the main Search page, so typing here can surface real
  // retailer listings beyond the small curated GPU/CPU dataset above.
  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query) {
      setLiveResults([]);
      setLiveLoading(false);
      setLiveError(false);
      return;
    }
    const controller = new AbortController();
    setLiveLoading(true);
    setLiveError(false);
    fetchLiveListings(query, selectedCategory as ComponentCategory | 'all', controller.signal)
      .then((listings) => {
        setLiveResults(listings.map(mapListingToCompareProduct));
        setLiveLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Error fetching live retailer results:', err);
        setLiveResults([]);
        setLiveError(true);
        setLiveLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQuery, selectedCategory]);

  // Reset to page 1 whenever the underlying live result set changes
  useEffect(() => {
    setLivePage(1);
  }, [liveResults]);

  const liveTotalPages = Math.max(1, Math.ceil(liveResults.length / LIVE_RESULTS_PAGE_SIZE));
  const pagedLiveResults = useMemo(
    () =>
      liveResults.slice((livePage - 1) * LIVE_RESULTS_PAGE_SIZE, livePage * LIVE_RESULTS_PAGE_SIZE),
    [liveResults, livePage],
  );

  // Curated results first, then the current page of live retailer results — one combined
  // list so Arrow/Enter keyboard navigation flows naturally across both sections.
  const combinedResults = useMemo(
    () => [...filteredProducts, ...pagedLiveResults],
    [filteredProducts, pagedLiveResults],
  );

  // Keep the highlighted index in range whenever the result set changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [combinedResults.length, debouncedQuery, selectedCategory, livePage]);

  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const commitSelection = async (item: CompareProduct) => {
    const isBlocked = currentProductIds.includes(item.id) && item.id !== currentSlotProductId;
    if (isBlocked) return;

    // A live/scraped pick linked to a catalog product: briefly try to enrich it with real
    // specs/retailer data from that catalog record before adding it to the slot, so the
    // comparison table isn't just "—" everywhere. Falls back to the plain item on timeout
    // or failure — selection never blocks indefinitely on the network.
    if (item.catalogProductId && Object.keys(item.specs).length === 0) {
      setEnrichingId(item.id);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CATALOG_ENRICH_TIMEOUT_MS);
      try {
        const detail = await fetchCatalogProductDetail(item.catalogProductId, controller.signal);
        onSelectProduct(mergeCatalogDetailIntoProduct(item, detail));
      } catch {
        onSelectProduct(item);
      } finally {
        clearTimeout(timeout);
        setEnrichingId(null);
      }
    } else {
      onSelectProduct(item);
    }
    onClose();
  };

  // Shared row renderer for both the curated list and the live retailer results, so the two
  // sections stay visually/behaviorally identical and highlightedIndex/keyboard nav line up.
  const renderResultRow = (item: CompareProduct, idx: number) => {
    const isCurrentSlotProduct = item.id === currentSlotProductId;
    const isUsedInOtherSlot = currentProductIds.includes(item.id) && !isCurrentSlotProduct;
    const isHighlighted = idx === highlightedIndex;
    const isEnriching = enrichingId === item.id;
    const isDisabled = isUsedInOtherSlot || (enrichingId !== null && !isEnriching);
    const inStock = item.retailers[0]?.inStock;
    return (
      <div
        key={item.id}
        ref={(el) => {
          itemRefs.current[idx] = el;
        }}
        onMouseEnter={() => setHighlightedIndex(idx)}
        onMouseDown={(e) => {
          e.preventDefault();
          if (isDisabled || isEnriching) return;
          commitSelection(item);
        }}
        aria-disabled={isDisabled}
        title={isUsedInOtherSlot ? 'Already added to another slot' : undefined}
        className={`flex items-center gap-4 mx-3.5 my-1.5 p-3.5 rounded-2xl border transition-all ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed border-transparent'
            : 'cursor-pointer border-transparent hover:border-accent/60 hover:shadow-[0_8px_32px_rgba(0,229,255,0.08)]'
        } ${isHighlighted && !isDisabled ? 'border-accent/60 bg-fill-subtle' : ''}`}
      >
        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center p-1 bg-gradient-to-br from-accent/15 to-purple/15">
          <div className="w-full h-full rounded-lg bg-white flex items-center justify-center p-1 overflow-hidden">
            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-text-primary truncate">{item.name}</h4>
          <div className="flex items-center flex-wrap gap-x-1.5 text-xs text-text-muted mt-0.5">
            <span>{item.brand}</span>
            <span>&middot;</span>
            <span className="uppercase">{item.category}</span>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-1">
              <Store className="w-3 h-3" />
              {item.primarySource}
            </span>
          </div>
          {inStock !== undefined && (
            <span
              className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                inStock ? 'text-emerald-400 bg-emerald-500/10' : 'text-danger bg-danger/10'
              }`}
            >
              {inStock ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          )}
        </div>

        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
          {item.basePriceBDT ? (
            <div className="text-base font-bold text-accent tabular-nums">
              ৳ {item.basePriceBDT.toLocaleString('en-BD')}
            </div>
          ) : (
            <div className="text-xs font-semibold text-warning">
              {t('slots.priceWithheld', 'Price Withheld')}
            </div>
          )}

          {isEnriching ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-accent/15 text-accent">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </span>
          ) : isUsedInOtherSlot ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-fill-muted text-text-muted">
              <Lock className="w-3.5 h-3.5" />
            </span>
          ) : isCurrentSlotProduct ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-accent/20 text-accent">
              <Check className="w-4 h-4" />
            </span>
          ) : (
            <div className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-accent to-cyan-400 text-slate-950 hover:brightness-110 transition-all">
              {t('modal.select', 'Select')}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Close on Escape, navigate results with Arrow keys / Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, combinedResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        const item = combinedResults[highlightedIndex];
        if (item) {
          e.preventDefault();
          commitSelection(item);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose, combinedResults, highlightedIndex, currentProductIds, currentSlotProductId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          data-lenis-prevent
        >
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
            className="relative w-full max-w-5xl h-[min(880px,85vh)] flex flex-col bg-bg-surface border border-border rounded-3xl shadow-2xl z-10 text-text-primary"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border rounded-t-3xl">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-accent transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('modal.back', 'Back')}</span>
              </button>
              <h3 className="text-lg font-bold text-text-primary text-center">
                {t('modal.titlePrefix', 'Choose a')}{' '}
                <span className="text-accent">{t('modal.titleAccent', 'Component')}</span>
              </h3>
              <span className="text-xs font-semibold text-text-muted whitespace-nowrap">
                {t('slots.slot', {
                  index: targetSlotIndex + 1,
                  defaultValue: `Slot ${targetSlotIndex + 1}`,
                })}
              </span>
            </div>

            {/* Toolbar: search bar + category pills, always visible above the results list */}
            <div className="px-5 sm:px-6 pt-4 pb-4 border-b border-border flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(
                    'modal.searchPlaceholder',
                    'Search by GPU, CPU, brand, or model...',
                  )}
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-fill-subtle border border-border text-text-primary placeholder:text-text-muted text-[15px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  autoFocus
                />
                {isSearching ? (
                  <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
                ) : (
                  searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'border-accent text-text-primary bg-gradient-to-r from-accent/20 to-purple/20'
                        : 'bg-fill-subtle border-border text-text-muted hover:border-accent/60 hover:text-text-primary'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results list — always visible, fills the rest of the modal */}
            <div className="flex-1 overflow-y-auto py-2 rounded-b-3xl" data-lenis-prevent>
              {/* Curated section: full spec-sheet items from the built-in dataset */}
              {filteredProducts.length > 0 && (
                <div>
                  <div className="px-5 sm:px-6 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Filter className="w-3 h-3" />
                    <span>Curated Comparison Database</span>
                  </div>
                  {filteredProducts.map((item, idx) => renderResultRow(item, idx))}
                </div>
              )}

              {/* Live section: only searched once a query is typed */}
              {debouncedQuery && (
                <div>
                  <div className="px-5 sm:px-6 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    <span>
                      Live Retailer Results
                      {liveResults.length > 0 && ` (${liveResults.length})`}
                    </span>
                  </div>

                  {liveLoading && (
                    <div className="py-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-accent" />
                      <span>Searching live retailer stock…</span>
                    </div>
                  )}

                  {!liveLoading && liveError && (
                    <div className="py-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-warning" />
                      <span>Couldn't load live retailer results. Try again shortly.</span>
                    </div>
                  )}

                  {!liveLoading && !liveError && liveResults.length === 0 && (
                    <div className="py-8 text-center text-text-muted text-sm">
                      No live retailer listings found for "{debouncedQuery}".
                    </div>
                  )}

                  {!liveLoading &&
                    !liveError &&
                    pagedLiveResults.map((item, i) =>
                      renderResultRow(item, filteredProducts.length + i),
                    )}

                  {!liveLoading && !liveError && liveResults.length > LIVE_RESULTS_PAGE_SIZE && (
                    <div className="flex items-center justify-between px-5 sm:px-6 py-3">
                      <button
                        onClick={() => setLivePage((p) => Math.max(1, p - 1))}
                        disabled={livePage <= 1}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-fill-subtle hover:bg-fill-muted border border-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>
                      <span className="text-[11px] text-text-muted font-semibold">
                        Page {livePage} of {liveTotalPages}
                      </span>
                      <button
                        onClick={() => setLivePage((p) => Math.min(liveTotalPages, p + 1))}
                        disabled={livePage >= liveTotalPages}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-fill-subtle hover:bg-fill-muted border border-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nothing anywhere: only possible once a query/category yields zero curated
                  AND zero live matches */}
              {filteredProducts.length === 0 && !debouncedQuery && (
                <div className="py-16 text-center text-text-muted text-sm">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>
                    {t('modal.noResults', 'No hardware components found matching your search.')}
                  </p>
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-fill-subtle hover:bg-fill-muted border border-border text-text-secondary hover:text-text-primary transition-all"
                    >
                      {t('modal.resetFilters', 'Reset search & filters')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
