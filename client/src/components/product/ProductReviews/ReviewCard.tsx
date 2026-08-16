import { CheckCircle, ThumbsUp, Flag, MessageSquare, Share2, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Review } from './dummyData';
import StarRating from './StarRating';
import ReviewImageGallery from './ReviewImageGallery';
import ReviewReply from './ReviewReply';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-[#0c1228] border border-white/5 rounded-3xl p-8 hover:bg-[#0f1730] transition-colors shadow-lg hover:shadow-cyan-500/5 group"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={review.user.avatar}
              alt={review.user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
            />
            {review.verified && (
              <div className="absolute -bottom-1 -right-1 bg-[#0c1228] rounded-full p-0.5">
                <CheckCircle className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-lg">{review.user.name}</h4>
              <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/5 rounded-md border border-white/5 flex items-center gap-1">
                {review.user.country}
                <img
                  src={`https://flagcdn.com/w20/${review.user.countryCode.toLowerCase()}.png`}
                  alt={review.user.country}
                  className="w-3 h-2 rounded-sm opacity-80"
                />
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-sm text-gray-500 font-medium">Purchased {review.date}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h5 className="text-xl font-bold text-white mb-3">{review.title}</h5>
        <p className="text-gray-300 leading-relaxed">{review.content}</p>

        {/* Pros and Cons */}
        {(review.pros || review.cons) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {review.pros && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-400 text-sm tracking-wide uppercase">
                    Pros
                  </span>
                </div>
                <ul className="space-y-1">
                  {review.pros.map((pro, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.cons && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-rose-400 text-sm tracking-wide uppercase">
                    Cons
                  </span>
                </div>
                <ul className="space-y-1">
                  {review.cons.map((con, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-rose-400 mt-1">•</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {review.images && <ReviewImageGallery images={review.images} />}

      {review.reply && (
        <ReviewReply
          storeName={review.reply.storeName}
          content={review.reply.content}
          date={review.reply.date}
        />
      )}

      <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-white/5">
        <button className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-cyan-400 transition-colors bg-white/5 hover:bg-cyan-500/10 px-4 py-2 rounded-lg group">
          <ThumbsUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          Helpful ({review.helpfulCount})
        </button>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <MessageSquare className="w-4 h-4" /> Reply
          </button>
          <button className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg">
            <Flag className="w-4 h-4" /> Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}
