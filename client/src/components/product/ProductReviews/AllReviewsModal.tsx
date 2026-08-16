import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { dummyReviews } from './dummyData';
import ReviewCard from './ReviewCard';
import ReviewFilters from './ReviewFilters';
import ReviewSearch from './ReviewSearch';
import ReviewPagination from './ReviewPagination';
import WriteReviewForm from './WriteReviewForm';

interface AllReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AllReviewsModal({ isOpen, onClose }: AllReviewsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[88vh] bg-[#080d1a] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,229,255,0.15)] flex flex-col overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/10 bg-[#0c1228]/80 backdrop-blur-xl shrink-0">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <span>⭐ Product Reviews</span>
                  <span className="text-sm font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
                    1,284 Verified Reviews
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Browse and filter all authentic customer feedback
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
              {/* Search and Sort */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="w-full sm:w-96">
                  <ReviewSearch />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-gray-400">Sort by:</span>
                  <button className="flex items-center gap-2 bg-[#0c1228] border border-white/10 hover:border-cyan-500/30 px-4 py-2 rounded-xl text-white font-medium transition-colors">
                    Most Helpful
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              </div>

              {/* Filter Chips */}
              <ReviewFilters />

              {/* Reviews List */}
              <div className="flex flex-col gap-6">
                {dummyReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {/* Pagination */}
              <ReviewPagination />

              {/* Write Review Form */}
              <WriteReviewForm />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
