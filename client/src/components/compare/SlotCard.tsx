import { motion } from 'framer-motion';
import { Plus, X, ArrowLeftRight, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CompareProduct } from '../../types/compare';

interface SlotCardProps {
  slotIndex: number;
  product: CompareProduct | null;
  onAddClick: (slotIndex: number) => void;
  onRemoveClick: (slotIndex: number) => void;
  onSwapClick: (slotIndex: number) => void;
  totalSlots: number;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slotIndex,
  product,
  onAddClick,
  onRemoveClick,
  onSwapClick,
  totalSlots,
}) => {
  const { t } = useTranslation('compare');

  // Vendor theme glow color resolver
  const getVendorGlow = (vendor?: string) => {
    switch (vendor) {
      case 'nvidia':
      case 'zotac':
      case 'pny':
        return 'hover:border-emerald-500/50 hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]';
      case 'amd':
      case 'sapphire':
        return 'hover:border-red-500/50 hover:shadow-[0_10px_30px_-10px_rgba(239,68,68,0.3)]';
      case 'intel':
        return 'hover:border-cyan-500/50 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)]';
      default:
        return 'hover:border-accent/50 hover:shadow-[0_10px_30px_-10px_rgba(0,229,255,0.3)]';
    }
  };

  const formatPrice = (val: number | null) => {
    if (val === null) return null;
    return `৳ ${val.toLocaleString('en-BD')}`;
  };

  if (!product) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={() => onAddClick(slotIndex)}
        className="h-full min-h-[260px] flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-accent/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group text-center"
      >
        <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-accent/10 border border-white/10 group-hover:border-accent/30 flex items-center justify-center text-text-muted group-hover:text-accent transition-all mb-3 group-hover:scale-110">
          <Plus className="w-6 h-6" />
        </div>
        <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-1">
          {t('slots.slot', { index: slotIndex + 1, defaultValue: `Slot ${slotIndex + 1}` })}
        </div>
        <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
          {t('actions.addSlot', 'Add Component')}
        </h4>
        <p className="text-xs text-text-muted mt-1 max-w-[200px]">
          {t('slots.addPrompt', 'Click to select a component to compare')}
        </p>
      </motion.div>
    );
  }

  const primaryRetailer = product.retailers.find((r) => r.inStock) || product.retailers[0];
  const isOutOfStock = !product.retailers.some((r) => r.inStock);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`relative h-full flex flex-col justify-between p-5 rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 transition-all duration-300 ${getVendorGlow(
        product.vendor,
      )} group`}
    >
      {/* Top Slot Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-accent">
          {t('slots.slot', { index: slotIndex + 1, defaultValue: `Slot ${slotIndex + 1}` })}
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {totalSlots > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSwapClick(slotIndex);
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-white/5 transition-colors"
              title={t('actions.swap', 'Swap Slot')}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick(slotIndex);
            }}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title={t('actions.remove', 'Remove Slot')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Image & Badge */}
      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-3.5 flex items-center justify-center p-2">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950/80 backdrop-blur-md border border-white/10 text-white">
          {product.brand}
        </div>
      </div>

      {/* Product Title */}
      <div className="flex-1">
        <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug hover:text-accent transition-colors">
          {product.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className="capitalize">{product.category.toUpperCase()}</span>
          <span>•</span>
          <span>{product.primarySource}</span>
        </div>
      </div>

      {/* Price Section */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          {product.basePriceBDT ? (
            <div className="text-base sm:text-lg font-black font-mono text-accent">
              {formatPrice(product.basePriceBDT)}
            </div>
          ) : (
            <div className="text-xs font-semibold text-warning flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t('slots.priceWithheld', 'Price Withheld')}</span>
            </div>
          )}

          {isOutOfStock ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/10 border border-danger/30 text-danger">
              {t('slots.outOfStock', 'Out of Stock')}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              {primaryRetailer?.retailerName}
            </span>
          )}
        </div>

        {/* Sync freshness timestamp badge */}
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Clock className="w-3 h-3 text-text-muted/70" />
          <span>
            {t('slots.priceLastSynced', {
              time: product.priceLastSynced,
              defaultValue: `Price synced ${product.priceLastSynced}`,
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
