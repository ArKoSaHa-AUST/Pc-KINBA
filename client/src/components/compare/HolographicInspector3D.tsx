import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCw, ZoomIn, ZoomOut, Sparkles, Info, Maximize2, Minimize2 } from 'lucide-react';
import type { CompareProduct } from '../../types/compare';

interface Hotspot {
  id: string;
  name: string;
  nameBn?: string;
  x: number; // 3D coordinate space percentage -50 to 50
  y: number;
  z: number;
  description: string;
}

interface HolographicInspector3DProps {
  isOpen: boolean;
  onClose: () => void;
  product: CompareProduct | null;
}

export const HolographicInspector3D = ({
  isOpen,
  onClose,
  product,
}: HolographicInspector3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'solid' | 'wireframe' | 'xray'>('solid');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.25, y: -0.6 });
  const animFrameRef = useRef<number | null>(null);

  // Dynamic Hotspots based on component category and vendor
  const hotspots: Hotspot[] = useMemo(
    () => [
      {
        id: 'shroud',
        name: 'Vapor Chamber & Heatpipe Shroud',
        x: 0,
        y: -15,
        z: 25,
        description:
          'Composite copper heatpipes with nickel-plated baseplate ensuring optimal thermal transfer across high-density VRMs.',
      },
      {
        id: 'fans',
        name: 'Axial Dual Ball-Bearing Fans',
        x: -45,
        y: 0,
        z: 28,
        description:
          'Custom winglet fan blades engineered to maximize static pressure through the heatsink fins while minimizing vortex noise.',
      },
      {
        id: 'power',
        name: product?.specs.powerConnectors
          ? String(product.specs.powerConnectors)
          : 'Power Delivery Header',
        x: 55,
        y: -40,
        z: -10,
        description:
          'Reinforced power connector delivery socket supporting sustained multi-rail wattage with transient spike filtering.',
      },
      {
        id: 'backplate',
        name: 'Vented Aluminum Backplate',
        x: 0,
        y: 10,
        z: -25,
        description:
          'Rigid cast-aluminum alloy backplate providing PCB structural rigidity and passthrough flow ventilation.',
      },
      {
        id: 'io',
        name: 'Stainless Steel I/O Bracket',
        x: -80,
        y: 0,
        z: 0,
        description:
          'Precision anti-corrosive stainless steel bracket with native DisplayPort 1.4a / 2.1 and HDMI 2.1a gold-plated ports.',
      },
    ],
    [product?.specs.powerConnectors],
  );

  // Vendor color resolver
  const getVendorColors = useCallback((vendor?: string) => {
    switch (vendor) {
      case 'nvidia':
      case 'zotac':
      case 'pny':
        return {
          primary: '#10b981', // Emerald
          secondary: '#06b6d4', // Cyan
          glow: 'rgba(16, 185, 129, 0.4)',
          aura: 'rgba(16, 185, 129, 0.15)',
        };
      case 'amd':
      case 'sapphire':
        return {
          primary: '#ef4444', // Crimson
          secondary: '#f97316', // Orange
          glow: 'rgba(239, 68, 68, 0.4)',
          aura: 'rgba(239, 68, 68, 0.15)',
        };
      case 'intel':
        return {
          primary: '#06b6d4', // Electric Cyan
          secondary: '#3b82f6', // Blue
          glow: 'rgba(6, 182, 212, 0.4)',
          aura: 'rgba(6, 182, 212, 0.15)',
        };
      default:
        return {
          primary: '#00e5ff',
          secondary: '#7c3aed',
          glow: 'rgba(0, 229, 255, 0.4)',
          aura: 'rgba(0, 229, 255, 0.15)',
        };
    }
  }, []);

  // Keyboard navigation and ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Main 3D Canvas Rendering Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = getVendorColors(product?.vendor);

    // 3D Projection geometry helper
    const project = (x: number, y: number, z: number, rotX: number, rotY: number) => {
      // Y-axis rotation
      const radY = rotY;
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      // X-axis rotation
      const radX = rotX;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Perspective projection
      const cameraDistance = 380 / zoomLevel;
      const scale = cameraDistance / (cameraDistance + z2);
      const px = width / 2 + x1 * scale * 2.2;
      const py = height / 2 + y2 * scale * 2.2;

      return { x: px, y: py, scale, z: z2 };
    };

    let animationTime = 0;

    const render = () => {
      animationTime += 0.015;
      if (autoRotate && !isDraggingRef.current) {
        rotationRef.current.y += 0.006;
      }

      ctx.clearRect(0, 0, width, height);

      // Background ambient cyber holographic grid
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let gx = 0; gx < width; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Ambient circular holographic floor disc
      ctx.beginPath();
      ctx.ellipse(
        width / 2,
        height / 2 + 160 * zoomLevel,
        240 * zoomLevel,
        60 * zoomLevel,
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = colors.glow;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = colors.aura;
      ctx.fill();
      ctx.restore();

      const rx = rotationRef.current.x;
      const ry = rotationRef.current.y;

      // Draw 3D Box / Shroud Model Geometries
      const w = 110;
      const h = 45;
      const d = 26;

      const vertices = [
        { x: -w, y: -h, z: -d },
        { x: w, y: -h, z: -d },
        { x: w, y: h, z: -d },
        { x: -w, y: h, z: -d },
        { x: -w, y: -h, z: d },
        { x: w, y: -h, z: d },
        { x: w, y: h, z: d },
        { x: -w, y: h, z: d },
      ];

      const projected = vertices.map((v) => project(v.x, v.y, v.z, rx, ry));

      const faces = [
        [0, 1, 2, 3], // Back
        [4, 5, 6, 7], // Front
        [0, 1, 5, 4], // Top
        [2, 3, 7, 6], // Bottom
        [0, 3, 7, 4], // Left
        [1, 2, 6, 5], // Right
      ];

      // Sort faces by depth
      const sortedFaces = faces
        .map((faceIndices) => {
          const avgZ =
            faceIndices.reduce((acc, idx) => acc + projected[idx].z, 0) / faceIndices.length;
          return { indices: faceIndices, avgZ };
        })
        .sort((a, b) => b.avgZ - a.avgZ);

      // Render 3D Faces
      sortedFaces.forEach(({ indices }) => {
        ctx.beginPath();
        ctx.moveTo(projected[indices[0]].x, projected[indices[0]].y);
        for (let i = 1; i < indices.length; i++) {
          ctx.lineTo(projected[indices[i]].x, projected[indices[i]].y);
        }
        ctx.closePath();

        if (viewMode === 'solid') {
          const grad = ctx.createLinearGradient(
            projected[indices[0]].x,
            projected[indices[0]].y,
            projected[indices[2]].x,
            projected[indices[2]].y,
          );
          grad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
          grad.addColorStop(1, 'rgba(30, 41, 59, 0.94)');
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (viewMode === 'xray') {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
          ctx.fill();
          ctx.strokeStyle = colors.secondary;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Wireframe
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Render 3 Triple-Axial Fans in front face if solid or wireframe
      const fanPositions = [-65, 0, 65];
      fanPositions.forEach((fanX, fIdx) => {
        const fanCenter = project(fanX, 0, d + 1, rx, ry);
        const radius = 26 * fanCenter.scale * 2.2;

        ctx.beginPath();
        ctx.arc(fanCenter.x, fanCenter.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Rotating blades
        const bladeCount = 7;
        const bladeSpin = animationTime * 4 + fIdx * 0.5;
        for (let b = 0; b < bladeCount; b++) {
          const angle = (b * Math.PI * 2) / bladeCount + bladeSpin;
          const bx = fanCenter.x + Math.cos(angle) * radius * 0.85;
          const by = fanCenter.y + Math.sin(angle) * radius * 0.85;
          ctx.beginPath();
          ctx.moveTo(fanCenter.x, fanCenter.y);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = colors.secondary;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // Render Hotspot Markers
      hotspots.forEach((spot) => {
        const p = project(spot.x, spot.y, spot.z, rx, ry);
        const isSelected = selectedHotspot?.id === spot.id;

        // Hotspot pulsing halo
        const pulse = (Math.sin(animationTime * 4) + 1) / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (8 + pulse * 6) * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(0, 229, 255, 0.4)' : colors.aura;
        ctx.fill();

        // Inner solid dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ffffff' : colors.primary;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = isSelected ? '#00e5ff' : 'rgba(255, 255, 255, 0.75)';
        ctx.font = `${Math.max(10, Math.round(11 * p.scale))}px Inter, sans-serif`;
        ctx.fillText(spot.name, p.x + 10, p.y - 6);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isOpen,
    viewMode,
    autoRotate,
    zoomLevel,
    product,
    getVendorColors,
    selectedHotspot,
    hotspots,
  ]);

  // Drag interaction handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    rotationRef.current.y += deltaX * 0.01;
    rotationRef.current.x = Math.max(-1.2, Math.min(1.2, rotationRef.current.x + deltaY * 0.01));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check proximity to any hotspot
    const width = canvas.width;
    const height = canvas.height;
    const rx = rotationRef.current.x;
    const ry = rotationRef.current.y;

    const project = (x: number, y: number, z: number) => {
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const cameraDistance = 380 / zoomLevel;
      const scale = cameraDistance / (cameraDistance + z2);
      return {
        x: width / 2 + x1 * scale * 2.2,
        y: height / 2 + y2 * scale * 2.2,
      };
    };

    let hit: Hotspot | null = null;
    hotspots.forEach((spot) => {
      const p = project(spot.x, spot.y, spot.z);
      const dist = Math.hypot(clickX - p.x, clickY - p.y);
      if (dist < 22) hit = spot;
    });

    setSelectedHotspot(hit);
  };

  const resetView = () => {
    rotationRef.current = { x: 0.25, y: -0.6 };
    setZoomLevel(1);
  };

  if (!isOpen || !product) return null;

  const vendorColor = getVendorColors(product.vendor);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        {/* Fullscreen Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 25 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={`relative w-full ${
            isFullscreen ? 'h-full max-w-none' : 'max-w-5xl h-[88vh]'
          } flex flex-col bg-slate-950 border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden z-10`}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{
                  backgroundColor: vendorColor.aura,
                  borderColor: vendorColor.glow,
                  color: vendorColor.primary,
                }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Holographic 3D Component Inspector</span>
                  <span
                    className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border"
                    style={{
                      borderColor: vendorColor.glow,
                      color: vendorColor.primary,
                    }}
                  >
                    {product.brand}
                  </span>
                </h3>
                <p className="text-xs text-text-muted">{product.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                title="Close Inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive WebGL Canvas Viewport */}
          <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={handleCanvasClick}
              className="w-full h-full block"
            />

            {/* View Mode & Control HUD (Top Left Floating) */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
              <button
                onClick={() => setViewMode('solid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === 'solid'
                    ? 'bg-accent text-slate-950 font-bold'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                Solid PBR
              </button>
              <button
                onClick={() => setViewMode('wireframe')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === 'wireframe'
                    ? 'bg-accent text-slate-950 font-bold'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                Wireframe
              </button>
              <button
                onClick={() => setViewMode('xray')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === 'xray'
                    ? 'bg-accent text-slate-950 font-bold'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                X-Ray PCB
              </button>

              <div className="h-4 w-px bg-white/10 mx-1" />

              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1.5 rounded-xl text-xs transition-all ${
                  autoRotate ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-white'
                }`}
                title={autoRotate ? 'Pause Auto Rotation' : 'Enable Auto Rotation'}
              >
                <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin-slow' : ''}`} />
              </button>
            </div>

            {/* Zoom Controls HUD (Bottom Right Floating) */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
                className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetView}
                className="px-2.5 py-1 rounded-xl text-xs font-mono font-semibold text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                title="Reset View"
              >
                Reset
              </button>
            </div>

            {/* Hotspot Info Flyout (Bottom Left Floating) */}
            <AnimatePresence>
              {selectedHotspot && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-4 left-4 max-w-sm bg-slate-900/90 backdrop-blur-xl border border-accent/40 rounded-2xl p-4 shadow-2xl z-20"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-accent">
                      <Info className="w-3.5 h-3.5" />
                      <span>{selectedHotspot.name}</span>
                    </div>
                    <button
                      onClick={() => setSelectedHotspot(null)}
                      className="p-1 rounded-lg text-text-muted hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {selectedHotspot.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instruction Overlay */}
            <div className="absolute top-4 right-4 pointer-events-none text-[11px] text-text-muted/60 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
              Drag to rotate 360° • Click hotspots for details
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
