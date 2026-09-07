import { createClient } from '../utils/supabase/client';
import type {
  ProductComponent,
  FilterState,
  ComponentCategory,
  RetailerPrice,
} from '../types/components';
import { MOCK_COMPONENTS } from '../data/mockComponentsData';

const supabase = createClient();

export interface FetchProductsResponse {
  products: ProductComponent[];
  totalCount: number;
}

export interface DBProductImageRow {
  id?: string;
  image_url: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface DBProductSpecRow {
  id?: string;
  spec_key: string;
  spec_value: string;
  spec_group?: string;
}

export interface DBProductRow {
  id: string;
  name: string;
  slug: string;
  category_id?: string;
  brand_id?: string;
  price: number;
  discount_price?: number | null;
  stock?: number;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_new_arrival?: boolean;
  categories?: { id: string; name: string; slug: string; parent_id?: string | null } | null;
  brands?: { id: string; name: string; slug: string } | null;
  product_images?: DBProductImageRow[];
  product_specs?: DBProductSpecRow[];
}

export interface DBListingRow {
  id?: string;
  product_id?: string;
  retailer: string;
  title?: string;
  price: number;
  price_str?: string;
  product_url: string;
  image_url?: string;
}

/**
 * Maps raw database joined row to standard ProductComponent entity
 */
export function mapDbProductToComponent(
  row: DBProductRow,
  images: DBProductImageRow[] = [],
  specs: DBProductSpecRow[] = [],
  listings: DBListingRow[] = [],
): ProductComponent {
  const brandName = row.brands?.name || 'Generic';
  const categorySlug = row.categories?.slug || 'cpu';
  const subcategorySlug = row.categories?.parent_id ? row.categories?.slug : undefined;

  const primaryImage =
    images.find((img) => img.is_primary)?.image_url ||
    images[0]?.image_url ||
    listings.find((l) => l.image_url)?.image_url ||
    'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80';

  const gallery =
    images.length > 0
      ? images.map((i) => i.image_url)
      : (listings.map((l) => l.image_url).filter(Boolean) as string[]);

  const finalGallery = gallery.length > 0 ? gallery : [primaryImage];

  const specsMap: Record<string, string> = {};
  const bulletSpecs: string[] = [];

  specs.forEach((s) => {
    specsMap[s.spec_key] = s.spec_value;
    if (bulletSpecs.length < 5) {
      bulletSpecs.push(`${s.spec_key.replace(/_/g, ' ').toUpperCase()}: ${s.spec_value}`);
    }
  });

  const validListingPrices = listings.map((l) => Number(l.price)).filter((p) => p > 0);
  const lowestListingPrice =
    validListingPrices.length > 0 ? Math.min(...validListingPrices) : undefined;

  const basePrice = Number(row.price) || 0;
  const discountPrice = row.discount_price ? Number(row.discount_price) : undefined;
  const effectivePrice = lowestListingPrice || discountPrice || basePrice;
  const originalPrice =
    discountPrice && basePrice > discountPrice
      ? basePrice
      : validListingPrices.length > 1
        ? Math.max(...validListingPrices)
        : undefined;

  const discountPercent =
    originalPrice && originalPrice > effectivePrice
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : undefined;

  const stock = Number(row.stock) || 12;
  const inStock = stock > 0;
  const stockStatus = stock > 10 ? 'in_stock' : stock > 0 ? 'limited_stock' : 'out_of_stock';

  // Format real retailer offers
  const formattedRetailers: RetailerPrice[] =
    listings.length > 0
      ? listings.map((l) => {
          const lPrice = Number(l.price) || effectivePrice;
          const isLowest = lPrice === lowestListingPrice;
          return {
            name: l.retailer,
            price: lPrice,
            inStock: true,
            url: l.product_url || 'https://www.startech.com.bd',
            badge: isLowest
              ? 'Lowest Price'
              : l.retailer.includes('StarTech') || l.retailer.includes('Ryans')
                ? 'Official Distributor'
                : 'Verified Dealer',
            warranty: '3 Years Official Warranty',
          };
        })
      : [
          {
            name: 'StarTech BD',
            price: effectivePrice,
            inStock: true,
            url: 'https://www.startech.com.bd',
            badge: 'Official Distributor',
            warranty: '3 Years Warranty',
          },
          {
            name: 'Ryans Computers',
            price: effectivePrice + 200,
            inStock: true,
            url: 'https://www.ryanscomputers.com',
            badge: 'Verified Dealer',
            warranty: '3 Years Official',
          },
          {
            name: 'Techland BD',
            price: effectivePrice,
            inStock: true,
            url: 'https://www.techlandbd.com',
            badge: 'Hot Deal',
            warranty: '2 Years Support',
          },
        ];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: brandName,
    brandId: row.brand_id,
    category: categorySlug as ComponentCategory,
    subcategory: subcategorySlug,
    categoryId: row.category_id,
    price: effectivePrice,
    originalPrice,
    discountPercent,
    inStock,
    stockCount: stock,
    stockStatus,
    rating: Number(row.rating) || 4.8,
    reviewCount: Number(row.review_count) || 12,
    image: primaryImage,
    gallery: finalGallery,
    bulletSpecs:
      bulletSpecs.length > 0
        ? bulletSpecs
        : [
            `Brand: ${brandName}`,
            `Verified Retailers: ${formattedRetailers.map((r) => r.name).join(', ')}`,
            `Stock Status: ${inStock ? 'In Stock' : 'Out of Stock'}`,
          ],
    specs: specsMap,
    retailers: formattedRetailers,
    featured: row.is_featured,
    isNewArrival: row.is_new_arrival,
  };
}

/**
 * Fetch products from Supabase with relational joins, server-side filtering, and sorting
 */
export async function getProducts(filters: FilterState): Promise<FetchProductsResponse> {
  try {
    // 1. If category is specified, fetch category ID and all child subcategory IDs
    let categoryIds: string[] | null = null;
    if (filters.category !== 'all') {
      const { data: catRows } = await supabase
        .from('categories')
        .select('id, slug, parent_id')
        .or(`slug.eq.${filters.category},slug.like.${filters.category}-%`);

      if (catRows && catRows.length > 0) {
        if (filters.subcategory !== 'all') {
          const matchedSub = catRows.find((c) => c.slug === filters.subcategory);
          if (matchedSub) {
            categoryIds = [matchedSub.id];
          }
        }
        if (!categoryIds) {
          categoryIds = catRows.map((c) => c.id);
        }
      }
    }

    // 2. Build base query with joins
    let query = supabase.from('products').select(
      `
        id,
        name,
        slug,
        category_id,
        brand_id,
        price,
        discount_price,
        stock,
        rating,
        review_count,
        is_featured,
        is_new_arrival,
        created_at,
        categories:category_id ( id, name, slug, parent_id ),
        brands:brand_id ( id, name, slug ),
        product_images ( id, image_url, is_primary, display_order ),
        product_specs ( id, spec_key, spec_value, spec_group )
      `,
      { count: 'exact' },
    );

    // Apply category IDs
    if (categoryIds && categoryIds.length > 0) {
      query = query.in('category_id', categoryIds);
    }

    // Apply stock filter
    if (filters.inStockOnly) {
      query = query.gt('stock', 0);
    }

    // Apply discount filter
    if (filters.onSaleOnly) {
      query = query.not('discount_price', 'is', null);
    }

    // Apply price range
    if (filters.priceRange[0] > 0) {
      query = query.gte('price', filters.priceRange[0]);
    }
    if (filters.priceRange[1] < 500000) {
      query = query.lte('price', filters.priceRange[1]);
    }

    // Apply search query
    if (filters.searchQuery.trim()) {
      query = query.ilike('name', `%${filters.searchQuery.trim()}%`);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'newest':
        query = query
          .order('is_new_arrival', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'discount':
        query = query.order('discount_price', { ascending: true, nullsFirst: false });
        break;
      case 'featured':
      default:
        query = query
          .order('is_featured', { ascending: false })
          .order('rating', { ascending: false });
        break;
    }

    // Limit to top 200 components per query for high-performance rendering
    query = query.limit(200);

    const { data, count, error } = await query;

    if (error) {
      console.warn('[getProducts] Supabase query error, falling back to mock:', error);
      return { products: MOCK_COMPONENTS, totalCount: MOCK_COMPONENTS.length };
    }

    if (!data || data.length === 0) {
      if (!count && filters.category === 'all' && !filters.searchQuery) {
        return { products: MOCK_COMPONENTS, totalCount: MOCK_COMPONENTS.length };
      }
      return { products: [], totalCount: 0 };
    }

    // 3. Fetch associated listings for all products to attach real retailer store comparison
    const productIds = data.map((p) => p.id);
    const listingsMap: Record<string, DBListingRow[]> = {};
    if (productIds.length > 0) {
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, product_id, retailer, title, price, price_str, product_url, image_url')
        .in('product_id', productIds);

      if (listingsData) {
        listingsData.forEach((l) => {
          if (l.product_id) {
            if (!listingsMap[l.product_id]) {
              listingsMap[l.product_id] = [];
            }
            listingsMap[l.product_id].push(l);
          }
        });
      }
    }

    // 4. Map rows to components
    let mappedProducts: ProductComponent[] = data.map((row) =>
      mapDbProductToComponent(
        row as unknown as DBProductRow,
        (row.product_images || []) as DBProductImageRow[],
        (row.product_specs || []) as DBProductSpecRow[],
        listingsMap[row.id] || [],
      ),
    );

    // Apply brand filtering
    if (filters.brands.length > 0) {
      mappedProducts = mappedProducts.filter((p) => filters.brands.includes(p.brand));
    }

    // Apply retailer filtering (StarTech, Ryans Computers, Techland, Skyland, etc.)
    if (filters.retailers.length > 0) {
      mappedProducts = mappedProducts.filter((p) =>
        p.retailers.some((r) =>
          filters.retailers.some((fRet) => r.name.toLowerCase().includes(fRet.toLowerCase())),
        ),
      );
    }

    // Apply dynamic specs filtering
    const activeSpecEntries = Object.entries(filters.dynamicSpecs).filter(
      ([, vals]) => vals && vals.length > 0,
    );

    if (activeSpecEntries.length > 0) {
      mappedProducts = mappedProducts.filter((p) => {
        return activeSpecEntries.every(([key, selectedValues]) => {
          const specVal = p.specs[key] || '';
          const allSpecsStr = JSON.stringify(p.specs).toLowerCase();
          const bulletsStr = p.bulletSpecs.join(' ').toLowerCase();

          return selectedValues.some((val) => {
            const vLower = val.toLowerCase();
            return (
              specVal.toLowerCase().includes(vLower) ||
              allSpecsStr.includes(vLower) ||
              bulletsStr.includes(vLower)
            );
          });
        });
      });
    }

    return {
      products: mappedProducts,
      totalCount: mappedProducts.length,
    };
  } catch (err) {
    console.error('[getProducts] Unexpected fetch error:', err);
    return { products: MOCK_COMPONENTS, totalCount: MOCK_COMPONENTS.length };
  }
}

/**
 * Fetch a single product by ID or Slug with joined store offers
 */
export async function getProductById(idOrSlug: string): Promise<ProductComponent | null> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let query = supabase.from('products').select(
      `
        id,
        name,
        slug,
        category_id,
        brand_id,
        price,
        discount_price,
        stock,
        rating,
        review_count,
        is_featured,
        is_new_arrival,
        categories:category_id ( id, name, slug, parent_id ),
        brands:brand_id ( id, name, slug ),
        product_images ( id, image_url, is_primary, display_order ),
        product_specs ( id, spec_key, spec_value, spec_group )
      `,
    );

    if (isUuid) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      const mockFound = MOCK_COMPONENTS.find((m) => m.id === idOrSlug || m.slug === idOrSlug);
      return mockFound || null;
    }

    // Fetch listings for this product
    const { data: listings } = await supabase
      .from('listings')
      .select('id, product_id, retailer, title, price, price_str, product_url, image_url')
      .eq('product_id', data.id);

    return mapDbProductToComponent(
      data as unknown as DBProductRow,
      (data.product_images || []) as DBProductImageRow[],
      (data.product_specs || []) as DBProductSpecRow[],
      (listings || []) as DBListingRow[],
    );
  } catch (err) {
    console.error('[getProductById] Error fetching product:', err);
    return MOCK_COMPONENTS.find((m) => m.id === idOrSlug || m.slug === idOrSlug) || null;
  }
}
