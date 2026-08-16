import { motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import RatingBreakdown from './RatingBreakdown';
import ReviewStats from './ReviewStats';

export default function ReviewSummary() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="flex flex-col gap-10 sticky top-28"
    >
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">⭐ Product Reviews</h2>
        <p className="text-gray-400 font-medium">Based on 1,284 verified reviews</p>
      </div>

      <div className="flex flex-col gap-8 bg-[#0c1228] border border-white/5 shadow-[0_0_80px_rgba(34,211,238,0.03)] rounded-3xl p-8 backdrop-blur-xl">
        {/* Overall Rating */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center justify-center">
            <span className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              4.8
            </span>
            <span className="text-sm text-gray-500 font-bold mt-1">out of 5</span>
          </div>
          <div className="flex-1">
            <div className="flex text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] mb-2">
              <span className="text-2xl">★★★★★</span>
            </div>
            <p className="text-sm text-gray-400">
              Highly rated by users for performance and build quality.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

        {/* Rating Breakdown */}
        <RatingBreakdown />

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

        {/* Recommendation */}
        <div className="flex items-center gap-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5">
          <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex items-center justify-center shrink-0">
            <ThumbsUp className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="text-lg text-white">
              <span className="font-black text-cyan-400 text-xl mr-1">96%</span>
              of buyers recommend this product.
            </div>
          </div>
        </div>

        {/* Stats */}
        <ReviewStats />
      </div>
    </motion.div>
  );
}
