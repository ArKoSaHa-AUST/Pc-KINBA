import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Check,
  Plus,
} from 'lucide-react';
import type { AlternativeProduct } from './dummyData';

interface AlternativeCardProps {
  product: AlternativeProduct;
  isCompared: boolean;
  onToggleCompare: (id: string) => void;
}

export default function AlternativeCard({
  product,
  isCompared,
  onToggleCompare,
}: AlternativeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCheaper = product.priceDiff < 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-[#0c1228] border border-white/8 hover:border-cyan-500/30 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,229,255,0.08)] flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${product.badgeColor} flex items-center gap-1.5 shadow-sm`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {product.badge}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-white bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="text-cyan-400">{product.aiMatch}%</span> Match
            </span>
          </div>
        </div>

        {/* Product Image */}
        <div className="relative aspect-[4/3] rounded-2xl bg-white/[0.02] border border-white/5 p-4 mb-5 overflow-hidden flex items-center justify-center group-hover:bg-white/[0.04] transition-colors">
          {product.discount > 0 && (
            <span className="absolute top-3 left-3 text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
              {product.discount}% OFF
            </span>
          )}
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Title & Brand */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {product.brand}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-white">{product.rating}</span>
              <span className="text-[11px] text-gray-500">({product.reviewsCount})</span>
            </div>
          </div>
          <h4 className="text-lg font-extrabold text-white leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2">
            {product.name}
          </h4>
        </div>

        {/* Price & Price Difference */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-2xl font-black text-white">
                ৳{product.price.toLocaleString()}
              </span>
              {product.oldPrice > product.price && (
                <span className="text-xs text-gray-500 line-through ml-2">
                  ৳{product.oldPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Price Difference Badge */}
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                isCheaper
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {isCheaper ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  -৳{Math.abs(product.priceDiff).toLocaleString()}
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  +৳{product.priceDiff.toLocaleString()}
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {product.lowestStore} ({product.storeCount} stores)
            </span>
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              {product.priceTrend.direction === 'down' ? '↓' : '↑'} {product.priceTrend.percent}%
              (30d)
            </span>
          </div>
        </div>

        {/* AI Recommendation Explanation */}
        <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-3.5 mb-5 text-xs text-cyan-200/90 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>{product.recommendationQuote}</span>
        </div>

        {/* Mini Benchmark Bars */}
        <div className="space-y-2 mb-5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Key Benchmarks
          </span>
          {product.benchmarks.map((bench, idx) => (
            <div key={idx} className="text-xs">
              <div className="flex justify-between text-gray-300 font-medium mb-1">
                <span>{bench.label}</span>
                <span className="font-bold text-cyan-400">{bench.diffText}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  style={{
                    width: `${Math.min(100, (bench.altVal / Math.max(bench.targetVal, bench.altVal)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Feature Chips */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {product.featureChips.map((chip, idx) => (
            <span
              key={idx}
              className="text-[11px] font-semibold text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable Details Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-6 pt-4 border-t border-white/10 space-y-5"
          >
            {/* Recommendation Reasons */}
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-2">
                Recommended Because
              </span>
              <div className="space-y-1.5">
                {product.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Specifications Grid */}
            <div className="bg-white/5 rounded-xl p-3.5 text-xs space-y-2 border border-white/5">
              <span className="font-bold text-white block mb-1">Specifications</span>
              <div className="grid grid-cols-2 gap-2 text-gray-400">
                <div>
                  VRAM: <span className="text-white font-medium">{product.specs.vram}</span>
                </div>
                <div>
                  Bus: <span className="text-white font-medium">{product.specs.bus}</span>
                </div>
                <div>
                  TDP: <span className="text-white font-medium">{product.specs.power}</span>
                </div>
                <div>
                  Warranty: <span className="text-white font-medium">{product.specs.warranty}</span>
                </div>
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <span className="font-bold text-emerald-400 block mb-1">Pros</span>
                {product.pros.map((p, i) => (
                  <p key={i} className="text-gray-300 text-[11px] mb-0.5">
                    • {p}
                  </p>
                ))}
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <span className="font-bold text-rose-400 block mb-1">Cons</span>
                {product.cons.map((c, i) => (
                  <p key={i} className="text-gray-300 text-[11px] mb-0.5">
                    • {c}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-white/5">
        <button
          onClick={() => onToggleCompare(product.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            isCompared
              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]'
              : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
          }`}
        >
          {isCompared ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {isCompared ? 'Compared' : 'Compare'}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
        >
          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className={`p-2.5 rounded-xl border transition-colors ${
            isFavorited
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          }`}
          title="Save to Wishlist"
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors relative"
          title="Share Product"
        >
          <Share2 className="w-4 h-4" />
          {copied && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-2 py-0.5 rounded shadow">
              Copied!
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
