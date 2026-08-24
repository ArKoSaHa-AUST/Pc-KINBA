import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { Cpu, ShieldCheck, Zap, Fan, Lock, Sparkles, Key } from 'lucide-react';

interface Kinba3DQuantumCoreProps {
  activeFocusField: 'email' | 'password' | null;
  loading?: boolean;
}

export function Kinba3DQuantumCore({ activeFocusField, loading }: Kinba3DQuantumCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  // Determine dynamic aura color scheme based on field focus
  const isEmail = activeFocusField === 'email';
  const isPassword = activeFocusField === 'password';

  const auraGradient = isPassword
    ? 'from-purple/40 via-purple/20 to-transparent'
    : isEmail
      ? 'from-accent/40 via-accent/20 to-transparent'
      : loading
        ? 'from-green/40 via-accent/30 to-purple/40'
        : 'from-accent/25 via-purple/20 to-transparent';

  const coreBorder = isPassword
    ? 'border-purple/70 shadow-[0_0_40px_rgba(124,58,237,0.4)]'
    : isEmail
      ? 'border-accent/70 shadow-[0_0_40px_rgba(0,229,255,0.4)]'
      : loading
        ? 'border-green/70 shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-pulse'
        : 'border-accent/30 shadow-[0_0_25px_rgba(0,229,255,0.2)]';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[540px] flex items-center justify-center overflow-hidden rounded-[32px] p-6"
      style={{ perspective: '1200px' }}
    >
      {/* Background Glow Field */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${auraGradient} transition-all duration-700 blur-3xl`}
      />

      {/* Main 3D Stage Container */}
      <motion.div
        animate={{
          rotateX: mousePos.y * -15,
          rotateY: mousePos.x * 15,
        }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        className="relative z-10 w-full max-w-[460px] h-[480px] flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Outer Kinetic Shield Rings */}
        <motion.div
          animate={{
            rotate: isEmail ? 360 : isPassword ? -360 : 180,
            scale: isPassword ? 1.08 : 1,
          }}
          transition={{
            rotate: {
              repeat: Infinity,
              duration: isEmail ? 8 : isPassword ? 12 : 20,
              ease: 'linear',
            },
            scale: { duration: 0.4 },
          }}
          className={`absolute w-[360px] h-[360px] rounded-full border-2 border-dashed ${
            isPassword ? 'border-purple/50' : isEmail ? 'border-accent/60' : 'border-accent/20'
          } transition-colors duration-500`}
          style={{ transformStyle: 'preserve-3d', transform: 'translateZ(-20px)' }}
        />

        {/* Central Holographic Quantum Core */}
        <motion.div
          animate={{
            translateZ: isPassword ? 40 : isEmail ? 30 : 0,
            scale: loading ? 1.05 : 1,
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`relative w-[300px] h-[300px] rounded-[36px] bg-bg-surface/85 backdrop-blur-2xl border-2 ${coreBorder} p-6 flex flex-col justify-between transition-all duration-500 overflow-hidden`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Core Header Status Bar */}
          <div className="flex justify-between items-center pb-3 border-b border-border/80">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isPassword ? 'bg-purple' : isEmail ? 'bg-accent' : 'bg-green'
                } animate-ping`}
              />
              <span className="text-[11px] font-mono font-bold tracking-widest text-text-muted">
                KINBA-CORE // {isPassword ? 'SHIELD_LOCK' : isEmail ? 'CYAN_SYNC' : 'READY'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Fan
                className={`w-4 h-4 ${isPassword ? 'text-purple' : 'text-accent'} animate-spin`}
                style={{ animationDuration: isEmail ? '1s' : '3s' }}
              />
            </div>
          </div>

          {/* Core Center Quantum CPU Node */}
          <div className="flex flex-col items-center justify-center my-auto relative">
            <motion.div
              animate={{
                scale: loading ? [1, 1.15, 1] : [1, 1.05, 1],
              }}
              transition={{ repeat: Infinity, duration: loading ? 1 : 2.5 }}
              className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${
                isPassword
                  ? 'from-purple to-indigo-700 shadow-[0_0_30px_rgba(124,58,237,0.5)]'
                  : isEmail
                    ? 'from-accent to-purple shadow-[0_0_30px_rgba(0,229,255,0.5)]'
                    : 'from-accent/80 to-purple/80'
              } flex items-center justify-center text-white relative`}
            >
              {isPassword ? (
                <Lock className="w-10 h-10 animate-bounce" />
              ) : isEmail ? (
                <Sparkles className="w-10 h-10 animate-pulse" />
              ) : (
                <Cpu className="w-10 h-10" />
              )}
            </motion.div>

            <span className="mt-3 text-xs font-mono font-semibold text-text-primary">
              QUANTUM-PC-PROCESSOR
            </span>
            <span className="text-[10px] text-text-muted">
              {isEmail
                ? '⚡ 100 Gbps Authentication Pipe'
                : isPassword
                  ? '🛡️ 256-Bit Hardware Encryption'
                  : '🟢 Session Standby'}
            </span>
          </div>

          {/* Core Footer Hardware Telemetry */}
          <div className="pt-3 border-t border-border/80 flex justify-between items-center text-[11px]">
            <span className="flex items-center gap-1 text-text-muted">
              <Zap className="w-3.5 h-3.5 text-accent" /> AI Rig Sync
            </span>
            <span className="font-mono font-bold text-accent">
              {loading ? 'AUTHENTICATING...' : 'STATUS: OPTIMAL'}
            </span>
          </div>
        </motion.div>

        {/* Floating Holographic Callout Badges */}
        <motion.div
          animate={{ translateZ: 50, y: isEmail ? -5 : 0 }}
          className="absolute -top-4 -left-6 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-glass/90 border border-accent/40 text-accent text-xs font-medium shadow-lg backdrop-blur-md"
        >
          <ShieldCheck className="w-4 h-4" /> Encrypted Auth
        </motion.div>

        <motion.div
          animate={{ translateZ: 60, y: isPassword ? 5 : 0 }}
          className="absolute top-1/2 -right-10 -translate-y-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-glass/90 border border-purple/40 text-purple text-xs font-medium shadow-lg backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4" /> AI Specs Match
        </motion.div>

        <motion.div
          animate={{ translateZ: 55 }}
          className="absolute -bottom-4 left-6 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-glass/90 border border-green/40 text-green text-xs font-medium shadow-lg backdrop-blur-md"
        >
          <Key className="w-4 h-4" /> Passkey Ready
        </motion.div>
      </motion.div>

      {/* Top Banner Tag */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-glass border border-border text-xs font-medium text-text-muted">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span>KINBA SPATIAL GATEWAY</span>
      </div>
    </div>
  );
}
