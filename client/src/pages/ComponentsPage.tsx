import { useState, useEffect } from 'react';
import CategoryHeroBanner from '../components/marketplace/CategoryHeroBanner';
import CategoryTaxonomyNav from '../components/marketplace/CategoryTaxonomyNav';
import FilterSidebar from '../components/marketplace/FilterSidebar';
import FilterMobileDrawer from '../components/marketplace/FilterMobileDrawer';
import ProductGrid from '../components/marketplace/ProductGrid';
import ProductQuickViewModal from '../components/marketplace/ProductQuickViewModal';
import CompareDrawer from '../components/marketplace/CompareDrawer';
import RecentlyViewed from '../components/marketplace/RecentlyViewed';
import AICompatibilityTip from '../components/marketplace/AICompatibilityTip';
import { useFilterSync } from '../hooks/useFilterSync';
import { useComponentQuery } from '../hooks/useComponentQuery';
import { useRealtimeStock } from '../hooks/useRealtimeStock';

export default function ComponentsPage() {
  // Sync URL search params with Zustand store
  useFilterSync();

  // Supabase Realtime Subscription for stock and price updates
  useRealtimeStock();

  // Query & Filter Pipeline (Connected to Supabase)
  const { products, totalCount, isLoading, availableBrands, availableRetailers } =
    useComponentQuery();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary pt-4 pb-32">
      <div className="container max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8">
        {/* Page Hero Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-text-primary mb-2">
            PC Components & Hardware
          </h1>
          <p className="text-sm sm:text-base text-text-muted max-w-3xl leading-relaxed">
            Discover, compare, and verify authentic computer components across all major Bangladeshi
            retailers with live Supabase database pricing, technical specifications, and AI
            compatibility checks.
          </p>
        </div>

        {/* 1. Diagonal Segmented Category Hero Banner */}
        <CategoryHeroBanner />

        {/* 2. AI Hardware Compatibility Tip */}
        <AICompatibilityTip />

        {/* 3. Category Taxonomy & Subcategory Navigation */}
        <CategoryTaxonomyNav />

        {/* 4. Main Marketplace Layout (Sticky Left Sidebar + Right Responsive Grid) */}
        <div className="flex items-start gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block w-72 flex-shrink-0 sticky top-24">
            <FilterSidebar
              availableBrands={availableBrands}
              availableRetailers={availableRetailers}
            />
          </div>

          {/* Right Product Grid */}
          <ProductGrid
            products={products}
            isLoading={isLoading}
            totalCount={totalCount}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
          />
        </div>

        {/* 5. Recently Viewed Hardware Carousel */}
        <RecentlyViewed />
      </div>

      {/* Mobile Filters Slide-Over Drawer */}
      <FilterMobileDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        availableBrands={availableBrands}
        availableRetailers={availableRetailers}
        totalCount={totalCount}
      />

      {/* Floating Compare Bottom Drawer + Comparison Matrix Modal */}
      <CompareDrawer />

      {/* Quick View Product Modal */}
      <ProductQuickViewModal />
    </div>
  );
}
