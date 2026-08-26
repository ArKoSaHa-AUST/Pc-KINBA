import React, { useRef, useState } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface Use3DTiltOptions {
  maxTilt?: number; // Maximum rotation in degrees (e.g. 8deg)
  stiffness?: number;
  damping?: number;
  scaleOnHover?: number;
}

export function use3DTilt({
  maxTilt = 8,
  stiffness = 300,
  damping = 25,
  scaleOnHover = 1.01,
}: Use3DTiltOptions = {}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glossPos, setGlossPos] = useState({ x: 50, y: 50 });

  // Normalized mouse coordinates from -0.5 to 0.5
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics with high responsiveness
  const springX = useSpring(mouseX, { stiffness, damping });
  const springY = useSpring(mouseY, { stiffness, damping });

  // RotateX is inversely mapped to cursor Y (-maxTilt to +maxTilt)
  const rotateX = useTransform(springY, [-0.5, 0.5], [maxTilt, -maxTilt]);
  // RotateY is directly mapped to cursor X (-maxTilt to +maxTilt)
  const rotateY = useTransform(springX, [-0.5, 0.5], [-maxTilt, maxTilt]);

  const scale = useSpring(isHovered ? scaleOnHover : 1, { stiffness, damping });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normalizedX = clientX / width - 0.5;
    const normalizedY = clientY / height - 0.5;

    mouseX.set(normalizedX);
    mouseY.set(normalizedY);

    const glossXPercent = (clientX / width) * 100;
    const glossYPercent = (clientY / height) * 100;
    setGlossPos({ x: glossXPercent, y: glossYPercent });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return {
    cardRef,
    isHovered,
    rotateX,
    rotateY,
    scale,
    glossPos,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  };
}
