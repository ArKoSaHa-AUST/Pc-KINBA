import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle, Plus, Minus, X, Loader2 } from 'lucide-react';
import StarRating from './StarRating';

interface WriteReviewFormProps {
  isModal?: boolean;
}

export default function WriteReviewForm({ isModal = false }: WriteReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !title || !content) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
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
      className={`${isModal ? '' : 'mt-12'} bg-[#0c1228] border border-white/5 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />

      {!isModal && <h3 className="text-2xl font-black text-white mb-8">Write Your Review</h3>}

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-cyan-400" />
            </div>
            <h4 className="text-2xl font-bold text-white mb-2">Review Submitted!</h4>
            <p className="text-gray-400 max-w-md mx-auto">
              Thank you for sharing your feedback. Your review will be published shortly after
              moderation.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setRating(0);
                setTitle('');
                setContent('');
              }}
              className="mt-8 px-6 py-3 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
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
            className="relative z-10 flex flex-col gap-8"
          >
            {/* Rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Overall Rating *
              </label>
              <StarRating rating={rating} interactive onRatingChange={setRating} size="xl" />
              {rating === 0 && (
                <p className="text-rose-400 text-xs mt-2 font-medium">Please select a rating.</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Review Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Amazing Performance"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                required
              />
            </div>

            {/* Content */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider">
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
                placeholder="What did you like or dislike about this product?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all min-h-[150px] resize-y"
                required
              />
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Pros
                </label>
                {pros.map((pro, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={pro}
                      onChange={(e) => updatePro(idx, e.target.value)}
                      placeholder="Add a pro..."
                      className="w-full bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
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
                  className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors mt-1"
                >
                  + Add another
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-rose-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Minus className="w-4 h-4" /> Cons
                </label>
                {cons.map((con, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={con}
                      onChange={(e) => updateCon(idx, e.target.value)}
                      placeholder="Add a con..."
                      className="w-full bg-white/5 border border-rose-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
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
                  className="text-rose-400 text-sm font-medium hover:text-rose-300 transition-colors mt-1"
                >
                  + Add another
                </button>
              </div>
            </div>

            {/* Image Upload Mock */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Upload Images (Max 5)
              </label>
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-white/[0.02] hover:border-cyan-500/50 transition-all cursor-pointer group">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all">
                  <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-cyan-400" />
                </div>
                <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">SVG, PNG, JPG or GIF (max. 800x400px)</p>
              </div>
            </div>

            {/* Verified Purchase Note */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Verification Status</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  This review will be marked as{' '}
                  <span className="font-medium text-gray-300">Unverified</span> because you haven't
                  purchased this item directly from us.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={isSubmitting || rating === 0 || !title || !content}
                className="relative overflow-hidden px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <span className="relative flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
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
    </div>
  );
}
