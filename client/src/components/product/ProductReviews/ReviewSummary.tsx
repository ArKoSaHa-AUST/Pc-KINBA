import { motion } from 'framer-motion';
import { ThumbsUp, Star } from 'lucide-react';
import RatingBreakdown from './RatingBreakdown';
import ReviewStats from './ReviewStats';
import type { ReviewStatsData } from './dummyData';

interface ReviewSummaryProps {
  stats?: ReviewStatsData;
  loading?: boolean;
}

export default function ReviewSummary({ stats, loading = false }: ReviewSummaryProps) {
  const total = stats?.totalReviews ?? 0;
  const rating = stats?.averageRating ?? 0;
  const recommend = stats?.recommendPercent ?? (total > 0 ? 100 : 0);

  // Render stars based on rating
  const renderStars = (score: number) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-5 h-5 ${
          score >= star
            ? 'text-cyan-400 fill-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
            : score >= star - 0.5
              ? 'text-cyan-400 fill-cyan-400/50'
              : 'text-gray-600'
        }`}
      />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="flex flex-col gap-8 sticky top-28"
    >
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
          <span>⭐ Product Reviews</span>
        </h2>
        <p className="text-gray-400 font-medium">
          {loading ? (
            'Loading reviews...'
          ) : total > 0 ? (
            `Based on ${total} ${total === 1 ? 'verified review' : 'verified reviews'}`
          ) : (
            'No customer reviews yet'
          )}
        </p>
      </div>

      <div className="flex flex-col gap-8 bg-[#0c1228] border border-white/5 shadow-[0_0_80px_rgba(34,211,238,0.03)] rounded-3xl p-8 backdrop-blur-xl">
        {/* Overall Rating */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center justify-center min-w-[72px]">
            <span className="text-5xl sm:text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              {total > 0 ? rating.toFixed(1) : '0.0'}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 font-bold mt-1">out of 5</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-2">
              {renderStars(rating)}
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              {total > 0
                ? rating >= 4
                  ? 'Highly rated by users for performance and build quality.'
                  : 'Customer feedback on performance and compatibility.'
                : 'Be the first to share your experience with this component!'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

        {/* Rating Breakdown */}
        <RatingBreakdown distribution={stats?.ratingDistribution} />

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

        {/* Recommendation */}
        <div className="flex items-center gap-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5">
          <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex items-center justify-center shrink-0">
            <ThumbsUp className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm sm:text-base text-white">
              {total > 0 ? (
                <>
                  <span className="font-black text-cyan-400 text-lg mr-1">{recommend}%</span>
                  of reviewers recommend this product.
                </>
              ) : (
                <span className="text-gray-300 font-medium">
                  Verified buyer reviews help the community build better PCs.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <ReviewStats stats={stats} />
      </div>
    </motion.div>
  );
}
