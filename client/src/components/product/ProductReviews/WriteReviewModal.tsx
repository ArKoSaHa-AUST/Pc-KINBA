import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import WriteReviewForm from './WriteReviewForm';
import type { Review } from './dummyData';

interface WriteReviewModalProps {
  productId?: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: (newReview: Review) => void;
}

export default function WriteReviewModal({
  productId,
  isOpen,
  onClose,
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Lock background page scroll completely and handle mouse wheel / touch / keyboard interactions
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

    // Pin the background page firmly in place
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0px';
    document.body.style.right = '0px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Route wheel events into the modal and prevent all background movement
    const handleWheel = (e: WheelEvent) => {
      const modalEl = scrollRef.current;
      if (!modalEl) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const target = e.target as HTMLElement | null;

      // Check if event target is inside a scrollable textarea
      if (target && target.tagName === 'TEXTAREA') {
        const ta = target as HTMLTextAreaElement;
        if (ta.scrollHeight > ta.clientHeight) {
          const atTop = ta.scrollTop <= 0 && e.deltaY < 0;
          const atBottom = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 1 && e.deltaY > 0;
          if (!atTop && !atBottom) {
            // Let the textarea scroll internally
            return;
          }
        }
      }

      // Block all window/page background scrolling
      e.preventDefault();
      e.stopPropagation();

      // If pointer is inside or over the modal container, scroll the modal body directly
      if (modalEl.contains(target) || (target && target.closest?.('[data-modal-container="true"]'))) {
        modalEl.scrollTop += e.deltaY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const modalEl = scrollRef.current;
      const target = e.target as HTMLElement | null;
      if (!modalEl || !target || !modalEl.contains(target)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // Initial check for scroll indicator
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight } = scrollRef.current;
        setCanScrollDown(scrollHeight > clientHeight + 20);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.left = prevLeft;
      document.body.style.right = prevRight;
      document.body.style.width = prevWidth;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setScrollProgress(progress);
      setCanScrollDown(maxScroll - scrollTop > 25);
    } else {
      setScrollProgress(0);
      setCanScrollDown(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none"
          style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Window Container */}
          <motion.div
            data-modal-container="true"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[85vh] bg-[#080d1a] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,229,255,0.25)] flex flex-col min-h-0 overflow-hidden z-10 select-text"
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-6 sm:p-8 border-b border-white/10 bg-[#0c1228]/95 backdrop-blur-xl shrink-0 z-20">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <span>⭐ Write Your Review</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Share your authentic hardware experience with the community
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrolling Progress Effect Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.9)] transition-all duration-150 ease-out"
                  style={{ width: `${Math.max(5, scrollProgress * 100)}%` }}
                />
              </div>
            </div>

            {/* Top Ambient Scroll Shadow Effect */}
            <div
              className={`absolute top-[88px] sm:top-[96px] left-0 right-0 h-6 bg-gradient-to-b from-[#080d1a]/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
                scrollProgress > 0.02 ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Modal Scrollable Body */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 custom-scrollbar relative"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
              }}
            >
              <WriteReviewForm
                productId={productId}
                isModal
                onSuccess={(newRev) => {
                  onReviewSubmitted?.(newRev);
                }}
              />
            </div>

            {/* Bottom Ambient Scroll Shadow Effect */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/60 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
                canScrollDown ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Floating "Scroll for More" Action Badge */}
            <AnimatePresence>
              {canScrollDown && (
                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0c1228]/95 border border-cyan-500/40 text-cyan-400 text-xs font-bold shadow-[0_0_25px_rgba(0,229,255,0.35)] backdrop-blur-md hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all group cursor-pointer"
                >
                  <span>Scroll for more</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce text-cyan-300" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
