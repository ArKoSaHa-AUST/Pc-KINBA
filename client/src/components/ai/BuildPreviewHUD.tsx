import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, List, Activity, ArrowUpRight, Check, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Chassis3DViewer from './Chassis3DViewer';
import CompatibilityGauge from './CompatibilityGauge';
import './BuildPreviewHUD.css';

export interface BuildComponentItem {
  category: string;
  name: string;
  priceBDT: number;
  retailer: string;
  inStock: boolean;
}

interface BuildPreviewHUDProps {
  totalPrice?: number;
  components?: BuildComponentItem[];
  compatibilityScore?: number;
  estimatedWattage?: number;
  psuWattage?: number;
  className?: string;
}

const DEFAULT_PARTS: BuildComponentItem[] = [
  {
    category: 'CPU',
    name: 'AMD Ryzen 7 7800X3D',
    priceBDT: 46500,
    retailer: 'Star Tech',
    inStock: true,
  },
  {
    category: 'GPU',
    name: 'MSI RTX 4070 Ti Super 16G Gaming X',
    priceBDT: 68500,
    retailer: 'Tech Land',
    inStock: true,
  },
  {
    category: 'Motherboard',
    name: 'ASUS TUF Gaming B650-PLUS WIFI',
    priceBDT: 24500,
    retailer: 'Ryans Computers',
    inStock: true,
  },
  {
    category: 'RAM',
    name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz',
    priceBDT: 13500,
    retailer: 'Star Tech',
    inStock: true,
  },
  {
    category: 'Storage',
    name: 'Samsung 990 Pro 1TB PCIe 4.0 NVMe M.2',
    priceBDT: 12800,
    retailer: 'PC House',
    inStock: true,
  },
  {
    category: 'Cooler',
    name: 'DeepCool LT720 360mm Liquid Cooler',
    priceBDT: 11500,
    retailer: 'Custom Mac BD',
    inStock: true,
  },
  {
    category: 'Power Supply',
    name: 'Corsair RM750e 750W 80 Plus Gold ATX 3.0',
    priceBDT: 11200,
    retailer: 'Star Tech',
    inStock: true,
  },
  {
    category: 'Case',
    name: 'Lian Li O11 Dynamic EVO White',
    priceBDT: 16500,
    retailer: 'Tech Land',
    inStock: true,
  },
];

export default function BuildPreviewHUD({
  totalPrice: initialTotalPrice,
  components = DEFAULT_PARTS,
  compatibilityScore = 98,
  estimatedWattage = 435,
  psuWattage = 750,
  className = '',
}: BuildPreviewHUDProps) {
  const [activeTab, setActiveTab] = useState<'3d' | 'parts' | 'metrics'>('3d');
  const navigate = useNavigate();

  // Calculate actual total from components if not explicitly provided
  const computedTotal = components.reduce((sum, c) => sum + c.priceBDT, 0);
  const targetPrice = initialTotalPrice || computedTotal;

  // Animated Price Count-up
  const [displayPrice, setDisplayPrice] = useState(targetPrice);
  const prevPriceRef = useRef(targetPrice);

  useEffect(() => {
    const start = prevPriceRef.current;
    const end = targetPrice;
    prevPriceRef.current = targetPrice;
    if (start === end) return;

    const duration = 600; // ms
    const startTime = performance.now();
    let animId: number;

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease out
      const current = Math.round(start + (end - start) * easeProgress);

      setDisplayPrice(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animateNumber);
      }
    };

    animId = requestAnimationFrame(animateNumber);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [targetPrice]);

  const handleExportToBuilder = () => {
    // Navigate to /pc-builder
    navigate('/pc-builder');
  };

  const gpuPart = components.find((c) => c.category === 'GPU')?.name || 'RTX 4070 Ti Super';
  const casePart = components.find((c) => c.category === 'Case')?.name || 'Lian Li O11 Dynamic EVO';

  return (
    <div className={`tonima-hud-card ${className}`}>
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
      <div className="tonima-hud-content">
        <AnimatePresence mode="wait">
          {activeTab === '3d' && (
            <motion.div
              key="tab-3d"
              className="flex flex-col gap-3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              {/* 3D Chassis Renderer */}
              <Chassis3DViewer gpuModel={gpuPart} caseModel={casePart} />

              {/* Compatibility & Wattage Gauge */}
              <CompatibilityGauge
                score={compatibilityScore}
                estimatedWattage={estimatedWattage}
                psuWattage={psuWattage}
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
              {components.map((part, idx) => (
                <div key={idx} className="tonima-parts-item">
                  <div className="flex flex-col max-w-[220px]">
                    <span className="text-[10px] uppercase font-bold text-accent">
                      {part.category}
                    </span>
                    <span className="text-xs font-medium text-text-primary truncate">
                      {part.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-text-muted">
                      <Store className="w-3 h-3 text-purple" />
                      <span>{part.retailer}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-text-primary">
                      ৳ {part.priceBDT.toLocaleString('en-IN')}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-green">
                      <Check className="w-2.5 h-2.5" /> In Stock
                    </span>
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
              {/* Bottleneck Analysis */}
              <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-text-primary">Bottleneck Index</span>
                  <span className="text-green font-extrabold">2.4% (Optimal)</span>
                </div>
                <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                  <div className="bg-green h-full w-[12%]" />
                </div>
                <p className="text-[11px] text-text-muted mt-2">
                  CPU and GPU pairing is exceptionally balanced for 1440p and 4K gaming loads.
                </p>
              </div>

              {/* Thermal Load Estimation */}
              <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                <span className="font-bold text-text-primary block mb-2">
                  Estimated Peak Thermals
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-bg-surface border border-glass-border flex flex-col">
                    <span className="text-text-muted">CPU Under Load</span>
                    <span className="text-sm font-bold text-accent mt-0.5">~64°C</span>
                  </div>
                  <div className="p-2 rounded-lg bg-bg-surface border border-glass-border flex flex-col">
                    <span className="text-text-muted">GPU Under Load</span>
                    <span className="text-sm font-bold text-accent mt-0.5">~61°C</span>
                  </div>
                </div>
              </div>

              {/* Acoustic & Noise Profile */}
              <div className="bg-fill-subtle p-3.5 rounded-xl border border-glass-border">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text-primary">Acoustic Rating</span>
                  <span className="text-text-secondary font-mono">~27.5 dB (Whisper Quiet)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Pricing & Export Button */}
      <div className="tonima-hud-footer">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-text-secondary">Estimated Total:</span>
          <div className="tonima-price-tag">৳ {displayPrice.toLocaleString('en-IN')}</div>
        </div>

        <button
          type="button"
          className="button-primary w-full !py-3 flex items-center justify-center gap-2 text-sm font-bold"
          onClick={handleExportToBuilder}
        >
          <span>Export to PC Builder</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
