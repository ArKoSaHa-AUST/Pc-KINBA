import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Radar, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CompareProduct } from '../../types/compare';

interface PerformanceRadarChartProps {
  slots: (CompareProduct | null)[];
}

interface MetricAxis {
  id: string;
  name: string;
  nameBn?: string;
  description: string;
}

const RADAR_AXES: MetricAxis[] = [
  {
    id: 'rasterization',
    name: '1. Rasterization Gaming',
    nameBn: '১. রাস্টারাইজেশন গেমিং',
    description:
      'Average raw 1080p, 1440p, and 4K native rendering throughput across synthetic & game engines.',
  },
  {
    id: 'rayTracing',
    name: '2. Ray Tracing & AI',
    nameBn: '২. রে ট্রেসিং ও এআই',
    description:
      'Hardware BVH traversal, RT core efficiency, and DLSS/FSR/XeSS neural upscaling generation.',
  },
  {
    id: 'efficiency',
    name: '3. Power Efficiency',
    nameBn: '৩. পাওয়ার দক্ষতা',
    description:
      'Sustained performance delivered per watt of power consumed under peak GPU/CPU load.',
  },
  {
    id: 'vram',
    name: '4. VRAM & Bandwidth',
    nameBn: '৪. ভি-র‍্যাম ও ব্যান্ডউইডথ',
    description:
      'Dedicated memory capacity, bus width, and total memory throughput for high-res assets.',
  },
  {
    id: 'pricePerf',
    name: '5. Price-to-Performance',
    nameBn: '৫. মূল্য বনাম কার্যক্ষমতা',
    description:
      'Normalized benchmark index relative to current Bangladeshi retail market pricing in BDT.',
  },
  {
    id: 'thermal',
    name: '6. Thermal & Acoustic',
    nameBn: '৬. থার্মাল ও নয়েজ',
    description:
      'Cooling capacity headroom, heatsink thickness, and acoustic decibel profile under load.',
  },
];

export const PerformanceRadarChart: React.FC<PerformanceRadarChartProps> = ({ slots }) => {
  const { i18n } = useTranslation('compare');
  const isBn = i18n.language.startsWith('bn');
  const [hoveredAxis, setHoveredAxis] = useState<MetricAxis | null>(null);

  const activeProducts = useMemo(
    () => slots.filter((p): p is CompareProduct => p !== null),
    [slots],
  );

  // Vendor color resolver for radar polygons
  const getProductColor = (vendor?: string, idx: number = 0) => {
    switch (vendor) {
      case 'nvidia':
      case 'zotac':
      case 'pny':
        return {
          stroke: '#10b981',
          fill: 'rgba(16, 185, 129, 0.22)',
          dot: '#10b981',
        };
      case 'amd':
      case 'sapphire':
        return {
          stroke: '#ef4444',
          fill: 'rgba(239, 68, 68, 0.22)',
          dot: '#ef4444',
        };
      case 'intel':
        return {
          stroke: '#06b6d4',
          fill: 'rgba(6, 182, 212, 0.22)',
          dot: '#06b6d4',
        };
      case 'asus':
        return {
          stroke: '#a855f7',
          fill: 'rgba(168, 85, 247, 0.22)',
          dot: '#a855f7',
        };
      default: {
        const fallbacks = [
          { stroke: '#00e5ff', fill: 'rgba(0, 229, 255, 0.22)', dot: '#00e5ff' },
          { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.22)', dot: '#f59e0b' },
          { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.22)', dot: '#ec4899' },
          { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.22)', dot: '#8b5cf6' },
        ];
        return fallbacks[idx % fallbacks.length];
      }
    }
  };

  // Compute 6 scores (0 to 100) per product based on taisha3.md mathematical models
  const productScores = useMemo(() => {
    return activeProducts.map((prod) => {
      const vram = typeof prod.specs.vramCapacity === 'number' ? prod.specs.vramCapacity : 12;
      const bus = typeof prod.specs.busWidth === 'number' ? prod.specs.busWidth : 192;
      const bandwidth =
        typeof prod.specs.memoryBandwidth === 'number' ? prod.specs.memoryBandwidth : 504;
      const tdp = typeof prod.specs.tdp === 'number' ? prod.specs.tdp : 285;
      const cores =
        typeof prod.specs.cudaOrStreamCores === 'number' ? prod.specs.cudaOrStreamCores : 7680;
      const price = prod.basePriceBDT || 108000;

      // 1. Rasterization Score
      const rasterScore = Math.min(100, Math.max(40, (cores / 8000) * 65 + (bandwidth / 800) * 35));

      // 2. Ray Tracing & AI Score
      const rtScore =
        prod.vendor === 'nvidia' || prod.vendor === 'zotac' || prod.vendor === 'pny'
          ? Math.min(100, Math.max(50, 92 + (cores > 8000 ? 5 : 0)))
          : Math.min(90, Math.max(40, (cores / 6000) * 75));

      // 3. Efficiency Score (Perf / Watt)
      const efficiencyScore = Math.min(100, Math.max(30, (rasterScore / tdp) * 260));

      // 4. VRAM & Bandwidth Score (taisha3.md formula: (VRAM_GB * 3) + (Bandwidth_GBps / 20))
      const vramScore = Math.min(100, Math.max(30, vram * 2.8 + (bandwidth / 20) * 0.9));

      // 5. Price to Performance Score (taisha3.md formula: (Total_Perf / Price_BDT) * 100,000)
      const totalRawPerf = (rasterScore + rtScore + vramScore) / 3;
      const pricePerfScore = Math.min(100, Math.max(30, (totalRawPerf / price) * 115000));

      // 6. Thermal Management Score
      const thermalScore = Math.min(
        100,
        Math.max(40, 100 - (tdp / 420) * 35 + (bus >= 256 ? 10 : 0)),
      );

      return {
        product: prod,
        scores: {
          rasterization: Math.round(rasterScore),
          rayTracing: Math.round(rtScore),
          efficiency: Math.round(efficiencyScore),
          vram: Math.round(vramScore),
          pricePerf: Math.round(pricePerfScore),
          thermal: Math.round(thermalScore),
        },
      };
    });
  }, [activeProducts]);

  // Radar geometry calculations (SVG viewBox 0 0 500 500, center: 250, 250, radius: 170)
  const cx = 250;
  const cy = 250;
  const radius = 160;
  const numAxes = RADAR_AXES.length;

  const getAxisCoord = (axisIndex: number, valPercent: number) => {
    const angle = (axisIndex * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = (valPercent / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  if (activeProducts.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute -top-10 -right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 border border-accent/30 text-accent mb-2">
            <Radar className="w-3.5 h-3.5" />
            <span>Interactive 3D Performance Radar</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white">
            6-Axis Hardware Battleground Index
          </h3>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Normalized 360° architectural index evaluating raw raster, ray tracing, power, memory,
            value, and thermals.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {productScores.map(({ product }, idx) => {
            const color = getProductColor(product.vendor, idx);
            return (
              <div
                key={product.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white"
              >
                <div
                  className="w-3 h-3 rounded-full border-2"
                  style={{ borderColor: color.stroke, backgroundColor: color.fill }}
                />
                <span className="truncate max-w-[140px]">{product.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Radar SVG Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        <div className="lg:col-span-8 flex justify-center items-center">
          <div className="relative w-full max-w-[480px] aspect-square">
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full filter drop-shadow-xl overflow-visible"
            >
              {/* Concentric Web Rings (20%, 40%, 60%, 80%, 100%) */}
              {[20, 40, 60, 80, 100].map((ringPercent) => {
                const ringPoints = RADAR_AXES.map((_, aIdx) => {
                  const pt = getAxisCoord(aIdx, ringPercent);
                  return `${pt.x},${pt.y}`;
                }).join(' ');

                return (
                  <polygon
                    key={ringPercent}
                    points={ringPoints}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1.2"
                    strokeDasharray={ringPercent === 100 ? 'none' : '4 4'}
                  />
                );
              })}

              {/* Axis Spokes & Labels */}
              {RADAR_AXES.map((axis, aIdx) => {
                const centerPt = { x: cx, y: cy };
                const outerPt = getAxisCoord(aIdx, 100);
                const labelPt = getAxisCoord(aIdx, 118);
                const isHovered = hoveredAxis?.id === axis.id;

                return (
                  <g
                    key={axis.id}
                    onMouseEnter={() => setHoveredAxis(axis)}
                    onMouseLeave={() => setHoveredAxis(null)}
                    className="cursor-pointer group"
                  >
                    {/* Spoke line */}
                    <line
                      x1={centerPt.x}
                      y1={centerPt.y}
                      x2={outerPt.x}
                      y2={outerPt.y}
                      stroke={isHovered ? '#00e5ff' : 'rgba(255, 255, 255, 0.15)'}
                      strokeWidth={isHovered ? 2 : 1}
                      className="transition-colors"
                    />

                    {/* Outer vertex indicator dot */}
                    <circle
                      cx={outerPt.x}
                      cy={outerPt.y}
                      r={isHovered ? 5 : 3.5}
                      fill={isHovered ? '#00e5ff' : 'rgba(255, 255, 255, 0.4)'}
                      className="transition-all"
                    />

                    {/* Axis Label */}
                    <text
                      x={labelPt.x}
                      y={labelPt.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`text-[11px] font-bold tracking-wide transition-all ${
                        isHovered ? 'fill-accent scale-110' : 'fill-slate-300'
                      }`}
                    >
                      {isBn ? axis.nameBn || axis.name : axis.name}
                    </text>
                  </g>
                );
              })}

              {/* Render Polygons for each active product */}
              {productScores.map(({ product, scores }, pIdx) => {
                const color = getProductColor(product.vendor, pIdx);
                const polygonPoints = RADAR_AXES.map((axis, aIdx) => {
                  const val = scores[axis.id as keyof typeof scores] || 50;
                  const pt = getAxisCoord(aIdx, val);
                  return `${pt.x},${pt.y}`;
                }).join(' ');

                return (
                  <g key={product.id}>
                    {/* Filled morphing polygon */}
                    <motion.polygon
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      points={polygonPoints}
                      fill={color.fill}
                      stroke={color.stroke}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />

                    {/* Vertex Data Points with Score Values */}
                    {RADAR_AXES.map((axis, aIdx) => {
                      const val = scores[axis.id as keyof typeof scores] || 50;
                      const pt = getAxisCoord(aIdx, val);

                      return (
                        <g key={axis.id}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={4.5}
                            fill={color.dot}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Detailed Metrics Score Breakdown & Axis Inspector (Right Panel) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{hoveredAxis ? hoveredAxis.name : 'Hover an Axis Spoke'}</span>
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              {hoveredAxis
                ? hoveredAxis.description
                : 'Hover or tap over any dimension of the radar to inspect exact benchmark weighting and architectural equations.'}
            </p>
          </div>

          {/* Scores Table */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-1">
              Normalized Index Table (0–100)
            </h4>
            <div className="space-y-2">
              {RADAR_AXES.map((axis) => (
                <div
                  key={axis.id}
                  onMouseEnter={() => setHoveredAxis(axis)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    hoveredAxis?.id === axis.id
                      ? 'bg-accent/10 border border-accent/30 text-white'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] text-text-secondary'
                  }`}
                >
                  <span className="font-semibold truncate max-w-[170px]">{axis.name}</span>
                  <div className="flex items-center gap-3 font-mono font-bold">
                    {productScores.map(({ product, scores }, idx) => {
                      const color = getProductColor(product.vendor, idx);
                      const val = scores[axis.id as keyof typeof scores];
                      return (
                        <span key={product.id} style={{ color: color.stroke }}>
                          {val}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
