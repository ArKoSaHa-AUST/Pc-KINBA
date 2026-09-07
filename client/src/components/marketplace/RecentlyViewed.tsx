import { History, Trash2 } from 'lucide-react';
import { useComponentStore } from '../../store/useComponentStore';

export default function RecentlyViewed() {
  const recentlyViewed = useComponentStore((s) => s.recentlyViewed);
  const clearRecentlyViewed = useComponentStore((s) => s.clearRecentlyViewed);
  const setQuickViewProduct = useComponentStore((s) => s.setQuickViewProduct);

  if (!recentlyViewed || recentlyViewed.length === 0) return null;

  return (
    <div className="w-full mt-14 pt-8 border-t border-border/80">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
            Recently Viewed Components
          </h3>
        </div>
        <button
          onClick={clearRecentlyViewed}
          className="text-xs text-text-muted hover:text-danger flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {recentlyViewed.slice(0, 6).map((item) => (
          <div
            key={item.id}
            onClick={() => setQuickViewProduct(item)}
            className="group relative bg-bg-surface/80 border border-border hover:border-accent/50 rounded-xl p-3 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
          >
            <div className="w-full pt-[80%] relative bg-[#070b14] rounded-lg mb-2 overflow-hidden flex items-center justify-center">
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-accent tracking-wider block">
                {item.brand}
              </span>
              <h4 className="text-xs font-semibold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                {item.name}
              </h4>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-text-primary">
                  ৳{item.price.toLocaleString()}
                </span>
                <span className="text-[10px] text-text-muted">{item.category.toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
