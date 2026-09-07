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

    return data.map((f: any) => ({
      id: f.filter_key,
      title: f.filter_label,
      type: f.filter_type,
      options: Array.isArray(f.options)
        ? f.options
        : typeof f.options === 'string'
        ? JSON.parse(f.options)
        : [],
    }));
  } catch (err) {
    console.warn('[getFiltersConfig] Falling back to default facets:', err);
    return categorySlug ? CATEGORY_FACETS[categorySlug] || [] : [];
  }
}

/**
 * Fetch available brands for a category
 */
export async function getAvailableBrands(categorySlug?: string): Promise<{ brand: string; count: number }[]> {
  try {
    let query = supabase.from('products').select(`
      brand_id,
      brands:brand_id ( name ),
      categories:category_id ( slug, parent_id )
    `);

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    const brandCounts: Record<string, number> = {};

    data.forEach((p: any) => {
      const pCatSlug = p.categories?.slug || '';
      if (!categorySlug || categorySlug === 'all' || pCatSlug.startsWith(categorySlug)) {
        const brandName = p.brands?.name || 'Generic';
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
