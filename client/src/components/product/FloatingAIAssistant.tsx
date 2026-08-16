import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles } from 'lucide-react';

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  return (
    <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="absolute bottom-20 lg:bottom-24 right-0 w-[360px] bg-gray-900/80 backdrop-blur-3xl border border-white/10 rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight mb-0.5">
                    PC-KINBA AI
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-5 h-[350px] overflow-y-auto flex flex-col gap-5 text-sm hide-scrollbar bg-black/20">
              <div className="bg-gray-800/80 backdrop-blur-md border border-white/5 rounded-[20px] rounded-tl-sm p-4 max-w-[85%] text-gray-200 shadow-sm leading-relaxed">
                Hi! I noticed you're looking at the RTX 5060 Ti. Need help deciding if it fits your
                build?
              </div>
              <div className="self-end bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 text-white rounded-[20px] rounded-tr-sm p-4 max-w-[85%] shadow-[0_5px_15px_rgba(0,229,255,0.1)] leading-relaxed">
                Should I buy this or the RTX 4060 Ti?
              </div>
              <div className="bg-gray-800/80 backdrop-blur-md border border-white/5 rounded-[20px] rounded-tl-sm p-4 max-w-[90%] text-gray-200 shadow-sm leading-relaxed">
                <strong className="flex items-center gap-1.5 mb-2 text-cyan-400 text-xs uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> AI Recommendation
                </strong>
                The 5060 Ti offers a ~25% performance uplift over the 4060 Ti for only $50 more
                MSRP. Unless you find a heavily discounted 4060 Ti (under $299), this is the better
                buy for future-proofing your 1080p/1440p gaming.
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-gray-900/50">
              <div className="relative flex items-center bg-gray-900/80 rounded-2xl overflow-hidden border border-white/10 focus-within:border-cyan-500/50 transition-colors shadow-inner">
                <input
                  type="text"
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent py-3.5 px-5 text-sm text-white placeholder-gray-500 outline-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setInput('')}
                />
                <button
                  className="p-2 mr-2 bg-white/5 rounded-xl text-cyan-400 hover:bg-white/10 hover:text-cyan-300 transition-colors"
                  onClick={() => setInput('')}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-cyan-400 to-purple-600 shadow-[0_10px_30px_rgba(0,229,255,0.3)] flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all duration-300 group relative border border-white/20"
      >
        {!isOpen && (
          <div className="absolute inset-0 rounded-[24px] bg-cyan-400/20 animate-ping opacity-50" />
        )}
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <Bot className="w-7 h-7 text-white group-hover:-translate-y-1 transition-transform duration-300" />
        )}
      </button>
    </div>
  );
}
