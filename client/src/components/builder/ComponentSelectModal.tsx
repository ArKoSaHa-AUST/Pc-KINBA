import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CheckCircle2, Search, Store, X, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { sanitizeImageUrl } from '../../utils/image';
import { formatTaka } from './buildConfig';
import {
  ALL_CATEGORIES,
  type BuilderProduct,
  type ComponentCategory,
  type FormFactor,
} from './builderCatalog';
import { checkCompatibility, type BuildSelection, type CompatResult } from './compatibility';

type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'popularity' | 'performance';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price-asc', label: 'Price ↑' },
  { key: 'price-desc', label: 'Price ↓' },
  { key: 'popularity', label: 'Popularity' },
  { key: 'performance', label: 'Performance' },
];

const PRICE_BUCKETS = [
  { key: 'under-10k', label: 'Under ৳10k', min: 0, max: 10000 },
  { key: '10-30k', label: '৳10k–30k', min: 10000, max: 30000 },
  { key: '30-80k', label: '৳30k–80k', min: 30000, max: 80000 },
  { key: '80k-plus', label: '৳80k+', min: 80000, max: Infinity },
] as const;

type PriceBucketKey = (typeof PRICE_BUCKETS)[number]['key'];

interface ComponentSelectModalProps {
  slot: ComponentCategory | null;
  build: BuildSelection;
  products: BuilderProduct[];
  /** Budget left for this slot (max budget − other parts). */
  remainingBudget: number;
  onClose: () => void;
  onSelect: (slot: ComponentCategory, product: BuilderProduct) => void;
}

/** Value-for-money within budget first; compatible parts before incompatible ones. */
function recommendedScore(p: BuilderProduct, compat: CompatResult, fits: boolean): number {
  const compatWeight =
    compat.status === 'incompatible' ? -1000 : compat.status === 'warning' ? -50 : 0;
  return (fits ? 100 : 0) + compatWeight + p.performanceScore * 0.6 + p.popularity * 0.4;
}

function CompatBadge({ result }: { result: CompatResult }) {
  const icon =
    result.status === 'compatible' ? (
      <CheckCircle2 size={14} />
    ) : result.status === 'warning' ? (
      <AlertTriangle size={14} />
    ) : (
      <XCircle size={14} />
    );
  return (
    <span className={`compat-badge compat-${result.status}`}>
      {icon} {result.message}
    </span>
  );
}

export default function ComponentSelectModal({
  slot,
  build,
  products,
  remainingBudget,
  onClose,
  onSelect,
}: ComponentSelectModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [brand, setBrand] = useState<string | null>(null);
  const [priceBucket, setPriceBucket] = useState<PriceBucketKey | null>(null);
  const [socket, setSocket] = useState<string | null>(null);
  const [formFactor, setFormFactor] = useState<FormFactor | null>(null);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [fitsBudgetOnly, setFitsBudgetOnly] = useState(false);
  const category = slot;

  // Debounced real-time search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset filters + lock body scroll while open
  useEffect(() => {
    setQuery('');
    setDebouncedQuery('');
    setBrand(null);
    setPriceBucket(null);
    setSocket(null);
    setFormFactor(null);
    setSort('recommended');
    setFitsBudgetOnly(false);
    if (!category) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [category, onClose]);

  const meta = ALL_CATEGORIES.find((c) => c.id === category);
  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(),
    [products],
  );
  // Socket / form factor pills only appear for categories whose products carry those attributes
  const sockets = useMemo(
    () => [...new Set(products.map((p) => p.socket).filter((s): s is string => !!s))],
    [products],
  );
  const formFactors = useMemo(
    () => [...new Set(products.map((p) => p.formFactor).filter((f): f is FormFactor => !!f))],
    [products],
  );
  const priceBuckets = useMemo(
    () => PRICE_BUCKETS.filter((b) => products.some((p) => p.price >= b.min && p.price < b.max)),
    [products],
  );

  const results = useMemo(() => {
    if (!slot) return [];
    const q = debouncedQuery.trim().toLowerCase();
    const bucket = PRICE_BUCKETS.find((b) => b.key === priceBucket);
    const rows = products
      .filter(
        (p) =>
          (!brand || p.brand === brand) &&
          (!bucket || (p.price >= bucket.min && p.price < bucket.max)) &&
          (!socket || p.socket === socket) &&
          (!formFactor || p.formFactor === formFactor) &&
          (!fitsBudgetOnly || p.price <= remainingBudget) &&
          (!q || p.name.toLowerCase().includes(q) || p.keySpec.toLowerCase().includes(q)),
      )
      .map((product) => {
        const compat = checkCompatibility(product, build, slot);
        const fits = product.price <= remainingBudget;
        return { product, compat, fits, score: recommendedScore(product, compat, fits) };
      });
    switch (sort) {
      case 'price-asc':
        rows.sort((a, b) => a.product.price - b.product.price);
        break;
      case 'price-desc':
        rows.sort((a, b) => b.product.price - a.product.price);
        break;
      case 'performance':
        rows.sort((a, b) => b.product.performanceScore - a.product.performanceScore);
        break;
      case 'popularity':
        rows.sort((a, b) => b.product.popularity - a.product.popularity);
        break;
      default:
        rows.sort((a, b) => b.score - a.score);
    }
    return rows;
  }, [
    slot,
    products,
    build,
    debouncedQuery,
    brand,
    priceBucket,
    socket,
    formFactor,
    sort,
    fitsBudgetOnly,
    remainingBudget,
  ]);

  return (
    <AnimatePresence>
      {slot && meta && (
        <motion.div
          className="builder-modal-backdrop"
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="builder-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Select your ${meta.label}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="builder-modal-header">
              <button type="button" className="builder-modal-back" onClick={onClose}>
                <ArrowLeft size={18} /> Back
              </button>
              <h3 className="builder-modal-title">
                Select Your <span className="gradient-text">{meta.label}</span>
              </h3>
              <button
                type="button"
                className="builder-modal-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </header>

            <div className="builder-modal-toolbar">
              <div className="builder-modal-search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder={`Search ${meta.label}…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="builder-modal-pills">
                <button
                  type="button"
                  className={`builder-pill builder-pill-budget${fitsBudgetOnly ? ' is-active' : ''}`}
                  onClick={() => setFitsBudgetOnly((v) => !v)}
                  title="Only show parts that fit the budget left for this slot"
                >
                  Fits budget · {formatTaka(Math.max(0, remainingBudget))}
                </button>
                <span className="builder-pill-divider" />
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`builder-pill${sort === opt.key ? ' is-active' : ''}`}
                    onClick={() => setSort(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="builder-pill-divider" />
                {brands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`builder-pill${brand === b ? ' is-active' : ''}`}
                    onClick={() => setBrand(brand === b ? null : b)}
                  >
                    {b}
                  </button>
                ))}
                <span className="builder-pill-divider" />
                {priceBuckets.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className={`builder-pill${priceBucket === b.key ? ' is-active' : ''}`}
                    onClick={() => setPriceBucket(priceBucket === b.key ? null : b.key)}
                  >
                    {b.label}
                  </button>
                ))}
                {sockets.length > 0 && <span className="builder-pill-divider" />}
                {sockets.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`builder-pill${socket === s ? ' is-active' : ''}`}
                    onClick={() => setSocket(socket === s ? null : s)}
                  >
                    {s}
                  </button>
                ))}
                {formFactors.length > 0 && <span className="builder-pill-divider" />}
                {formFactors.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`builder-pill${formFactor === f ? ' is-active' : ''}`}
                    onClick={() => setFormFactor(formFactor === f ? null : f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-modal-list">
              {results.map(({ product, compat, fits }) => {
                const Icon = meta.icon;
                const stores = product.listings?.length ?? 0;
                const img = sanitizeImageUrl(product.image);
                return (
                  <div
                    key={product.id}
                    className={`builder-product-card${fits ? '' : ' is-over-budget'}`}
                  >
                    <div className="builder-product-thumb">
                      {img ? <img src={img} alt="" loading="lazy" /> : <Icon size={24} />}
                    </div>
                    <div className="builder-product-info">
                      <span className="builder-product-name">{product.name}</span>
                      <span className="builder-product-meta">
                        {[product.brand, product.keySpec].filter(Boolean).join(' · ')}
                        {stores > 0 && (
                          <>
                            {' · '}
                            <Store size={11} /> {stores} store{stores > 1 ? 's' : ''}
                          </>
                        )}
                      </span>
                      <CompatBadge result={compat} />
                    </div>
                    <div className="builder-product-action">
                      <span className="builder-product-price">
                        {formatTaka(product.price)}
                        {!fits && <small>over budget</small>}
                      </span>
                      <button
                        type="button"
                        className="button-primary builder-product-select"
                        onClick={() => onSelect(slot, product)}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                );
              })}
              {results.length === 0 && (
                <p className="builder-modal-empty">
                  No products match your filters.
                  {fitsBudgetOnly && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="builder-modal-empty-action"
                        onClick={() => setFitsBudgetOnly(false)}
                      >
                        Show parts over budget
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
