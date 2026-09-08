import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FALLBACK_CATALOG, fetchBuilderCatalog } from '../api/builderCatalog';
import {
  slotSource,
  type BuilderProduct,
  type ComponentCategory,
} from '../components/builder/builderCatalog';

/** Categories with fewer live products than this are padded with curated fallback parts. */
const MIN_LIVE_PER_CATEGORY = 4;

export interface BuilderCatalog {
  /** Products offered in the picker. */
  products: BuilderProduct[];
  /** Resolves any id — live UUIDs and legacy curated ids (old share links / saved builds). */
  byId: Map<string, BuilderProduct>;
  forSlot: (slot: ComponentCategory) => BuilderProduct[];
  isLive: boolean;
  isLoading: boolean;
}

export function useBuilderCatalog(): BuilderCatalog {
  const { data, isLoading } = useQuery({
    queryKey: ['builder-catalog'],
    queryFn: fetchBuilderCatalog,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return useMemo(() => {
    const live = data ?? [];
    const liveCount = new Map<ComponentCategory, number>();
    for (const p of live) liveCount.set(p.category, (liveCount.get(p.category) ?? 0) + 1);

    const padding = FALLBACK_CATALOG.filter(
      (p) => (liveCount.get(p.category) ?? 0) < MIN_LIVE_PER_CATEGORY,
    );
    const products = [...live, ...padding];
    const byId = new Map([...FALLBACK_CATALOG, ...live].map((p) => [p.id, p]));

    return {
      products,
      byId,
      forSlot: (slot) => products.filter((p) => p.category === slotSource(slot)),
      isLive: live.length > 0,
      isLoading,
    };
  }, [data, isLoading]);
}
