import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Cpu, Zap, ShieldCheck, Sparkles, Fan, Activity } from 'lucide-react';

interface Kinba3DPCRigAssemblyProps {
  currentStep: 1 | 2 | 3;
  purpose?: string;
}

/**
 * Interactive 3D Canvas / Spatial PC Rig Assembly showcase.
 * Components assemble dynamically based on wizard step completion.
 * Features exploded 3D component view on scroll down.
 */
export function Kinba3DPCRigAssembly({
  currentStep,
  purpose = 'gaming',
}: Kinba3DPCRigAssemblyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExploded, setIsExploded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle scroll trigger for exploded view
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setIsExploded(true);
      } else {
        setIsExploded(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Parallax tilt effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Color theme mapping based on user's rig purpose selection
  const accentGradient =
    purpose === 'ai'
      ? 'from-purple to-accent'
      : purpose === 'creation'
        ? 'from-green to-accent'
        : purpose === 'workstation'
          ? 'from-accent to-purple'
          : 'from-accent via-purple to-green';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[520px] flex items-center justify-center overflow-hidden rounded-[32px] p-6"
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic Ambient Mesh Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary/80 via-bg-primary/90 to-bg-secondary/80 backdrop-blur-xl border border-glass-border rounded-[32px]" />

      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-purple/15 blur-3xl" />

      {/* Main Interactive 3D Assembly Stage */}
      <motion.div
        animate={{
          rotateX: mousePos.y * -14,
          rotateY: mousePos.x * 16,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="relative z-10 w-full max-w-[440px] h-[480px] flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Layer 0: PC Case Frame Chassis */}
        <motion.div
          animate={{
            translateZ: isExploded ? -60 : 0,
            scale: currentStep >= 1 ? 1 : 0.9,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 rounded-[28px] border-2 border-accent/40 bg-glass/60 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col justify-between p-6 overflow-hidden"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Top Chassis RGB Fan Bar */}
          <div className="flex justify-between items-center pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-text-muted">
                KINBA-SPEC-X // CHASSIS
              </span>
            </div>
            <div className="flex gap-2">
              <Fan
                className={`w-4 h-4 text-accent ${currentStep >= 3 ? 'animate-spin' : ''}`}
                style={{ animationDuration: '3s' }}
              />
              <Fan
                className={`w-4 h-4 text-purple ${currentStep >= 3 ? 'animate-spin' : ''}`}
                style={{ animationDuration: '2s' }}
              />
            </div>
          </div>

          {/* Bottom PSU & Cable Management Bay */}
          <div className="pt-3 border-t border-border flex justify-between items-center text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-green" /> 1200W Titanium Power
            </span>
            <span className="font-mono text-accent">STEP {currentStep} / 3</span>
          </div>
        </motion.div>

        {/* Layer 1: Motherboard & CPU Socket (Base Hardware Layer) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: currentStep >= 1 ? 1 : 0.25,
            scale: currentStep >= 1 ? 1 : 0.85,
            translateZ: isExploded ? -20 : 0,
            translateY: isExploded ? -40 : 0,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute w-[88%] h-[74%] rounded-2xl bg-bg-surface/90 border border-purple/40 p-4 shadow-xl flex flex-col justify-between"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Top Motherboard Bar */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-accent/20 to-purple/20 text-accent">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-text-primary">Z790 Kinba Pro</h5>
                <span className="text-[10px] text-text-muted">Socket LGA1700</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green/20 text-green border border-green/30">
              {currentStep >= 1 ? '✓ MOUNTED' : 'PENDING'}
            </span>
          </div>

          {/* RAM DIMM Slots */}
          <div className="grid grid-cols-4 gap-1.5 my-1.5 px-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-12 rounded-md border transition-all duration-500 ${
                  currentStep >= 1
                    ? 'bg-gradient-to-b from-accent/30 to-purple/40 border-accent/50 shadow-[0_0_8px_rgba(0,229,255,0.25)]'
                    : 'bg-border/30 border-border'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between items-center text-[10px] text-text-muted px-1">
            <span>PCIe 5.0 x16 Ready</span>
            <span className="font-mono text-purple">DDR5 7200MHz</span>
          </div>
        </motion.div>

        {/* Layer 2: AIO Liquid Cooler (Positioned above CPU Socket) */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{
            opacity: currentStep >= 2 ? 1 : 0.15,
            scale: currentStep >= 2 ? 1 : 0.85,
            translateZ: isExploded ? 80 : 30,
            translateY: isExploded ? -110 : -85,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute w-[74%] h-[30%] rounded-2xl bg-glass border border-accent/60 backdrop-blur-md p-3 shadow-2xl flex flex-col justify-between"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-accent animate-pulse" /> AIO Liquid 360mm
            </span>
            <span className="text-[10px] font-mono text-accent">28°C</span>
          </div>

          {/* Animated Coolant Flow Line */}
          <div className="w-full h-2 rounded-full bg-border overflow-hidden relative">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className={`h-full w-1/2 bg-gradient-to-r ${accentGradient}`}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-text-muted">
            <span>Flow: 120 L/h</span>
            <span className="text-green font-bold">
              {currentStep >= 2 ? 'COOLANT ACTIVE' : 'LOCKED'}
            </span>
          </div>
        </motion.div>

        {/* Layer 3: Dual RTX GPUs (Positioned at PCIe Slot Area) */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{
            opacity: currentStep >= 3 ? 1 : 0.15,
            scale: currentStep >= 3 ? 1 : 0.85,
            translateZ: isExploded ? 140 : 50,
            translateY: isExploded ? 95 : 75,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute w-[92%] h-[30%] rounded-2xl bg-gradient-to-r from-bg-secondary via-bg-surface to-bg-secondary border-2 border-purple/60 p-3 shadow-2xl flex items-center justify-between"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple to-accent flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.4)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-text-primary">RTX 4090 OC 24GB</h5>
              <span className="text-[10px] text-text-muted">PCIe 5.0 Speed</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full border border-accent/40 flex items-center justify-center">
              <Fan
                className={`w-3.5 h-3.5 text-accent ${currentStep >= 3 ? 'animate-spin' : ''}`}
                style={{ animationDuration: '1s' }}
              />
            </div>
            <div className="w-7 h-7 rounded-full border border-purple/40 flex items-center justify-center">
              <Fan
                className={`w-3.5 h-3.5 text-purple ${currentStep >= 3 ? 'animate-spin' : ''}`}
                style={{ animationDuration: '1.2s' }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating Callout Badges in Exploded Scroll Mode */}
      {isExploded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-6 right-6 z-20 flex justify-between gap-2"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glass border border-accent/40 text-accent text-[11px] font-medium shadow-lg">
            <Zap className="w-3.5 h-3.5" /> Free GPU Overclocking
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glass border border-green/40 text-green text-[11px] font-medium shadow-lg">
            <ShieldCheck className="w-3.5 h-3.5" /> 3-Yr Kinba Care
          </div>
        </motion.div>
      )}

      {/* Step Progress Indicator Bar */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-glass border border-border text-xs font-medium text-text-muted">
        <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
        <span>
          RIG STATUS:{' '}
          {currentStep === 1 ? 'CHASSIS' : currentStep === 2 ? 'COOLING' : 'READY TO LAUNCH'}
        </span>
      </div>
    </div>
  );
}
