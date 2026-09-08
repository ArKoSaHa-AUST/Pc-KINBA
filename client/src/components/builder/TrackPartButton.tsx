import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, ExternalLink, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import PriceAlertButton from '../product/PriceAlertButton';
import WishlistButton from '../product/WishlistButton';
import type { ProductDetails } from '../product/ProductHero';
import { sanitizeImageUrl } from '../../utils/image';
import type { BuilderProduct } from './builderCatalog';

interface TrackPartButtonProps {
  product: BuilderProduct;
  className?: string;
}

/**
 * Bridges a static builder catalog part to its live retailer listing (via /api/search) so
 * the user can wishlist it, subscribe to price alerts, or open the live price page.
 */
export default function TrackPartButton({ product, className }: TrackPartButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Wishlist or set a price alert for this part"
      >
        <BellRing size={13} /> Track
      </button>
      <TrackPartModal product={product} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

interface TrackPartModalProps {
  product: BuilderProduct;
  open: boolean;
  onClose: () => void;
}

function TrackPartModal({ product, open, onClose }: TrackPartModalProps) {
  const [matches, setMatches] = useState<ProductDetails[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(0);
    // Live catalog parts already carry their retailer listings — no search round-trip needed.
    if (product.listings?.length) {
      setMatches(
        product.listings.slice(0, 3).map((l) => ({
          id: l.id,
          product_id: product.id,
          title: product.name,
          brand: product.brand,
          price: l.price,
          price_str: `${l.price.toLocaleString()}৳`,
          retailer: l.retailer,
          product_url: l.url,
          image_url: product.image,
        })),
      );
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setMatches([]);
    fetch(`/api/search?q=${encodeURIComponent(product.name)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data: { results?: ProductDetails[] }) => setMatches((data.results ?? []).slice(0, 3)))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Error matching builder part:', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, product]);

  const match = matches[selected];

  return (
    <Modal open={open} onClose={onClose} title={`Track ${product.name}`} closeLabel="Close">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-accent text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Matching live retailer listings…
        </div>
      ) : !match ? (
        <p className="text-sm text-text-muted py-4">
          No live listing found for this part yet. Try the{' '}
          <Link
            to={`/search?q=${encodeURIComponent(product.name)}`}
            className="text-accent underline"
          >
            search page
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="text-xs text-text-muted mb-3">
            Pick the retailer listing to track — wishlist it or subscribe to price-drop alerts.
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {matches.map((m, i) => {
              const img = sanitizeImageUrl(m.image_url);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-pressed={i === selected}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    i === selected ? 'border-accent bg-accent/10' : 'border-border hover:bg-border'
                  }`}
                >
                  {img && (
                    <img
                      src={img}
                      alt=""
                      className="w-10 h-10 object-contain rounded-md shrink-0"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-primary truncate">
                      {m.title}
                    </span>
                    <span className="block text-xs text-text-muted">{m.retailer}</span>
                  </span>
                  <span className="text-sm font-bold text-accent whitespace-nowrap">
                    {m.price_str || (m.price ? `৳${m.price.toLocaleString()}` : '—')}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <WishlistButton productId={match.product_id} />
            <PriceAlertButton product={match} />
            <Link
              to={`/product/${match.id}`}
              onClick={onClose}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
            >
              Live prices & history <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}
    </Modal>
  );
}
