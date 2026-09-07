import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Eye, CheckCircle2, Clock, ExternalLink, Layers, Sparkles } from 'lucide-react';
import type { ProductComponent } from '../../types/components';
import { useComponentStore } from '../../store/useComponentStore';
import { useCompare } from '../../hooks/useCompare';

interface ProductCardProps {
  product: ProductComponent;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const setQuickViewProduct = useComponentStore((s) => s.setQuickViewProduct);
  const addRecentlyViewed = useComponentStore((s) => s.addRecentlyViewed);

  const inCompare = isInCompare(product.id);

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
    addRecentlyViewed(product);
  };

  return (
    <div
      onClick={() => addRecentlyViewed(product)}
      className="group relative flex flex-col bg-bg-surface/80 backdrop-blur-md border border-border hover:border-accent/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1"
    >
      {/* Badges Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {product.discountPercent && product.discountPercent > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-danger text-white shadow-md tracking-wider">
            -{product.discountPercent}%
          </span>
        )}
        {product.isNewArrival && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 border border-accent/40 text-accent backdrop-blur-md">
            <Sparkles className="w-2.5 h-2.5" />
            NEW
          </span>
        )}
        {product.isBestSeller && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple/20 border border-purple/40 text-purple backdrop-blur-md">
            BESTSELLER
          </span>
        )}
      </div>

      {/* Top Right Quick View */}
      <div className="absolute top-3 right-3 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleQuickView}
          className="w-8 h-8 rounded-full bg-bg-primary/70 backdrop-blur-md border border-border text-text-muted hover:text-accent hover:border-accent/40 hover:bg-bg-primary flex items-center justify-center transition-all cursor-pointer shadow-sm"
          aria-label="Quick preview component"
          title="Quick Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Image Container with Zoom */}
      <Link
        to={`/product/${product.id}`}
        className="relative block w-full pt-[80%] overflow-hidden bg-[#070b14] border-b border-border/60 group-hover:border-accent/30 transition-colors"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain p-5 group-hover:scale-108 transition-transform duration-500 ease-out"
        />
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-radial from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Link>

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-5">
        {/* Brand & Stock Status */}
        <div className="flex items-center justify-between gap-2 mb-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-accent text-[11px]">
            {product.brand}
          </span>
          <div className="flex items-center gap-1.5">
            {product.stockStatus === 'in_stock' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                In Stock
              </span>
            ) : product.stockStatus === 'pre_order' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                <Clock className="w-3 h-3" />
                Pre-Order
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted">
                Out of Stock
              </span>
            )}
          </div>
        </div>

        {/* Product Title */}
        <Link
          to={`/product/${product.id}`}
          className="font-bold text-sm sm:text-base text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-3"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* Ratings & Review count */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <div className="flex items-center text-amber-400">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="ml-1 font-bold text-text-primary">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-text-muted">({product.reviewCount} reviews)</span>
        </div>

        {/* Key Specs Bullet Points (3-4 items) */}
        <ul className="space-y-1.5 mb-4 flex-1">
          {product.bulletSpecs.slice(0, 3).map((spec, i) => (
            <li
              key={i}
              className="text-[11px] sm:text-xs text-text-muted flex items-start gap-1.5 leading-tight line-clamp-1"
            >
              <span className="w-1 h-1 rounded-full bg-accent/70 mt-1.5 flex-shrink-0" />
              <span>{spec}</span>
            </li>
          ))}
        </ul>

        {/* Price Section */}
        <div className="pt-3 border-t border-border/60 mb-4">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">
            Lowest BD Price
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
              ৳{product.price.toLocaleString()}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-text-muted line-through">
                ৳{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Compare & View Details aligned to fit perfectly */}
        <div className="flex items-center gap-2.5 mt-auto">
          <button
            onClick={handleCompareToggle}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              inCompare
                ? 'bg-purple/20 border-purple text-purple shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                : 'bg-bg-primary/80 border-border text-text-muted hover:text-accent hover:border-accent/50 hover:bg-bg-primary'
            }`}
            title={inCompare ? 'Remove from Compare' : 'Add to Compare'}
          >
            {inCompare ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-purple" />
                <span>In Compare</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Compare</span>
              </>
            )}
          </button>

          <Link
            to={`/product/${product.id}`}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-bg-primary/80 border border-border text-text-muted hover:text-accent hover:border-accent/50 hover:bg-bg-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
            title="View full specs & price history"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent" />
            <span>View Details</span>
          </Link>
        </div>
      </div>
    </div>
  );
});
