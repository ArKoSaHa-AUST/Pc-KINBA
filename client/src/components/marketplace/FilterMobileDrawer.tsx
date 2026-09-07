import { X } from 'lucide-react';
import FilterSidebar from './FilterSidebar';

interface FilterMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBrands: { brand: string; count: number }[];
  availableRetailers: string[];
  totalCount: number;
}

export default function FilterMobileDrawer({
  isOpen,
  onClose,
  availableBrands,
  availableRetailers,
  totalCount,
}: FilterMobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-bg-surface border-l border-border flex flex-col z-10 shadow-2xl animate-slideLeft">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-bg-secondary/50">
          <div>
            <h2 className="font-bold text-base text-text-primary">Filters</h2>
            <p className="text-xs text-text-muted">{totalCount} matching components</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg-primary text-text-muted hover:text-white transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <FilterSidebar
            availableBrands={availableBrands}
            availableRetailers={availableRetailers}
          />
        </div>

        {/* Bottom Apply Button */}
        <div className="p-4 border-t border-border bg-bg-secondary/80">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-accent text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            Apply Filters ({totalCount} Products)
          </button>
        </div>
      </div>
    </div>
  );
}
