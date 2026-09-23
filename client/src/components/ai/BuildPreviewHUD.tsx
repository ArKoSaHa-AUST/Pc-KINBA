import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  List,
  Activity,
  ArrowUpRight,
  Check,
  Store,
  FileText,
  Download,
  ShieldCheck,
  X,
  TrendingDown,
  Zap,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Chassis3DViewer, { Chassis3DErrorBoundary } from './Chassis3DViewer';
import CompatibilityGauge from './CompatibilityGauge';
import { useTonimaSession, type BuildValidation } from '../../store/useTonimaSession';
import {
  saveTonimaHandoff,
  TONIMA_HANDOFF_VERSION,
  type TonimaHandoff,
} from '../../store/tonimaHandoff';
import './BuildPreviewHUD.css';

export interface BuildComponentItem {
  category: string;
  name: string;
  priceBDT: number;
  retailer: string;
  inStock: boolean;
  productId?: string;
  listingId?: string;
  productUrl?: string;
  priceAsOf?: string;
  buySignal?: 'buy' | 'fair' | 'wait' | 'neutral';
  delta_bdt?: number;
}

interface BuildPreviewHUDProps {
  totalPrice?: number;
  components?: BuildComponentItem[];
  validation?: BuildValidation | null;
  compatibilityScore?: number;
  estimatedWattage?: number;
  psuWattage?: number;
  priceDiff?: number;
  className?: string;
}

const EMPTY_SKELETON_CATEGORIES = [
  'CPU',
  'GPU',
  'Motherboard',
  'RAM',
  'Storage',
  'Cooler',
  'Power Supply',
  'Case',
];

export default function BuildPreviewHUD({
  totalPrice: initialTotalPrice,
  components = [],
  validation: propValidation,
  compatibilityScore = 0,
  estimatedWattage = 0,
  psuWattage = 0,
  priceDiff,
  className = '',
}: BuildPreviewHUDProps) {
  const [activeTab, setActiveTab] = useState<'3d' | 'parts' | 'metrics'>('3d');
  const [showQuotationModal, setShowQuotationModal] = useState<boolean>(false);
  const navigate = useNavigate();

  const storeBuild = useTonimaSession((s) => s.activeBuild);
  const sessionBudget = useTonimaSession((s) => s.budgetBDT);

  const effectiveValidation = propValidation || storeBuild.validation;

  // Calculate actual total from components if not explicitly provided
  const computedTotal = components.reduce((sum, c) => sum + (c.priceBDT || 0), 0);
  const targetPrice =
    initialTotalPrice !== undefined && initialTotalPrice > 0 ? initialTotalPrice : computedTotal;

  // Warn if authoritative total and computed total disagree by more than 1 BDT
  useEffect(() => {
    if (
      initialTotalPrice !== undefined &&
      initialTotalPrice > 0 &&
      computedTotal > 0 &&
      Math.abs(initialTotalPrice - computedTotal) > 1
    ) {
      console.warn(
        `[Price Discrepancy] Authoritative totalBDT (৳${initialTotalPrice}) differs from HUD item sum (৳${computedTotal})`,
      );
    }
  }, [initialTotalPrice, computedTotal]);

  // Animated Price Count-up
  const [displayPrice, setDisplayPrice] = useState(targetPrice);
  const prevPriceRef = useRef(targetPrice);

  useEffect(() => {
    const start = prevPriceRef.current;
    const end = targetPrice;
    prevPriceRef.current = targetPrice;
    if (start === end) return;

    const duration = 500;
    const startTime = performance.now();
    let animId: number;

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeProgress);

      setDisplayPrice(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animateNumber);
      }
    };

    animId = requestAnimationFrame(animateNumber);
    return () => cancelAnimationFrame(animId);
  }, [targetPrice]);

  const handleExportToBuilder = () => {
    if (components.length === 0) return;

    const handoffPayload: TonimaHandoff = {
      version: TONIMA_HANDOFF_VERSION,
      sessionId: storeBuild.sessionId,
      createdAt: new Date().toISOString(),
      // The purpose Tonima actually planned against — an AI/ML rig arrived in the
      // builder labelled "Gaming" while this was hardcoded.
      purpose: storeBuild.purpose ?? 'gaming',
      budgetBDT: sessionBudget,
      totalBDT: targetPrice,
      parts: components.map((c) => ({
        productId: c.productId,
        listingId: c.listingId,
        category: c.category,
        name: c.name,
        priceBDT: c.priceBDT,
        retailer: c.retailer,
      })),
    };

    saveTonimaHandoff(handoffPayload);

    // The handoff payload above is what actually assembles the build; the ?parts= ids are
    // only a convenience for sharing/refresh, so listing ids (which the builder catalog
    // does not key on) are left out rather than producing a URL that resolves to nothing.
    const partIds = components
      .map((c) => c.productId)
      .filter((id): id is string => !!id);

    navigate(partIds.length > 0 ? `/pc-builder?parts=${partIds.join(',')}` : '/pc-builder');
  };

  const handleDownloadPDF = () => {
    setShowQuotationModal(true);
  };

  const hasBuild = components.length > 0;
  const isStreamingOrThinking =
    storeBuild.status === 'thinking' || storeBuild.status === 'streaming';

  // Derived thermals estimation (not fabricated literal)
  const coolerPart = components.find((c) => c.category === 'Cooler')?.name || '';
  const isLiquidCooler = /liquid|aio|360|240|280/i.test(coolerPart);
  const cpuTempEstimated = hasBuild
    ? estimatedWattage > 350
      ? isLiquidCooler
        ? '~62°C'
        : '~72°C'
      : isLiquidCooler
        ? '~54°C'
        : '~62°C'
    : '';
  const gpuTempEstimated = hasBuild ? (estimatedWattage > 350 ? '~66°C' : '~58°C') : '';

  // Price freshness computation
  const uniqueRetailersCount = new Set(components.map((c) => c.retailer).filter(Boolean)).size || 1;
  const getPriceFreshnessBadge = (priceAsOf?: string) => {
    if (!priceAsOf) {
      return (
        <span className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5 font-medium">
          <Clock className="w-2.5 h-2.5" /> Market Price
        </span>
      );
    }
    const ageHours = (Date.now() - new Date(priceAsOf).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 24) {
      return (
        <span className="flex items-center gap-1 text-[10px] text-green mt-0.5 font-medium">
          <Check className="w-2.5 h-2.5" /> Live Price
        </span>
      );
    }
    if (ageHours <= 168) {
      return (
        <span className="flex items-center gap-1 text-[10px] text-accent mt-0.5 font-medium">
          <Check className="w-2.5 h-2.5" /> Recent
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5 font-medium">
        <Clock className="w-2.5 h-2.5" /> Verified
      </span>
    );
  };

  return (
    <div className={`tonima-hud-card-container ${className}`}>
      <div className="tonima-hud-card">
        {/* Tab Navigation Header */}
        <div className="tonima-hud-tabs">
          <button
            type="button"
            className={`tonima-hud-tab-btn ${activeTab === '3d' ? 'active' : ''}`}
            onClick={() => setActiveTab('3d')}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>
          <button
            type="button"
            className={`tonima-hud-tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
            onClick={() => setActiveTab('parts')}
          >
            <List className="w-3.5 h-3.5" />
            <span>Parts List ({components.length})</span>
          </button>
          <button
            type="button"
            className={`tonima-hud-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Metrics</span>
          </button>
        </div>

        {/* Main Viewport Content Area */}
        {/*
          data-lenis-prevent: the AI Assistant page runs Lenis smooth scroll, which
          captures wheel events document-wide. Without this the parts list could only be
          scrolled by dragging its scrollbar — the wheel scrolled the page behind it.
        */}
        <div className="tonima-hud-content" data-lenis-prevent>
          <AnimatePresence>
            {activeTab === '3d' && (
              <motion.div
                key="tab-3d"
                className="flex flex-col gap-3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                {/* 3D Chassis Renderer with Error Boundary */}
                <Chassis3DErrorBoundary>
                  <Chassis3DViewer components={components} />
                </Chassis3DErrorBoundary>

                {/* Compatibility & Wattage Gauge */}
                <CompatibilityGauge
                  score={compatibilityScore}
                  estimatedWattage={estimatedWattage}
                  psuWattage={psuWattage}
                  components={components}
                  violations={effectiveValidation?.violations}
                />
              </motion.div>
            )}

            {activeTab === 'parts' && (
              <motion.div
                key="tab-parts"
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                {/* Empty / Loading Skeleton Rows */}
                {(!hasBuild || isStreamingOrThinking) && (
                  <div className="space-y-2">
                    {EMPTY_SKELETON_CATEGORIES.map((cat, idx) => (
                      <div key={idx} className="tonima-parts-item opacity-60">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-bold text-accent tracking-wider">
                            {cat}
                          </span>
                          <div className="h-3 w-4/5 bg-fill-muted rounded animate-pulse mt-1" />
                          <div className="h-2 w-2/5 bg-fill-muted rounded animate-pulse mt-1" />
                        </div>
                        <div className="h-4 w-16 bg-fill-muted rounded animate-pulse" />
                      </div>
                    ))}
                    {!hasBuild && (
                      <p className="text-center text-xs text-text-muted py-2">
                        Describe your build in the chat to populate parts list.
                      </p>
                    )}
                  </div>
                )}

                {/* Real Parts Rows */}
                {hasBuild &&
                  !isStreamingOrThinking &&
                  components.map((part, idx) => (
                    <div key={idx} className="tonima-parts-item group">
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-accent tracking-wider">
                            {part.category}
                          </span>

                          {/* Honest Buy Signal Badges */}
                          {part.buySignal === 'buy' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-green/15 text-green border border-green/30 rounded-full flex items-center gap-0.5">
                              <TrendingDown className="w-2.5 h-2.5" /> Low
                            </span>
                          )}
                          {part.buySignal === 'fair' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-accent/15 text-accent border border-accent/30 rounded-full flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Fair
                            </span>
                          )}
                          {part.buySignal === 'wait' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> Watch
                            </span>
                          )}
                          {part.buySignal === 'neutral' && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-fill-muted text-text-muted border border-border rounded-full flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> Neutral
                            </span>
                          )}

                          {/* Delta BDT indicator on refinement */}
                          {part.delta_bdt !== undefined && part.delta_bdt !== 0 && (
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${
                                part.delta_bdt < 0
                                  ? 'bg-green/15 text-green border border-green/30'
                                  : 'bg-accent/15 text-accent border border-accent/30'
                              }`}
                            >
                              {part.delta_bdt < 0
                                ? `-৳${Math.abs(part.delta_bdt).toLocaleString('en-IN')}`
                                : `+৳${part.delta_bdt.toLocaleString('en-IN')}`}
                            </span>
                          )}
                        </div>

                        {/* Part Name with Link Affordance */}
                        {part.productUrl ? (
                          <a
                            href={part.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-text-primary hover:text-accent truncate mt-0.5 flex items-center gap-1 group/link"
                            title={`${part.name} (Opens store page)`}
                          >
                            <span className="truncate">{part.name}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60 group-hover/link:opacity-100" />
                          </a>
                        ) : (
                          <span
                            className="text-xs font-medium text-text-primary truncate mt-0.5"
                            title={part.name}
                          >
                            {part.name}
                          </span>
                        )}

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted flex-wrap">
                          <div className="flex items-center gap-1 truncate">
                            <Store className="w-3 h-3 text-purple shrink-0" />
                            <span className="truncate">{part.retailer}</span>
                          </div>
                          <span
                            className={`px-1 rounded text-[9px] font-semibold ${
                              part.inStock ? 'text-green bg-green/10' : 'text-danger bg-danger/10'
                            }`}
                          >
                            {part.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className="text-xs font-bold text-text-primary whitespace-nowrap">
                          ৳ {part.priceBDT.toLocaleString('en-IN')}
                        </span>
                        {getPriceFreshnessBadge(part.priceAsOf)}
                      </div>
                    </div>
                  ))}
              </motion.div>
            )}

            {activeTab === 'metrics' && (
              <motion.div
                key="tab-metrics"
                className="flex flex-col gap-3 text-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                {!hasBuild ? (
                  <div className="bg-fill-subtle p-6 rounded-xl border border-glass-border text-center text-text-muted space-y-1">
                    <Activity className="w-6 h-6 mx-auto text-accent/50 mb-2" />
                    <p className="font-semibold text-text-primary">No Active Configuration</p>
                    <p className="text-[11px]">
                      Metrics appear once Tonima validates a configuration in the chat.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Bottleneck Analysis — Honest Rendering */}
                    <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-text-primary">Bottleneck Index</span>
                        <span className="text-text-muted text-[11px] italic">
                          Not available for this configuration
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1">
                        Requires CPU & GPU benchmark profile from live engine.
                      </p>
                    </div>

                    {/* Thermal Load Estimation — Explicitly Labeled as Estimated */}
                    <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-text-primary">Estimated Peak Thermals</span>
                        <span className="text-[10px] text-text-muted bg-fill-muted px-1.5 py-0.5 rounded">
                          Estimated*
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-bg-surface border border-glass-border flex flex-col">
                          <span className="text-text-muted">CPU Under Load</span>
                          <span className="text-sm font-bold text-accent mt-0.5">
                            {cpuTempEstimated}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-bg-surface border border-glass-border flex flex-col">
                          <span className="text-text-muted">GPU Under Load</span>
                          <span className="text-sm font-bold text-accent mt-0.5">
                            {gpuTempEstimated}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-text-muted mt-2">
                        *Estimated based on estimated TDP ({estimatedWattage}W), cooler class, and
                        airflow headroom.
                      </p>
                    </div>

                    {/* Hardware Clearance & Validation Violations */}
                    <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-text-primary">Validation Checks</span>
                        <span
                          className={`font-bold ${
                            (effectiveValidation?.violations?.length ?? 0) === 0
                              ? 'text-green'
                              : 'text-warning'
                          }`}
                        >
                          {(effectiveValidation?.violations?.length ?? 0) === 0
                            ? 'All Passed'
                            : `${effectiveValidation?.violations.length} Notice(s)`}
                        </span>
                      </div>

                      {effectiveValidation?.violations &&
                      effectiveValidation.violations.length > 0 ? (
                        <div className="space-y-1.5 mt-2">
                          {effectiveValidation.violations.map((violation, vIdx) => (
                            <div
                              key={vIdx}
                              className="p-2 rounded bg-warning/10 border border-warning/20 text-warning text-[11px] flex items-start gap-2"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" />
                              <div className="flex flex-col">
                                <span className="font-bold uppercase text-[10px]">
                                  {violation.rule}
                                </span>
                                <span>{violation.detail}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-text-muted">
                          Zero clearance or wattage conflicts detected across selected parts.
                        </p>
                      )}
                    </div>

                    {/* Budget Adherence Card */}
                    {sessionBudget && (
                      <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-text-primary">Budget Adherence</span>
                          <span
                            className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                              targetPrice <= sessionBudget
                                ? 'bg-green/15 text-green border border-green/30'
                                : 'bg-warning/15 text-warning border border-warning/30'
                            }`}
                          >
                            {targetPrice <= sessionBudget
                              ? 'Within Budget'
                              : `Over by ৳${(targetPrice - sessionBudget).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-text-muted mt-1">
                          <span>Target: ৳{sessionBudget.toLocaleString('en-IN')}</span>
                          <span>Actual: ৳{targetPrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Pricing & Export Button */}
        <div className="tonima-hud-footer">
          <div className="flex justify-between items-baseline">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-secondary">Estimated Total:</span>
              {priceDiff !== undefined && priceDiff !== 0 && (
                <span
                  className={`text-[11px] font-bold ${
                    priceDiff < 0 ? 'text-green' : 'text-accent'
                  }`}
                >
                  {priceDiff < 0
                    ? `-৳ ${Math.abs(priceDiff).toLocaleString('en-IN')}`
                    : `+৳ ${priceDiff.toLocaleString('en-IN')}`}
                </span>
              )}
              {hasBuild && (
                <span className="text-[10px] text-text-muted mt-0.5">
                  Prices as of today across {uniqueRetailersCount} stores
                </span>
              )}
            </div>
            <div className="tonima-price-tag">৳ {displayPrice.toLocaleString('en-IN')}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="px-3 py-2.5 rounded-xl glass border border-glass-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-accent flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleDownloadPDF}
              disabled={!hasBuild}
            >
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>Quotation</span>
            </button>

            <button
              type="button"
              className="button-primary !py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleExportToBuilder}
              disabled={!hasBuild}
            >
              <span>PC Builder</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Quotation Modal */}
      <AnimatePresence>
        {showQuotationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              className="bg-bg-surface border border-glass-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                type="button"
                className="absolute top-4 right-4 p-1.5 rounded-full glass text-text-muted hover:text-text-primary"
                onClick={() => setShowQuotationModal(false)}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-accent font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Tonima AI Verified Quotation Certificate</span>
              </div>

              <h4 className="text-lg font-extrabold text-text-primary mb-1">
                Custom PC Hardware Quotation
              </h4>
              <p className="text-xs text-text-muted mb-4">
                Verified on {new Date().toLocaleDateString('en-GB')} • Lowest Market Pricing across
                BD Stores (৳ BDT)
              </p>

              <div
                className="max-h-60 overflow-y-auto space-y-1.5 pr-2 mb-4 text-xs"
                data-lenis-prevent
              >
                {components.map((part, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-1.5 border-b border-glass-border"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary">{part.name}</span>
                      <span className="text-[10px] text-text-muted">
                        {part.category} • {part.retailer}
                      </span>
                    </div>
                    <span className="font-bold text-accent">
                      ৳ {part.priceBDT.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-glass-border mb-5">
                <span className="text-sm font-bold text-text-primary">Grand Total:</span>
                <span className="text-xl font-extrabold text-accent">
                  ৳ {targetPrice.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="button-primary flex-1 !py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
                  onClick={() => {
                    window.print();
                    setShowQuotationModal(false);
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print PDF</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
