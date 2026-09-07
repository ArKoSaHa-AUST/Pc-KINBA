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
  | 'workstation-ai'
  | string;

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
  categoryId?: string;
  brandId?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  inStock: boolean;
  stockCount?: number;
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
  accentColor: string;
  badge?: string;
  linkUrl: string;
}

export interface DynamicFilterFacet {
  id: string;
  title: string;
  type?: 'range' | 'select' | 'multi-select';
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

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: ProductComponent;
  createdAt: string;
}

// Database Schema Interfaces
export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon: string | null;
  accent_color: string | null;
  display_order: number;
  created_at: string;
}

export interface DBBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export interface DBProduct {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  brand_id: string;
  price: number;
  discount_price: number | null;
  stock: number;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface DBProductSpec {
  id: string;
  product_id: string;
  spec_key: string;
  spec_value: string;
  spec_group: string;
  created_at: string;
}

export interface DBFiltersConfig {
  id: string;
  category_id: string | null;
  filter_key: string;
  filter_label: string;
  filter_type: 'range' | 'select' | 'multi-select';
  options: { label: string; value: string }[];
  display_order: number;
  created_at: string;
}

export interface DBCart {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DBCompareList {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}
