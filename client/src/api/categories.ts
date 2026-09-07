import { createClient } from '../utils/supabase/client';
import type {
  CategoryInfo,
  DBCategory,
  ComponentCategory,
  CategoryGroup,
} from '../types/components';
import { CATEGORY_TAXONOMY } from '../data/categoryTaxonomy';

const supabase = createClient();

/**
 * Maps database category rows into CategoryInfo taxonomy tree
 */
export async function getCategories(): Promise<CategoryInfo[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return CATEGORY_TAXONOMY;
    }

    const dbCategories = data as DBCategory[];
    const rootCategories = dbCategories.filter((c) => !c.parent_id);

    const mapped: CategoryInfo[] = rootCategories.map((root) => {
      const subcategories = dbCategories
        .filter((c) => c.parent_id === root.id)
        .map((sub) => ({ id: sub.slug, name: sub.name }));

      // Find matching mock info for description & default fallback images if empty
      const existingInfo = CATEGORY_TAXONOMY.find((c: CategoryInfo) => c.id === root.slug);

      return {
        id: root.slug as ComponentCategory,
        name: root.name,
        group: (existingInfo?.group || 'core') as CategoryGroup,
        iconName: root.icon || existingInfo?.iconName || 'Cpu',
        description: existingInfo?.description || `${root.name} components and hardware`,
        subcategories: subcategories.length > 0 ? subcategories : existingInfo?.subcategories || [],
        badge: existingInfo?.badge,
        accentColor: root.accent_color || existingInfo?.accentColor || '#00e5ff',
        heroImage:
          existingInfo?.heroImage ||
          'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1200&auto=format&fit=crop&q=80',
      };
    });

    return mapped.length > 0 ? mapped : CATEGORY_TAXONOMY;
  } catch (err) {
    console.warn('[getCategories] Falling back to default category taxonomy:', err);
    return CATEGORY_TAXONOMY;
  }
}
