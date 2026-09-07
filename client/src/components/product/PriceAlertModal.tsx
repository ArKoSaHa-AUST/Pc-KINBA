import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BellRing,
  CheckCircle,
  TrendingDown,
  Loader2,
  Mail,
  UserCheck,
  BellOff,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import type { ProductDetails } from './ProductHero';

interface PriceAlertModalProps {
  product?: ProductDetails | null;
  bestPriceStr?: string;
  isOpen: boolean;
  onClose: () => void;
  isSubscribed: boolean;
  onSubscriptionChange: (subscribed: boolean) => void;
}

export default function PriceAlertModal({
  product,
  bestPriceStr,
  isOpen,
  onClose,
  isSubscribed,
  onSubscriptionChange,
}: PriceAlertModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [notifyAnyChange, setNotifyAnyChange] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Lock background page scroll while modal is active
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

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0px';
    document.body.style.right = '0px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.left = prevLeft;
      document.body.style.right = prevRight;
      document.body.style.width = prevWidth;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted) return null;

  const currentPriceDisplay =
    bestPriceStr ||
    product?.price_str ||
    (product?.price ? `৳${product.price.toLocaleString()}` : 'Market Price');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (user?.email || email).trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address to receive price drop alerts.');
      return;
    }

    if (!product?.id) {
      setErrorMessage('Product reference is missing. Please reload the page.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        email: targetEmail,
        userId: user?.id || null,
        userName: user?.name || 'PC Builder',
        productTitle: product.title || 'Component',
        productImage: product.image_url || null,
        productUrl: product.product_url || null,
        currentPrice: product.price || product.best_price || null,
        targetPrice: targetPrice ? Number(targetPrice) : null,
        notifyOnAnyChange: notifyAnyChange,
      };

      const res = await fetch(`/api/product/${product.id}/price-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to activate price alert');
      }

      onSubscriptionChange(true);
      setSuccessMessage('Price alert activated! You will receive email notifications when the price drops or changes.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error setting up price alert';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!product?.id) return;
    const targetEmail = (user?.email || email).trim().toLowerCase();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/product/${product.id}/price-alert`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, userId: user?.id || null }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel price alert');
      }

      onSubscriptionChange(false);
      setSuccessMessage('Price alert cancelled.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling price alert';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[#0c1228] border border-rose-500/30 rounded-3xl shadow-[0_0_80px_rgba(244,63,94,0.3)] overflow-hidden z-10 select-text"
          >
            {/* Ambient Red/Cyan Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/15 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-center justify-between p-6 sm:p-7 border-b border-white/10 bg-[#080d1a]/80 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  <BellRing className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span>Price Change Alert</span>
                  </h3>
                  <p className="text-xs text-gray-400">Get notified the second the price updates or drops</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-105"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-7 space-y-6 relative">
              {/* Product Snippet */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                {product?.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.title || 'Product'}
                    className="w-14 h-14 object-contain rounded-xl bg-black/40 p-1 border border-white/5 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {product?.title || 'Component Listing'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">Best Price:</span>
                    <span className="text-sm font-extrabold text-green-400 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {currentPriceDisplay}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback Alert Banners */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs sm:text-sm font-semibold"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Subscription Form */}
              <form onSubmit={handleSubscribe} className="space-y-4">
                {/* Email Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Notification Email *
                  </label>
                  {user ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-cyan-500/30">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.name || 'Member'}</p>
                        <p className="text-xs text-cyan-300 truncate">{user.email}</p>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase">
                        Active Account
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Optional Target Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Target Alert Price (৳ Optional)
                  </label>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="e.g. 50000 (Notify if price drops below this)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Leave blank to be alerted on any price drop across all Bangladesh tech stores.
                  </p>
                </div>

                {/* Notify On Any Change Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={notifyAnyChange}
                    onChange={(e) => setNotifyAnyChange(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-white/20 bg-white/5"
                  />
                  <span className="text-xs text-gray-300">
                    Notify me when any retailer updates pricing or new deals are discovered
                  </span>
                </label>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  {isSubscribed ? (
                    <>
                      <button
                        type="button"
                        onClick={handleUnsubscribe}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <BellOff className="w-4 h-4 text-rose-400" />
                        )}
                        <span>Unsubscribe</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span>Update Alert</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs sm:text-sm font-extrabold shadow-[0_0_25px_rgba(244,63,94,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BellRing className="w-4 h-4" />
                      )}
                      <span>Activate Price Alert</span>
                    </button>
                  )}
                </div>

                {!user && (
                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-gray-500">
                      Have an account?{' '}
                      <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
                        Log In to sync alerts across all devices
                      </Link>
                    </p>
                  </div>
                )}
              </form>

              {/* Safe Trust Note */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                <span>Zero spam guarantee. Unsubscribe anytime in 1-click.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
