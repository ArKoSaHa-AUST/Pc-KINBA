import { createClient } from '../utils/supabase/client';
import type { ProductComponent, FilterState } from '../types/components';
import { MOCK_COMPONENTS } from '../data/mockComponentsData';

const supabase = createClient();

export interface FetchProductsResponse {
  products: ProductComponent[];
  totalCount: number;
}

/**
 * Maps raw database joined row to standard ProductComponent entity
 */
export function mapDbProductToComponent(
  row: any,
  images: any[] = [],
  specs: any[] = [],
): ProductComponent {
  const brandName = row.brands?.name || 'Generic';
  const categorySlug = row.categories?.slug || 'cpu';
  const subcategorySlug = row.categories?.parent_id ? row.categories?.slug : undefined;

  const primaryImage =
    images.find((img) => img.is_primary)?.image_url ||
    images[0]?.image_url ||
    'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80';

  const gallery = images.length > 0 ? images.map((i) => i.image_url) : [primaryImage];

  const specsMap: Record<string, string> = {};
  const bulletSpecs: string[] = [];

  specs.forEach((s) => {
    specsMap[s.spec_key] = s.spec_value;
    if (bulletSpecs.length < 5) {
      bulletSpecs.push(`${s.spec_key.replace(/_/g, ' ').toUpperCase()}: ${s.spec_value}`);
    }
  });

  const price = Number(row.price) || 0;
  const discountPrice = row.discount_price ? Number(row.discount_price) : undefined;
  const discountPercent =
    discountPrice && price > discountPrice
      ? Math.round(((price - discountPrice) / price) * 100)
      : undefined;

  const stock = Number(row.stock) || 0;
  const inStock = stock > 0;
  const stockStatus =
    stock > 10 ? 'in_stock' : stock > 0 ? 'limited_stock' : 'out_of_stock';

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: brandName,
    brandId: row.brand_id,
    category: categorySlug as any,
    subcategory: subcategorySlug,
    categoryId: row.category_id,
    price: discountPrice || price,
    originalPrice: discountPrice ? price : undefined,
    discountPercent,
    inStock,
    stockCount: stock,
    stockStatus,
    rating: Number(row.rating) || 4.8,
    reviewCount: Number(row.review_count) || 0,
    image: primaryImage,
    gallery,
    bulletSpecs:
      bulletSpecs.length > 0
        ? bulletSpecs
        : [`Brand: ${brandName}`, `Stock: ${inStock ? 'In Stock' : 'Out of Stock'}`],
    specs: specsMap,
    retailers: [
      {
        name: 'StarTech',
        price: discountPrice || price,
        inStock,
        url: 'https://startech.com.bd',
        badge: 'Official Distributor',
        warranty: '3 Years Warranty',
      },
      {
        name: 'Ryans Computers',
        price: (discountPrice || price) + 200,
        inStock,
        url: 'https://ryanscomputers.com',
        badge: 'Verified Dealer',
        warranty: '3 Years Official',
      },
      {
        name: 'Techland BD',
        price: (discountPrice || price) - 100,
        inStock,
        url: 'https://techlandbd.com',
        badge: 'Hot Deal',
        warranty: '2 Years Support',
      },
    ],
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
        // If subcategory is selected, pick only that specific subcategory id
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
    let query = supabase
      .from('products')
      .select(
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
        query = query.order('is_new_arrival', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'discount':
        query = query.order('discount_price', { ascending: true, nullsFirst: false });
        break;
      case 'featured':
      default:
        query = query.order('is_featured', { ascending: false }).order('rating', { ascending: false });
        break;
    }

    const { data, count, error } = await query;

    if (error) {
      console.warn('[getProducts] Supabase query error, falling back to mock:', error);
      return { products: MOCK_COMPONENTS, totalCount: MOCK_COMPONENTS.length };
    }

    if (!data || data.length === 0) {
      // If table is completely empty, fallback
      if (!count && filters.category === 'all' && !filters.searchQuery) {
        return { products: MOCK_COMPONENTS, totalCount: MOCK_COMPONENTS.length };
      }
      return { products: [], totalCount: 0 };
    }

    // Map rows
    let mappedProducts: ProductComponent[] = data.map((row: any) =>
      mapDbProductToComponent(row, row.product_images || [], row.product_specs || []),
    );

    // Apply client-side brand and dynamic specs filtering
    if (filters.brands.length > 0) {
      mappedProducts = mappedProducts.filter((p) => filters.brands.includes(p.brand));
    }

    // Apply dynamic specs filtering
    const activeSpecEntries = Object.entries(filters.dynamicSpecs).filter(
      ([_, vals]) => vals && vals.length > 0,
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
 * Fetch a single product by ID or Slug
 */
export async function getProductById(idOrSlug: string): Promise<ProductComponent | null> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let query = supabase
      .from('products')
      .select(
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
      const mockFound = MOCK_COMPONENTS.find(
        (m) => m.id === idOrSlug || m.slug === idOrSlug,
      );
      return mockFound || null;
    }

    return mapDbProductToComponent(
      data,
      data.product_images || [],
      data.product_specs || [],
    );
  } catch (err) {
    console.error('[getProductById] Error fetching product:', err);
    return MOCK_COMPONENTS.find((m) => m.id === idOrSlug || m.slug === idOrSlug) || null;
  }
}
