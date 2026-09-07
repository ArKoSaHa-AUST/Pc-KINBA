export type CategoryGroup =
  | 'core'
  | 'peripherals'
  | 'accessories'
  | 'networking'
  | 'advanced';

export type ComponentCategory =
  // Core
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'ram'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooler'
  | 'fans'
  // Peripherals
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'headphone'
  | 'speaker'
  | 'webcam'
  | 'microphone'
  // Accessories
  | 'thermal-paste'
  | 'rgb-fan-hub'
  | 'pcie-card'
  | 'capture-card'
  | 'cables-dock'
  | 'usb-flash-drive'
  | 'external-storage'
  // Networking
  | 'router'
  | 'switch'
  | 'wifi-adapter'
  // Advanced
  | 'nas'
  | 'server'
  | 'workstation-ai';

export interface RetailerPrice {
  name: 'StarTech' | 'Ryans' | 'Techland' | 'Skyland' | 'Potaka IT' | string;
  price: number;
  inStock: boolean;
  url: string;
  badge?: string;
  warranty?: string;
}

export interface SpecItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ProductComponent {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ComponentCategory;
  subcategory?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  inStock: boolean;
  stockStatus: 'in_stock' | 'pre_order' | 'out_of_stock' | 'limited_stock';
  rating: number;
  reviewCount: number;
  image: string;
  gallery: string[];
  bulletSpecs: string[];
  specs: Record<string, string>;
  specSections?: { title: string; items: SpecItem[] }[];
  retailers: RetailerPrice[];
  featured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
  tdp?: number;
  compatibility?: {
    socket?: string;
    ramType?: 'DDR4' | 'DDR5' | 'DDR3';
    formFactor?: string;
    pcieGen?: string;
    recommendedPsuWattage?: number;
    notes?: string;
  };
}

export interface CategoryInfo {
  id: ComponentCategory;
  name: string;
  group: CategoryGroup;
  iconName: string;
  description: string;
  subcategories: { id: string; name: string }[];
  badge?: string;
  accentColor: string;
  heroImage: string;
}

export interface HeroCategoryCard {
  id: string;
  title: string;
  category: ComponentCategory;
  tag: string;
  imageUrl: string;
  accentColor: string; // e.g. '#00e5ff' or '#ef4444' or '#10b981'
  badge?: string;
  linkUrl: string;
}

export interface DynamicFilterFacet {
  id: string;
  title: string;
  options: { label: string; value: string; count?: number }[];
}

export interface FilterState {
  searchQuery: string;
  category: ComponentCategory | 'all';
  subcategory: string | 'all';
  brands: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  retailers: string[];
  dynamicSpecs: Record<string, string[]>;
  sortBy: 'featured' | 'price_asc' | 'price_desc' | 'rating' | 'discount' | 'newest';
  viewMode: 'grid-4' | 'grid-3' | 'list';
}

export interface CompareProductItem {
  id: string;
  name: string;
  brand: string;
  category: ComponentCategory;
  image: string;
  price: number;
  rating: number;
  specs: Record<string, string>;
  bulletSpecs: string[];
  inStock: boolean;
}
