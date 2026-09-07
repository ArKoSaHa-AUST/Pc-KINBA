import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useComponentStore } from '../store/useComponentStore';
import { MOCK_COMPONENTS } from '../data/mockComponentsData';
import type { ProductComponent } from '../types/components';

export function useComponentQuery() {
  const filters = useComponentStore((s) => s.filters);

  // TanStack Query to fetch / synchronize components
  const { data: rawProducts = MOCK_COMPONENTS, isLoading, isError, refetch } = useQuery<ProductComponent[]>({
    queryKey: ['components', filters.category, filters.subcategory, filters.searchQuery],
    queryFn: async () => {
      // If there's an active search query, we can query backend /api/search or fallback to rich mock data
      if (filters.searchQuery.trim()) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(filters.searchQuery.trim())}`);
          if (res.ok) {
            const json = await res.json();
            if (json.results && json.results.length > 0) {
              // Map backend results to ProductComponent
              const mapped: ProductComponent[] = json.results.map((r: any) => ({
                id: r.id ? `db-${r.id}` : `scraped-${Math.random().toString(36).substring(7)}`,
                slug: (r.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name: r.title || r.name,
                brand: r.brand || 'Generic',
                category: (r.category || filters.category !== 'all' ? filters.category : 'cpu') as any,
                subcategory: r.subcategory,
                price: Number(r.price) || 0,
                originalPrice: r.original_price ? Number(r.original_price) : undefined,
                inStock: r.in_stock !== false,
                stockStatus: r.in_stock === false ? 'out_of_stock' : 'in_stock',
                rating: Number(r.rating) || 4.8,
                reviewCount: Number(r.review_count) || 24,
                image: r.image_url || r.image || 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80',
                gallery: [r.image_url || r.image || 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80'],
                bulletSpecs: r.bullet_specs || [
                  `Brand: ${r.brand || 'N/A'}`,
                  `Retailer: ${r.retailer || 'StarTech / Ryans'}`,
                  `Price: ৳${Number(r.price).toLocaleString()}`,
                ],
                specs: r.specs || { Brand: r.brand || 'N/A', Retailer: r.retailer || 'StarTech' },
                retailers: [
                  {
                    name: r.retailer || 'StarTech',
                    price: Number(r.price) || 0,
                    inStock: r.in_stock !== false,
                    url: r.product_url || 'https://startech.com.bd',
                    badge: 'Direct Store',
                  },
                ],
              }));

              // Merge unique items with mock catalog
              const existingIds = new Set(mapped.map((m) => m.name.toLowerCase()));
              const filteredMock = MOCK_COMPONENTS.filter((m) => !existingIds.has(m.name.toLowerCase()));
              return [...mapped, ...filteredMock];
            }
          }
        } catch (e) {
          console.warn('[useComponentQuery] Falling back to local catalog:', e);
        }
      }
      return MOCK_COMPONENTS;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    return rawProducts.filter((product) => {
      // 1. Search text filter
      if (filters.searchQuery.trim()) {
        const queryLower = filters.searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(queryLower);
        const matchesBrand = product.brand.toLowerCase().includes(queryLower);
        const matchesSpecs = Object.values(product.specs).some((v) =>
          v.toLowerCase().includes(queryLower),
        );
        if (!matchesName && !matchesBrand && !matchesSpecs) return false;
      }

      // 2. Category filter
      if (filters.category !== 'all' && product.category !== filters.category) {
        return false;
      }

      // 3. Subcategory filter
      if (filters.subcategory !== 'all' && product.subcategory !== filters.subcategory) {
        return false;
      }

      // 4. Brands filter
      if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) {
        return false;
      }

      // 5. Price range filter
      if (
        product.price < filters.priceRange[0] ||
        product.price > filters.priceRange[1]
      ) {
        return false;
      }

      // 6. In stock only
      if (filters.inStockOnly && !product.inStock) {
        return false;
      }

      // 7. On sale only
      if (filters.onSaleOnly && (!product.discountPercent || product.discountPercent <= 0)) {
        return false;
      }

      // 8. Retailer filter
      if (filters.retailers.length > 0) {
        const hasRetailer = product.retailers.some((r) =>
          filters.retailers.includes(r.name),
        );
        if (!hasRetailer) return false;
      }

      // 9. Dynamic Specs (e.g. socket, cores, vram)
      for (const [specKey, selectedValues] of Object.entries(filters.dynamicSpecs)) {
        if (!selectedValues || selectedValues.length === 0) continue;

        // Check product specs and bullet specs
        const specValue = product.specs[specKey] || '';
        const allSpecsString = JSON.stringify(product.specs).toLowerCase();
        const bulletString = product.bulletSpecs.join(' ').toLowerCase();

        const match = selectedValues.some((val) => {
          const valLower = val.toLowerCase();
          return (
            specValue.toLowerCase().includes(valLower) ||
            allSpecsString.includes(valLower) ||
            bulletString.includes(valLower)
          );
        });

        if (!match) return false;
      }

      return true;
    });
  }, [rawProducts, filters]);

  // Sort Pipeline
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (filters.sortBy) {
      case 'price_asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return list.sort((a, b) => b.price - a.price);
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      case 'discount':
        return list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
      case 'newest':
        return list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
      case 'featured':
      default:
        return list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [filteredProducts, filters.sortBy]);

  // Available brands in current category (with counts)
  const availableBrands = useMemo(() => {
    const currentCategoryProducts =
      filters.category === 'all'
        ? rawProducts
        : rawProducts.filter((p) => p.category === filters.category);

    const brandCounts: Record<string, number> = {};
    currentCategoryProducts.forEach((p) => {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });

    return Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawProducts, filters.category]);

  // Available retailers in current category
  const availableRetailers = useMemo(() => {
    const retailersSet = new Set<string>();
    rawProducts.forEach((p) => {
      p.retailers.forEach((r) => retailersSet.add(r.name));
    });
    return Array.from(retailersSet);
  }, [rawProducts]);

  return {
    products: sortedProducts,
    totalCount: sortedProducts.length,
    rawCount: rawProducts.length,
    isLoading,
    isError,
    refetch,
    availableBrands,
    availableRetailers,
  };
}
