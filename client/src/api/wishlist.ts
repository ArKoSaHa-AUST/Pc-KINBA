import { createClient } from '../utils/supabase/client';

const supabase = createClient();

/** Canonical product ids the user is tracking (wishlists.product_id → products.id). */
export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('product_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id as string);
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlists')
    .upsert(
      { user_id: userId, product_id: productId },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

export interface WishlistProduct {
  productId: string;
  name: string;
  image: string | null;
  /** Lowest current retailer price, or the catalog price when no listings are linked. */
  bestPrice: number | null;
  /** Cheapest listing id — product pages are addressed by listing id. */
  listingId: string | null;
  addedAt: string;
}

interface WishlistRow {
  product_id: string;
  created_at: string;
  products: {
    name: string;
    price: number | null;
    discount_price: number | null;
    product_images: { image_url: string; is_primary: boolean }[] | null;
    listings: { id: string; price: number }[] | null;
  } | null;
}

/** Wishlist rows joined with product name, image and cheapest live listing. */
export async function getWishlistProducts(userId: string): Promise<WishlistProduct[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select(
      `product_id, created_at,
       products ( name, price, discount_price,
         product_images ( image_url, is_primary ),
         listings ( id, price ) )`,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as WishlistRow[])
    .filter((row) => row.products)
    .map((row) => {
      const p = row.products!;
      const images = p.product_images ?? [];
      const cheapest = (p.listings ?? [])
        .filter((l) => l.price > 0)
        .sort((a, b) => a.price - b.price)[0];
      return {
        productId: row.product_id,
        name: p.name,
        image: images.find((i) => i.is_primary)?.image_url ?? images[0]?.image_url ?? null,
        bestPrice: cheapest?.price ?? p.discount_price ?? p.price ?? null,
        listingId: cheapest?.id ?? null,
        addedAt: row.created_at,
      };
    });
}
