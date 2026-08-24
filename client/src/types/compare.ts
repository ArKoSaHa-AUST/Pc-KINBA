export type ComponentCategory = 'gpu' | 'cpu' | 'motherboard' | 'ram' | 'storage' | 'psu' | 'case';

export interface RetailerPriceInfo {
  retailerName: string;
  retailerSlug: 'startech' | 'ryans' | 'techland' | 'other';
  priceBDT: number | null; // null if price withheld or out of stock
  inStock: boolean;
  stockStatus: 'in_stock' | 'out_of_stock' | 'pre_order' | 'price_withheld';
  warranty: string;
  productUrl: string;
  lastSynced: string;
}

export interface SpecItem {
  key: string;
  label: string;
  labelBn?: string;
  format?: 'text' | 'number' | 'currency' | 'frequency' | 'power' | 'memory' | 'percentage';
  unit?: string;
  higherIsBetter?: boolean;
}

export interface SpecCategoryGroup {
  id: string;
  title: string;
  titleBn?: string;
  iconName: string;
  specs: SpecItem[];
}

export interface CompareProduct {
  id: string;
  name: string;
  brand: string;
  category: ComponentCategory;
  vendor:
    | 'nvidia'
    | 'amd'
    | 'intel'
    | 'asus'
    | 'msi'
    | 'gigabyte'
    | 'zotac'
    | 'sapphire'
    | 'pny'
    | 'other';
  image: string;
  basePriceBDT: number | null;
  retailers: RetailerPriceInfo[];
  primarySource: string;
  priceLastSynced: string;
  specs: Record<string, string | number | boolean | null>;
}

export interface SlotState {
  slotIndex: number;
  product: CompareProduct | null;
}
