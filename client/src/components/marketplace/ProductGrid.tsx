import {
  LayoutGrid,
  Grid3X3,
  List,
  SlidersHorizontal,
  X,
  Search,
  PackageOpen,
  ArrowUpDown,
} from 'lucide-react';
import { ProductCard } from './ProductCard';
import type { ProductComponent, FilterState } from '../../types/components';
import { useComponentStore, DEFAULT_PRICE_RANGE } from '../../store/useComponentStore';

interface ProductGridProps {
  products: ProductComponent[];
  isLoading: boolean;
  totalCount: number;
  onOpenMobileFilters: () => void;
}

export default function ProductGrid({
  products,
  isLoading,
  totalCount,
  onOpenMobileFilters,
}: ProductGridProps) {
  const filters = useComponentStore((s) => s.filters);
  const setFilter = useComponentStore((s) => s.setFilter);
  const removeFilterChip = useComponentStore((s) => s.removeFilterChip);
  const clearAllFilters = useComponentStore((s) => s.clearAllFilters);

  // Active filter chips computation
  const activeChips: { label: string; onRemove: () => void }[] = [];

  if (filters.category !== 'all') {
    activeChips.push({
      label: `Category: ${filters.category.toUpperCase()}`,
      onRemove: () => removeFilterChip('category'),
    });
  }

  if (filters.subcategory !== 'all') {
    activeChips.push({
      label: `Sub: ${filters.subcategory}`,
      onRemove: () => removeFilterChip('subcategory'),
    });
  }

  filters.brands.forEach((brand) => {
    activeChips.push({
      label: `Brand: ${brand}`,
      onRemove: () => removeFilterChip('brand', brand),
    });
  });

  filters.retailers.forEach((ret) => {
    activeChips.push({
      label: `Store: ${ret}`,
      onRemove: () => removeFilterChip('retailer', ret),
    });
  });

  if (filters.inStockOnly) {
    activeChips.push({
      label: 'In Stock Only',
      onRemove: () => removeFilterChip('inStock'),
    });
  }

  if (filters.onSaleOnly) {
    activeChips.push({
      label: 'On Sale Only',
      onRemove: () => removeFilterChip('onSale'),
    });
  }

  if (
    filters.priceRange[0] > DEFAULT_PRICE_RANGE[0] ||
    filters.priceRange[1] < DEFAULT_PRICE_RANGE[1]
  ) {
    activeChips.push({
      label: `৳${filters.priceRange[0].toLocaleString()} - ৳${filters.priceRange[1].toLocaleString()}`,
      onRemove: () => setFilter('priceRange', DEFAULT_PRICE_RANGE),
    });
  }

  Object.entries(filters.dynamicSpecs).forEach(([specKey, values]) => {
    values.forEach((v) => {
      activeChips.push({
        label: `${specKey}: ${v}`,
        onRemove: () => removeFilterChip('spec', specKey, v),
      });
    });
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top Controls Toolbar */}
      <div className="bg-bg-surface/80 backdrop-blur-md border border-border rounded-2xl p-4 mb-6 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Result Counter & Search in Category */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onOpenMobileFilters}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/20 border border-accent/40 text-accent font-semibold text-xs tracking-wide cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search in components..."
              value={filters.searchQuery}
              onChange={(e) => setFilter('searchQuery', e.target.value)}
              className="w-full bg-bg-primary/80 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:border-accent"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilter('searchQuery', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="hidden sm:block text-xs text-text-muted whitespace-nowrap">
            Showing <strong className="text-text-primary font-bold">{totalCount}</strong> results
          </div>
        </div>

        {/* Right: Sort By & View Layout Mode */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilter('sortBy', e.target.value as FilterState['sortBy'])}
              className="bg-bg-primary border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary font-medium focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="featured">Featured / Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="discount">Biggest Discount %</option>
              <option value="newest">Newest Releases</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-bg-primary border border-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setFilter('viewMode', 'grid-4')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                filters.viewMode === 'grid-4'
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-white'
              }`}
              title="4-Column Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilter('viewMode', 'grid-3')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                filters.viewMode === 'grid-3'
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-white'
              }`}
              title="3-Column Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilter('viewMode', 'list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                filters.viewMode === 'list'
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-fadeIn">
          <span className="text-xs font-semibold uppercase text-text-muted mr-1">Active:</span>
          {activeChips.map((chip, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bg-surface border border-accent/30 text-accent shadow-sm"
            >
              <span>{chip.label}</span>
              <button
                onClick={chip.onRemove}
                className="hover:text-white transition-colors cursor-pointer"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            onClick={clearAllFilters}
            className="text-xs text-text-muted hover:text-accent underline transition-colors cursor-pointer ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div
          className={`grid gap-5 ${
            filters.viewMode === 'grid-4'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : filters.viewMode === 'grid-3'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
          }`}
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-bg-surface/60 border border-border/60 rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="w-full pt-[75%] bg-bg-primary/80 rounded-xl" />
              <div className="h-4 bg-bg-primary/80 rounded w-1/3" />
              <div className="h-6 bg-bg-primary/80 rounded w-4/5" />
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-bg-primary/60 rounded w-full" />
                <div className="h-3 bg-bg-primary/60 rounded w-3/4" />
              </div>
              <div className="h-8 bg-bg-primary/80 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <div className="bg-bg-surface/50 border border-dashed border-border rounded-3xl p-12 text-center flex flex-col items-center justify-center my-8">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">No Components Found</h3>
          <p className="text-sm text-text-muted max-w-md mb-6">
            We couldn't find any PC parts matching your active filter criteria. Try clearing some
            filters or search for another model.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 rounded-xl bg-accent text-black font-bold text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Main Responsive Grid */}
      {!isLoading && products.length > 0 && (
        <div
          className={`grid gap-5 ${
            filters.viewMode === 'grid-4'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : filters.viewMode === 'grid-3'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
          }`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
