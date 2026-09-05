import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Plus, Minus, X, Loader2, LogIn, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import { useAuth } from '../../../auth/useAuth';
import type { Review } from './dummyData';

interface WriteReviewFormProps {
  productId?: string;
  isModal?: boolean;
  onSuccess?: (newReview: Review) => void;
}

export default function WriteReviewForm({
  productId,
  isModal = false,
  onSuccess,
}: WriteReviewFormProps) {
  const { user, status } = useAuth();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !title.trim() || !content.trim()) return;

    if (!user) {
      setErrorMessage('Please log in to submit your product review.');
      return;
    }

    if (!productId) {
      setErrorMessage('Product reference missing. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const filteredPros = pros.map((p) => p.trim()).filter(Boolean);
    const filteredCons = cons.map((c) => c.trim()).filter(Boolean);

    const payload = {
      rating,
      title: title.trim(),
      content: content.trim(),
      pros: filteredPros,
      cons: filteredCons,
      userId: user.id,
      userName: user.name || 'Verified Customer',
      userAvatar: user.avatarUrl || null,
      userCountry: 'Bangladesh',
      userCountryCode: 'BD',
    };

    try {
      const response = await fetch(`/api/product/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setIsSubmitting(false);
      setSubmitted(true);
      if (onSuccess && data.review) {
        onSuccess(data.review);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review. Please try again.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const updatePro = (index: number, value: string) => {
    const newPros = [...pros];
    newPros[index] = value;
    setPros(newPros);
  };

  const updateCon = (index: number, value: string) => {
    const newCons = [...cons];
    newCons[index] = value;
    setCons(newCons);
  };

  return (
    <div
      className={
        isModal
          ? 'relative w-full'
          : 'mt-12 bg-[#0c1228] border border-white/5 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden'
      }
    >
      {!isModal && (
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
      )}

      {!isModal && <h3 className="text-2xl font-black text-white mb-8">Write Your Review</h3>}

      {/* Check Authentication Status */}
      {status === 'unauthenticated' || !user ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-white/10 rounded-2xl bg-white/[0.02]">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-cyan-400" />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Sign In to Write a Review</h4>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            Only authenticated PC Kinba members can post authentic product reviews and help the
            builder community.
          </p>
          <Link
            to="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Log In to Continue</span>
          </Link>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                <CheckCircle className="w-10 h-10 text-cyan-400" />
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">Review Published!</h4>
              <p className="text-gray-400 max-w-md mx-auto text-sm">
                Thank you, <span className="text-cyan-400 font-semibold">{user.name}</span>! Your review
                has been recorded and is now live for all PC builders.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setRating(0);
                  setTitle('');
                  setContent('');
                  setPros(['']);
                  setCons(['']);
                }}
                className="mt-8 px-6 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors text-sm"
              >
                Write Another Review
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="relative z-10 flex flex-col gap-6 sm:gap-8"
            >
              {/* Logged in User Bar */}
              <div className="flex items-center gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                <img
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`
                  }
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-cyan-400/40"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{user.name}</span>
                    <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      Member
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 font-medium bg-cyan-500/5 border border-cyan-500/10 px-3 py-1 rounded-xl">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Verified Author</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Rating */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Overall Rating *
                </label>
                <StarRating rating={rating} interactive onRatingChange={setRating} size="xl" />
                {rating === 0 && (
                  <p className="text-rose-400 text-xs mt-2 font-medium">Please select a star rating.</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Review Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Amazing 1440p Gaming Performance"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-sm sm:text-base"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Review Description *
                  </label>
                  <span
                    className={`text-xs font-medium ${content.length > 1000 ? 'text-rose-400' : 'text-gray-500'}`}
                  >
                    {content.length}/1000
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 1000))}
                  placeholder="What did you like or dislike about this product? How is the thermals, noise, and performance in your build?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all min-h-[140px] resize-y text-sm sm:text-base"
                  required
                />
              </div>

              {/* Pros and Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Pros
                  </label>
                  {pros.map((pro, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={pro}
                        onChange={(e) => updatePro(idx, e.target.value)}
                        placeholder="Add a pro..."
                        className="w-full bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm"
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setPros(pros.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-rose-400 p-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPros([...pros, ''])}
                    className="text-emerald-400 text-xs sm:text-sm font-medium hover:text-emerald-300 transition-colors mt-1"
                  >
                    + Add another pro
                  </button>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-rose-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Minus className="w-4 h-4" /> Cons
                  </label>
                  {cons.map((con, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={con}
                        onChange={(e) => updateCon(idx, e.target.value)}
                        placeholder="Add a con..."
                        className="w-full bg-white/5 border border-rose-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all text-sm"
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setCons(cons.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-rose-400 p-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCons([...cons, ''])}
                    className="text-rose-400 text-xs sm:text-sm font-medium hover:text-rose-300 transition-colors mt-1"
                  >
                    + Add another con
                  </button>
                </div>
              </div>

              {/* Verified Purchase Note */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Community Review Guidelines</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your authentic feedback will be immediately visible to all PC builders across the platform.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || !title.trim() || !content.trim()}
                  className="relative overflow-hidden px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                  <span className="relative flex items-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Publishing Review...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
