import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Palette, Layers, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BuildComponentItem } from './BuildPreviewHUD';

export type RGBMode = 'cyberpunk' | 'emerald' | 'ice' | 'rainbow';

export interface ComponentSpecInfo {
  id: string;
  name: string;
  category: string;
  specs: string;
  priceBDT: number;
  retailer: string;
  inStock: boolean;
}

interface Chassis3DViewerProps {
  components?: BuildComponentItem[];
  primaryColor?: string;
  rgbMode?: RGBMode;
  gpuModel?: string;
  caseModel?: string;
  explodedProgress?: number;
  onSelectComponent?: (comp: ComponentSpecInfo) => void;
  className?: string;
}

// Error Boundary around Chassis3DViewer
export class Chassis3DErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Chassis3DViewer Error]:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-[330px] bg-bg-secondary/60 rounded-2xl border border-glass-border flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-warning mb-2" />
          <p className="text-xs font-bold text-text-primary">3D Viewport Offline</p>
          <p className="text-[11px] text-text-muted mt-1 max-w-xs">
            WebGL / Canvas context was interrupted. Your parts list and metrics remain fully active.
          </p>
          <button
            type="button"
            className="mt-3 px-3 py-1 text-xs rounded-lg glass border border-glass-border text-text-secondary hover:text-text-primary"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry Viewport
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Chassis3DViewer({
  components = [],
  rgbMode: initialRgbMode = 'cyberpunk',
  gpuModel: propGpuModel,
  caseModel: propCaseModel,
  explodedProgress: externalExplodedProgress,
  onSelectComponent,
  className = '',
}: Chassis3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rgbMode, setRgbMode] = useState<RGBMode>(initialRgbMode);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExplodedMode, setIsExplodedMode] = useState<boolean>(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentSpecInfo | null>(null);

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.35, y: -0.75 });
  const animFrameRef = useRef<number | null>(null);
  const explodedFactorRef = useRef<number>(0);

  const hasBuild = components.length > 0;

  // Derive model names and configuration from real components
  const gpuPart = components.find((c) => c.category === 'GPU' || c.category === 'Graphics Card');
  const casePart = components.find((c) => c.category === 'Case' || c.category === 'Casings');
  const coolerPart = components.find((c) => c.category === 'Cooler');
  const moboPart = components.find((c) => c.category === 'Motherboard');
  const ramPart = components.find((c) => c.category === 'RAM');

  const gpuName = gpuPart?.name || propGpuModel || (hasBuild ? 'Custom Discrete GPU' : '');
  const caseName = casePart?.name || propCaseModel || (hasBuild ? 'Mid-Tower Chassis' : '');

  const isAIO = coolerPart ? /liquid|aio|360|240|280/i.test(coolerPart.name) : true;
  const isITX = moboPart ? /itx|mini-itx/i.test(moboPart.name) : false;

  // Build dynamic component specs map from live parts
  const liveSpecs: Record<string, ComponentSpecInfo> = {};
  if (gpuPart) {
    liveSpecs.gpu = {
      id: 'gpu',
      name: gpuPart.name,
      category: 'Graphics Card (GPU)',
      specs: `${gpuPart.retailer} • ৳${gpuPart.priceBDT.toLocaleString('en-IN')}`,
      priceBDT: gpuPart.priceBDT,
      retailer: gpuPart.retailer,
      inStock: gpuPart.inStock,
    };
  }
  if (coolerPart) {
    liveSpecs.cooler = {
      id: 'cooler',
      name: coolerPart.name,
      category: isAIO ? 'Liquid AIO Cooler' : 'CPU Tower Cooler',
      specs: `${coolerPart.retailer} • ৳${coolerPart.priceBDT.toLocaleString('en-IN')}`,
      priceBDT: coolerPart.priceBDT,
      retailer: coolerPart.retailer,
      inStock: coolerPart.inStock,
    };
  }
  if (ramPart) {
    liveSpecs.ram = {
      id: 'ram',
      name: ramPart.name,
      category: 'System Memory (RAM)',
      specs: `${ramPart.retailer} • ৳${ramPart.priceBDT.toLocaleString('en-IN')}`,
      priceBDT: ramPart.priceBDT,
      retailer: ramPart.retailer,
      inStock: ramPart.inStock,
    };
  }
  if (moboPart) {
    liveSpecs.mobo = {
      id: 'mobo',
      name: moboPart.name,
      category: 'Motherboard',
      specs: `${moboPart.retailer} • ৳${moboPart.priceBDT.toLocaleString('en-IN')}`,
      priceBDT: moboPart.priceBDT,
      retailer: moboPart.retailer,
      inStock: moboPart.inStock,
    };
  }

  const resetView = () => {
    rotationRef.current = { x: 0.35, y: -0.75 };
    setZoomLevel(1);
    setIsExplodedMode(false);
    setSelectedComponent(null);
  };

  const getRgbColors = useCallback((mode: RGBMode, time: number) => {
    switch (mode) {
      case 'cyberpunk':
        return {
          primary: 'rgba(0, 229, 255, 0.95)',
          secondary: 'rgba(124, 58, 237, 0.85)',
          ambient: 'rgba(0, 229, 255, 0.18)',
        };
      case 'emerald':
        return {
          primary: 'rgba(0, 255, 178, 0.95)',
          secondary: 'rgba(16, 185, 129, 0.85)',
          ambient: 'rgba(0, 255, 178, 0.18)',
        };
      case 'ice':
        return {
          primary: 'rgba(224, 242, 254, 0.95)',
          secondary: 'rgba(56, 189, 248, 0.85)',
          ambient: 'rgba(186, 230, 253, 0.18)',
        };
      case 'rainbow': {
        const hue1 = (time * 40) % 360;
        const hue2 = (hue1 + 120) % 360;
        return {
          primary: `hsla(${hue1}, 95%, 60%, 0.95)`,
          secondary: `hsla(${hue2}, 95%, 55%, 0.85)`,
          ambient: `hsla(${hue1}, 85%, 50%, 0.18)`,
        };
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 380);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 280);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || 380;
      height = rect.height || 280;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      rotationRef.current.y += dx * 0.008;
      rotationRef.current.x = Math.max(-0.8, Math.min(0.8, rotationRef.current.x + dy * 0.008));
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const startTime = performance.now();

    const render = () => {
      const time = (performance.now() - startTime) * 0.001;
      ctx.clearRect(0, 0, width, height);

      // Idle auto-rotation when not interacting
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.0025;
      }

      // Exploded factor lerp
      const targetExploded =
        externalExplodedProgress !== undefined ? externalExplodedProgress : isExplodedMode ? 1 : 0;
      explodedFactorRef.current += (targetExploded - explodedFactorRef.current) * 0.08;
      const ex = explodedFactorRef.current;

      const colors = getRgbColors(rgbMode, time);

      const cx = width / 2;
      const cy = height / 2 + 10;
      const baseScale = (Math.min(width, height) / 280) * 80 * zoomLevel;

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const project = (x: number, y: number, z: number) => {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const fov = 400;
        const factor = fov / (fov + z2 * baseScale);
        return {
          px: cx + x1 * baseScale * factor,
          py: cy + y2 * baseScale * factor,
          depth: z2,
        };
      };

      // Draw Chassis Base / Outer Frame
      const chassisW = isITX ? 1.4 : 1.7;
      const chassisH = isITX ? 1.6 : 2.1;
      const chassisD = 1.0;

      const corners = [
        [-chassisW, -chassisH, -chassisD],
        [chassisW, -chassisH, -chassisD],
        [chassisW, chassisH, -chassisD],
        [-chassisW, chassisH, -chassisD],
        [-chassisW, -chassisH, chassisD],
        [chassisW, -chassisH, chassisD],
        [chassisW, chassisH, chassisD],
        [-chassisW, chassisH, chassisD],
      ].map(([x, y, z]) => project(x, y, z));

      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ];

      // Draw chassis edges
      ctx.lineWidth = hasBuild ? 1.5 : 1.0;
      ctx.strokeStyle = hasBuild ? 'rgba(0, 229, 255, 0.45)' : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      for (const [s, e] of edges) {
        ctx.moveTo(corners[s].px, corners[s].py);
        ctx.lineTo(corners[e].px, corners[e].py);
      }
      ctx.stroke();

      // Ambient RGB glow reflection on internal backplate
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120 * zoomLevel);
      glowGrad.addColorStop(0, colors.ambient);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      if (hasBuild) {
        // GPU block
        const gpuShift = ex * 0.7;
        const gpuP1 = project(-chassisW * 0.8, 0.2 + gpuShift, -chassisD * 0.4);
        const gpuP2 = project(chassisW * 0.7, 0.2 + gpuShift, -chassisD * 0.4);
        const gpuP3 = project(chassisW * 0.7, 0.6 + gpuShift, chassisD * 0.4);
        const gpuP4 = project(-chassisW * 0.8, 0.6 + gpuShift, chassisD * 0.4);

        ctx.fillStyle = 'rgba(20, 28, 48, 0.85)';
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gpuP1.px, gpuP1.py);
        ctx.lineTo(gpuP2.px, gpuP2.py);
        ctx.lineTo(gpuP3.px, gpuP3.py);
        ctx.lineTo(gpuP4.px, gpuP4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // CPU Cooler block (AIO pump or Air Tower)
        const coolerShift = ex * 0.9;
        const cpuP = project(0, -0.4 - coolerShift, -chassisD * 0.2);
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(cpuP.px, cpuP.py, isAIO ? 16 * zoomLevel : 24 * zoomLevel, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.primary;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    hasBuild,
    isAIO,
    isITX,
    rgbMode,
    zoomLevel,
    isExplodedMode,
    externalExplodedProgress,
    getRgbColors,
  ]);

  const handleComponentChipClick = (key: string) => {
    const spec = liveSpecs[key];
    if (spec) {
      setSelectedComponent(spec);
      if (onSelectComponent) {
        onSelectComponent(spec);
      }
    }
  };

  return (
    <div
      className={`relative w-full h-[330px] bg-bg-secondary/60 rounded-2xl overflow-hidden border border-glass-border flex flex-col ${className}`}
    >
      {/* HUD Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 glass px-2.5 py-1 rounded-full text-[11px] font-semibold text-text-secondary pointer-events-auto border border-glass-border">
          <span
            className={`w-2 h-2 rounded-full ${hasBuild ? 'bg-accent animate-pulse' : 'bg-text-muted'}`}
          />
          <span className="truncate max-w-[140px]">
            {gpuName || (hasBuild ? 'GPU' : 'No Build')}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {hasBuild && (
            <button
              type="button"
              className={`p-1.5 rounded-lg glass transition-all flex items-center gap-1 text-[11px] font-medium ${
                isExplodedMode
                  ? 'bg-accent/20 text-accent border-accent/50 shadow-[0_0_12px_var(--glass-glow)]'
                  : 'text-text-muted hover:text-text-primary hover:border-accent'
              }`}
              onClick={() => setIsExplodedMode(!isExplodedMode)}
              title={isExplodedMode ? 'Assembled View' : '3D Exploded View'}
              aria-label="Toggle Exploded View"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExplodedMode ? 'Exploded' : 'Assemble'}</span>
            </button>
          )}

          {/* RGB Profile Switcher */}
          <button
            type="button"
            className="p-1.5 rounded-lg glass text-text-muted hover:text-text-primary hover:border-accent transition-all"
            onClick={() => {
              const modes: RGBMode[] = ['cyberpunk', 'emerald', 'ice', 'rainbow'];
              const nextIdx = (modes.indexOf(rgbMode) + 1) % modes.length;
              setRgbMode(modes[nextIdx]);
            }}
            title={`RGB Profile: ${rgbMode}`}
            aria-label="Toggle RGB Mode"
          >
            <Palette className="w-3.5 h-3.5 text-accent" />
          </button>

          {/* Zoom In / Out */}
          <button
            type="button"
            className="p-1.5 rounded-lg glass text-text-muted hover:text-text-primary hover:border-accent transition-all"
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-lg glass text-text-muted hover:text-text-primary hover:border-accent transition-all"
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset View */}
          <button
            type="button"
            className="p-1.5 rounded-lg glass text-text-muted hover:text-text-primary hover:border-accent transition-all"
            onClick={resetView}
            title="Reset View Orientation"
            aria-label="Reset View Orientation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block select-none"
        aria-label="Real-time 3D PC Build Preview"
      />

      {/* Empty State Overlay */}
      {!hasBuild && (
        <div className="absolute inset-0 z-15 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <p className="text-xs font-semibold text-text-secondary">Awaiting Configuration</p>
          <p className="text-[11px] text-text-muted max-w-xs mt-1">
            Describe your build and Tonima will assemble it here.
          </p>
        </div>
      )}

      {/* Exploded Part Quick Select Bar when in Exploded Mode */}
      <AnimatePresence>
        {isExplodedMode && Object.keys(liveSpecs).length > 0 && (
          <motion.div
            className="absolute top-12 left-3 right-3 z-15 flex flex-wrap gap-1 pointer-events-auto"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {Object.keys(liveSpecs).map((k) => {
              const item = liveSpecs[k];
              const isSelected = selectedComponent?.id === item.id;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleComponentChipClick(k)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full glass border transition-all ${
                    isSelected
                      ? 'bg-accent/25 border-accent text-accent'
                      : 'border-glass-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.category.split(' ')[0]}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Component Spec Card Drawer */}
      <AnimatePresence>
        {selectedComponent && (
          <motion.div
            className="absolute bottom-10 left-3 right-3 z-30 p-2.5 rounded-xl glass border border-accent/40 bg-bg-surface/90 backdrop-filter blur-xl text-xs shadow-2xl"
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-accent">
                  {selectedComponent.category}
                </span>
                <span className="font-bold text-text-primary mt-0.5 truncate max-w-[200px]">
                  {selectedComponent.name}
                </span>
                <span className="text-[10px] text-text-secondary mt-0.5">
                  {selectedComponent.specs}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="font-extrabold text-accent text-sm whitespace-nowrap">
                  ৳ {selectedComponent.priceBDT.toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-green mt-0.5">
                  <Check className="w-3 h-3" />
                  <span>In Stock ({selectedComponent.retailer})</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mt-2 text-[10px] text-text-muted hover:text-text-primary block text-right w-full font-medium"
              onClick={() => setSelectedComponent(null)}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Case Details Footer Bar */}
      <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-text-muted pointer-events-none">
        <span className="truncate max-w-[200px]">{caseName}</span>
        <span className="text-[10px] text-accent/80 font-mono">
          {hasBuild
            ? isExplodedMode
              ? 'Exploded Layering Active'
              : '360° Drag to Orbit'
            : 'Spatial Engine Ready'}
        </span>
      </div>
    </div>
  );
}
