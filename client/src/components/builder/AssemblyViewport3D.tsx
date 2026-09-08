import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Expand, Shrink } from 'lucide-react';
import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import AssemblyScene from './AssemblyScene';
import './AssemblyViewport3D.css';
import { formatTaka } from './buildConfig';
import { COMPONENT_CATEGORIES, type ComponentCategory } from './builderCatalog';
import { getBuildChecks, getCompatibilityScore, type BuildSelection } from './compatibility';

interface AssemblyViewport3DProps {
  build: BuildSelection;
  onOpenCategory: (category: ComponentCategory) => void;
}

/** Orbit locked to the glass side of the case; idle rotation sweeps back and forth across it. */
const MAX_AZIMUTH = 0.85;

function GlassSideOrbit({ paused }: { paused: boolean }) {
  const ref = useRef<OrbitControlsImpl>(null);
  const dir = useRef(1);
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const az = c.getAzimuthalAngle();
    if (az > MAX_AZIMUTH - 0.05) dir.current = -1;
    else if (az < -MAX_AZIMUTH + 0.05) dir.current = 1;
    c.autoRotateSpeed = 0.5 * dir.current;
  });
  return (
    <OrbitControls
      ref={ref}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={16}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 + 0.15}
      minAzimuthAngle={-MAX_AZIMUTH}
      maxAzimuthAngle={MAX_AZIMUTH}
      autoRotate={!paused}
      target={[0, 0.2, 0]}
    />
  );
}

export default function AssemblyViewport3D({ build, onOpenCategory }: AssemblyViewport3DProps) {
  const [exploded, setExploded] = useState(false);
  const [hovered, setHovered] = useState<ComponentCategory | null>(null);

  const score = getCompatibilityScore(getBuildChecks(build));
  const hoveredMeta = hovered ? COMPONENT_CATEGORIES.find((c) => c.id === hovered) : null;
  const hoveredProduct = hovered ? build[hovered] : null;

  return (
    <div className="assembly-viewport" style={{ cursor: hovered ? 'pointer' : 'grab' }}>
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

      {/* data-lenis-prevent keeps wheel-zoom inside the canvas instead of scrolling the page */}
      <div className="assembly-canvas" data-lenis-prevent>
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={[1, 1.75]}
          camera={{ position: [4.4, 1.9, 9.2], fov: 34 }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <AssemblyScene
              build={build}
              exploded={exploded}
              hovered={hovered}
              onHover={setHovered}
              onClick={onOpenCategory}
            />
          </Suspense>
          <GlassSideOrbit paused={!!hovered} />
        </Canvas>
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
          <span className="assembly-hud-hint">Drag to orbit · scroll to zoom · click a part</span>
        )}
      </div>
    </div>
  );
}
