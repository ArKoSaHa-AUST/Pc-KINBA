export type AlternativeProduct = {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  oldPrice: number;
  discount: number;
  aiMatch: number;
  badge: string;
  badgeColor: string; // hex or tailwind class
  recommendationQuote: string;
  priceDiff: number; // positive = more expensive, negative = cheaper
  rating: number;
  reviewsCount: number;
  storeCount: number;
  availability: 'Available' | 'Limited Stock';
  lowestStore: string;
  category: string; // for filter tabs
  featureChips: string[];
  scores: {
    gaming: number; // 0-100
    productivity: number; // 0-100
    aiWorkloads: number; // 0-100
    powerEfficiency: number; // 0-100
    buildQuality: number; // 1-5
  };
  benchmarks: {
    label: string;
    targetVal: number;
    altVal: number;
    diffText: string;
  }[];
  priceTrend: {
    direction: 'down' | 'up';
    percent: number;
  };
  specs: {
    vram: string;
    bus: string;
    power: string;
    warranty: string;
    releaseDate: string;
    dimensions: string;
  };
  pros: string[];
  cons: string[];
  reasons: string[];
  product_url?: string;
};

export const currentProductPrice = 39900;

export const dummyAlternatives: AlternativeProduct[] = [
  {
    id: 'alt-1',
    name: 'NVIDIA GeForce RTX 5070 12GB',
    brand: 'NVIDIA',
    image:
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=600',
    price: 49900,
    oldPrice: 54900,
    discount: 9,
    aiMatch: 98,
    badge: 'Best Upgrade',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    recommendationQuote:
      'Offers approximately 18% higher gaming performance and 12GB VRAM while consuming only 15W more power.',
    priceDiff: 10000,
    rating: 4.9,
    reviewsCount: 312,
    storeCount: 6,
    availability: 'Available',
    lowestStore: 'Star Tech',
    category: 'Better Performance',
    featureChips: ['DLSS 4', 'Ray Tracing', 'AV1', '12GB VRAM', 'PCIe 5.0'],
    scores: {
      gaming: 94,
      productivity: 88,
      aiWorkloads: 96,
      powerEfficiency: 85,
      buildQuality: 5,
    },
    benchmarks: [
      { label: '1440p Ultra FPS', targetVal: 115, altVal: 136, diffText: '+18%' },
      { label: 'AI Inference (Tokens/s)', targetVal: 84, altVal: 108, diffText: '+28%' },
      { label: 'Blender Rendering (s)', targetVal: 42, altVal: 34, diffText: '-19% Time' },
    ],
    priceTrend: { direction: 'down', percent: 5 },
    specs: {
      vram: '12GB GDDR7',
      bus: '192-bit',
      power: '220W TDP',
      warranty: '3 Years',
      releaseDate: '2026 Q1',
      dimensions: '242 x 112 x 40 mm',
    },
    pros: ['18% Faster 1440p gaming', 'Extra VRAM for future-proofing', 'DLSS 4 Frame Gen'],
    cons: ['Costs ৳10,000 more'],
    reasons: [
      'Better Gaming FPS (+18%)',
      'Better AI Performance (+28%)',
      'More VRAM (12GB vs 8GB)',
    ],
  },
  {
    id: 'alt-2',
    name: 'NVIDIA GeForce RTX 4070 Super 12GB',
    brand: 'NVIDIA',
    image:
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=600',
    price: 43500,
    oldPrice: 46900,
    discount: 7,
    aiMatch: 95,
    badge: 'Best Value',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    recommendationQuote:
      'Costs just ৳3,600 more for 12% faster rasterization and 50% more VRAM bandwidth.',
    priceDiff: 3600,
    rating: 4.8,
    reviewsCount: 540,
    storeCount: 5,
    availability: 'Available',
    lowestStore: 'TechLand',
    category: 'Best Value',
    featureChips: ['DLSS 3.5', '12GB VRAM', 'Low Noise', '1440p King'],
    scores: {
      gaming: 88,
      productivity: 84,
      aiWorkloads: 90,
      powerEfficiency: 88,
      buildQuality: 5,
    },
    benchmarks: [
      { label: '1440p Ultra FPS', targetVal: 115, altVal: 129, diffText: '+12%' },
      { label: 'AI Inference (Tokens/s)', targetVal: 84, altVal: 95, diffText: '+13%' },
      { label: 'Power Draw (W)', targetVal: 200, altVal: 220, diffText: '+10%' },
    ],
    priceTrend: { direction: 'down', percent: 3 },
    specs: {
      vram: '12GB GDDR6X',
      bus: '192-bit',
      power: '220W TDP',
      warranty: '3 Years',
      releaseDate: '2024 Q1',
      dimensions: '242 x 110 x 40 mm',
    },
    pros: ['Proven 1440p sweet spot', '12GB VRAM', 'Super efficient'],
    cons: ['No DLSS 4 support'],
    reasons: ['Excellent Value Ratio', '12GB VRAM Buffer', 'Better 1440p Stability'],
  },
  {
    id: 'alt-3',
    name: 'AMD Radeon RX 7800 XT 16GB',
    brand: 'AMD',
    image:
      'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&q=80&w=600',
    price: 37900,
    oldPrice: 41900,
    discount: 10,
    aiMatch: 92,
    badge: 'Lower Price',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    recommendationQuote:
      'Costs ৳2,000 less while providing double the VRAM (16GB) for heavy texture packs.',
    priceDiff: -2000,
    rating: 4.7,
    reviewsCount: 410,
    storeCount: 4,
    availability: 'Available',
    lowestStore: 'Ryans',
    category: 'Lower Price',
    featureChips: ['16GB VRAM', 'FSR 3.1', '256-bit Bus', 'Pure Raster King'],
    scores: {
      gaming: 86,
      productivity: 75,
      aiWorkloads: 70,
      powerEfficiency: 78,
      buildQuality: 4,
    },
    benchmarks: [
      { label: '1440p Native FPS', targetVal: 115, altVal: 122, diffText: '+6%' },
      { label: 'VRAM Capacity', targetVal: 8, altVal: 16, diffText: '+100%' },
      { label: 'Ray Tracing FPS', targetVal: 72, altVal: 58, diffText: '-19%' },
    ],
    priceTrend: { direction: 'down', percent: 8 },
    specs: {
      vram: '16GB GDDR6',
      bus: '256-bit',
      power: '263W TDP',
      warranty: '2 Years',
      releaseDate: '2023 Q3',
      dimensions: '267 x 110 x 50 mm',
    },
    pros: ['Massive 16GB VRAM buffer', 'Cheaper than target GPU', 'Strong raw rasterization'],
    cons: ['Weaker ray tracing & AI performance', 'Higher power consumption'],
    reasons: ['Lower Purchase Price (-৳2,000)', 'Huge 16GB VRAM Buffer', 'Wide 256-bit Memory Bus'],
  },
  {
    id: 'alt-4',
    name: 'NVIDIA GeForce RTX 5060 Ti 16GB',
    brand: 'NVIDIA',
    image:
      'https://images.unsplash.com/photo-1590253232292-5c0c4c04e428?auto=format&fit=crop&q=80&w=600',
    price: 42900,
    oldPrice: 45000,
    discount: 5,
    aiMatch: 96,
    badge: 'AI Recommended',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    recommendationQuote:
      'Exact same 5060 Ti chip but with 16GB VRAM for large LLMs and 4K texture workloads.',
    priceDiff: 3000,
    rating: 4.8,
    reviewsCount: 189,
    storeCount: 6,
    availability: 'Available',
    lowestStore: 'Global Brand',
    category: 'AI Recommended',
    featureChips: ['16GB VRAM', 'DLSS 4', 'Local LLM Ready', 'Creator Ready'],
    scores: {
      gaming: 84,
      productivity: 92,
      aiWorkloads: 98,
      powerEfficiency: 90,
      buildQuality: 5,
    },
    benchmarks: [
      { label: 'Local LLM Context', targetVal: 8, altVal: 16, diffText: '+100%' },
      { label: 'Stable Diffusion 4K', targetVal: 45, altVal: 78, diffText: '+73%' },
      { label: 'Power Consumption', targetVal: 160, altVal: 165, diffText: '+3%' },
    ],
    priceTrend: { direction: 'down', percent: 2 },
    specs: {
      vram: '16GB GDDR7',
      bus: '128-bit',
      power: '165W TDP',
      warranty: '3 Years',
      releaseDate: '2026 Q1',
      dimensions: '220 x 110 x 40 mm',
    },
    pros: ['Double VRAM for AI workflows', 'Same ultra-low power draw', 'DLSS 4 support'],
    cons: ['Slightly higher price tag'],
    reasons: ['Perfect for AI & Local LLMs', '16GB VRAM Buffer', 'Ultra Power Efficient'],
  },
  {
    id: 'alt-5',
    name: 'AMD Radeon RX 9070 XT 16GB',
    brand: 'AMD',
    image:
      'https://images.unsplash.com/photo-1541029071515-84cc54f84cb5?auto=format&fit=crop&q=80&w=600',
    price: 52900,
    oldPrice: 58000,
    discount: 9,
    aiMatch: 90,
    badge: 'Latest Generation',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    recommendationQuote:
      'Next-gen RDNA 4 architecture offering massive raw performance and improved Ray Tracing.',
    priceDiff: 13000,
    rating: 4.8,
    reviewsCount: 96,
    storeCount: 3,
    availability: 'Limited Stock',
    lowestStore: 'Skyland',
    category: 'Latest Generation',
    featureChips: ['RDNA 4', '16GB VRAM', 'DisplayPort 2.1a', 'FSR 4 AI'],
    scores: {
      gaming: 96,
      productivity: 82,
      aiWorkloads: 84,
      powerEfficiency: 82,
      buildQuality: 5,
    },
    benchmarks: [
      { label: '1440p Ultra FPS', targetVal: 115, altVal: 148, diffText: '+28%' },
      { label: '4K Gaming FPS', targetVal: 54, altVal: 82, diffText: '+51%' },
      { label: 'Ray Tracing RDNA4', targetVal: 72, altVal: 86, diffText: '+19%' },
    ],
    priceTrend: { direction: 'up', percent: 2 },
    specs: {
      vram: '16GB GDDR7',
      bus: '256-bit',
      power: '245W TDP',
      warranty: '3 Years',
      releaseDate: '2026 Q1',
      dimensions: '280 x 120 x 50 mm',
    },
    pros: ['28% Faster gaming FPS', '16GB GDDR7 memory', 'Next-gen DisplayPort 2.1a'],
    cons: ['Requires higher PSU (700W+)'],
    reasons: ['Latest Next-Gen Tech', 'Monster 1440p & 4K Performance', 'Future-proof 16GB GDDR7'],
  },
  {
    id: 'alt-6',
    name: 'NVIDIA GeForce RTX 4060 Ti 8GB',
    brand: 'NVIDIA',
    image:
      'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=600',
    price: 32500,
    oldPrice: 36000,
    discount: 10,
    aiMatch: 87,
    badge: 'Best Budget Choice',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/40',
    recommendationQuote:
      'Save ৳7,400 while keeping 85% of the performance for budget 1080p/1440p gaming.',
    priceDiff: -7400,
    rating: 4.6,
    reviewsCount: 820,
    storeCount: 7,
    availability: 'Available',
    lowestStore: 'UCC BD',
    category: 'Lower Price',
    featureChips: ['DLSS 3', 'Low Power 160W', '1080p Beast', 'Compact'],
    scores: {
      gaming: 78,
      productivity: 74,
      aiWorkloads: 76,
      powerEfficiency: 94,
      buildQuality: 4,
    },
    benchmarks: [
      { label: '1080p Ultra FPS', targetVal: 144, altVal: 130, diffText: '-10%' },
      { label: 'Power Consumption', targetVal: 160, altVal: 160, diffText: '0%' },
      { label: 'Price Savings', targetVal: 0, altVal: 7400, diffText: '-৳7,400' },
    ],
    priceTrend: { direction: 'down', percent: 6 },
    specs: {
      vram: '8GB GDDR6',
      bus: '128-bit',
      power: '160W TDP',
      warranty: '3 Years',
      releaseDate: '2023 Q2',
      dimensions: '200 x 110 x 38 mm',
    },
    pros: ['Save ৳7,400', 'Very low power draw', 'Fits in small cases'],
    cons: ['15% slower than 5060 Ti'],
    reasons: ['Massive Price Savings (-৳7,400)', 'Low 160W Power Draw', 'Solid 1080p/1440p Gaming'],
  },
  {
    id: 'alt-7',
    name: 'Intel Arc B770 Battlemage 16GB',
    brand: 'Intel',
    image:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600',
    price: 35900,
    oldPrice: 39900,
    discount: 10,
    aiMatch: 88,
    badge: 'Best Productivity',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    recommendationQuote:
      'Dual AV1 encoders and 16GB VRAM make this an unmatched budget card for video editing.',
    priceDiff: -4000,
    rating: 4.5,
    reviewsCount: 140,
    storeCount: 4,
    availability: 'Available',
    lowestStore: 'PC House',
    category: 'Similar Performance',
    featureChips: ['Dual AV1', 'XeSS AI', '16GB VRAM', 'XMX Engines'],
    scores: {
      gaming: 80,
      productivity: 94,
      aiWorkloads: 82,
      powerEfficiency: 80,
      buildQuality: 4,
    },
    benchmarks: [
      { label: 'AV1 Video Encoding (fps)', targetVal: 90, altVal: 180, diffText: '+100%' },
      { label: 'Premiere Export (s)', targetVal: 65, altVal: 42, diffText: '-35% Time' },
      { label: '1440p XeSS FPS', targetVal: 115, altVal: 110, diffText: '-4%' },
    ],
    priceTrend: { direction: 'down', percent: 4 },
    specs: {
      vram: '16GB GDDR6',
      bus: '256-bit',
      power: '190W TDP',
      warranty: '3 Years',
      releaseDate: '2025 Q4',
      dimensions: '240 x 112 x 42 mm',
    },
    pros: [
      'Dual AV1 hardware encoders',
      '16GB VRAM for under ৳36,000',
      'Great Davinci / Premiere speed',
    ],
    cons: ['Older DirectX 9/10 games require emulation'],
    reasons: [
      'Unbeatable Video Editing & AV1',
      '16GB VRAM Buffer',
      'Cheaper than Target (-৳4,000)',
    ],
  },
  {
    id: 'alt-8',
    name: 'NVIDIA GeForce RTX 5080 16GB',
    brand: 'NVIDIA',
    image:
      'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&q=80&w=600',
    price: 115000,
    oldPrice: 125000,
    discount: 8,
    aiMatch: 99,
    badge: "Editor's Choice",
    badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    recommendationQuote:
      'Flagship enthusiast GPU for uncompromising 4K high refresh rate gaming and heavy AI LLM fine-tuning.',
    priceDiff: 75100,
    rating: 5.0,
    reviewsCount: 230,
    storeCount: 5,
    availability: 'Limited Stock',
    lowestStore: 'Star Tech',
    category: 'Better Performance',
    featureChips: ['DLSS 4', '4K Beast', '16GB GDDR7', 'Blackwell AI', 'Top Tier'],
    scores: {
      gaming: 100,
      productivity: 100,
      aiWorkloads: 100,
      powerEfficiency: 82,
      buildQuality: 5,
    },
    benchmarks: [
      { label: '4K Ray Tracing FPS', targetVal: 54, altVal: 135, diffText: '+150%' },
      { label: 'AI Model Training (img/s)', targetVal: 120, altVal: 380, diffText: '+216%' },
      { label: 'VRAM Bandwidth (GB/s)', targetVal: 448, altVal: 1024, diffText: '+128%' },
    ],
    priceTrend: { direction: 'down', percent: 1 },
    specs: {
      vram: '16GB GDDR7',
      bus: '256-bit',
      power: '360W TDP',
      warranty: '3 Years',
      releaseDate: '2026 Q1',
      dimensions: '304 x 137 x 61 mm',
    },
    pros: [
      'Ultimate 4K gaming & Ray Tracing',
      'Blackwell architecture flagship power',
      '1024 GB/s Memory Bandwidth',
    ],
    cons: ['High power requirement (850W PSU)', 'High price point'],
    reasons: [
      'Uncompromised 4K Performance',
      'Maximum AI & Machine Learning Speed',
      'Premium Flagship Build Quality',
    ],
  },
];
