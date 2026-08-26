import { motion } from 'framer-motion';
import { Expand, Shrink } from 'lucide-react';
import { useRef, useState } from 'react';
import './AssemblyViewport3D.css';
import { formatTaka } from './buildConfig';
import { COMPONENT_CATEGORIES, type ComponentCategory } from './builderCatalog';
import { getBuildChecks, getCompatibilityScore, type BuildSelection } from './compatibility';

interface AssemblyViewport3DProps {
  build: BuildSelection;
  onOpenCategory: (category: ComponentCategory) => void;
}

interface PartLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  ex: number;
  ey: number;
  ez: number;
}

// Scene is a 500×500 plane; z = height above the board, e* = exploded-view offsets
const PART_LAYOUT: Record<ComponentCategory, PartLayout> = {
  case: { x: 4, y: 4, w: 492, h: 492, z: 0, ex: 0, ey: 0, ez: 150 },
  motherboard: { x: 90, y: 55, w: 320, h: 320, z: 12, ex: 0, ey: 0, ez: 0 },
  cpu: { x: 205, y: 130, w: 90, h: 90, z: 34, ex: -20, ey: -60, ez: 80 },
  cooling: { x: 195, y: 120, w: 110, h: 110, z: 62, ex: 30, ey: -80, ez: 150 },
  ram: { x: 330, y: 105, w: 44, h: 170, z: 30, ex: 90, ey: -30, ez: 60 },
  gpu: { x: 115, y: 255, w: 270, h: 92, z: 44, ex: -60, ey: 80, ez: 90 },
  storage: { x: 35, y: 130, w: 60, h: 110, z: 22, ex: -90, ey: 0, ez: 40 },
  psu: { x: 175, y: 395, w: 150, h: 85, z: 26, ex: 0, ey: 110, ez: 50 },
};

const sceneVariants = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const partVariants = {
  hidden: { opacity: 0, scale: 0.5, y: -120 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function AssemblyViewport3D({ build, onOpenCategory }: AssemblyViewport3DProps) {
  const [exploded, setExploded] = useState(false);
  const [rotation, setRotation] = useState({ x: 58, z: -40 });
  const [hovered, setHovered] = useState<ComponentCategory | null>(null);
  const dragRef = useRef<{ px: number; py: number; moved: boolean } | null>(null);

  const score = getCompatibilityScore(getBuildChecks(build));
  const hoveredMeta = hovered ? COMPONENT_CATEGORIES.find((c) => c.id === hovered) : null;
  const hoveredProduct = hovered ? build[hovered] : null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { px: e.clientX, py: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.px;
    const dy = e.clientY - drag.py;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    drag.px = e.clientX;
    drag.py = e.clientY;
    setRotation((r) => ({
      x: Math.min(80, Math.max(15, r.x - dy * 0.4)),
      z: r.z + dx * 0.4,
    }));
  };

  const handlePointerUp = () => {
    // keep `moved` until the click event fires, then release
    setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  const handlePartClick = (category: ComponentCategory) => {
    if (dragRef.current?.moved) return;
    onOpenCategory(category);
  };

  return (
    <div className="assembly-viewport">
      <div className="assembly-hud assembly-hud-score">
        Compatibility{' '}
        <strong className={score >= 80 ? 'is-good' : score >= 50 ? 'is-warn' : 'is-bad'}>
          {score}%
        </strong>
      </div>

      <button
        type="button"
        className="button-secondary assembly-explode-toggle"
        onClick={() => setExploded((v) => !v)}
      >
        {exploded ? <Shrink size={16} /> : <Expand size={16} />}
        {exploded ? 'Assemble' : 'Explode'}
      </button>

      <div
        className="assembly-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <motion.div
          className="assembly-scene"
          style={
            {
              transform: `rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg)`,
              '--explode': exploded ? 1 : 0,
            } as React.CSSProperties
          }
          variants={sceneVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {COMPONENT_CATEGORIES.map((meta) => {
            const layout = PART_LAYOUT[meta.id];
            const product = build[meta.id];
            return (
              <div
                key={meta.id}
                className={`assembly-part assembly-part-${meta.id}${product ? ' is-filled' : ' is-empty'}`}
                style={{
                  left: layout.x,
                  top: layout.y,
                  width: layout.w,
                  height: layout.h,
                  transform: `translate3d(calc(var(--explode) * ${layout.ex}px), calc(var(--explode) * ${layout.ey}px), calc(${layout.z}px + var(--explode) * ${layout.ez}px))`,
                }}
              >
                <motion.button
                  type="button"
                  className="assembly-part-body"
                  variants={partVariants}
                  onClick={() => handlePartClick(meta.id)}
                  onMouseEnter={() => setHovered(meta.id)}
                  onMouseLeave={() => setHovered(null)}
                  aria-label={product ? `${meta.label}: ${product.name}` : `Select ${meta.label}`}
                >
                  <span className="assembly-part-label">{meta.label}</span>
                </motion.button>
              </div>
            );
          })}
        </motion.div>
      </div>

      <div className="assembly-hud assembly-hud-info" aria-live="polite">
        {hoveredMeta ? (
          hoveredProduct ? (
            <>
              <strong>{hoveredProduct.name}</strong>
              <span>{formatTaka(hoveredProduct.price)}</span>
            </>
          ) : (
            <>
              <strong>{hoveredMeta.label}</strong>
              <span>Empty slot — click to select</span>
            </>
          )
        ) : (
          <span className="assembly-hud-hint">Drag to orbit · click a part to configure</span>
        )}
      </div>
    </div>
  );
}
