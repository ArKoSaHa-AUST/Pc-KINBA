import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Plus, X, ArrowLeftRight, Clock, AlertTriangle, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CompareProduct } from '../../types/compare';

interface SlotCardProps {
  slotIndex: number;
  product: CompareProduct | null;
  onAddClick: (slotIndex: number) => void;
  onRemoveClick: (slotIndex: number) => void;
  onSwapClick: (slotIndex: number) => void;
  onInspect3DClick?: (product: CompareProduct) => void;
  totalSlots: number;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slotIndex,
  product,
  onAddClick,
  onRemoveClick,
  onSwapClick,
  onInspect3DClick,
  totalSlots,
}) => {
  const { t } = useTranslation('compare');
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 3D Parallax & Physics Motion Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring smoothing configuration per taisha2.md (stiffness: 300, damping: 25, mass: 0.5)
  const springConfig = { stiffness: 300, damping: 25, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [16, -16]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-16, 16]);

  // Dynamic Gloss Sheen Coordinates
  const [glossPos, setGlossPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current || !product) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5; // [-0.5, 0.5]
    const relY = (e.clientY - rect.top) / rect.height - 0.5; // [-0.5, 0.5]

    x.set(relX);
    y.set(relY);

    setGlossPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      opacity: 1,
    });
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
    setGlossPos((prev) => ({ ...prev, opacity: 0 }));
  };

  // Vendor theme glow color resolver matching taisha2.md §4
  const getVendorTheme = (vendor?: string) => {
    switch (vendor) {
      case 'nvidia':
      case 'zotac':
      case 'pny':
        return {
          glowClass: 'hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
          auraColor: '#10b981',
          accentText: 'text-emerald-400',
        };
      case 'amd':
      case 'sapphire':
        return {
          glowClass: 'hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
          auraColor: '#ef4444',
          accentText: 'text-red-400',
        };
      case 'intel':
        return {
          glowClass: 'hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
          auraColor: '#06b6d4',
          accentText: 'text-cyan-400',
        };
      case 'asus':
        return {
          glowClass: 'hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)]',
          auraColor: '#9333ea',
          accentText: 'text-purple-400',
        };
      case 'gigabyte':
        return {
          glowClass: 'hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
          auraColor: '#f59e0b',
          accentText: 'text-amber-400',
        };
      default:
        return {
          glowClass: 'hover:border-accent/50 hover:shadow-[0_0_30px_rgba(0,229,255,0.3)]',
          auraColor: '#00e5ff',
          accentText: 'text-accent',
        };
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
        className="h-full min-h-[300px] flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-white/10 hover:border-accent/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group text-center"
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

  const vendorTheme = getVendorTheme(product.vendor);
  const primaryRetailer = product.retailers.find((r) => r.inStock) || product.retailers[0];
  const isOutOfStock = !product.retailers.some((r) => r.inStock);

  return (
    <div
      ref={cardRef}
      style={{ perspective: 1200 }}
      className="h-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <motion.div
        layout
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className={`relative h-full flex flex-col justify-between p-6 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 transition-all duration-300 ${vendorTheme.glowClass} group overflow-hidden`}
      >
        {/* Dynamic Light Gloss Sheen Layer (Follows cursor coordinates) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl"
          style={{
            opacity: glossPos.opacity,
            background: `radial-gradient(circle 280px at ${glossPos.x}% ${glossPos.y}%, rgba(255, 255, 255, 0.14), transparent 70%)`,
          }}
        />

        {/* Top Slot Header Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-accent">
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

        {/* Product 3D Pop-Out Image Container */}
        <div
          style={{ transform: 'translateZ(30px)', transformStyle: 'preserve-3d' }}
          className="relative w-full h-36 rounded-2xl overflow-hidden bg-black/40 border border-white/5 mb-4 flex items-center justify-center p-3 shadow-inner"
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-950/90 backdrop-blur-md border border-white/10 text-white">
            {product.brand}
          </div>

          {/* 3D Inspect Action Overlay Pill */}
          {onInspect3DClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspect3DClick(product);
              }}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/90 hover:bg-accent hover:text-slate-950 text-accent border border-accent/40 backdrop-blur-md transition-all shadow-md"
              title="Inspect in 3D WebGL Modal"
            >
              <Eye className="w-3 h-3" />
              <span>3D Inspect</span>
            </button>
          )}
        </div>

        {/* Product Title & Category */}
        <div style={{ transform: 'translateZ(15px)' }} className="flex-1 z-10">
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug hover:text-accent transition-colors">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
            <span className="capitalize">{product.category.toUpperCase()}</span>
            <span>•</span>
            <span>{product.primarySource}</span>
          </div>
        </div>

        {/* Price & Retailer Status */}
        <div
          style={{ transform: 'translateZ(20px)' }}
          className="mt-4 pt-3.5 border-t border-white/10 flex flex-col gap-1.5 z-10"
        >
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-danger/10 border border-danger/30 text-danger">
                {t('slots.outOfStock', 'Out of Stock')}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
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
    </div>
  );
};
