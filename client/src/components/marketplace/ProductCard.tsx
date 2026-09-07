import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Eye,
  CheckCircle2,
  Clock,
  Heart,
  ExternalLink,
  Layers,
  Sparkles,
  ShoppingCart,
  Check,
} from 'lucide-react';
import type { ProductComponent } from '../../types/components';
import { useComponentStore } from '../../store/useComponentStore';
import { useCompare } from '../../hooks/useCompare';
import { useCart } from '../../hooks/useCart';

interface ProductCardProps {
  product: ProductComponent;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const { addToCart } = useCart();
  const setQuickViewProduct = useComponentStore((s) => s.setQuickViewProduct);
  const isInWishlist = useComponentStore((s) => s.isInWishlist(product.id));
  const toggleWishlist = useComponentStore((s) => s.toggleWishlist);
  const addRecentlyViewed = useComponentStore((s) => s.addRecentlyViewed);

  const [addedToCart, setAddedToCart] = useState(false);
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

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addedToCart || !product.inStock) return;

    await addToCart(product, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const lowestRetailer = product.retailers?.[0];

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

      {/* Top Right Quick Actions (Wishlist & Quick View) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleWishlist}
          className={`w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer ${
            isInWishlist
              ? 'bg-danger/20 border-danger text-danger shadow-[0_0_10px_rgba(255,77,94,0.4)]'
              : 'bg-bg-primary/70 border-border text-text-muted hover:text-white hover:bg-bg-primary'
          }`}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={handleQuickView}
          className="w-8 h-8 rounded-full bg-bg-primary/70 backdrop-blur-md border border-border text-text-muted hover:text-accent hover:border-accent/40 hover:bg-bg-primary flex items-center justify-center transition-all cursor-pointer"
          aria-label="Quick preview component"
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
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-text-muted block">Lowest Price in BD</span>
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
            {lowestRetailer && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-bg-primary border border-border text-text-muted">
                {lowestRetailer.name}
              </span>
            )}
          </div>
        </div>

        {/* Fast Action Buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs tracking-wide text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !product.inStock
                  ? 'bg-bg-primary text-text-muted border border-border cursor-not-allowed opacity-60'
                  : addedToCart
                    ? 'bg-success text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-accent text-black hover:brightness-110 active:scale-98 shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]'
              }`}
            >
              {addedToCart ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{product.inStock ? 'Add to Cart' : 'Out of Stock'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCompareToggle}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                inCompare
                  ? 'bg-purple/20 border-purple text-purple shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                  : 'bg-bg-primary border-border text-text-muted hover:text-white hover:border-accent/40'
              }`}
              title={inCompare ? 'Remove from Compare' : 'Add to Compare'}
            >
              {inCompare ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple" />
                  <span className="hidden sm:inline">Added</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compare</span>
                </>
              )}
            </button>

            <Link
              to={`/product/${product.id}`}
              className="p-2.5 rounded-xl bg-bg-primary border border-border text-text-muted hover:text-white hover:border-accent/40 transition-colors flex items-center justify-center"
              title="View full specs & price history"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});
