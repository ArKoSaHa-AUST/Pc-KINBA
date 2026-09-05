import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X, ArrowUpRight, Layers } from 'lucide-react';
import { dummyAlternatives, type AlternativeProduct } from './dummyData';
import AlternativeCard from './AlternativeCard';
import AlternativeFilters from './AlternativeFilters';
import AlternativeSearch from './AlternativeSearch';
import type { ProductDetails } from '../ProductHero';

interface AlternativePartsSectionProps {
  product?: ProductDetails | null;
}

export default function AlternativePartsSection({ product }: AlternativePartsSectionProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('most-similar');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string>('Components');

  // Fetch dynamic alternative parts whenever current product changes
  useEffect(() => {
    if (!product?.id) {
      setAlternatives(dummyAlternatives);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setVisibleCount(4);
    setActiveFilter('All');
    setSearchQuery('');

    fetch(`/api/product/${product.id}/alternatives`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
          setAlternatives(data.alternatives);
          setTargetCategory(data.target_category || product.category || 'Components');
        } else {
          // If no specific alternatives found in DB, fallback to category search
          fetch(`/api/alternatives?category=${encodeURIComponent(product.category || 'Component')}&price=${product.price || 25000}`)
            .then((r) => r.json())
            .then((catData) => {
              if (isMounted && catData.success && Array.isArray(catData.alternatives) && catData.alternatives.length > 0) {
                setAlternatives(catData.alternatives);
                setTargetCategory(product.category || 'Components');
              } else if (isMounted) {
                setAlternatives(dummyAlternatives);
              }
            })
            .catch(() => {
              if (isMounted) setAlternatives(dummyAlternatives);
            });
        }
      })
      .catch((err) => {
        console.warn('Error fetching dynamic alternatives:', err);
        if (isMounted) setAlternatives(dummyAlternatives);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [product?.id, product?.category, product?.price]);

  // Toggle items in comparison tray
  const handleToggleCompare = (id: string) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        alert('You can compare a maximum of 4 products at a time.');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Filter & Sort logic
  const filteredProducts = useMemo(() => {
    const list = alternatives.length > 0 ? alternatives : dummyAlternatives;
    return list
      .filter((item) => {
        // Category filter tab
        if (activeFilter !== 'All' && item.category !== activeFilter) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesBrand = item.brand.toLowerCase().includes(q);
          const matchesChips = item.featureChips.some((chip) =>
            chip.toLowerCase().includes(q),
          );
          if (!matchesName && !matchesBrand && !matchesChips) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'best-ai-match') return b.aiMatch - a.aiMatch;
        if (sortBy === 'highest-rated') return b.rating - a.rating;
        if (sortBy === 'cheapest') return a.price - b.price;
        if (sortBy === 'best-performance') return b.scores.gaming - a.scores.gaming;
        if (sortBy === 'newest') return (b.specs?.releaseDate || '').localeCompare(a.specs?.releaseDate || '');
        return b.aiMatch - a.aiMatch; // default most-similar
      });
  }, [alternatives, activeFilter, searchQuery, sortBy]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <section
      id="alternative-parts"
      style={{ marginTop: '220px' }}
      className="relative w-full z-10 scroll-mt-28"
    >
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                🔄 Alternative Parts Suggestions
              </h2>
            </div>
            <p className="text-gray-400 max-w-2xl text-base leading-relaxed">
              Looking for something similar? Here are carefully selected{' '}
              <span className="text-cyan-400 font-semibold">{targetCategory}</span> alternatives
              based on performance, budget brackets, and real-time Bangladeshi market pricing.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 px-4 py-2.5 rounded-2xl shrink-0 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-black text-cyan-400 tracking-wide">
              Category-Aware AI Engine
            </span>
          </div>
        </div>

        {/* Controls: Search, Sort & Category Filters */}
        <div className="flex flex-col gap-6 mb-10">
          <AlternativeSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
          <AlternativeFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </div>

        {/* Floating / Active Comparison Tray Banner */}
        <AnimatePresence>
          {comparedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {comparedIds.length}
                </div>
                <div>
                  <span className="text-sm font-bold text-white">
                    Comparing {comparedIds.length} of 4 products
                  </span>
                  <p className="text-xs text-gray-400">
                    Select up to 4 items to compare side-by-side
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => alert(`Comparing products: ${comparedIds.join(', ')}`)}
                  className="px-5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-black hover:bg-cyan-300 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.4)] cursor-pointer"
                >
                  <span>Launch Side-by-Side Compare</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setComparedIds([])}
                  className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Clear comparison"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-[#0c1228] border border-white/5 rounded-3xl p-6 animate-pulse flex flex-col justify-between min-h-[460px]"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-24 h-6 bg-white/10 rounded-full" />
                    <div className="w-16 h-6 bg-white/10 rounded-full" />
                  </div>
                  <div className="aspect-[4/3] rounded-2xl bg-white/5 mb-5" />
                  <div className="w-20 h-4 bg-white/10 rounded mb-2" />
                  <div className="w-full h-6 bg-white/10 rounded mb-4" />
                  <div className="w-32 h-8 bg-white/10 rounded-xl mb-4" />
                </div>
                <div className="w-full h-10 bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : displayedProducts.length > 0 ? (
          /* Responsive Grid: 4 cards Desktop, 2 Tablet, 1 Mobile */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((altProduct) => (
              <AlternativeCard
                key={altProduct.id}
                product={altProduct}
                isCompared={comparedIds.includes(altProduct.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-[#0c1228] border border-white/5 rounded-3xl p-8">
            <Layers className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">
              No alternative products found matching "{searchQuery}" under "{activeFilter}".
            </p>
            <button
              onClick={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
              className="mt-4 text-cyan-400 font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && visibleCount < filteredProducts.length && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 4)}
              className="px-8 py-4 rounded-2xl bg-[#0c1228] border border-cyan-500/30 text-white font-extrabold text-sm hover:bg-cyan-500/10 hover:border-cyan-500/60 transition-all shadow-[0_0_20px_rgba(0,229,255,0.05)] hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>Load More Alternatives</span>
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
