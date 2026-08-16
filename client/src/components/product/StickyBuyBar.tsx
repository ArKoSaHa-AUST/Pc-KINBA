import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

export default function StickyBuyBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 w-full z-40 px-4 pb-6 lg:pb-8 pointer-events-none"
        >
          <div className="container max-w-[800px] mx-auto relative">
            <div className="absolute inset-0 bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="bg-gray-900/60 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2.5 flex items-center justify-between pointer-events-auto relative z-10 transition-all hover:bg-gray-900/70 hover:border-white/20">
              <div className="flex items-center gap-4 pl-3">
                <img
                  src="https://images.unsplash.com/photo-1590253232292-5c0c4c04e428?auto=format&fit=crop&q=80&w=100"
                  alt="Product Thumbnail"
                  className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-full border-2 border-white/10 shadow-lg"
                />
                <div className="hidden sm:block">
                  <h4 className="font-bold text-white text-base tracking-tight mb-0.5">
                    NVIDIA RTX 5060 Ti
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                    <p className="text-cyan-400 text-xs font-semibold tracking-wider uppercase">
                      AI Score: 93
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pr-1">
                <span className="text-2xl font-bold text-white hidden sm:block tracking-tight">
                  $399
                </span>
                <button className="bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 px-6 md:px-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-95 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <ShoppingCart className="w-4 h-4" /> Buy Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
