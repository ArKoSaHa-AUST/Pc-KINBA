import { motion } from 'framer-motion';
import { Expand, Shrink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

// Leader pins lean outward (azimuth in board plane) so labels fan apart instead of stacking
const PIN_LEAN = 58; // deg from board plane; smaller = more diagonal
const PIN_CONFIG: Record<ComponentCategory, { az: number; len: number } | null> = {
  case: null,
  motherboard: { az: -45, len: 85 },
  cpu: { az: -135, len: 160 },
  cooling: { az: 135, len: 120 },
  ram: { az: -90, len: 110 },
  gpu: { az: 45, len: 95 },
  storage: { az: 90, len: 95 },
  psu: { az: 0, len: 85 },
};

const rad = (deg: number) => (deg * Math.PI) / 180;

// Pre-computed label anchor (top of each diagonal pin) relative to the part center
const PIN_ANCHORS = Object.fromEntries(
  Object.entries(PIN_CONFIG).map(([id, pin]) => {
    if (!pin) return [id, null];
    const horizontal = Math.cos(rad(PIN_LEAN)) * pin.len;
    return [
      id,
      {
        dx: -Math.sin(rad(pin.az)) * horizontal,
        dy: Math.cos(rad(pin.az)) * horizontal,
        dz: Math.sin(rad(PIN_LEAN)) * pin.len,
      },
    ];
  }),
) as Record<ComponentCategory, { dx: number; dy: number; dz: number } | null>;

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

/** Hardware-styled face rendered inside a filled slot. */
function PartVisual({ category }: { category: ComponentCategory }) {
  switch (category) {
    case 'motherboard':
      return (
        <span className="part-visual visual-mobo">
          <i className="mobo-socket" />
          <i className="mobo-slots" />
          <i className="mobo-chipset" />
        </span>
      );
    case 'cpu':
      return (
        <span className="part-visual visual-cpu">
          <i className="cpu-ihs" />
        </span>
      );
    case 'cooling':
      return (
        <span className="part-visual visual-cooler">
          <i className="fan-blades" />
          <i className="fan-hub" />
        </span>
      );
    case 'ram':
      return (
        <span className="part-visual visual-ram">
          <i className="ram-stick" />
          <i className="ram-stick" />
        </span>
      );
    case 'gpu':
      return (
        <span className="part-visual visual-gpu">
          <i className="gpu-fan">
            <i className="fan-blades" />
            <i className="fan-hub" />
          </i>
          <i className="gpu-fan">
            <i className="fan-blades" />
            <i className="fan-hub" />
          </i>
          <i className="gpu-led" />
          <i className="gpu-fingers" />
        </span>
      );
    case 'storage':
      return (
        <span className="part-visual visual-storage">
          <i className="storage-chip" />
          <i className="storage-pins" />
        </span>
      );
    case 'psu':
      return (
        <span className="part-visual visual-psu">
          <i className="psu-fan">
            <i className="fan-blades" />
            <i className="fan-hub" />
          </i>
          <i className="psu-sticker" />
        </span>
      );
    default:
      return null;
  }
}

export default function AssemblyViewport3D({ build, onOpenCategory }: AssemblyViewport3DProps) {
  const [exploded, setExploded] = useState(false);
  const [hovered, setHovered] = useState<ComponentCategory | null>(null);
  const dragRef = useRef<{ px: number; py: number; moved: boolean } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef({ x: 58, z: -40 });
  const lastInteractionRef = useRef(0);

  // Orbit + slow idle auto-rotation, applied straight to the DOM (no re-renders)
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId: number;
    const tick = () => {
      if (!reduceMotion && !dragRef.current && Date.now() - lastInteractionRef.current > 2500) {
        rotationRef.current.z += 0.05;
      }
      const scene = sceneRef.current;
      if (scene) {
        const { x, z } = rotationRef.current;
        scene.style.transform = `rotateX(${x}deg) rotateZ(${z}deg)`;
        // Billboard the pin labels so they always face the camera
        scene.querySelectorAll<HTMLElement>('.part-pin-label').forEach((el) => {
          el.style.transform = `translate(-50%, -100%) translateZ(${el.dataset.z}px) rotateZ(${-z}deg) rotateX(${-x}deg)`;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

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
    rotationRef.current = {
      x: Math.min(80, Math.max(15, rotationRef.current.x - dy * 0.4)),
      z: rotationRef.current.z + dx * 0.4,
    };
    lastInteractionRef.current = Date.now();
  };

  const handlePointerUp = () => {
    lastInteractionRef.current = Date.now();
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
        <div
          ref={sceneRef}
          className={`assembly-scene${exploded ? ' is-exploded' : ''}`}
          style={{ '--explode': exploded ? 1 : 0 } as React.CSSProperties}
        >
          <motion.div
            className="assembly-scene-inner"
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
                  <motion.div className="assembly-part-entry" variants={partVariants}>
                    <button
                      type="button"
                      className="assembly-part-body"
                      onClick={() => handlePartClick(meta.id)}
                      onMouseEnter={() => setHovered(meta.id)}
                      onMouseLeave={() => setHovered(null)}
                      aria-label={
                        product ? `${meta.label}: ${product.name}` : `Select ${meta.label}`
                      }
                    >
                      {product && <PartVisual category={meta.id} />}
                      <span className="assembly-part-label">{meta.label}</span>
                    </button>
                    {product && PIN_CONFIG[meta.id] && PIN_ANCHORS[meta.id] && (
                      <>
                        <i
                          className="part-pin-line"
                          style={{
                            height: PIN_CONFIG[meta.id]!.len,
                            transform: `rotateZ(${PIN_CONFIG[meta.id]!.az}deg) rotateX(${PIN_LEAN}deg)`,
                          }}
                          aria-hidden="true"
                        />
                        <span
                          className="part-pin-label"
                          style={{
                            left: `calc(50% + ${Math.round(PIN_ANCHORS[meta.id]!.dx)}px)`,
                            top: `calc(50% + ${Math.round(PIN_ANCHORS[meta.id]!.dy)}px)`,
                          }}
                          data-z={Math.round(PIN_ANCHORS[meta.id]!.dz)}
                          aria-hidden="true"
                        >
                          {product.name}
                        </span>
                      </>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
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
