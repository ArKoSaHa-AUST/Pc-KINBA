import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { ReactNode } from 'react';

interface Interactive3DCardProps {
  children: ReactNode;
  className?: string;
  isShaking?: boolean;
}

export function Interactive3DCard({
  children,
  className = '',
  isShaking = false,
}: Interactive3DCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['12deg', '-12deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-12deg', '12deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={
        isShaking
          ? {
              x: [0, -12, 12, -12, 12, -6, 6, 0],
              rotateZ: [0, -1, 1, -1, 1, 0],
            }
          : { x: 0, rotateZ: 0 }
      }
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`glass relative z-20 w-full max-w-[460px] p-6 sm:p-8 lg:p-10 rounded-[28px] border border-glass-border shadow-[0_20px_60px_rgba(0,0,0,0.4)] ${className}`}
    >
      <div style={{ transform: 'translateZ(30px)' }}>{children}</div>
    </motion.div>
  );
}
