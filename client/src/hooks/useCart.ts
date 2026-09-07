import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  getUserCart,
  addToUserCart,
  updateUserCartItemQty,
  removeFromUserCart,
  clearUserCart,
  syncGuestCart,
} from '../api/cart';
import type { CartItem, ProductComponent } from '../types/components';

const GUEST_CART_KEY = 'pc-kinba.guest_cart';

interface GuestCartItem {
  id: string;
  productId: string;
  quantity: number;
  product: ProductComponent;
  createdAt: string;
}

function getLocalCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCart(items: GuestCartItem[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAuth = !!user?.id && !user.id.startsWith('demo_');

  // Supabase Cart Query for authenticated users
  const {
    data: dbCart = [],
    isLoading,
    refetch,
  } = useQuery<CartItem[]>({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return getUserCart(user.id);
    },
    enabled: isAuth,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Sync local cart to Supabase upon login
  useEffect(() => {
    if (isAuth && user?.id) {
      const local = getLocalCart();
      if (local.length > 0) {
        syncGuestCart(
          user.id,
          local.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        ).then(() => {
          localStorage.removeItem(GUEST_CART_KEY);
          queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
        });
      }
    }
  }, [isAuth, user?.id, queryClient]);

  // Unified items
  const cartItems: (CartItem | GuestCartItem)[] = isAuth ? dbCart : getLocalCart();

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async ({
      product,
      quantity = 1,
    }: {
      product: ProductComponent;
      quantity?: number;
    }) => {
      if (isAuth && user?.id) {
        return addToUserCart(user.id, product.id, quantity);
      } else {
        const local = getLocalCart();
        const existingIdx = local.findIndex((i) => i.productId === product.id);
        if (existingIdx >= 0) {
          local[existingIdx].quantity += quantity;
        } else {
          local.push({
            id: `guest-cart-${Date.now()}`,
            productId: product.id,
            quantity,
            product,
            createdAt: new Date().toISOString(),
          });
        }
        saveLocalCart(local);
        return { success: true };
      }
    },
    onSuccess: () => {
      if (isAuth && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['cart', 'guest'] });
      }
    },
  });

  // Update quantity mutation
  const updateQtyMutation = useMutation({
    mutationFn: async ({
      cartId,
      productId,
      quantity,
    }: {
      cartId: string;
      productId: string;
      quantity: number;
    }) => {
      if (isAuth) {
        return updateUserCartItemQty(cartId, quantity);
      } else {
        let local = getLocalCart();
        if (quantity <= 0) {
          local = local.filter((i) => i.id !== cartId && i.productId !== productId);
        } else {
          const item = local.find((i) => i.id === cartId || i.productId === productId);
          if (item) item.quantity = quantity;
        }
        saveLocalCart(local);
        return { success: true };
      }
    },
    onSuccess: () => {
      if (isAuth && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['cart', 'guest'] });
      }
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async ({ cartId, productId }: { cartId: string; productId: string }) => {
      if (isAuth) {
        return removeFromUserCart(cartId);
      } else {
        const local = getLocalCart().filter((i) => i.id !== cartId && i.productId !== productId);
        saveLocalCart(local);
        return { success: true };
      }
    },
    onSuccess: () => {
      if (isAuth && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['cart', 'guest'] });
      }
    },
  });

  // Clear cart
  const clearCart = useCallback(async () => {
    if (isAuth && user?.id) {
      await clearUserCart(user.id);
      queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
      queryClient.invalidateQueries({ queryKey: ['cart', 'guest'] });
    }
  }, [isAuth, user?.id, queryClient]);

  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return {
    cartItems,
    totalCount,
    subtotal,
    isLoading,
    refetch,
    addToCart: (product: ProductComponent, quantity = 1) =>
      addMutation.mutateAsync({ product, quantity }),
    updateQuantity: (cartId: string, productId: string, quantity: number) =>
      updateQtyMutation.mutateAsync({ cartId, productId, quantity }),
    removeFromCart: (cartId: string, productId: string) =>
      removeMutation.mutateAsync({ cartId, productId }),
    clearCart,
  };
}
