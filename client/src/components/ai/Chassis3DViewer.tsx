import { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Palette } from 'lucide-react';

export type RGBMode = 'cyberpunk' | 'emerald' | 'ice' | 'rainbow';

interface Chassis3DViewerProps {
  primaryColor?: string;
  rgbMode?: RGBMode;
  gpuModel?: string;
  caseModel?: string;
  className?: string;
}

export default function Chassis3DViewer({
  rgbMode: initialRgbMode = 'cyberpunk',
  gpuModel = 'RTX 4070 Ti Super',
  caseModel = 'Lian Li O11 Dynamic EVO',
  className = '',
}: Chassis3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rgbMode, setRgbMode] = useState<RGBMode>(initialRgbMode);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.35, y: -0.75 });
  const animFrameRef = useRef<number | null>(null);

  const resetView = () => {
    rotationRef.current = { x: 0.35, y: -0.75 };
    setZoomLevel(1);
  };

  const getRgbColors = useCallback((mode: RGBMode, time: number) => {
    switch (mode) {
      case 'cyberpunk':
        return {
          primary: 'rgba(0, 229, 255, 0.9)',
          secondary: 'rgba(124, 58, 237, 0.85)',
          ambient: 'rgba(0, 229, 255, 0.15)',
        };
      case 'emerald':
        return {
          primary: 'rgba(0, 255, 178, 0.9)',
          secondary: 'rgba(16, 185, 129, 0.85)',
          ambient: 'rgba(0, 255, 178, 0.15)',
        };
      case 'ice':
        return {
          primary: 'rgba(224, 242, 254, 0.95)',
          secondary: 'rgba(56, 189, 248, 0.8)',
          ambient: 'rgba(186, 230, 253, 0.15)',
        };
      case 'rainbow': {
        const hue1 = (time * 40) % 360;
        const hue2 = (hue1 + 120) % 360;
        return {
          primary: `hsla(${hue1}, 90%, 60%, 0.9)`,
          secondary: `hsla(${hue2}, 90%, 55%, 0.85)`,
          ambient: `hsla(${hue1}, 80%, 50%, 0.15)`,
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
      const groundP = project(0, 110, 0);
      const groundGlow = ctx.createRadialGradient(
        groundP.px,
        groundP.py,
        10,
        groundP.px,
        groundP.py,
        140 * scale,
      );
      groundGlow.addColorStop(0, rgb.ambient);
      groundGlow.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
      groundGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(groundP.px, groundP.py, 130 * scale, 45 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Chassis 3D Geometry Box Wireframe & Tinted Glass
      const hw = 75; // Half width
      const hh = 100; // Half height
      const hd = 85; // Half depth

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

      // Draw Chassis Back Plate (Motherboard Tray)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;

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
      drawQuad(0, 1, 2, 3, 'rgba(10, 15, 30, 0.9)', 'rgba(255,255,255,0.1)'); // Back
      drawQuad(3, 2, 6, 7, 'rgba(15, 20, 35, 0.95)', 'rgba(255,255,255,0.15)'); // Bottom PSU shroud

      // 3. Motherboard & Components inside
      // Motherboard PCB
      const moboTopLeft = project(-60, -80, -70);
      const moboTopRight = project(50, -80, -70);
      const moboBotRight = project(50, 40, -70);
      const moboBotLeft = project(-60, 40, -70);

      ctx.fillStyle = 'rgba(20, 25, 45, 0.95)';
      ctx.strokeStyle = rgb.secondary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(moboTopLeft.px, moboTopLeft.py);
      ctx.lineTo(moboTopRight.px, moboTopRight.py);
      ctx.lineTo(moboBotRight.px, moboBotRight.py);
      ctx.lineTo(moboBotLeft.px, moboBotLeft.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // RAM Sticks (2x RGB sticks)
      for (let r = 0; r < 2; r++) {
        const rx = 15 + r * 10;
        const ramTop = project(rx, -65, -60);
        const ramBot = project(rx, -20, -60);
        ctx.strokeStyle = rgb.primary;
        ctx.lineWidth = 3 * ramTop.scale;
        ctx.beginPath();
        ctx.moveTo(ramTop.px, ramTop.py);
        ctx.lineTo(ramBot.px, ramBot.py);
        ctx.stroke();
      }

      // CPU AIO Water Cooler Pump Head (Glowing circular RGB)
      const cpuPump = project(-15, -40, -60);
      const pumpRad = 16 * cpuPump.scale;
      const pumpGlow = ctx.createRadialGradient(
        cpuPump.px,
        cpuPump.py,
        2,
        cpuPump.px,
        cpuPump.py,
        pumpRad * 1.5,
      );
      pumpGlow.addColorStop(0, rgb.primary);
      pumpGlow.addColorStop(0.5, rgb.secondary);
      pumpGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = pumpGlow;
      ctx.beginPath();
      ctx.arc(cpuPump.px, cpuPump.py, pumpRad * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // GPU (Horizontal beefy card)
      const gpuStart = project(-55, 0, -30);
      const gpuEnd = project(45, 0, -30);
      const gpuBotStart = project(-55, 25, -30);
      const gpuBotEnd = project(45, 25, -30);

      ctx.fillStyle = 'rgba(30, 35, 55, 0.95)';
      ctx.strokeStyle = rgb.primary;
      ctx.lineWidth = 1.5;
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
      ctx.lineWidth = 2 * gpuStart.scale;
      ctx.beginPath();
      ctx.moveTo(gpuStart.px, gpuStart.py + 4);
      ctx.lineTo(gpuEnd.px, gpuEnd.py + 4);
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

      // 5. Front/Side Tempered Glass Panel Overlay
      drawQuad(4, 5, 6, 7, 'rgba(0, 229, 255, 0.04)', 'rgba(255,255,255,0.25)'); // Front Glass
      drawQuad(1, 5, 6, 2, 'rgba(124, 58, 237, 0.04)', 'rgba(0, 229, 255, 0.3)'); // Side Glass

      // Chassis Outer Frame Bevels
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
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
  }, [getRgbColors, rgbMode, zoomLevel]);

  return (
    <div
      className={`relative w-full h-[320px] bg-bg-secondary/60 rounded-2xl overflow-hidden border border-glass-border flex flex-col ${className}`}
    >
      {/* HUD Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 glass px-2.5 py-1 rounded-full text-[11px] font-semibold text-text-secondary pointer-events-auto border border-glass-border">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="truncate max-w-[140px]">{gpuModel}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* RGB Profile Switcher */}
          <button
            type="button"
            className="p-1.5 rounded-lg glass text-text-muted hover:text-text-primary hover:border-accent transition-all"
            onClick={() => {
              const modes: RGBMode[] = ['cyberpunk', 'emerald', 'ice', 'rainbow'];
              const nextIdx = (modes.indexOf(rgbMode) + 1) % modes.length;
              setRgbMode(modes[nextIdx]);
            }}
            title={`RGB Mode: ${rgbMode}`}
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

      {/* Case Details Footer Bar */}
      <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-text-muted pointer-events-none">
        <span className="truncate max-w-[200px]">{caseModel}</span>
        <span className="text-[10px] text-accent/80 font-mono">360° Drag to Orbit</span>
      </div>
    </div>
  );
}
