import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { useComponentStore } from '../store/useComponentStore';
import {
  getUserCompareList,
  addToUserCompare,
  removeFromUserCompare,
  clearUserCompare,
  syncGuestCompare,
} from '../api/userCompare';
import type { CompareProductItem, ProductComponent } from '../types/components';

export function useCompare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAuth = !!user?.id && !user.id.startsWith('demo_');

  // Local Zustand compare store
  const localCompareList = useComponentStore((s) => s.compareList);
  const addLocalCompare = useComponentStore((s) => s.addToCompare);
  const removeLocalCompare = useComponentStore((s) => s.removeFromCompare);
  const clearLocalCompare = useComponentStore((s) => s.clearCompare);
  const isCompareModalOpen = useComponentStore((s) => s.isCompareModalOpen);
  const setCompareModalOpen = useComponentStore((s) => s.setCompareModalOpen);

  // Supabase query for authenticated users
  const { data: dbCompareList = [], isLoading } = useQuery<CompareProductItem[]>({
    queryKey: ['compare-list', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return getUserCompareList(user.id);
    },
    enabled: isAuth,
    staleTime: 1000 * 60,
  });

  // Sync local items to Supabase on login
  useEffect(() => {
    if (isAuth && user?.id && localCompareList.length > 0) {
      syncGuestCompare(
        user.id,
        localCompareList.map((i) => i.id),
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ['compare-list', user.id] });
      });
    }
  }, [isAuth, user?.id, queryClient, localCompareList]);

  // Active compare list
  const compareList: CompareProductItem[] =
    isAuth && dbCompareList.length > 0 ? dbCompareList : localCompareList;

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async (product: ProductComponent) => {
      addLocalCompare(product);
      if (isAuth && user?.id) {
        return addToUserCompare(user.id, product.id);
      }
      return { success: true };
    },
    onSuccess: () => {
      if (isAuth && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['compare-list', user.id] });
      }
    },
  });

  // Remove Mutation
  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      removeLocalCompare(productId);
      if (isAuth && user?.id) {
        return removeFromUserCompare(user.id, productId);
      }
      return { success: true };
    },
    onSuccess: () => {
      if (isAuth && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['compare-list', user.id] });
      }
    },
  });

  // Clear Mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      clearLocalCompare();
      if (isAuth && user?.id) {
        return clearUserCompare(user.id);
      }
      return { success: true };
    },
    onSuccess: () => {
      if (isAuth && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['compare-list', user.id] });
      }
    },
  });

  const isInCompare = (productId: string) => {
    return compareList.some((p) => p.id === productId);
  };

  return {
    compareList,
    isLoading,
    isCompareModalOpen,
    setCompareModalOpen,
    addToCompare: (product: ProductComponent) => addMutation.mutateAsync(product),
    removeFromCompare: (productId: string) => removeMutation.mutateAsync(productId),
    clearCompare: () => clearMutation.mutateAsync(),
    isInCompare,
  };
}
