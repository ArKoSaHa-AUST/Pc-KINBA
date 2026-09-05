import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, MessageSquare } from 'lucide-react';
import type { Review, ReviewStatsData } from './dummyData';
import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import ReviewSearch from './ReviewSearch';
import ReviewPagination from './ReviewPagination';
import WriteReviewForm from './WriteReviewForm';

interface AllReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews?: Review[];
  stats?: ReviewStatsData;
  productId?: string;
  onReviewSubmitted?: (newReview: Review) => void;
}

const ITEMS_PER_PAGE = 5;

type SortOption = 'helpful' | 'newest' | 'highest' | 'lowest';

export default function AllReviewsModal({
  isOpen,
  onClose,
  reviews = [],
  stats,
  productId,
  onReviewSubmitted,
}: AllReviewsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('helpful');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Lock background page scroll completely and handle mouse wheel / touch / keyboard interactions
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevLeft = document.body.style.left;
    const prevRight = document.body.style.right;
    const prevWidth = document.body.style.width;
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    // Pin the background page firmly in place
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0px';
    document.body.style.right = '0px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Route wheel events into the modal and prevent all background movement
    const handleWheel = (e: WheelEvent) => {
      const modalEl = scrollRef.current;
      if (!modalEl) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const target = e.target as HTMLElement | null;

      // Check if event target is inside a scrollable textarea
      if (target && target.tagName === 'TEXTAREA') {
        const ta = target as HTMLTextAreaElement;
        if (ta.scrollHeight > ta.clientHeight) {
          const atTop = ta.scrollTop <= 0 && e.deltaY < 0;
          const atBottom = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 1 && e.deltaY > 0;
          if (!atTop && !atBottom) {
            // Let the textarea scroll internally
            return;
          }
        }
      }

      // Block all window/page background scrolling
      e.preventDefault();
      e.stopPropagation();

      // If pointer is inside or over the modal container, scroll the modal body directly
      if (modalEl.contains(target) || (target && target.closest?.('[data-modal-container="true"]'))) {
        modalEl.scrollTop += e.deltaY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const modalEl = scrollRef.current;
      const target = e.target as HTMLElement | null;
      if (!modalEl || !target || !modalEl.contains(target)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // Initial check for scroll indicator
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight } = scrollRef.current;
        setCanScrollDown(scrollHeight > clientHeight + 30);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.left = prevLeft;
      document.body.style.right = prevRight;
      document.body.style.width = prevWidth;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, sortBy]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setScrollProgress(progress);
      setCanScrollDown(maxScroll - scrollTop > 30);
    } else {
      setScrollProgress(0);
      setCanScrollDown(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Filter and Sort Reviews
  const filteredAndSortedReviews = useMemo(() => {
    let list = [...reviews];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const inTitle = r.title.toLowerCase().includes(q);
        const inContent = r.content.toLowerCase().includes(q);
        const inAuthor = r.user.name.toLowerCase().includes(q);
        const inPros = (r.pros || []).some((p) => p.toLowerCase().includes(q));
        const inCons = (r.cons || []).some((c) => c.toLowerCase().includes(q));
        return inTitle || inContent || inAuthor || inPros || inCons;
      });
    }

    // Category / Star filter
    if (activeFilter === '5★') list = list.filter((r) => r.rating === 5);
    else if (activeFilter === '4★') list = list.filter((r) => r.rating === 4);
    else if (activeFilter === '3★') list = list.filter((r) => r.rating === 3);
    else if (activeFilter === '2★') list = list.filter((r) => r.rating === 2);
    else if (activeFilter === '1★') list = list.filter((r) => r.rating === 1);
    else if (activeFilter === 'Verified') list = list.filter((r) => r.verified);
    else if (activeFilter === 'Newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    // Sort order
    if (sortBy === 'helpful') {
      list.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
    } else if (sortBy === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => a.rating - b.rating);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [reviews, searchQuery, activeFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedReviews.length / ITEMS_PER_PAGE);
  const paginatedReviews = filteredAndSortedReviews.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const sortLabels: Record<SortOption, string> = {
    helpful: 'Most Helpful',
    newest: 'Newest First',
    highest: 'Highest Rating',
    lowest: 'Lowest Rating',
  };

  if (!mounted) return null;

  const totalCount = stats?.totalReviews ?? reviews.length;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            data-modal-container="true"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[85vh] bg-[#080d1a] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,229,255,0.25)] flex flex-col min-h-0 overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-6 sm:p-8 border-b border-white/10 bg-[#0c1228]/95 backdrop-blur-xl shrink-0 z-20">
              <div>
                <h3 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <span>⭐ Product Reviews</span>
                  <span className="text-xs sm:text-sm font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
                    {totalCount} {totalCount === 1 ? 'Verified Review' : 'Verified Reviews'}
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Browse and filter authentic customer feedback from verified PC builders
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrolling Progress Indicator Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.9)] transition-all duration-150 ease-out"
                  style={{ width: `${Math.max(5, scrollProgress * 100)}%` }}
                />
              </div>
            </div>

            {/* Top Ambient Scroll Shadow Effect */}
            <div
              className={`absolute top-[88px] sm:top-[96px] left-0 right-0 h-6 bg-gradient-to-b from-[#080d1a]/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
                scrollProgress > 0.02 ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Modal Scrollable Content */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-8 custom-scrollbar relative"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {/* Search and Sort */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full sm:w-96">
                  <ReviewSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                </div>

                <div className="relative flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-gray-400">Sort by:</span>
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center gap-2 bg-[#0c1228] border border-white/10 hover:border-cyan-500/30 px-4 py-2 rounded-xl text-white font-medium text-sm transition-colors"
                  >
                    <span>{sortLabels[sortBy]}</span>
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  </button>

                  {isSortDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#0c1228] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                      {(['helpful', 'newest', 'highest', 'lowest'] as SortOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-colors ${
                            sortBy === option
                              ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                              : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          {sortLabels[option]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Chips */}
              <ReviewFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

              {/* Reviews List */}
              <div className="flex flex-col gap-6">
                {paginatedReviews.length > 0 ? (
                  paginatedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/[0.01] border border-white/5 rounded-3xl">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">No matching reviews found</h4>
                    <p className="text-sm text-gray-400 max-w-md mx-auto">
                      {searchQuery || activeFilter !== 'All'
                        ? 'Try clearing your search query or selecting a different filter above.'
                        : 'No customer reviews recorded yet for this product. Be the first to review!'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <ReviewPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}

              {/* Write Review Form Divider */}
              <div className="pt-8 border-t border-white/10">
                <WriteReviewForm
                  productId={productId}
                  onSuccess={(newRev) => {
                    onReviewSubmitted?.(newRev);
                  }}
                />
              </div>
            </div>

            {/* Bottom Ambient Scroll Shadow Effect */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
                canScrollDown ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Floating "Scroll for More" Action Badge */}
            <AnimatePresence>
              {canScrollDown && (
                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0c1228]/95 border border-cyan-500/40 text-cyan-400 text-xs font-bold shadow-[0_0_25px_rgba(0,229,255,0.35)] backdrop-blur-md hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all group cursor-pointer"
                >
                  <span>Scroll for more</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce text-cyan-300" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
