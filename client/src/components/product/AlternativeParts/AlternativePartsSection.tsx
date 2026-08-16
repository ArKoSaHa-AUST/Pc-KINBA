import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X, ArrowUpRight } from 'lucide-react';
import { dummyAlternatives } from './dummyData';
import AlternativeCard from './AlternativeCard';
import AlternativeFilters from './AlternativeFilters';
import AlternativeSearch from './AlternativeSearch';

export default function AlternativePartsSection() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('most-similar');
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(4);

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
    return dummyAlternatives
      .filter((product) => {
        // Category filter
        if (activeFilter !== 'All' && product.category !== activeFilter) {
          return false;
        }
        // Search filter
        if (
          searchQuery.trim() &&
          !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.brand.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.featureChips.some((chip) =>
            chip.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'best-ai-match') return b.aiMatch - a.aiMatch;
        if (sortBy === 'highest-rated') return b.rating - a.rating;
        if (sortBy === 'cheapest') return a.price - b.price;
        if (sortBy === 'best-performance') return b.scores.gaming - a.scores.gaming;
        if (sortBy === 'newest') return b.specs.releaseDate.localeCompare(a.specs.releaseDate);
        return b.aiMatch - a.aiMatch; // default most-similar
      });
  }, [activeFilter, searchQuery, sortBy]);

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
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
                🔄 Alternative Parts Suggestions
              </h2>
            </div>
            <p className="text-gray-400 max-w-2xl text-base leading-relaxed">
              Looking for something similar? Here are carefully selected alternatives based on
              performance, budget, and AI user preference analysis.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 px-4 py-2.5 rounded-2xl shrink-0 shadow-[0_0_30px_rgba(0,229,255,0.08)]">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-black text-cyan-400 tracking-wide">
              Based on AI Recommendations
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
                  className="px-5 py-2 rounded-xl bg-cyan-400 text-black text-xs font-black hover:bg-cyan-300 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                >
                  <span>Launch Side-by-Side Compare</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setComparedIds([])}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Clear comparison"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Responsive Grid: 4 cards Desktop, 2 Tablet, 1 Mobile */}
        {displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <AlternativeCard
                key={product.id}
                product={product}
                isCompared={comparedIds.includes(product.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-[#0c1228] border border-white/5 rounded-3xl p-8">
            <p className="text-gray-400 text-lg">
              No alternative products found matching your filters.
            </p>
            <button
              onClick={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
              className="mt-4 text-cyan-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Load More Button */}
        {visibleCount < filteredProducts.length && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 4)}
              className="px-8 py-4 rounded-2xl bg-[#0c1228] border border-cyan-500/30 text-white font-extrabold text-sm hover:bg-cyan-500/10 hover:border-cyan-500/60 transition-all shadow-[0_0_20px_rgba(0,229,255,0.05)] hover:scale-105 active:scale-95 flex items-center gap-2"
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
