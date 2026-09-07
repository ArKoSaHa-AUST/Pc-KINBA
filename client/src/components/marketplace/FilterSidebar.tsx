import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  Check,
  Tag,
  DollarSign,
  Building2,
  Cpu,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFiltersConfig } from '../../api/filters';
import { CATEGORY_FACETS } from '../../data/categoryTaxonomy';
import { useComponentStore, DEFAULT_PRICE_RANGE } from '../../store/useComponentStore';

interface FilterSidebarProps {
  availableBrands: { brand: string; count: number }[];
  availableRetailers: string[];
}

export default function FilterSidebar({ availableBrands, availableRetailers }: FilterSidebarProps) {
  const filters = useComponentStore((s) => s.filters);
  const setFilter = useComponentStore((s) => s.setFilter);
  const toggleBrand = useComponentStore((s) => s.toggleBrand);
  const toggleRetailer = useComponentStore((s) => s.toggleRetailer);
  const toggleDynamicSpec = useComponentStore((s) => s.toggleDynamicSpec);
  const clearAllFilters = useComponentStore((s) => s.clearAllFilters);

  const [brandSearch, setBrandSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    stock: true,
    brand: true,
    retailer: true,
    socket: true,
    chipset: true,
    vram: true,
    memory_type: true,
    capacity: true,
    form_factor: true,
    wattage: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch dynamic facets from Supabase filters_config table
  const { data: dbFacets } = useQuery({
    queryKey: ['filters-config', filters.category],
    queryFn: () => getFiltersConfig(filters.category),
    enabled: filters.category !== 'all',
    staleTime: 1000 * 60 * 10,
  });

  const dynamicFacets =
    filters.category !== 'all'
      ? dbFacets && dbFacets.length > 0
        ? dbFacets
        : CATEGORY_FACETS[filters.category] || []
      : [];

  const filteredBrands = availableBrands.filter((b) =>
    b.brand.toLowerCase().includes(brandSearch.toLowerCase().trim()),
  );

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.subcategory !== 'all' ||
    filters.brands.length > 0 ||
    filters.retailers.length > 0 ||
    filters.inStockOnly ||
    filters.onSaleOnly ||
    filters.priceRange[0] > DEFAULT_PRICE_RANGE[0] ||
    filters.priceRange[1] < DEFAULT_PRICE_RANGE[1] ||
    Object.keys(filters.dynamicSpecs).length > 0;

  return (
    <aside className="w-full bg-bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-lg select-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-accent" />
          <h3 className="font-bold text-sm text-text-primary uppercase tracking-wider">
            Filter Components
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs text-accent hover:underline transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 1. Quick Availability & Deals */}
      <div className="space-y-3 pb-4 border-b border-border">
        <label className="flex items-center justify-between p-2.5 rounded-xl bg-bg-primary/50 hover:bg-bg-primary/80 border border-border/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
            </span>
            <span className="text-xs font-semibold text-text-primary">In Stock Only</span>
          </div>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => setFilter('inStockOnly', e.target.checked)}
            className="w-4 h-4 rounded text-accent focus:ring-accent bg-bg-surface border-border cursor-pointer accent-cyan-400"
          />
        </label>

        <label className="flex items-center justify-between p-2.5 rounded-xl bg-bg-primary/50 hover:bg-bg-primary/80 border border-border/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger/20 text-danger border border-danger/40">
              SALE
            </span>
            <span className="text-xs font-semibold text-text-primary">On Discount</span>
          </div>
          <input
            type="checkbox"
            checked={filters.onSaleOnly}
            onChange={(e) => setFilter('onSaleOnly', e.target.checked)}
            className="w-4 h-4 rounded text-accent focus:ring-accent bg-bg-surface border-border cursor-pointer accent-cyan-400"
          />
        </label>
      </div>

      {/* 2. Price Range Slider */}
      <div className="pb-4 border-b border-border">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left font-semibold text-xs text-text-primary uppercase tracking-wider mb-3 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-accent" />
            Price Range (৳ BDT)
          </span>
          {openSections.price ? (
            <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          )}
        </button>

        {openSections.price && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex-1 bg-bg-primary border border-border rounded-lg p-2">
                <span className="text-[10px] text-text-muted block">Min</span>
                <span className="font-semibold text-text-primary">
                  ৳{filters.priceRange[0].toLocaleString()}
                </span>
              </div>
              <span className="text-text-muted">-</span>
              <div className="flex-1 bg-bg-primary border border-border rounded-lg p-2 text-right">
                <span className="text-[10px] text-text-muted block">Max</span>
                <span className="font-semibold text-accent">
                  ৳{filters.priceRange[1].toLocaleString()}
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={500000}
              step={2000}
              value={filters.priceRange[1]}
              onChange={(e) =>
                setFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value, 10)])
              }
              className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
            />

            <div className="flex items-center gap-1.5 pt-1">
              {[50000, 100000, 200000, 500000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setFilter('priceRange', [0, preset])}
                  className={`flex-1 py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                    filters.priceRange[1] === preset
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-bg-primary/60 border-border text-text-muted hover:text-white'
                  }`}
                >
                  &lt;৳{preset >= 100000 ? `${preset / 100000}L` : `${preset / 1000}k`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Brands Multi-Select */}
      {availableBrands.length > 0 && (
        <div className="pb-4 border-b border-border">
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center justify-between w-full text-left font-semibold text-xs text-text-primary uppercase tracking-wider mb-2.5 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              Brand ({availableBrands.length})
            </span>
            {openSections.brand ? (
              <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>

          {openSections.brand && (
            <div className="space-y-2 pt-1">
              {availableBrands.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search brands..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg pl-7 pr-2 py-1 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {filteredBrands.map(({ brand, count }) => {
                  const isChecked = filters.brands.includes(brand);
                  return (
                    <label
                      key={brand}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-primary/80 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-accent border-accent text-black font-bold'
                              : 'border-border bg-bg-primary'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span
                          className={isChecked ? 'font-semibold text-accent' : 'text-text-primary'}
                        >
                          {brand}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-primary border border-border/50">
                        {count}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBrand(brand)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Dynamic Category Facets (Socket, Cores, VRAM, Form Factor, etc.) */}
      {dynamicFacets.map((facet) => {
        const isOpen = openSections[facet.id] ?? true;
        const selectedValues = filters.dynamicSpecs[facet.id] || [];

        return (
          <div key={facet.id} className="pb-4 border-b border-border">
            <button
              onClick={() => toggleSection(facet.id)}
              className="flex items-center justify-between w-full text-left font-semibold text-xs text-text-primary uppercase tracking-wider mb-2.5 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                {facet.title}
              </span>
              {isOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              )}
            </button>

            {isOpen && (
              <div className="space-y-1.5 pt-1">
                {facet.options.map((opt) => {
                  const isChecked = selectedValues.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-primary/80 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-accent border-accent text-black font-bold'
                              : 'border-border bg-bg-primary'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span
                          className={isChecked ? 'font-semibold text-accent' : 'text-text-primary'}
                        >
                          {opt.label}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDynamicSpec(facet.id, opt.value)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 5. Retailers in BD */}
      {availableRetailers.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('retailer')}
            className="flex items-center justify-between w-full text-left font-semibold text-xs text-text-primary uppercase tracking-wider mb-2.5 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              BD Retailers
            </span>
            {openSections.retailer ? (
              <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>

          {openSections.retailer && (
            <div className="space-y-1.5 pt-1">
              {availableRetailers.map((ret) => {
                const isChecked = filters.retailers.includes(ret);
                return (
                  <label
                    key={ret}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-primary/80 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-accent border-accent text-black font-bold'
                            : 'border-border bg-bg-primary'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span
                        className={isChecked ? 'font-semibold text-accent' : 'text-text-primary'}
                      >
                        {ret}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRetailer(ret)}
                      className="sr-only"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
