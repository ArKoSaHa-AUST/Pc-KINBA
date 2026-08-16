import { useState } from 'react';
import { motion } from 'framer-motion';
import { dummyReviews } from './dummyData';
import ReviewCard from './ReviewCard';
import AllReviewsModal from './AllReviewsModal';
import WriteReviewModal from './WriteReviewModal';
import { ArrowRight, PenSquare } from 'lucide-react';

export default function ReviewList() {
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const displayedReviews = dummyReviews.slice(0, 3);

  return (
    <div className="flex flex-col">
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
        className="flex flex-col gap-8"
      >
        {displayedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </motion.div>

      {/* Action Banner for View All and Write Review with Height Gap */}
      <div className="mt-12 p-8 bg-[#0c1228] border border-cyan-500/20 rounded-3xl backdrop-blur-xl shadow-[0_0_40px_rgba(0,229,255,0.05)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h4 className="text-xl font-bold text-white">Showing 3 of 1,284 Verified Reviews</h4>
          <p className="text-sm text-gray-400 mt-1">
            Explore all customer feedback or share your experience with this component
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
            <span>View All 1,284 Reviews</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Popup Windows */}
      <AllReviewsModal isOpen={isAllModalOpen} onClose={() => setIsAllModalOpen(false)} />
      <WriteReviewModal isOpen={isWriteModalOpen} onClose={() => setIsWriteModalOpen(false)} />
    </div>
  );
}
