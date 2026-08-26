import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, Search, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  COMPONENT_CATEGORIES,
  productsByCategory,
  type BuilderProduct,
  type ComponentCategory,
} from './builderCatalog';
import { checkCompatibility, type BuildSelection, type CompatResult } from './compatibility';
import { formatTaka } from './buildConfig';

type SortKey = 'price-asc' | 'price-desc' | 'popularity' | 'performance';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'price-asc', label: 'Price ↑' },
  { key: 'price-desc', label: 'Price ↓' },
  { key: 'popularity', label: 'Popularity' },
  { key: 'performance', label: 'Performance' },
];

interface ComponentSelectModalProps {
  category: ComponentCategory | null;
  build: BuildSelection;
  onClose: () => void;
  onSelect: (product: BuilderProduct) => void;
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
  category,
  build,
  onClose,
  onSelect,
}: ComponentSelectModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [brand, setBrand] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('popularity');

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
    setSort('popularity');
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

  const meta = COMPONENT_CATEGORIES.find((c) => c.id === category);
  const products = useMemo(() => (category ? productsByCategory(category) : []), [category]);
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))], [products]);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        (!brand || p.brand === brand) &&
        (!q || p.name.toLowerCase().includes(q) || p.keySpec.toLowerCase().includes(q)),
    );
    const sorted = [...filtered];
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'performance':
        sorted.sort((a, b) => b.performanceScore - a.performanceScore);
        break;
      default:
        sorted.sort((a, b) => b.popularity - a.popularity);
    }
    return sorted;
  }, [products, debouncedQuery, brand, sort]);

  return (
    <AnimatePresence>
      {category && meta && (
        <motion.div
          className="builder-modal-backdrop"
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
              </div>
            </div>

            <div className="builder-modal-list">
              {results.map((product) => {
                const Icon = meta.icon;
                const compat = checkCompatibility(product, build);
                return (
                  <div key={product.id} className="builder-product-card">
                    <div className="builder-product-thumb">
                      <Icon size={24} />
                    </div>
                    <div className="builder-product-info">
                      <span className="builder-product-name">{product.name}</span>
                      <span className="builder-product-meta">
                        {product.brand} · {product.keySpec}
                      </span>
                      <CompatBadge result={compat} />
                    </div>
                    <div className="builder-product-action">
                      <span className="builder-product-price">{formatTaka(product.price)}</span>
                      <button
                        type="button"
                        className="button-primary builder-product-select"
                        onClick={() => onSelect(product)}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                );
              })}
              {results.length === 0 && (
                <p className="builder-modal-empty">No products match your filters.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
