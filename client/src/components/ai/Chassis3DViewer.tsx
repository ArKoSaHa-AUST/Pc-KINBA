import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Palette, Layers, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  primaryColor?: string;
  rgbMode?: RGBMode;
  gpuModel?: string;
  caseModel?: string;
  explodedProgress?: number; // 0 (assembled) to 1 (fully exploded)
  onSelectComponent?: (comp: ComponentSpecInfo) => void;
  className?: string;
}

const DEFAULT_COMPONENT_SPECS: Record<string, ComponentSpecInfo> = {
  gpu: {
    id: 'gpu',
    name: 'MSI RTX 4070 Ti Super 16G Gaming X',
    category: 'Graphics Card (GPU)',
    specs: '16GB GDDR6X • 8448 CUDA Cores • 285W TDP',
    priceBDT: 68500,
    retailer: 'Tech Land',
    inStock: true,
  },
  cooler: {
    id: 'cooler',
    name: 'DeepCool LT720 360mm Liquid Cooler',
    category: 'CPU Liquid Cooler (AIO)',
    specs: '360mm Radiator • Anti-Leak Tech • 300W TDP',
    priceBDT: 11500,
    retailer: 'Custom Mac BD',
    inStock: true,
  },
  ram: {
    id: 'ram',
    name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5',
    category: 'System Memory (RAM)',
    specs: 'DDR5 6000MHz • CL30 • AMD EXPO & XMP 3.0',
    priceBDT: 13500,
    retailer: 'Star Tech',
    inStock: true,
  },
  psu: {
    id: 'psu',
    name: 'Corsair RM750e 750W 80 Plus Gold ATX 3.0',
    category: 'Power Supply Unit (PSU)',
    specs: '750W • 80+ Gold • PCIe 5.0 12VHPWR Native',
    priceBDT: 11200,
    retailer: 'Star Tech',
    inStock: true,
  },
  mobo: {
    id: 'mobo',
    name: 'ASUS TUF Gaming B650-PLUS WIFI',
    category: 'Motherboard',
    specs: 'Socket AM5 • PCIe 5.0 M.2 • 2.5Gb LAN & WiFi 6',
    priceBDT: 24500,
    retailer: 'Ryans Computers',
    inStock: true,
  },
};

export default function Chassis3DViewer({
  rgbMode: initialRgbMode = 'cyberpunk',
  gpuModel = 'MSI RTX 4070 Ti Super 16G',
  caseModel = 'Lian Li O11 Dynamic EVO',
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

    // Mouse Drag Controls
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

    let time = 0;

    const render = () => {
      time += 0.015;

      // Smooth interpolation for exploded factor
      const targetExplode =
        externalExplodedProgress !== undefined
          ? externalExplodedProgress
          : isExplodedMode
            ? 1.0
            : 0.0;
      explodedFactorRef.current += (targetExplode - explodedFactorRef.current) * 0.08;
      const exp = explodedFactorRef.current;

      // Auto gentle idle orbit when not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.002;
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 10;
      const fov = 500;
      const scale = zoomLevel;

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      const project = (x: number, y: number, z: number) => {
        // Rotate Y
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);

        // Rotate X
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

        const projScale = (fov / (fov + z2)) * scale;
        return {
          px: cx + x1 * projScale,
          py: cy + y2 * projScale,
          pz: z2,
          scale: projScale,
        };
      };

      const rgb = getRgbColors(rgbMode, time);

      // 1. Base pedestal glow shadow
      const groundP = project(0, 110 + exp * 20, 0);
      const groundGlow = ctx.createRadialGradient(
        groundP.px,
        groundP.py,
        10,
        groundP.px,
        groundP.py,
        150 * scale,
      );
      groundGlow.addColorStop(0, rgb.ambient);
      groundGlow.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
      groundGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(groundP.px, groundP.py, 140 * scale, 50 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Chassis 3D Geometry Box Wireframe & Tinted Glass
      const hw = 75;
      const hh = 100;
      const hd = 85;

      const vertices = [
        [-hw, -hh, -hd], // 0: Top-Left-Back
        [hw, -hh, -hd], // 1: Top-Right-Back
        [hw, hh, -hd], // 2: Bottom-Right-Back
        [-hw, hh, -hd], // 3: Bottom-Left-Back
        [-hw, -hh, hd], // 4: Top-Left-Front
        [hw, -hh, hd], // 5: Top-Right-Front
        [hw, hh, hd], // 6: Bottom-Right-Front
        [-hw, hh, hd], // 7: Bottom-Left-Front
      ];

      const projVerts = vertices.map((v) => project(v[0], v[1], v[2]));

      const drawQuad = (
        i0: number,
        i1: number,
        i2: number,
        i3: number,
        fill: string,
        stroke: string,
      ) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(projVerts[i0].px, projVerts[i0].py);
        ctx.lineTo(projVerts[i1].px, projVerts[i1].py);
        ctx.lineTo(projVerts[i2].px, projVerts[i2].py);
        ctx.lineTo(projVerts[i3].px, projVerts[i3].py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      // Chassis Interior
      drawQuad(0, 1, 2, 3, 'rgba(10, 15, 30, 0.92)', 'rgba(255,255,255,0.12)'); // Back

      // 3. Components inside with Exploded View Offsets along local 3D vectors
      // Exploded Offsets:
      // GPU: slides forward along local Z-axis (+Z offset 65px)
      // CPU Cooler / AIO: detaches and elevates perpendicular to motherboard (+Z 45px, -Y 40px)
      // RAM: ejects slightly from DIMM slots (+X 35px, -Y 25px)
      // PSU: shifts outward from bottom chamber (+Z 30px, +Y 45px)

      // Motherboard PCB
      const moboTopLeft = project(-60, -80, -70);
      const moboTopRight = project(50, -80, -70);
      const moboBotRight = project(50, 40, -70);
      const moboBotLeft = project(-60, 40, -70);

      ctx.fillStyle = 'rgba(20, 25, 45, 0.95)';
      ctx.strokeStyle = rgb.secondary;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(moboTopLeft.px, moboTopLeft.py);
      ctx.lineTo(moboTopRight.px, moboTopRight.py);
      ctx.lineTo(moboBotRight.px, moboBotRight.py);
      ctx.lineTo(moboBotLeft.px, moboBotLeft.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // RAM Modules (ejected when exploded)
      const ramOffsetX = exp * 35;
      const ramOffsetY = -exp * 25;
      for (let r = 0; r < 2; r++) {
        const rx = 15 + r * 10 + ramOffsetX;
        const ramTop = project(rx, -65 + ramOffsetY, -60);
        const ramBot = project(rx, -20 + ramOffsetY, -60);
        ctx.strokeStyle = rgb.primary;
        ctx.lineWidth = 3.5 * ramTop.scale;
        ctx.beginPath();
        ctx.moveTo(ramTop.px, ramTop.py);
        ctx.lineTo(ramBot.px, ramBot.py);
        ctx.stroke();
      }

      // CPU AIO Water Cooler Pump Head (elevates and detaches when exploded)
      const coolerOffsetZ = exp * 45;
      const coolerOffsetY = -exp * 35;
      const cpuPump = project(-15, -40 + coolerOffsetY, -60 + coolerOffsetZ);
      const pumpRad = 16 * cpuPump.scale;
      const pumpGlow = ctx.createRadialGradient(
        cpuPump.px,
        cpuPump.py,
        2,
        cpuPump.px,
        cpuPump.py,
        pumpRad * 1.6,
      );
      pumpGlow.addColorStop(0, rgb.primary);
      pumpGlow.addColorStop(0.5, rgb.secondary);
      pumpGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = pumpGlow;
      ctx.beginPath();
      ctx.arc(cpuPump.px, cpuPump.py, pumpRad * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // GPU (slides forward on Z-axis when exploded)
      const gpuOffsetZ = exp * 65;
      const gpuStart = project(-55, 0, -30 + gpuOffsetZ);
      const gpuEnd = project(45, 0, -30 + gpuOffsetZ);
      const gpuBotStart = project(-55, 25, -30 + gpuOffsetZ);
      const gpuBotEnd = project(45, 25, -30 + gpuOffsetZ);

      ctx.fillStyle = 'rgba(30, 35, 55, 0.96)';
      ctx.strokeStyle = rgb.primary;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(gpuStart.px, gpuStart.py);
      ctx.lineTo(gpuEnd.px, gpuEnd.py);
      ctx.lineTo(gpuBotEnd.px, gpuBotEnd.py);
      ctx.lineTo(gpuBotStart.px, gpuBotStart.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // GPU RGB Edge Stripe
      ctx.strokeStyle = rgb.secondary;
      ctx.lineWidth = 2.5 * gpuStart.scale;
      ctx.beginPath();
      ctx.moveTo(gpuStart.px, gpuStart.py + 4);
      ctx.lineTo(gpuEnd.px, gpuEnd.py + 4);
      ctx.stroke();

      // PSU Chamber (shifts outward from bottom when exploded)
      const psuOffsetY = exp * 35;
      const psuOffsetZ = exp * 30;
      const psuTL = project(-65, 50 + psuOffsetY, -70 + psuOffsetZ);
      const psuTR = project(55, 50 + psuOffsetY, -70 + psuOffsetZ);
      const psuBR = project(55, 95 + psuOffsetY, -70 + psuOffsetZ);
      const psuBL = project(-65, 95 + psuOffsetY, -70 + psuOffsetZ);

      ctx.fillStyle = 'rgba(15, 20, 35, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(psuTL.px, psuTL.py);
      ctx.lineTo(psuTR.px, psuTR.py);
      ctx.lineTo(psuBR.px, psuBR.py);
      ctx.lineTo(psuBL.px, psuBL.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. Front / Top RGB Fans (3x Fans)
      for (let f = 0; f < 3; f++) {
        const fy = -60 + f * 45;
        const fanP = project(70, fy, 0);
        const fanRad = 14 * fanP.scale;

        ctx.strokeStyle = rgb.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fanP.px, fanP.py, fanRad, 0, Math.PI * 2);
        ctx.stroke();

        // Fan Blades spinning
        const angle = time * 8 + f;
        ctx.strokeStyle = rgb.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fanP.px + Math.cos(angle) * fanRad, fanP.py + Math.sin(angle) * fanRad);
        ctx.lineTo(fanP.px - Math.cos(angle) * fanRad, fanP.py - Math.sin(angle) * fanRad);
        ctx.stroke();
      }

      // 5. Front/Side Glass Panel (detaches forward when exploded)
      const glassAlpha = Math.max(0.02, 0.04 * (1 - exp));
      const glassStrokeAlpha = Math.max(0.1, 0.25 * (1 - exp * 0.5));
      drawQuad(
        4,
        5,
        6,
        7,
        `rgba(0, 229, 255, ${glassAlpha})`,
        `rgba(255,255,255,${glassStrokeAlpha})`,
      ); // Front Glass
      drawQuad(
        1,
        5,
        6,
        2,
        `rgba(124, 58, 237, ${glassAlpha})`,
        `rgba(0, 229, 255, ${glassStrokeAlpha})`,
      ); // Side Glass

      // Chassis Outer Frame Wireframe
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.8;
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
      edges.forEach(([start, end]) => {
        ctx.beginPath();
        ctx.moveTo(projVerts[start].px, projVerts[start].py);
        ctx.lineTo(projVerts[end].px, projVerts[end].py);
        ctx.stroke();
      });

      // 6. Component Exploded Spec Callout Dots (When in exploded mode)
      if (exp > 0.4) {
        const renderCallout = (
          px: number,
          py: number,
          _compKey: string,
          label: string,
          side: 'left' | 'right',
        ) => {
          ctx.save();
          ctx.fillStyle = rgb.primary;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          // Outer beacon ring
          ctx.strokeStyle = rgb.primary;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, 7 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
          ctx.stroke();

          // Leader line
          const lineEndX = side === 'left' ? px - 35 : px + 35;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(lineEndX, py - 10);
          ctx.lineTo(side === 'left' ? lineEndX - 20 : lineEndX + 20, py - 10);
          ctx.stroke();

          // Label
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = side === 'left' ? 'right' : 'left';
          ctx.fillText(label, side === 'left' ? lineEndX - 24 : lineEndX + 24, py - 7);
          ctx.restore();
        };

        // Render interactive labels for exploded parts
        renderCallout(gpuStart.px + 20, gpuStart.py + 10, 'gpu', 'GPU: RTX 4070 Ti', 'right');
        renderCallout(cpuPump.px, cpuPump.py, 'cooler', '360mm Liquid AIO', 'left');
        renderCallout(psuTL.px + 40, psuTL.py + 15, 'psu', '750W 80+ Gold PSU', 'right');
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
  }, [getRgbColors, rgbMode, zoomLevel, isExplodedMode, externalExplodedProgress]);

  const handleComponentChipClick = (key: string) => {
    const spec = DEFAULT_COMPONENT_SPECS[key];
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
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="truncate max-w-[140px]">{gpuModel}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Exploded View Toggle */}
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

      {/* Exploded Part Quick Select Bar when in Exploded Mode */}
      <AnimatePresence>
        {isExplodedMode && (
          <motion.div
            className="absolute top-12 left-3 right-3 z-15 flex flex-wrap gap-1 pointer-events-auto"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {Object.keys(DEFAULT_COMPONENT_SPECS).map((k) => {
              const item = DEFAULT_COMPONENT_SPECS[k];
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
              <div className="flex flex-col">
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
              <div className="flex flex-col items-end">
                <span className="font-extrabold text-accent text-sm">
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
        <span className="truncate max-w-[200px]">{caseModel}</span>
        <span className="text-[10px] text-accent/80 font-mono">
          {isExplodedMode ? 'Exploded Layering Active' : '360° Drag to Orbit'}
        </span>
      </div>
    </div>
  );
}
