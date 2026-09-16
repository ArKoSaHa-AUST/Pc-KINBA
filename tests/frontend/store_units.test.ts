import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { useComponentStore } from '../../client/src/store/useComponentStore';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence';

describe('Frontend > Global Component & Filter Store (useComponentStore.ts)', () => {
  beforeAll(() => {
    const memoryStore = new Map<string, string>();
    const mockStorage: Storage = {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => {
        memoryStore.delete(key);
      },
      clear: () => {
        memoryStore.clear();
      },
      key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
      get length() {
        return memoryStore.size;
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  });

  beforeEach(() => {
    useComponentStore.getState().clearAllFilters();
    useComponentStore.getState().clearCompare();
  });


  afterAll(async () => {
    await closeBrowser();
  });

  it('FE-STORE-001: Updates filter state and toggles brand selections', async () => {
    const store = useComponentStore.getState();

    store.setFilter('searchQuery', 'RTX 4060');
    store.toggleBrand('ASUS');
    store.toggleBrand('MSI');

    const updated = useComponentStore.getState();
    expect(updated.filters.searchQuery).toBe('RTX 4060');
    expect(updated.filters.brands).toContain('ASUS');
    expect(updated.filters.brands).toContain('MSI');

    await captureEvidence({
      testId: 'FE-STORE-001',
      service: 'frontend',
      moduleName: 'Global Filter State Mutators',
      description: 'Updates active search query and toggles multi-brand filter array',
      steps: 'setFilter("searchQuery", "RTX 4060"), toggleBrand("ASUS"), toggleBrand("MSI")',
      expected: 'filters.searchQuery: "RTX 4060", filters.brands: ["ASUS", "MSI"]',
      actual: `Query: "${updated.filters.searchQuery}", Brands: [${updated.filters.brands.join(', ')}]`,
      status: 'PASS',
      inputData: { searchQuery: 'RTX 4060', brands: ['ASUS', 'MSI'] },
      outputData: updated.filters
    });
  });

  it('FE-STORE-002: Manages comparison list capacity and deduplication', async () => {
    const store = useComponentStore.getState();
    const mockProduct: any = {
      id: 'prod-1',
      name: 'Gigabyte RTX 4060',
      brand: 'Gigabyte',
      category: 'gpu',
      bestPrice: 38000,
      image: '/mock.png',
      inStock: true
    };

    const added = store.addToCompare(mockProduct);
    expect(added).toBe(true);

    const isIn = useComponentStore.getState().isInCompare('prod-1');
    expect(isIn).toBe(true);

    // Try adding again (duplicate guard)
    const duplicateAdd = store.addToCompare(mockProduct);
    expect(duplicateAdd).toBe(false);

    await captureEvidence({
      testId: 'FE-STORE-002',
      service: 'frontend',
      moduleName: 'Comparison Queue Manager',
      description: 'Enforces comparison item queueing, lookup, and duplicate prevention',
      steps: 'addToCompare(mockProduct) followed by duplicate addToCompare(mockProduct)',
      expected: 'First add: true, Duplicate add: false, isInCompare: true',
      actual: `First add: ${added}, Duplicate add: ${duplicateAdd}, InCompare: ${isIn}`,
      status: 'PASS',
      inputData: mockProduct,
      outputData: { compareList: useComponentStore.getState().compareList }
    });
  });

  it('FE-STORE-003: Wishlist toggle and state persistence', async () => {
    const store = useComponentStore.getState();
    const productId = 'prod-990-pro';

    store.toggleWishlist(productId);
    expect(useComponentStore.getState().isInWishlist(productId)).toBe(true);

    store.toggleWishlist(productId);
    expect(useComponentStore.getState().isInWishlist(productId)).toBe(false);

    await captureEvidence({
      testId: 'FE-STORE-003',
      service: 'frontend',
      moduleName: 'Wishlist State Manager',
      description: 'Toggles product wishlist state between active and removed',
      steps: `toggleWishlist("${productId}") -> check -> toggleWishlist("${productId}") -> check`,
      expected: 'Toggled ON (true) -> Toggled OFF (false)',
      actual: 'Wishlist state toggled successfully',
      status: 'PASS',
      inputData: productId,
      outputData: { wishlist: useComponentStore.getState().wishlist }
    });
  });
});
