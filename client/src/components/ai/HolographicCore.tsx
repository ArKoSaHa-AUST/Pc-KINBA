import { useEffect, useRef, useCallback } from 'react';

interface HolographicCoreProps {
  isVoiceActive?: boolean;
  intensity?: number;
  scaleProgress?: number;
  className?: string;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  color: string;
  speed: number;
  angle: number;
  orbitRadius: number;
  elevation: number;
}

export default function HolographicCore({
  isVoiceActive = false,
  intensity = 1.0,
  scaleProgress = 1.0,
  className = '',
}: HolographicCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioLevelRef = useRef<number>(0);

  // Initialize 3D particles and rings
  const particlesRef = useRef<Particle3D[]>([]);

  const initParticles = useCallback(() => {
    const count = 120;
    const particles: Particle3D[] = [];
    const colors = [
      'rgba(0, 229, 255, ',
      'rgba(124, 58, 237, ',
      'rgba(0, 255, 178, ',
      'rgba(168, 85, 247, ',
    ];

    for (let i = 0; i < count; i++) {
      const orbitRadius = 60 + Math.random() * 140;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI * 0.8;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particles.push({
        x: Math.cos(angle) * Math.cos(elevation) * orbitRadius,
        y: Math.sin(elevation) * orbitRadius,
        z: Math.sin(angle) * Math.cos(elevation) * orbitRadius,
        baseRadius: 1.5 + Math.random() * 2.5,
        color,
        speed: (0.005 + Math.random() * 0.01) * (Math.random() > 0.5 ? 1 : -1),
        angle,
        orbitRadius,
        elevation,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Web Audio API Listener Setup
  useEffect(() => {
    if (!isVoiceActive) {
      // Clean up microphone stream if deactivated
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      audioSourceRef.current = null;
      audioLevelRef.current = 0;
      return;
    }

    let isMounted = true;

    async function setupAudio() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        audioSourceRef.current = source;
        source.connect(analyser);
      } catch {
        // Fallback to simulated audio reactive pulse
        audioLevelRef.current = 0;
      }
    }

    setupAudio();

    return () => {
      isMounted = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isVoiceActive]);

  useEffect(() => {
    initParticles();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || 500;
      height = rect.height || 500;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - rect.width / 2;
      const clientY = e.clientY - rect.top - rect.height / 2;
      mouseRef.current.targetX = (clientX / (rect.width / 2)) * 0.4;
      mouseRef.current.targetY = (clientY / (rect.height / 2)) * 0.4;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const rotationX = 0.2;
    let rotationY = 0;
    let time = 0;
    const dataArray = new Uint8Array(32);

    const render = () => {
      time += 0.02;

      // Real-time audio analyzer extraction
      let liveVolume = 0;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        liveVolume = sum / dataArray.length / 255; // 0 to 1
      }

      // Smooth audio volume interpolation with fallback simulation
      const targetAudio = isVoiceActive
        ? analyserRef.current
          ? liveVolume * 1.5
          : 0.3 + Math.sin(time * 6) * 0.2
        : 0;
      audioLevelRef.current += (targetAudio - audioLevelRef.current) * 0.15;

      // Mouse easing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const currentRotX = rotationX + mouseRef.current.y;
      const currentRotY = rotationY + mouseRef.current.x;

      rotationY += 0.008 + audioLevelRef.current * 0.02;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 400;

      // Dynamic voice pulse factor combining audio reactivity & base pulse
      const audioPulse = 1.0 + audioLevelRef.current * 0.6 * intensity;
      const baseScale = scaleProgress * audioPulse;

      // 1. Draw central glowing core with dynamic audio-reactive aura
      const coreRadius = (80 + audioLevelRef.current * 40) * baseScale;
      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10 * baseScale,
        centerX,
        centerY,
        coreRadius,
      );

      const cyanOpacity = 0.75 + audioLevelRef.current * 0.25;
      const purpleOpacity = 0.45 + audioLevelRef.current * 0.35;

      coreGradient.addColorStop(0, `rgba(0, 229, 255, ${cyanOpacity})`);
      coreGradient.addColorStop(0.35, `rgba(124, 58, 237, ${purpleOpacity})`);
      coreGradient.addColorStop(0.7, 'rgba(0, 229, 255, 0.15)');
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw 3D Orbital Rings with audio deformation
      const drawRing = (
        radius: number,
        tiltX: number,
        tiltY: number,
        tiltZ: number,
        color: string,
        lineDash: number[] = [],
        waveFreq = 0,
      ) => {
        ctx.save();
        ctx.setLineDash(lineDash);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 + audioLevelRef.current * 1.5;
        ctx.beginPath();

        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          // Local ring coords with waveform modulation
          const waveDeform =
            waveFreq > 0 ? Math.sin(theta * waveFreq + time * 5) * audioLevelRef.current * 18 : 0;
          const currentR = (radius + waveDeform) * baseScale;

          const x = Math.cos(theta) * currentR;
          const y = Math.sin(theta) * currentR;
          const z = 0;

          // Apply ring tilt
          const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
          const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
          const x2 = x * Math.cos(tiltY) + z1 * Math.sin(tiltY);
          const z2 = -x * Math.sin(tiltY) + z1 * Math.cos(tiltY);
          const x3 = x2 * Math.cos(tiltZ) - y1 * Math.sin(tiltZ);
          const y3 = x2 * Math.sin(tiltZ) + y1 * Math.cos(tiltZ);

          // Apply global rotation
          const yRot = y3 * Math.cos(currentRotX) - z2 * Math.sin(currentRotX);
          const zRot = y3 * Math.sin(currentRotX) + z2 * Math.cos(currentRotX);
          const xRot = x3 * Math.cos(currentRotY) + zRot * Math.sin(currentRotY);
          const zFinal = -x3 * Math.sin(currentRotY) + zRot * Math.cos(currentRotY);

          const scale = fov / (fov + zFinal);
          const projX = centerX + xRot * scale;
          const projY = centerY + yRot * scale;

          if (i === 0) {
            ctx.moveTo(projX, projY);
          } else {
            ctx.lineTo(projX, projY);
          }
        }
        ctx.stroke();
        ctx.restore();
      };

      // Draw primary, secondary, and tertiary neon rings
      drawRing(110, 0.6 + time * 0.2, 0.4, 0.2, 'rgba(0, 229, 255, 0.7)', [8, 6], 8);
      drawRing(140, -0.5, 0.8 + time * 0.15, -0.3, 'rgba(124, 58, 237, 0.65)', [12, 8], 6);
      drawRing(170, 0.9, -0.4, 0.7 + time * 0.1, 'rgba(0, 255, 178, 0.5)', [4, 10], 12);

      // 3. Update & render 3D Particles
      const particles = particlesRef.current;
      const projectedList: {
        projX: number;
        projY: number;
        projR: number;
        alpha: number;
        color: string;
        zFinal: number;
      }[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed * (1 + audioLevelRef.current * 3);

        // Current 3D position
        const currentRadius = p.orbitRadius * baseScale;
        const rawX = Math.cos(p.angle) * Math.cos(p.elevation) * currentRadius;
        const rawY = Math.sin(p.elevation) * currentRadius;
        const rawZ = Math.sin(p.angle) * Math.cos(p.elevation) * currentRadius;

        // Rotate in 3D
        const yRot = rawY * Math.cos(currentRotX) - rawZ * Math.sin(currentRotX);
        const zRot = rawY * Math.sin(currentRotX) + rawZ * Math.cos(currentRotX);
        const xRot = rawX * Math.cos(currentRotY) + zRot * Math.sin(currentRotY);
        const zFinal = -rawX * Math.sin(currentRotY) + zRot * Math.cos(currentRotY);

        const scale = fov / (fov + zFinal);
        const projX = centerX + xRot * scale;
        const projY = centerY + yRot * scale;
        const projR = Math.max(0.5, p.baseRadius * scale * (1 + audioLevelRef.current * 0.8));
        const alpha = Math.max(0.1, Math.min(1, (zFinal + 200) / 400));

        projectedList.push({
          projX,
          projY,
          projR,
          alpha,
          color: p.color,
          zFinal,
        });
      }

      // Sort by depth (back to front)
      projectedList.sort((a, b) => a.zFinal - b.zFinal);

      // Draw particle connections
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projectedList.length; i++) {
        for (let j = i + 1; j < projectedList.length; j++) {
          const p1 = projectedList[i];
          const p2 = projectedList[j];
          const dx = p1.projX - p2.projX;
          const dy = p1.projY - p2.projY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 45 + audioLevelRef.current * 25;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.3 * p1.alpha;
            ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.projX, p1.projY);
            ctx.lineTo(p2.projX, p2.projY);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < projectedList.length; i++) {
        const p = projectedList[i];
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, p.projR, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initParticles, isVoiceActive, intensity, scaleProgress]);

  return (
    <div className={`relative w-full h-[520px] flex items-center justify-center ${className}`}>
      {/* Background ambient glow blur */}
      <div className="absolute w-[360px] h-[360px] rounded-full bg-gradient-to-tr from-accent/25 via-purple/20 to-transparent blur-[100px] pointer-events-none -z-10 animate-pulse-glow" />
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        style={{ touchAction: 'none' }}
        aria-label="3D Holographic AI Neural Core"
      />
    </div>
  );
}
