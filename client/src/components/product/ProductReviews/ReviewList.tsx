import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Review, ReviewStatsData } from './dummyData';
import ReviewCard from './ReviewCard';
import AllReviewsModal from './AllReviewsModal';
import WriteReviewModal from './WriteReviewModal';
import { ArrowRight, PenSquare, MessageSquarePlus, Loader2 } from 'lucide-react';

interface ReviewListProps {
  reviews?: Review[];
  stats?: ReviewStatsData;
  productId?: string;
  loading?: boolean;
  onReviewSubmitted?: (newReview: Review) => void;
}

export default function ReviewList({
  reviews = [],
  stats,
  productId,
  loading = false,
  onReviewSubmitted,
}: ReviewListProps) {
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  const handleCloseAllModal = useCallback(() => setIsAllModalOpen(false), []);
  const handleCloseWriteModal = useCallback(() => setIsWriteModalOpen(false), []);

  const totalCount = stats?.totalReviews ?? reviews.length;
  const displayedReviews = reviews.slice(0, 3);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0c1228] border border-white/5 rounded-3xl">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">Fetching verified community reviews...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* If 0 reviews exist yet */}
      {reviews.length === 0 ? (
        <div className="bg-[#0c1228] border border-white/5 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <MessageSquarePlus className="w-10 h-10 text-cyan-400" />
          </div>
          <h4 className="text-2xl font-bold text-white mb-2">No Reviews for this Component Yet</h4>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-8">
            Be the first PC builder to share benchmark scores, thermal performance, and build
            compatibility with the community!
          </p>

          <button
            onClick={() => setIsWriteModalOpen(true)}
            className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <PenSquare className="w-4 h-4" />
            <span>Write the First Review</span>
          </button>
        </div>
      ) : (
        <>
          {/* List of max 3 reviews with generous gap */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15 },
              },
            }}
            className="flex flex-col gap-6"
          >
            {displayedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </motion.div>

          {/* Action Banner for View All and Write Review */}
          <div className="mt-8 p-6 sm:p-8 bg-[#0c1228] border border-cyan-500/20 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(0,229,255,0.05)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-white">
                Showing {Math.min(3, totalCount)} of {totalCount}{' '}
                {totalCount === 1 ? 'Verified Review' : 'Verified Reviews'}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Explore all customer feedback or share your authentic experience with this component
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap w-full md:w-auto shrink-0">
              <button
                onClick={() => setIsWriteModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-extrabold text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all hover:scale-105 active:scale-95"
              >
                <PenSquare className="w-4 h-4 text-cyan-400" />
                <span>Write a Review</span>
              </button>

              <button
                onClick={() => setIsAllModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-extrabold text-sm text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <span>View All {totalCount} Reviews</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Popup Windows */}
      <AllReviewsModal
        isOpen={isAllModalOpen}
        onClose={handleCloseAllModal}
        reviews={reviews}
        stats={stats}
        productId={productId}
        onReviewSubmitted={onReviewSubmitted}
      />

      <WriteReviewModal
        productId={productId}
        isOpen={isWriteModalOpen}
        onClose={handleCloseWriteModal}
        onReviewSubmitted={onReviewSubmitted}
      />
    </div>
  );
}
