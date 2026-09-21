// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTonimaSession, INITIAL_BUILD_STATE } from '../../store/useTonimaSession';
import {
  toBuilderSlot,
  toBuilderPurpose,
  saveTonimaHandoff,
  loadTonimaHandoff,
  TONIMA_HANDOFF_KEY,
  type TonimaHandoff,
} from '../../store/tonimaHandoff';
import ChatWorkspace from './ChatWorkspace';
import BuildPreviewHUD, { type BuildComponentItem } from './BuildPreviewHUD';
import CompatibilityGauge from './CompatibilityGauge';
import PCBuilderPage from '../../pages/PCBuilderPage';
import type { BuilderProduct } from '../builder/builderCatalog';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Mock useAuth
vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ status: 'authenticated', user: { id: 'test-user' } }),
}));

// Mock useToast
vi.mock('../../components/ui/useToast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Mock framer-motion to immediately render AnimatePresence children in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock useBuilderCatalog with 8 sample products covering all slots
const MOCK_CATALOG_PRODUCTS: BuilderProduct[] = [
  {
    id: 'prod-cpu-1',
    name: 'Intel Core i5-13600K',
    brand: 'Intel',
    category: 'cpu',
    price: 32000,
    keySpec: '14 Cores / 20 Threads',
    popularity: 90,
    performanceScore: 88,
    socket: 'LGA1700',
    tdp: 125,
  },
  {
    id: 'prod-gpu-1',
    name: 'RTX 4070 Super 12GB',
    brand: 'NVIDIA',
    category: 'gpu',
    price: 72000,
    keySpec: '12GB GDDR6X',
    popularity: 95,
    performanceScore: 92,
    lengthMm: 300,
  },
  {
    id: 'prod-mobo-1',
    name: 'MSI B760 Gaming Plus WiFi',
    brand: 'MSI',
    category: 'motherboard',
    price: 21000,
    keySpec: 'LGA1700 ATX',
    popularity: 85,
    performanceScore: 80,
    socket: 'LGA1700',
    formFactor: 'ATX',
  },
  {
    id: 'prod-ram-1',
    name: 'Corsair Vengeance 32GB DDR5',
    brand: 'Corsair',
    category: 'ram',
    price: 13000,
    keySpec: '32GB (2x16GB) 6000MHz',
    popularity: 88,
    performanceScore: 85,
    ramType: 'DDR5',
  },
  {
    id: 'prod-storage-1',
    name: 'Kingston KC3000 1TB NVMe',
    brand: 'Kingston',
    category: 'storage',
    price: 10500,
    keySpec: '1TB Gen4 NVMe',
    popularity: 86,
    performanceScore: 89,
  },
  {
    id: 'prod-psu-1',
    name: 'Corsair RM750e 750W Gold',
    brand: 'Corsair',
    category: 'psu',
    price: 11000,
    keySpec: '750W 80+ Gold Fully Modular',
    popularity: 91,
    performanceScore: 87,
    wattage: 750,
  },
  {
    id: 'prod-case-1',
    name: 'NZXT H5 Flow Black',
    brand: 'NZXT',
    category: 'case',
    price: 9500,
    keySpec: 'Mid-Tower ATX Airflow',
    popularity: 89,
    performanceScore: 84,
    maxGpuLengthMm: 365,
    formFactor: 'ATX',
  },
  {
    id: 'prod-cooling-1',
    name: 'DeepCool AK620 Digital',
    brand: 'DeepCool',
    category: 'cooling',
    price: 7500,
    keySpec: 'Dual Tower Air Cooler',
    popularity: 87,
    performanceScore: 86,
    heightMm: 162,
    tdp: 260,
  },
];

const mockCatalogMap = new Map<string, BuilderProduct>(MOCK_CATALOG_PRODUCTS.map((p) => [p.id, p]));

vi.mock('../../hooks/useBuilderCatalog', () => ({
  useBuilderCatalog: () => ({
    isLoading: false,
    isLive: true,
    products: MOCK_CATALOG_PRODUCTS,
    byId: mockCatalogMap,
    forSlot: (slot: string) => MOCK_CATALOG_PRODUCTS.filter((p) => p.category === slot),
  }),
}));

describe('Tonima AI Handoff & Wiring Test Suite (TonimaHandoff.test.tsx)', () => {
  beforeEach(() => {
    localStorage.clear();
    useTonimaSession.setState({
      pendingPrompt: null,
      activeBuild: { ...INITIAL_BUILD_STATE },
      budgetBDT: 150000,
    });
    Element.prototype.scrollTo = vi.fn();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock ResizeObserver
    globalThis.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };

    // Mock IntersectionObserver
    globalThis.IntersectionObserver = class IntersectionObserver {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn().mockReturnValue([]);
    } as unknown as typeof IntersectionObserver;

    // Default mock fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let called = false;
          return {
            read: async () => {
              if (!called) {
                called = true;
                const encoder = new TextEncoder();
                return {
                  done: false,
                  value: encoder.encode('event: token\ndata: {"token":"Build planned"}\n\n'),
                };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    } as unknown as Response);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-AGENT-001: Repeated prompt dispatch produces two submissions (no-op re-launch is fixed)
  it('UI-AGENT-001: Dispatching the same prompt text twice produces two submissions', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<ChatWorkspace />);

    // First dispatch
    await act(async () => {
      useTonimaSession.getState().dispatchPrompt({
        id: 'prompt-1',
        text: 'Build me an RTX 4070 rig under 150k',
        source: 'hero',
      });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second dispatch with IDENTICAL text but fresh unique ID
    await act(async () => {
      useTonimaSession.getState().dispatchPrompt({
        id: 'prompt-2',
        text: 'Build me an RTX 4070 rig under 150k',
        source: 'hero',
      });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // UI-AGENT-002: Single dispatch produces exactly one submission despite state flips
  it('UI-AGENT-002: A single dispatch produces exactly one submission even when state changes mid-flight', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { rerender } = render(<ChatWorkspace />);

    await act(async () => {
      useTonimaSession.getState().dispatchPrompt({
        id: 'prompt-stable-1',
        text: 'Build a video editing rig',
        source: 'hero',
      });
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Re-render multiple times simulating isProcessing flips and parent updates
    rerender(<ChatWorkspace />);
    rerender(<ChatWorkspace />);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // UI-AGENT-003: Hero budget reaches request body and natural language prefix
  it('UI-AGENT-003: The hero budget reaches the request body and message text', async () => {
    let capturedBody: { budgetBDT?: number; message?: string } | null = null;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, opts) => {
      if (opts?.body) {
        capturedBody = JSON.parse(opts.body as string);
      }
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      } as unknown as Response;
    });

    render(<ChatWorkspace />);

    await act(async () => {
      useTonimaSession.getState().dispatchPrompt({
        id: 'prompt-budget-test',
        text: 'Build me a gaming machine',
        budgetBDT: 180000,
        source: 'hero',
      });
    });

    const body = capturedBody as { budgetBDT?: number; message?: string } | null;
    expect(body).not.toBeNull();
    expect(body?.budgetBDT).toBe(180000);
    expect(body?.message).toContain('1,80,000');
  });

  // UI-HUD-001: With no build, HUD renders empty states without fake Ryzen 7 7800X3D
  it('UI-HUD-001: With no build, the HUD renders empty states and no fake parts appear', () => {
    render(
      <MemoryRouter>
        <BuildPreviewHUD components={[]} />
      </MemoryRouter>,
    );

    // Ensure hardcoded Ryzen 7 7800X3D does NOT exist in the tree
    expect(screen.queryByText(/AMD Ryzen 7 7800X3D/i)).toBeNull();

    // Verify empty state text or skeleton placeholder
    const partsTab = screen.getByRole('button', { name: /Parts List/i });
    fireEvent.click(partsTab);

    expect(screen.getByText(/Describe your build in the chat/i)).toBeDefined();
  });

  // UI-HUD-002: After SSE build event, HUD reflects payload accurately and footer matches totalBDT
  it('UI-HUD-002: After a build event, Parts, Metrics, and footer total reflect the payload', () => {
    const testParts: BuildComponentItem[] = [
      {
        category: 'CPU',
        name: 'Intel Core i5-13600K',
        priceBDT: 32000,
        retailer: 'Star Tech',
        inStock: true,
        productId: 'prod-cpu-1',
      },
      {
        category: 'GPU',
        name: 'RTX 4070 Super 12GB',
        priceBDT: 72000,
        retailer: 'Tech Land',
        inStock: true,
        productId: 'prod-gpu-1',
      },
    ];

    render(
      <MemoryRouter>
        <BuildPreviewHUD components={testParts} totalPrice={104000} />
      </MemoryRouter>,
    );

    expect(screen.getByText('৳ 1,04,000')).toBeDefined();

    // Check parts tab
    const partsTab = screen.getByRole('button', { name: /Parts List/i });
    fireEvent.click(partsTab);

    expect(screen.getByText('Intel Core i5-13600K')).toBeDefined();
    expect(screen.getByText('RTX 4070 Super 12GB')).toBeDefined();
  });

  // UI-HUD-003: validation.violations are rendered in the Metrics tab
  it('UI-HUD-003: validation.violations are rendered in the Metrics tab', () => {
    const testParts: BuildComponentItem[] = [
      {
        category: 'CPU',
        name: 'Intel Core i9-14900K',
        priceBDT: 65000,
        retailer: 'Star Tech',
        inStock: true,
      },
      {
        category: 'Power Supply',
        name: '500W Basic PSU',
        priceBDT: 3500,
        retailer: 'Star Tech',
        inStock: true,
      },
    ];

    const testValidation = {
      score: 65,
      wattage: 580,
      psuWattage: 500,
      ok: false,
      violations: [
        {
          rule: 'psu_headroom',
          detail: 'System wattage (580W) exceeds recommended PSU output (500W).',
        },
      ],
    };

    render(
      <MemoryRouter>
        <BuildPreviewHUD components={testParts} totalPrice={68500} validation={testValidation} />
      </MemoryRouter>,
    );

    const metricsTab = screen.getByRole('button', { name: /Metrics/i });
    fireEvent.click(metricsTab);

    expect(screen.getByText('psu_headroom')).toBeDefined();
    expect(screen.getByText(/System wattage \(580W\) exceeds/i)).toBeDefined();
  });

  // UI-HUD-004: CompatibilityGauge displays real socket, not "AM5" for LGA1700 build
  it('UI-HUD-004: CompatibilityGauge displays real socket, not AM5, for an LGA1700 build', () => {
    const lgaParts: BuildComponentItem[] = [
      {
        category: 'CPU',
        name: 'Intel Core i5-13600K (LGA1700)',
        priceBDT: 32000,
        retailer: 'Star Tech',
        inStock: true,
      },
      {
        category: 'Motherboard',
        name: 'MSI B760 Gaming Plus WiFi (LGA1700)',
        priceBDT: 21000,
        retailer: 'Ryans',
        inStock: true,
      },
    ];

    render(<CompatibilityGauge components={lgaParts} score={100} />);

    expect(screen.queryByText(/Socket AM5 Matched/i)).toBeNull();
    expect(screen.getByText(/Socket LGA1700 Matched/i)).toBeDefined();
  });

  // UI-MAP-001: toBuilderSlot maps all 8 categories and handles unknown
  it('UI-MAP-001: toBuilderSlot maps all eight agent categories accurately', () => {
    expect(toBuilderSlot('CPU')).toBe('cpu');
    expect(toBuilderSlot('Processor')).toBe('cpu');
    expect(toBuilderSlot('GPU')).toBe('gpu');
    expect(toBuilderSlot('Graphics Card')).toBe('gpu');
    expect(toBuilderSlot('Motherboard')).toBe('motherboard');
    expect(toBuilderSlot('Mainboard')).toBe('motherboard');
    expect(toBuilderSlot('RAM')).toBe('ram');
    expect(toBuilderSlot('Memory')).toBe('ram');
    expect(toBuilderSlot('Storage')).toBe('storage');
    expect(toBuilderSlot('Power Supply')).toBe('psu');
    expect(toBuilderSlot('PSU')).toBe('psu');
    expect(toBuilderSlot('Case')).toBe('case');
    expect(toBuilderSlot('Casing')).toBe('case');
    expect(toBuilderSlot('Cooler')).toBe('cooling');
    expect(toBuilderSlot('Cooling')).toBe('cooling');

    expect(toBuilderSlot('Custom RGB Lighting Cable')).toBeNull();
    expect(toBuilderSlot('')).toBeNull();
  });

  // UI-MAP-002: toBuilderPurpose covers all agent purposes
  it('UI-MAP-002: toBuilderPurpose covers every agent purpose value', () => {
    expect(toBuilderPurpose('gaming')).toBe('Gaming');
    expect(toBuilderPurpose('ai_ml')).toBe('AI/ML Workstation');
    expect(toBuilderPurpose('content_creation')).toBe('Content Creation');
    expect(toBuilderPurpose('streaming')).toBe('Streaming');
    expect(toBuilderPurpose('office')).toBe('Office/Productivity');
    expect(toBuilderPurpose('general')).toBe('Office/Productivity');
    expect(toBuilderPurpose(null)).toBe('Gaming');
  });

  // UI-HANDOFF-001: Clicking PC Builder writes valid versioned payload and navigates
  it('UI-HANDOFF-001: Clicking PC Builder writes a valid versioned payload and navigates', () => {
    const testParts: BuildComponentItem[] = [
      {
        category: 'CPU',
        name: 'Intel Core i5-13600K',
        priceBDT: 32000,
        retailer: 'Star Tech',
        inStock: true,
        productId: 'prod-cpu-1',
      },
    ];

    render(
      <MemoryRouter>
        <BuildPreviewHUD components={testParts} totalPrice={32000} />
      </MemoryRouter>,
    );

    const pcBuilderBtn = screen.getByRole('button', { name: /PC Builder/i });
    fireEvent.click(pcBuilderBtn);

    const handoff = loadTonimaHandoff();
    expect(handoff).not.toBeNull();
    expect(handoff?.version).toBe(1);
    expect(handoff?.totalBDT).toBe(32000);
    expect(handoff?.parts[0].name).toBe('Intel Core i5-13600K');
  });

  // UI-HANDOFF-002: PCBuilderPage hydrates slots from full handoff
  it('UI-HANDOFF-002: PCBuilderPage hydrates slots from a full handoff', async () => {
    const fullHandoff: TonimaHandoff = {
      version: 1,
      sessionId: 'sess-test',
      createdAt: new Date().toISOString(),
      purpose: 'gaming',
      budgetBDT: 150000,
      totalBDT: 177000,
      parts: MOCK_CATALOG_PRODUCTS.map((p) => ({
        productId: p.id,
        category: p.category,
        name: p.name,
        priceBDT: p.price,
        retailer: 'Star Tech',
      })),
    };

    saveTonimaHandoff(fullHandoff);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/pc-builder']}>
          <PCBuilderPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Check that parts are populated in the selection
    expect(screen.getAllByText('Intel Core i5-13600K').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RTX 4070 Super 12GB').length).toBeGreaterThan(0);
  });

  // UI-HANDOFF-003: Partial handoff hydrates matched and reports unresolved parts
  it('UI-HANDOFF-003: A partial handoff hydrates what it can and reports unresolved parts', async () => {
    const partialHandoff: TonimaHandoff = {
      version: 1,
      sessionId: 'sess-partial',
      createdAt: new Date().toISOString(),
      purpose: 'gaming',
      budgetBDT: 120000,
      totalBDT: 85000,
      parts: [
        {
          productId: 'prod-cpu-1',
          category: 'CPU',
          name: 'Intel Core i5-13600K',
          priceBDT: 32000,
          retailer: 'Star Tech',
        },
        {
          category: 'Cooler',
          name: 'Exotic Custom Japanese Liquid Cooler',
          priceBDT: 25000,
          retailer: 'Import Shop',
        },
      ],
    };

    saveTonimaHandoff(partialHandoff);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/pc-builder']}>
          <PCBuilderPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Matched CPU appears
    expect(screen.getAllByText('Intel Core i5-13600K').length).toBeGreaterThan(0);

    // Unresolved notice banner appears
    expect(screen.getByText(/Exotic Custom Japanese Liquid Cooler/i)).toBeDefined();
  });

  // UI-HANDOFF-004: Stale (> 30 min) handoff is ignored
  it('UI-HANDOFF-004: Stale (> 30 min) handoff is ignored', () => {
    const staleTime = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    const staleHandoff: TonimaHandoff = {
      version: 1,
      sessionId: 'sess-old',
      createdAt: staleTime,
      purpose: 'gaming',
      budgetBDT: 100000,
      totalBDT: 50000,
      parts: [],
    };

    localStorage.setItem(TONIMA_HANDOFF_KEY, JSON.stringify(staleHandoff));

    const loaded = loadTonimaHandoff();
    expect(loaded).toBeNull();
  });

  // UI-HANDOFF-005: Existing draft is safeguarded against clobbering without confirmation
  it('UI-HANDOFF-005: Existing non-empty draft is not clobbered without confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    // Save existing draft
    localStorage.setItem(
      'pc-kinba.builder-draft',
      JSON.stringify({
        partIds: ['prod-cpu-1'],
        budget: [20000, 100000],
        purpose: 'Gaming',
      }),
    );

    // Put fresh handoff
    const handoff: TonimaHandoff = {
      version: 1,
      sessionId: 'sess-new',
      createdAt: new Date().toISOString(),
      purpose: 'streaming',
      budgetBDT: 200000,
      totalBDT: 72000,
      parts: [
        {
          productId: 'prod-gpu-1',
          category: 'GPU',
          name: 'RTX 4070 Super 12GB',
          priceBDT: 72000,
          retailer: 'Tech Land',
        },
      ],
    };
    saveTonimaHandoff(handoff);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/pc-builder']}>
          <PCBuilderPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(confirmSpy).toHaveBeenCalled();
    // Because user answered false, previous draft CPU remains
    expect(screen.getAllByText('Intel Core i5-13600K').length).toBeGreaterThan(0);
  });
});
