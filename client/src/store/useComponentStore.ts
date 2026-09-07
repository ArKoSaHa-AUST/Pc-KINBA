import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CompareProductItem,
  FilterState,
  ProductComponent,
} from '../types/components';


export const DEFAULT_PRICE_RANGE: [number, number] = [0, 500000];

export const INITIAL_FILTER_STATE: FilterState = {
  searchQuery: '',
  category: 'all',
  subcategory: 'all',
  brands: [],
  priceRange: [0, 500000],
  inStockOnly: false,
  onSaleOnly: false,
  retailers: [],
  dynamicSpecs: {},
  sortBy: 'featured',
  viewMode: 'grid-4',
};

interface ComponentStore {
  // Filters
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  toggleBrand: (brand: string) => void;
  toggleRetailer: (retailer: string) => void;
  toggleDynamicSpec: (facetId: string, value: string) => void;
  setPriceRange: (range: [number, number]) => void;
  clearAllFilters: () => void;
  removeFilterChip: (type: 'category' | 'subcategory' | 'brand' | 'retailer' | 'inStock' | 'onSale' | 'spec', keyOrVal?: string, specVal?: string) => void;

  // Comparison System
  compareList: CompareProductItem[];
  isCompareModalOpen: boolean;
  addToCompare: (product: ProductComponent) => boolean;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  setCompareModalOpen: (open: boolean) => void;
  isInCompare: (productId: string) => boolean;

  // Quick View Modal
  quickViewProduct: ProductComponent | null;
  setQuickViewProduct: (product: ProductComponent | null) => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Recently Viewed
  recentlyViewed: ProductComponent[];
  addRecentlyViewed: (product: ProductComponent) => void;
  clearRecentlyViewed: () => void;
}

export const useComponentStore = create<ComponentStore>()(
  persist(
    (set, get) => ({
      // Filters
      filters: INITIAL_FILTER_STATE,

      setFilter: (key, value) => {
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
          },
        }));
      },

      toggleBrand: (brand) => {
        set((state) => {
          const current = state.filters.brands;
          const next = current.includes(brand)
            ? current.filter((b) => b !== brand)
            : [...current, brand];
          return { filters: { ...state.filters, brands: next } };
        });
      },

      toggleRetailer: (retailer) => {
        set((state) => {
          const current = state.filters.retailers;
          const next = current.includes(retailer)
            ? current.filter((r) => r !== retailer)
            : [...current, retailer];
          return { filters: { ...state.filters, retailers: next } };
        });
      },

      toggleDynamicSpec: (facetId, value) => {
        set((state) => {
          const currentSpecValues = state.filters.dynamicSpecs[facetId] || [];
          const exists = currentSpecValues.includes(value);
          const nextValues = exists
            ? currentSpecValues.filter((v) => v !== value)
            : [...currentSpecValues, value];

          const nextDynamicSpecs = { ...state.filters.dynamicSpecs };
          if (nextValues.length === 0) {
            delete nextDynamicSpecs[facetId];
          } else {
            nextDynamicSpecs[facetId] = nextValues;
          }

          return { filters: { ...state.filters, dynamicSpecs: nextDynamicSpecs } };
        });
      },

      setPriceRange: (range) => {
        set((state) => ({
          filters: { ...state.filters, priceRange: range },
        }));
      },

      clearAllFilters: () => {
        set((state) => ({
          filters: {
            ...INITIAL_FILTER_STATE,
            viewMode: state.filters.viewMode,
          },
        }));
      },

      removeFilterChip: (type, keyOrVal, specVal) => {
        set((state) => {
          const f = { ...state.filters };
          if (type === 'category') {
            f.category = 'all';
            f.subcategory = 'all';
            f.dynamicSpecs = {};
          } else if (type === 'subcategory') {
            f.subcategory = 'all';
          } else if (type === 'brand' && keyOrVal) {
            f.brands = f.brands.filter((b) => b !== keyOrVal);
          } else if (type === 'retailer' && keyOrVal) {
            f.retailers = f.retailers.filter((r) => r !== keyOrVal);
          } else if (type === 'inStock') {
            f.inStockOnly = false;
          } else if (type === 'onSale') {
            f.onSaleOnly = false;
          } else if (type === 'spec' && keyOrVal && specVal) {
            const currentVals = f.dynamicSpecs[keyOrVal] || [];
            const nextVals = currentVals.filter((v) => v !== specVal);
            if (nextVals.length === 0) {
              const updated = { ...f.dynamicSpecs };
              delete updated[keyOrVal];
              f.dynamicSpecs = updated;
            } else {
              f.dynamicSpecs = { ...f.dynamicSpecs, [keyOrVal]: nextVals };
            }
          }
          return { filters: f };
        });
      },

      // Compare
      compareList: [],
      isCompareModalOpen: false,

      addToCompare: (product) => {
        const { compareList } = get();
        if (compareList.some((p) => p.id === product.id)) return false;
        if (compareList.length >= 4) return false;

        const compareItem: CompareProductItem = {
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          image: product.image,
          price: product.price,
          rating: product.rating,
          specs: product.specs,
          bulletSpecs: product.bulletSpecs,
          inStock: product.inStock,
        };

        set({ compareList: [...compareList, compareItem] });
        return true;
      },

      removeFromCompare: (productId) => {
        set((state) => ({
          compareList: state.compareList.filter((p) => p.id !== productId),
        }));
      },

      clearCompare: () => {
        set({ compareList: [] });
      },

      setCompareModalOpen: (open) => {
        set({ isCompareModalOpen: open });
      },

      isInCompare: (productId) => {
        return get().compareList.some((p) => p.id === productId);
      },

      // Quick View
      quickViewProduct: null,
      setQuickViewProduct: (product) => {
        set({ quickViewProduct: product });
      },

      // Wishlist
      wishlist: [],
      toggleWishlist: (productId) => {
        set((state) => {
          const exists = state.wishlist.includes(productId);
          const next = exists
            ? state.wishlist.filter((id) => id !== productId)
            : [...state.wishlist, productId];
          return { wishlist: next };
        });
      },
      isInWishlist: (productId) => {
        return get().wishlist.includes(productId);
      },

      // Recently Viewed
      recentlyViewed: [],
      addRecentlyViewed: (product) => {
        set((state) => {
          const filtered = state.recentlyViewed.filter((p) => p.id !== product.id);
          return {
            recentlyViewed: [product, ...filtered].slice(0, 8),
          };
        });
      },
      clearRecentlyViewed: () => {
        set({ recentlyViewed: [] });
      },
    }),
    {
      name: 'pc-kinba-components-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        compareList: state.compareList,
        wishlist: state.wishlist,
        recentlyViewed: state.recentlyViewed,
        filters: {
          ...INITIAL_FILTER_STATE,
          viewMode: state.filters.viewMode,
        },
      }),
    },
  ),
);
