import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useComponentStore, DEFAULT_PRICE_RANGE } from '../store/useComponentStore';
import type { ComponentCategory } from '../types/components';

export function useFilterSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useComponentStore((s) => s.filters);
  const setFilter = useComponentStore((s) => s.setFilter);
  const isInitialMount = useRef(true);

  // Sync from URL to Store on initial load
  useEffect(() => {
    const categoryParam = searchParams.get('category') as ComponentCategory | null;
    const subcategoryParam = searchParams.get('sub');
    const qParam = searchParams.get('q');
    const brandsParam = searchParams.get('brand');
    const retailersParam = searchParams.get('retailer');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    const onSale = searchParams.get('onSale');
    const sortParam = searchParams.get('sort') as any;

    if (categoryParam) {
      setFilter('category', categoryParam);
    }
    if (subcategoryParam) {
      setFilter('subcategory', subcategoryParam);
    }
    if (qParam !== null) {
      setFilter('searchQuery', qParam);
    }
    if (brandsParam) {
      setFilter('brands', brandsParam.split(',').filter(Boolean));
    }
    if (retailersParam) {
      setFilter('retailers', retailersParam.split(',').filter(Boolean));
    }
    if (minPrice || maxPrice) {
      const min = minPrice ? parseInt(minPrice, 10) : DEFAULT_PRICE_RANGE[0];
      const max = maxPrice ? parseInt(maxPrice, 10) : DEFAULT_PRICE_RANGE[1];
      if (!isNaN(min) && !isNaN(max)) {
        setFilter('priceRange', [min, max]);
      }
    }
    if (inStock === 'true') {
      setFilter('inStockOnly', true);
    }
    if (onSale === 'true') {
      setFilter('onSaleOnly', true);
    }
    if (sortParam) {
      setFilter('sortBy', sortParam);
    }

    // Dynamic specs
    const dynamicSpecs: Record<string, string[]> = {};
    searchParams.forEach((val, key) => {
      if (key.startsWith('spec_')) {
        const specName = key.replace('spec_', '');
        dynamicSpecs[specName] = val.split(',').filter(Boolean);
      }
    });
    if (Object.keys(dynamicSpecs).length > 0) {
      setFilter('dynamicSpecs', dynamicSpecs);
    }
  }, []);

  // Sync from Store to URL whenever filters change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const newParams = new URLSearchParams();

    if (filters.category && filters.category !== 'all') {
      newParams.set('category', filters.category);
    }
    if (filters.subcategory && filters.subcategory !== 'all') {
      newParams.set('sub', filters.subcategory);
    }
    if (filters.searchQuery.trim()) {
      newParams.set('q', filters.searchQuery.trim());
    }
    if (filters.brands.length > 0) {
      newParams.set('brand', filters.brands.join(','));
    }
    if (filters.retailers.length > 0) {
      newParams.set('retailer', filters.retailers.join(','));
    }
    if (
      filters.priceRange[0] > DEFAULT_PRICE_RANGE[0] ||
      filters.priceRange[1] < DEFAULT_PRICE_RANGE[1]
    ) {
      newParams.set('minPrice', filters.priceRange[0].toString());
      newParams.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.inStockOnly) {
      newParams.set('inStock', 'true');
    }
    if (filters.onSaleOnly) {
      newParams.set('onSale', 'true');
    }
    if (filters.sortBy !== 'featured') {
      newParams.set('sort', filters.sortBy);
    }

    // Dynamic specs
    Object.entries(filters.dynamicSpecs).forEach(([specKey, values]) => {
      if (values && values.length > 0) {
        newParams.set(`spec_${specKey}`, values.join(','));
      }
    });

    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams]);
}
