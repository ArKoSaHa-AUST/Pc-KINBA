import { createClient } from '../utils/supabase/client';
import type { CartItem } from '../types/components';
import { mapDbProductToComponent } from './products';

const supabase = createClient();

/**
 * Fetch authenticated user cart items from Supabase
 */
export async function getUserCart(userId: string): Promise<CartItem[]> {
  try {
    const { data, error } = await supabase
      .from('cart')
      .select(
        `
        id,
        user_id,
        product_id,
        quantity,
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
          is_featured,
          is_new_arrival,
          categories:category_id ( id, name, slug, parent_id ),
          brands:brand_id ( id, name, slug ),
          product_images ( id, image_url, is_primary, display_order ),
          product_specs ( id, spec_key, spec_value, spec_group )
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getUserCart] Error fetching cart:', error);
      return [];
    }

    return (data || []).map((item) => {
      const productRow = item.products as unknown as Parameters<typeof mapDbProductToComponent>[0];
      const productImages =
        (item.products as { product_images?: unknown[] } | null)?.product_images || [];
      const productSpecs =
        (item.products as { product_specs?: unknown[] } | null)?.product_specs || [];

      return {
        id: item.id,
        userId: item.user_id,
        productId: item.product_id,
        quantity: item.quantity,
        createdAt: item.created_at,
        product: mapDbProductToComponent(
          productRow,
          productImages as Parameters<typeof mapDbProductToComponent>[1],
          productSpecs as Parameters<typeof mapDbProductToComponent>[2],
        ),
      };
    });
  } catch (err) {
    console.error('[getUserCart] Unexpected error:', err);
    return [];
  }
}

/**
 * Add item to Supabase cart or increment quantity if exists
 */
export async function addToUserCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from('cart')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const newQty = existing.quantity + quantity;
      const { error } = await supabase
        .from('cart')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('cart').insert({
        user_id: userId,
        product_id: productId,
        quantity,
      });

      if (error) throw error;
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('[addToUserCart] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update cart item quantity
 */
export async function updateUserCartItemQty(
  cartId: string,
  quantity: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (quantity <= 0) {
      return removeFromUserCart(cartId);
    }

    const { error } = await supabase
      .from('cart')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', cartId);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateUserCartItemQty] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Remove item from user cart
 */
export async function removeFromUserCart(
  cartId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('cart').delete().eq('id', cartId);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    console.error('[removeFromUserCart] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Clear all cart items for a user
 */
export async function clearUserCart(userId: string): Promise<{ success: boolean }> {
  try {
    await supabase.from('cart').delete().eq('user_id', userId);
    return { success: true };
  } catch (err) {
    console.error('[clearUserCart] Error:', err);
    return { success: false };
  }
}

/**
 * Sync guest cart items into database when user logs in
 */
export async function syncGuestCart(
  userId: string,
  guestItems: { productId: string; quantity: number }[],
): Promise<void> {
  if (!userId || guestItems.length === 0) return;

  for (const item of guestItems) {
    await addToUserCart(userId, item.productId, item.quantity);
  }
}
