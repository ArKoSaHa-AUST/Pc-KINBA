import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Zap, RefreshCw, ShoppingBag, Clock, Store, Tag } from 'lucide-react';

interface ProductListing {
  id: string;
  title: string;
  brand: string;
  price: number;
  price_str: string;
  retailer: 'StarTech BD' | 'Ryans Computers' | string;
  product_url: string;
  image_url: string;
  last_scraped_at: string;
  base_product_name?: string;
  category?: string;
  is_call_for_price?: boolean;
  estimated_price?: number;
  estimation_source?: string;
}

interface StructuredSuggestion {
  id?: string;
  title: string;
  retailer?: string;
  price?: number;
  price_str?: string;
  category?: string;
  image_url?: string;
  product_url?: string;
  type?: 'retailer_listing' | 'catalog_product' | 'keyword';
  is_call_for_price?: boolean;
  estimated_price?: number;
  estimation_source?: string;
}

const DEFAULT_TRENDING = ['RTX 4060', 'RTX 4060 Ti', 'RTX 5060', 'Ryzen 7 7700', 'Core i5 13400', 'Samsung 990 Pro'];

function formatTimeAgo(isoString: string): string {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function getRetailerBadge(retailer?: string) {
  if (!retailer) return { text: 'BD Store', bg: 'bg-white/10 border-white/20', color: 'text-white' };
  const r = retailer.toLowerCase();
  if (r.includes('startech')) return { text: 'StarTech BD', bg: 'bg-red-500/20 border-red-500/40', color: 'text-red-400' };
  if (r.includes('ryans')) return { text: 'Ryans', bg: 'bg-emerald-500/20 border-emerald-500/40', color: 'text-emerald-400' };
  if (r.includes('techland')) return { text: 'Techland BD', bg: 'bg-pink-500/20 border-pink-500/40', color: 'text-pink-400' };
  if (r.includes('skyland')) return { text: 'Skyland BD', bg: 'bg-indigo-500/20 border-indigo-500/40', color: 'text-indigo-400' };
  if (r.includes('pcb')) return { text: 'PCB Store', bg: 'bg-purple-500/20 border-purple-500/40', color: 'text-purple-400' };
  if (r.includes('global')) return { text: 'Global Brand', bg: 'bg-blue-500/20 border-blue-500/40', color: 'text-blue-400' };
  if (r.includes('sell')) return { text: 'Sell Tech', bg: 'bg-orange-500/20 border-orange-500/40', color: 'text-orange-400' };
  if (r.includes('village')) return { text: 'Computer Village', bg: 'bg-cyan-500/20 border-cyan-500/40', color: 'text-cyan-400' };
  if (r.includes('ultra')) return { text: 'UltraTech', bg: 'bg-amber-500/20 border-amber-500/40', color: 'text-amber-400' };
  if (r.includes('ucc')) return { text: 'UCC', bg: 'bg-lime-500/20 border-lime-500/40', color: 'text-lime-400' };
  return { text: retailer.replace(' BD', '').replace(' Computers', ''), bg: 'bg-white/10 border-white/20', color: 'text-cyan-300' };
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [structuredSuggestions, setStructuredSuggestions] = useState<StructuredSuggestion[]>([]);
  const [retailersFound, setRetailersFound] = useState<string[]>([]);
  const [results, setResults] = useState<ProductListing[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [detectedCategory, setDetectedCategory] = useState<string>('All');

  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query (~250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch live suggestions from database on debounced query change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setStructuredSuggestions([]);
      setRetailersFound([]);
      return;
    }

    let isMounted = true;
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(debouncedQuery.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setStructuredSuggestions(data.structured_suggestions || []);
            setRetailersFound(data.retailers_found || []);
          }
        }
      } catch (err) {
        console.error('Error fetching autosuggest:', err);
      }
    };

    fetchSuggestions();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Perform DB search
  const executeSearch = useCallback(async (searchQuery: string, categoryFilter = 'All', retailerFilter = 'All') => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setIsFocused(false);
    inputRef.current?.blur();
    setSearchParams({ q: searchQuery.trim() });

    try {
      const catParam =
        categoryFilter !== 'All' ? `&category=${encodeURIComponent(categoryFilter)}` : '';
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}${catParam}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setDetectedCategory(data.detected_category || 'All');
        setActiveFilter(retailerFilter);
        setActiveCategory(categoryFilter);
      }
    } catch (err) {
      console.error('Error executing search:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setSearchParams]);

  // Auto execute if initial URL query exists
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery, executeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionClick = (suggestionText: string, specificRetailer = 'All') => {
    setQuery(suggestionText);
    executeSearch(suggestionText, 'All', specificRetailer);
  };

  const filteredResults = results.filter((item) => {
    if (activeFilter === 'All') return true;
    return item.retailer === activeFilter;
  });

  // Calculate unique retailers and counts
  const retailerCounts = results.reduce((acc: Record<string, number>, item) => {
    acc[item.retailer] = (acc[item.retailer] || 0) + 1;
    return acc;
  }, {});

  const availableRetailers = Object.keys(retailerCounts);

  return (
    <div className="min-h-screen pt-[40px] pb-[120px] relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-cyan-400/10 rounded-full blur-[120px]" />
      </div>

      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8 flex flex-col items-center">
        {/* Search Header */}
        <motion.div
          className="text-center mb-[48px] mt-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-hero mb-4">
            Compare <span className="gradient-text">StarTech, Ryans & BD Retailers</span> Prices
          </h1>
          <p className="text-subtitle max-w-2xl mx-auto">
            Live precision component search across top BD retailers (StarTech, Ryans, Techland, Skyland,
            Global Brand, PCB Store, Computer Village, Sell Tech, UltraTech & UCC).
          </p>
        </motion.div>

        {/* Search Input Bar */}
        <motion.div
          className="w-full max-w-3xl relative z-30 mb-[60px]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <form onSubmit={handleSearchSubmit} className="relative group">
            <div
              className={`absolute -inset-1 rounded-[24px] blur-md opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 bg-gradient-to-r from-cyan-400 to-purple-500 ${isFocused ? 'opacity-75' : ''}`}
            ></div>
            <div className="relative flex items-center glass border border-border rounded-[20px] overflow-hidden shadow-2xl h-[76px]">
              <Search
                className={`ml-6 w-7 h-7 transition-colors duration-300 ${isFocused ? 'text-cyan-400' : 'text-text-muted'}`}
              />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent py-4 px-4 text-xl text-text-primary placeholder:text-text-muted outline-none"
                placeholder="Search RTX 4060, Ryzen 7, i7, SSD..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 250)}
              />
              <button
                type="submit"
                className="mr-3 p-4 rounded-xl bg-[var(--fill-subtle)] hover:bg-[var(--fill-muted)] transition-colors text-text-primary flex items-center gap-2 font-medium"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-cyan-400" />
                )}
              </button>
            </div>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 w-full mt-3 glass border border-border rounded-2xl shadow-2xl overflow-hidden z-40 bg-[var(--bg-elevated,rgba(15,23,42,0.95))] backdrop-blur-xl divide-y divide-border/40"
              >
                {/* Retailer Availability Quick Chips */}
                {retailersFound.length > 0 && (
                  <div className="p-3 bg-white/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1 shrink-0 px-2">
                      <Store className="w-3.5 h-3.5 text-cyan-400" /> Available in:
                    </span>
                    {retailersFound.map((ret) => {
                      const badge = getRetailerBadge(ret);
                      return (
                        <button
                          key={ret}
                          onMouseDown={() => handleSuggestionClick(query, ret)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shrink-0 hover:scale-105 ${badge.bg} ${badge.color}`}
                        >
                          {badge.text}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Structured Multi-Retailer Product Suggestions */}
                {structuredSuggestions.length > 0 && (
                  <div className="p-3">
                    <div className="px-3 py-1.5 text-xs font-semibold text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" /> Live Store Suggestions
                    </div>
                    <div className="space-y-1 mt-1">
                      {structuredSuggestions.map((item, idx) => {
                        const badge = getRetailerBadge(item.retailer);
                        return (
                          <button
                            key={idx}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
                            onMouseDown={() => {
                              if (item.id && item.type === 'retailer_listing') {
                                navigate(`/product/${item.id}`);
                              } else {
                                handleSuggestionClick(item.title);
                              }
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {item.retailer && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badge.bg} ${badge.color}`}>
                                  {badge.text}
                                </span>
                              )}
                              <span className="text-text-primary text-sm font-medium truncate group-hover:text-cyan-300 transition-colors">
                                {item.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.category && (
                                <span className="hidden sm:inline-block text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  {item.category}
                                </span>
                              )}
                              {item.price_str && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-xs font-bold ${item.is_call_for_price ? 'text-amber-300' : 'text-emerald-400'}`}>
                                    {item.price_str}
                                  </span>
                                  {item.is_call_for_price && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 uppercase tracking-wider">
                                      Call for Price
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Trending Badges */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider mb-2.5">
                    <Tag className="w-3 h-3 text-cyan-400" /> Popular Hardware Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_TRENDING.map((trend, idx) => (
                      <button
                        key={idx}
                        onMouseDown={() => handleSuggestionClick(trend)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/10 text-text-secondary hover:text-cyan-300 transition-all text-xs font-medium"
                      >
                        {trend}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search Results Display */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Results Top Filter Header */}
              <div className="flex flex-col gap-5 mb-8 pb-6 border-b border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-title text-2xl font-bold">
                      Results for "<span className="gradient-text">{query}</span>"
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-text-muted">
                        Found {results.length} listings across {availableRetailers.length}{' '}
                        Bangladeshi retailers
                      </p>
                      {detectedCategory !== 'All' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          Target Component: {detectedCategory}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Retailer Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
                    <button
                      onClick={() => setActiveFilter('All')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        activeFilter === 'All'
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      All Stores ({results.length})
                    </button>
                    {availableRetailers.map((store) => (
                      <button
                        key={store}
                        onClick={() => setActiveFilter(store)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                          activeFilter === store
                            ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/25 font-bold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {store} ({retailerCounts[store]})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  <span className="text-xs font-semibold text-text-muted mr-1">
                    Component Filter:
                  </span>
                  {[
                    'All',
                    'Graphics Card',
                    'Processor',
                    'Motherboard',
                    'RAM Memory',
                    'SSD Storage',
                    'Monitor',
                    'UPS & Power',
                    'Pendrive / Storage',
                    'Power Supply',
                    'Casing',
                    'Cooler',
                    'Laptop',
                    'Desktop PC',
                  ].map((cat) => {
                    const isSelected = activeCategory === cat;
                    const isDetected = detectedCategory === cat && activeCategory === 'All';
                    return (
                      <button
                        key={cat}
                        onClick={() => executeSearch(query, cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-bold'
                            : isDetected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-white/5 text-text-muted hover:text-text-primary hover:bg-white/10'
                        }`}
                      >
                        {cat}
                        {isDetected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Empty Results State */}
              {filteredResults.length === 0 && !isLoading && (
                <div className="glass p-12 rounded-3xl text-center max-w-lg mx-auto my-12 border border-border">
                  <ShoppingBag className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-text-primary mb-2">No listings found</h3>
                  <p className="text-text-muted text-sm mb-6">
                    We couldn't find any products matching "{query}" under {activeFilter}.
                  </p>
                  <button
                    onClick={() => executeSearch('rtx 4060')}
                    className="button-primary px-6 py-2.5 text-sm"
                  >
                    Try "rtx 4060"
                  </button>
                </div>
              )}

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredResults.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.03 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="group relative flex flex-col glass border border-border rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300 shadow-xl cursor-pointer"
                  >
                    {/* Top Scrape Time Badge */}
                    <div className="p-4 pb-2 flex items-center justify-end z-10">
                      <span className="text-[11px] text-text-muted flex items-center gap-1 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                        <Clock className="w-3 h-3 text-text-muted" />
                        {formatTimeAgo(product.last_scraped_at)}
                      </span>
                    </div>

                    {/* Product Image Area */}
                    <div className="relative h-48 p-4 flex items-center justify-center bg-black/20 overflow-hidden">
                      <img
                        src={
                          product.image_url ||
                          'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800'
                        }
                        alt={product.title}
                        className="object-contain h-full max-w-full transform group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                    </div>

                    {/* Content Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          {product.brand && (
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
                              {product.brand}
                            </span>
                          )}
                          {product.category && (
                            <span className="text-[10px] font-semibold text-cyan-300/90 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                              {product.category}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors mb-3">
                          {product.title}
                        </h3>
                      </div>

                      {/* Price and Action Button */}
                      <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-auto">
                        <div>
                          <span className="text-[10px] text-text-muted block uppercase tracking-wider font-semibold">
                            Price (BDT)
                          </span>
                          {(() => {
                            const rawCardPrice =
                              typeof product.price === 'number'
                                ? product.price
                                : parseInt(String(product.price || '').replace(/[^0-9]/g, ''), 10);
                            const isCardCallForPrice =
                              isNaN(rawCardPrice) ||
                              rawCardPrice <= 0 ||
                              product.price_str === 'Call for Price' ||
                              Boolean(product.is_call_for_price);
                            const cardPriceNum =
                              !isNaN(rawCardPrice) && rawCardPrice > 0
                                ? rawCardPrice
                                : product.estimated_price && product.estimated_price > 0
                                  ? product.estimated_price
                                  : 25000;
                            const cardPriceDisplay = `${cardPriceNum.toLocaleString()}৳`;

                            return (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                                  {cardPriceDisplay}
                                </span>
                                {isCardCallForPrice && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 uppercase tracking-wider">
                                    Call for Price
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <Link
                          to={`/product/${product.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
