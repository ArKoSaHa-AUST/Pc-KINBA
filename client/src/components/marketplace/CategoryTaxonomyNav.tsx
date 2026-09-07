import { useMemo } from 'react';
import {
  Cpu,
  Zap,
  CircuitBoard,
  Layers,
  HardDrive,
  BatteryCharging,
  Box,
  Fan,
  Tv,
  Keyboard,
  Mouse,
  Headphones,
  Volume2,
  Wifi,
  Server,
  Grid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../../api/categories';
import { CATEGORY_TAXONOMY } from '../../data/categoryTaxonomy';
import { useComponentStore } from '../../store/useComponentStore';
import type { CategoryInfo, ComponentCategory } from '../../types/components';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  cpu: Cpu,
  gpu: Zap,
  motherboard: CircuitBoard,
  ram: Layers,
  storage: HardDrive,
  psu: BatteryCharging,
  case: Box,
  cooler: Fan,
  monitor: Tv,
  keyboard: Keyboard,
  mouse: Mouse,
  headphone: Headphones,
  speaker: Volume2,
  router: Wifi,
  nas: Server,
};

export default function CategoryTaxonomyNav() {
  const activeCategory = useComponentStore((s) => s.filters.category);
  const activeSubcategory = useComponentStore((s) => s.filters.subcategory);
  const setFilter = useComponentStore((s) => s.setFilter);

  const { data: categories = CATEGORY_TAXONOMY } = useQuery<CategoryInfo[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 15,
  });

  const currentCategoryMeta = useMemo(() => {
    return categories.find((c: CategoryInfo) => c.id === activeCategory);
  }, [categories, activeCategory]);

  return (
    <div className="w-full mb-8">
      {/* Primary Category Quick Switcher Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => {
            setFilter('category', 'all');
            setFilter('subcategory', 'all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-accent text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
              : 'bg-bg-surface/80 border border-border text-text-muted hover:text-white hover:border-accent/40'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>All Components</span>
        </button>

        {categories.slice(0, 10).map((cat: CategoryInfo) => {
          const Icon = CATEGORY_ICON_MAP[cat.id] || Cpu;
          const isSelected = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setFilter('category', cat.id as ComponentCategory);
                setFilter('subcategory', 'all');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-accent text-black font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                  : 'bg-bg-surface/80 border border-border text-text-muted hover:text-white hover:border-accent/40 hover:bg-bg-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name.split(' (')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Subcategory Secondary Pills Bar (if a specific category is active) */}
      {currentCategoryMeta && currentCategoryMeta.subcategories.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 overflow-x-auto pb-1 scrollbar-none animate-fadeIn">
          <span className="text-[11px] font-semibold uppercase text-text-muted tracking-wider flex-shrink-0 mr-1">
            Sub-series:
          </span>
          <button
            onClick={() => setFilter('subcategory', 'all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeSubcategory === 'all'
                ? 'bg-purple/30 text-purple border border-purple/50'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'
            }`}
          >
            All {currentCategoryMeta.name.split(' (')[0]}
          </button>
          {currentCategoryMeta.subcategories.map((sub: { id: string; name: string }) => {
            const isSelected = activeSubcategory === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setFilter('subcategory', sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple/30 text-purple border border-purple/50 font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-surface border border-transparent'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
