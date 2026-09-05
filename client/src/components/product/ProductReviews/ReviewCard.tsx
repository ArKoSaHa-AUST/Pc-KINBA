import { useState } from 'react';
import { CheckCircle, ThumbsUp, Flag, MessageSquare, Share2, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Review } from './dummyData';
import StarRating from './StarRating';
import ReviewImageGallery from './ReviewImageGallery';
import ReviewReply from './ReviewReply';

interface ReviewCardProps {
  review: Review;
  onHelpfulVote?: (reviewId: string, newCount: number) => void;
}

export default function ReviewCard({ review, onHelpfulVote }: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [hasVoted, setHasVoted] = useState(() => {
    try {
      return localStorage.getItem(`pckinba_helpful_${review.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [isVoting, setIsVoting] = useState(false);

  const handleHelpfulClick = async () => {
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    const updatedCount = helpfulCount + 1;
    setHelpfulCount(updatedCount);
    setHasVoted(true);

    try {
      localStorage.setItem(`pckinba_helpful_${review.id}`, 'true');
      const res = await fetch(`/api/reviews/${review.id}/helpful`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.helpfulCount !== undefined) {
        setHelpfulCount(data.helpfulCount);
        onHelpfulVote?.(review.id, data.helpfulCount);
      }
    } catch (err) {
      console.warn('Failed to update helpful vote:', err);
    } finally {
      setIsVoting(false);
    }
  };

  const formattedDate = review.date.startsWith('Purchased')
    ? review.date
    : `Purchased ${review.date}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-[#0c1228] border border-white/5 rounded-3xl p-6 sm:p-8 hover:bg-[#0f1730] transition-colors shadow-lg hover:shadow-cyan-500/5 group"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={
                review.user.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(review.user.name)}`
              }
              alt={review.user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/10 bg-slate-800"
            />
            {review.verified && (
              <div className="absolute -bottom-1 -right-1 bg-[#0c1228] rounded-full p-0.5" title="Verified Customer">
                <CheckCircle className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-base sm:text-lg">{review.user.name}</h4>
              {review.user.country && (
                <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-white/5 rounded-md border border-white/5 flex items-center gap-1">
                  {review.user.country}
                  {review.user.countryCode && (
                    <img
                      src={`https://flagcdn.com/w20/${review.user.countryCode.toLowerCase()}.png`}
                      alt={review.user.country}
                      className="w-3.5 h-2.5 rounded-sm opacity-80"
                    />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <StarRating rating={review.rating} />
              <span className="text-xs sm:text-sm text-gray-500 font-medium">{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h5 className="text-lg sm:text-xl font-bold text-white mb-2">{review.title}</h5>
        <p className="text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">{review.content}</p>

        {/* Pros and Cons */}
        {((review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0)) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {review.pros && review.pros.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase">
                    Pros
                  </span>
                </div>
                <ul className="space-y-1">
                  {review.pros.map((pro, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {review.cons && review.cons.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-rose-400 text-xs tracking-wide uppercase">
                    Cons
                  </span>
                </div>
                <ul className="space-y-1">
                  {review.cons.map((con, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {review.images && review.images.length > 0 && <ReviewImageGallery images={review.images} />}

      {review.reply && (
        <ReviewReply
          storeName={review.reply.storeName}
          content={review.reply.content}
          date={review.reply.date}
        />
      )}

      <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-white/5">
        <button
          onClick={handleHelpfulClick}
          disabled={hasVoted || isVoting}
          className={`flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all px-4 py-2 rounded-lg group ${
            hasVoted
              ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
              : 'text-gray-400 hover:text-cyan-400 bg-white/5 hover:bg-cyan-500/10 border border-transparent'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-cyan-400' : 'group-hover:-translate-y-0.5 transition-transform'}`} />
          <span>{hasVoted ? 'Helpful' : 'Helpful'} ({helpfulCount})</span>
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
