import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useComponentStore } from '../store/useComponentStore';
import { getProducts } from '../api/products';
import { getAvailableBrands } from '../api/filters';
import type { ProductComponent } from '../types/components';

export function useComponentQuery() {
  const filters = useComponentStore((s) => s.filters);

  // TanStack Query to fetch components from Supabase
  const {
    data: queryResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ products: ProductComponent[]; totalCount: number }>({
    queryKey: [
      'components',
      filters.category,
      filters.subcategory,
      filters.searchQuery,
      filters.sortBy,
      filters.priceRange[0],
      filters.priceRange[1],
      filters.inStockOnly,
      filters.onSaleOnly,
      filters.brands.join(','),
      filters.retailers.join(','),
      JSON.stringify(filters.dynamicSpecs),
    ],
    queryFn: async () => {
      return getProducts(filters);
    },
    staleTime: 1000 * 60 * 3, // 3 minutes cache
    refetchOnWindowFocus: false,
  });

  const rawProducts = useMemo(() => queryResult?.products || [], [queryResult]);
  const totalCount = queryResult?.totalCount ?? rawProducts.length;

  // Query available brands in current category
  const { data: dbBrands } = useQuery({
    queryKey: ['available-brands', filters.category],
    queryFn: () => getAvailableBrands(filters.category),
    staleTime: 1000 * 60 * 10,
  });

  // Calculate or fallback brands
  const availableBrands = useMemo(() => {
    if (dbBrands && dbBrands.length > 0) {
      return dbBrands;
    }
    const brandCounts: Record<string, number> = {};
    rawProducts.forEach((p) => {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });
    return Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [dbBrands, rawProducts]);

  // Available retailers in current category / marketplace
  const availableRetailers = useMemo(() => {
    const retailersSet = new Set<string>([
      'StarTech BD',
      'Ryans Computers',
      'Techland BD',
      'Skyland BD',
      'Computer Village',
      'Global Brand',
      'PC House BD',
      'PCB Store',
      'Sell Tech BD',
      'Ultra Technology',
      'EIT',
      'UCC',
    ]);
    rawProducts.forEach((p) => {
      p.retailers.forEach((r) => {
        if (r.name) retailersSet.add(r.name);
      });
    });
    return Array.from(retailersSet);
  }, [rawProducts]);

  return {
    products: rawProducts,
    totalCount,
    rawCount: rawProducts.length,
    isLoading,
    isError,
    error,
    refetch,
    availableBrands,
    availableRetailers,
  };
}
