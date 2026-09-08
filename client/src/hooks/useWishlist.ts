import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { useComponentStore } from '../store/useComponentStore';
import { addToWishlist, getWishlistProductIds, removeFromWishlist } from '../api/wishlist';

/**
 * Wishlist keyed by canonical products.id. Signed-in Supabase users persist to the
 * `wishlists` table (which powers price-drop notifications); guests fall back to the
 * local Zustand store.
 */
export function useWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAuth = !!user?.id && !user.id.startsWith('demo_') && !user.id.startsWith('user_');

  const localWishlist = useComponentStore((s) => s.wishlist);
  const toggleLocal = useComponentStore((s) => s.toggleWishlist);

  const { data: remoteIds = [] } = useQuery<string[]>({
    queryKey: ['wishlist', user?.id],
    queryFn: () => getWishlistProductIds(user!.id),
    enabled: isAuth,
    staleTime: 60_000,
  });

  const ids = isAuth ? remoteIds : localWishlist;

  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!isAuth) {
        toggleLocal(productId);
        return;
      }
      if (ids.includes(productId)) {
        await removeFromWishlist(user!.id, productId);
      } else {
        await addToWishlist(user!.id, productId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist', user?.id] }),
  });

  return {
    isAuth,
    count: ids.length,
    isInWishlist: (productId: string) => ids.includes(productId),
    toggle: toggleMutation.mutate,
    isPending: toggleMutation.isPending,
  };
}
