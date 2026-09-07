import { createClient } from '../utils/supabase/client';
import type { CompareProductItem } from '../types/components';
import { mapDbProductToComponent } from './products';

const supabase = createClient();

/**
 * Fetch user's persistent compare list from Supabase
 */
export async function getUserCompareList(userId: string): Promise<CompareProductItem[]> {
  try {
    const { data, error } = await supabase
      .from('compare_list')
      .select(`
        id,
        user_id,
        product_id,
        created_at,
        products (
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
          categories:category_id ( id, name, slug, parent_id ),
          brands:brand_id ( id, name, slug ),
          product_images ( id, image_url, is_primary, display_order ),
          product_specs ( id, spec_key, spec_value, spec_group )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data
      .filter((item: any) => item.products)
      .map((item: any) => {
        const prod = mapDbProductToComponent(
          item.products,
          item.products?.product_images || [],
          item.products?.product_specs || [],
        );
        return {
          id: prod.id,
          name: prod.name,
          brand: prod.brand,
          category: prod.category,
          image: prod.image,
          price: prod.price,
          rating: prod.rating,
          specs: prod.specs,
          bulletSpecs: prod.bulletSpecs,
          inStock: prod.inStock,
        };
      });
  } catch (err) {
    console.warn('[getUserCompareList] Error fetching compare list:', err);
    return [];
  }
}

/**
 * Add a product to authenticated user's compare list
 */
export async function addToUserCompare(
  userId: string,
  productId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { count } = await supabase
      .from('compare_list')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count && count >= 4) {
      return { success: false, error: 'Maximum 4 components can be compared simultaneously' };
    }

    const { error } = await supabase.from('compare_list').upsert(
      {
        user_id: userId,
        product_id: productId,
      },
      { onConflict: 'user_id,product_id' },
    );

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[addToUserCompare] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a product from user's compare list
 */
export async function removeFromUserCompare(
  userId: string,
  productId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('compare_list')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[removeFromUserCompare] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clear user's entire compare list
 */
export async function clearUserCompare(userId: string): Promise<{ success: boolean }> {
  try {
    await supabase.from('compare_list').delete().eq('user_id', userId);
    return { success: true };
  } catch (err) {
    console.error('[clearUserCompare] Error:', err);
    return { success: false };
  }
}

/**
 * Sync guest local compare list to Supabase when user logs in
 */
export async function syncGuestCompare(userId: string, productIds: string[]): Promise<void> {
  if (!userId || productIds.length === 0) return;
  for (const pid of productIds.slice(0, 4)) {
    await addToUserCompare(userId, pid);
  }
}
