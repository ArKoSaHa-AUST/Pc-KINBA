import { createClient } from '../utils/supabase/client';
import type { DynamicFilterFacet } from '../types/components';
import { CATEGORY_FACETS } from '../data/categoryTaxonomy';

const supabase = createClient();

/**
 * Fetch dynamic filter facets from filters_config table
 */
export async function getFiltersConfig(categorySlug?: string): Promise<DynamicFilterFacet[]> {
  try {
    if (!categorySlug || categorySlug === 'all') {
      return [];
    }

    // First find category id for this slug or root category
    const { data: catData } = await supabase
      .from('categories')
      .select('id, parent_id, slug')
      .or(`slug.eq.${categorySlug},slug.like.${categorySlug}-%`);

    if (!catData || catData.length === 0) {
      return CATEGORY_FACETS[categorySlug] || [];
    }

    const catIds = catData.map((c) => c.id);

    const { data, error } = await supabase
      .from('filters_config')
      .select('*')
      .in('category_id', catIds)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return CATEGORY_FACETS[categorySlug] || [];
    }

    return data.map(
      (f: {
        filter_key: string;
        filter_label: string;
        filter_type?: DynamicFilterFacet['type'];
        options: unknown;
      }) => ({
        id: f.filter_key,
        title: f.filter_label,
        type: f.filter_type,
        options: Array.isArray(f.options)
          ? f.options
          : typeof f.options === 'string'
            ? JSON.parse(f.options)
            : [],
      }),
    );
  } catch (err) {
    console.warn('[getFiltersConfig] Falling back to default facets:', err);
    return CATEGORY_FACETS[categorySlug!] || [];
  }
}

/**
 * Fetch available brands for a category
 */
export async function getAvailableBrands(
  categorySlug?: string,
): Promise<{ brand: string; count: number }[]> {
  try {
    const query = supabase.from('products').select(`
      brand_id,
      brands:brand_id ( name ),
      categories:category_id ( slug, parent_id )
    `);

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    const brandCounts: Record<string, number> = {};
    const rows = data as unknown as {
      brands?: { name?: string } | { name?: string }[] | null;
      categories?:
        | { slug?: string; parent_id?: string | null }
        | { slug?: string; parent_id?: string | null }[]
        | null;
    }[];

    rows.forEach((p) => {
      const pCat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      const pBrand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
      const pCatSlug = pCat?.slug || '';
      if (!categorySlug || categorySlug === 'all' || pCatSlug.startsWith(categorySlug)) {
        const brandName = pBrand?.name || 'Generic';
        brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
      }
    });

    return Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  } catch (err) {
    console.warn('[getAvailableBrands] Error:', err);
    return [];
  }
}
