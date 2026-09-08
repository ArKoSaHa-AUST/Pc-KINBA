import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, ExternalLink, Layers, CheckCircle2, Info, Building2 } from 'lucide-react';
import { useComponentStore } from '../../store/useComponentStore';
import { useCompare } from '../../hooks/useCompare';
import { sanitizeHref } from '../../utils/image';

export default function ProductQuickViewModal() {
  const product = useComponentStore((s) => s.quickViewProduct);
  const setQuickViewProduct = useComponentStore((s) => s.setQuickViewProduct);

  const { isInCompare, addToCompare, removeFromCompare } = useCompare();

  const [activeTab, setActiveTab] = useState<'specs' | 'stores' | 'compatibility'>('specs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!product) return null;

  const currentImage = selectedImage || product.image;
  const inCompare = isInCompare(product.id);

  const handleCompare = () => {
    if (inCompare) {
      removeFromCompare(product.id);
    } else {
      addToCompare(product);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-bg-surface/95 border border-border rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-10 flex flex-col md:flex-row max-h-[90vh] animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-bg-primary/80 border border-border text-text-muted hover:text-white hover:border-accent/40 flex items-center justify-center transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Gallery & Image Preview */}
        <div className="w-full md:w-1/2 bg-[#070b14] p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
          <div className="relative w-full pt-[75%] rounded-2xl overflow-hidden bg-bg-primary/40 border border-border/60 flex items-center justify-center mb-4">
            <img
              src={currentImage}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain p-6"
            />
          </div>

          {/* Thumbnails */}
          {product.gallery && product.gallery.length > 1 && (
            <div className="flex gap-2 justify-center">
              {product.gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border p-1 bg-bg-primary transition-all cursor-pointer ${
                    currentImage === img
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Lowest Price Callout */}
          <div className="mt-6 p-4 rounded-2xl bg-bg-primary/60 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted block">Lowest Market Price in BD</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-accent tracking-tight">
                  ৳{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-text-muted line-through">
                    ৳{product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/15 border border-success/30 text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Pricing
            </span>
          </div>
        </div>

        {/* Right: Info, Tabs & Actions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[80vh] md:max-h-[90vh]">
          <div>
            {/* Header info */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/20 border border-accent/40 text-accent uppercase tracking-wider">
                {product.brand}
              </span>
              <span className="text-xs text-text-muted uppercase tracking-wider">
                {product.category}
              </span>
              <div className="ml-auto flex items-center gap-1 text-amber-400 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{product.rating.toFixed(1)}</span>
                <span className="text-text-muted font-normal">({product.reviewCount})</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-text-primary mb-3 leading-snug">
              {product.name}
            </h2>

            {/* Bullet Highlights */}
            <div className="mb-5 space-y-1.5 bg-bg-primary/40 border border-border/50 rounded-xl p-3">
              {product.bulletSpecs.slice(0, 3).map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border mb-4">
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-2 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  activeTab === 'specs'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                Specifications
              </button>
              <button
                onClick={() => setActiveTab('stores')}
                className={`pb-2 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  activeTab === 'stores'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                Stores & Stock ({product.retailers.length})
              </button>
              {product.compatibility && (
                <button
                  onClick={() => setActiveTab('compatibility')}
                  className={`pb-2 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                    activeTab === 'compatibility'
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-muted hover:text-white'
                  }`}
                >
                  Compatibility
                </button>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'specs' && (
              <div className="space-y-2 mb-6">
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(product.specs).map(([key, value], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? 'bg-bg-primary/40' : 'bg-transparent'}
                      >
                        <td className="py-2 px-3 text-text-muted font-medium w-2/5 border-b border-border/40">
                          {key}
                        </td>
                        <td className="py-2 px-3 text-text-primary font-semibold border-b border-border/40">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="space-y-2 mb-6">
                {product.retailers.map((ret, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/50 border border-border"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-accent" />
                      <div>
                        <span className="text-xs font-bold text-text-primary block">
                          {ret.name}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {ret.warranty || 'Official BD Warranty'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black text-text-primary block">
                          ৳{ret.price.toLocaleString()}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            ret.inStock ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {ret.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      <a
                        href={sanitizeHref(ret.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-bg-surface hover:bg-accent hover:text-black text-text-muted transition-colors"
                        aria-label={`Open store page for ${ret.name}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'compatibility' && product.compatibility && (
              <div className="space-y-3 mb-6">
                <div className="p-3.5 rounded-xl bg-bg-primary/60 border border-border space-y-2 text-xs">
                  {product.compatibility.socket && (
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-text-muted">CPU / Mobo Socket</span>
                      <span className="font-bold text-accent">{product.compatibility.socket}</span>
                    </div>
                  )}
                  {product.compatibility.ramType && (
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-text-muted">Required RAM Gen</span>
                      <span className="font-bold text-purple">{product.compatibility.ramType}</span>
                    </div>
                  )}
                  {product.compatibility.recommendedPsuWattage && (
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-text-muted">Recommended PSU</span>
                      <span className="font-bold text-success">
                        {product.compatibility.recommendedPsuWattage}W or Higher
                      </span>
                    </div>
                  )}
                  {product.compatibility.notes && (
                    <div className="pt-2 text-text-muted text-[11px] leading-relaxed flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                      <span>{product.compatibility.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Buttons: Compare & View Full Details */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={handleCompare}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                inCompare
                  ? 'bg-purple/20 border-purple text-purple shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                  : 'bg-bg-primary/80 border-border text-text-muted hover:text-accent hover:border-accent/40 hover:bg-bg-primary'
              }`}
            >
              {inCompare ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-purple" />
                  <span>In Compare</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Add to Compare</span>
                </>
              )}
            </button>

            <Link
              to={`/product/${product.id}`}
              onClick={() => setQuickViewProduct(null)}
              className="flex-1 w-full py-3 px-4 rounded-xl bg-accent/15 border border-accent/40 hover:bg-accent/25 hover:border-accent/60 text-accent text-xs font-bold transition-all flex items-center justify-center gap-2 text-center cursor-pointer shadow-sm"
            >
              <span>View Full Specs & Price History</span>
              <ExternalLink className="w-4 h-4 text-accent" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
