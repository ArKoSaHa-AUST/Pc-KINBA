import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactElement, type ReactNode } from 'react';
import * as THREE from 'three';
import type { ComponentCategory } from './builderCatalog';
import type { BuildSelection } from './compatibility';

/**
 * Real-scale ATX mid-tower (1 unit = 10 cm), lying on its side so the motherboard tray faces
 * the camera through the open glass panel. x: left→right (I/O shield → front), y: bottom→top,
 * z: tray → glass. Empty slots are ghosted so the user sees where each part goes.
 */

const CASE = { w: 4.6, h: 4.5, d: 2.1, t: 0.03 };
const TRAY_Z = -CASE.d / 2 + 0.25; // motherboard tray inner face
const MOBO = { w: 2.44, h: 3.05, d: 0.016, x: -0.55, y: 0.2 };
const MOBO_Z = TRAY_Z + 0.08 + MOBO.d / 2; // on standoffs
const ON_MOBO = MOBO_Z + MOBO.d / 2;

/** Rest position, exploded offset and a coarse "hit box" for each slot. */
interface Slot {
  pos: [number, number, number];
  explode: [number, number, number];
  size: [number, number, number];
}

const SLOTS: Record<ComponentCategory, Slot | null> = {
  case: { pos: [0, 0, 0], explode: [0, 0, 0], size: [CASE.w, CASE.h, CASE.d] },
  motherboard: {
    pos: [MOBO.x, MOBO.y, MOBO_Z],
    explode: [0, 0, 0.5],
    size: [MOBO.w, MOBO.h, MOBO.d],
  },
  cpu: {
    pos: [MOBO.x + 0.15, MOBO.y + 0.85, ON_MOBO],
    explode: [0, 0.3, 1.0],
    size: [0.4, 0.4, 0.05],
  },
  cooling: {
    pos: [MOBO.x + 0.15, MOBO.y + 0.85, ON_MOBO + 0.05],
    explode: [0, 0.6, 1.6],
    size: [1.2, 1.2, 1.55],
  },
  ram: {
    pos: [MOBO.x + 0.95, MOBO.y + 0.85, ON_MOBO],
    explode: [0.7, 0.3, 0.9],
    size: [0.45, 1.33, 0.32],
  },
  gpu: {
    pos: [MOBO.x + 0.6, MOBO.y - 0.55, ON_MOBO + 0.35],
    explode: [0, -0.9, 1.3],
    size: [3.0, 1.2, 0.55],
  },
  storage: {
    pos: [MOBO.x + 0.75, MOBO.y - 0.05, ON_MOBO],
    explode: [0.9, 0, 0.7],
    size: [0.8, 0.22, 0.04],
  },
  psu: {
    pos: [-0.9, -CASE.h / 2 + 0.45, -0.2],
    explode: [-0.9, -0.9, 0.4],
    size: [1.5, 0.86, 1.4],
  },
  storage2: null,
  monitor: null,
  keyboard: null,
  mouse: null,
};

// ---- Materials (shared so the scene stays cheap) -------------------------------------------

const MAT = {
  steel: new THREE.MeshStandardMaterial({ color: '#181b21', metalness: 0.6, roughness: 0.55 }),
  steelDark: new THREE.MeshStandardMaterial({ color: '#0c0e12', metalness: 0.5, roughness: 0.65 }),
  pcb: new THREE.MeshStandardMaterial({ color: '#14261a', metalness: 0.15, roughness: 0.65 }),
  pcbLight: new THREE.MeshStandardMaterial({ color: '#22362a', metalness: 0.15, roughness: 0.6 }),
  plastic: new THREE.MeshStandardMaterial({ color: '#0b0d11', metalness: 0.1, roughness: 0.6 }),
  shroud: new THREE.MeshStandardMaterial({ color: '#131619', metalness: 0.7, roughness: 0.4 }),
  alu: new THREE.MeshStandardMaterial({ color: '#5f6772', metalness: 0.85, roughness: 0.42 }),
  copper: new THREE.MeshStandardMaterial({ color: '#b87333', metalness: 0.9, roughness: 0.3 }),
  ihs: new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.2 }),
  gold: new THREE.MeshStandardMaterial({ color: '#d4a92a', metalness: 1, roughness: 0.3 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#0e1626',
    metalness: 0.1,
    roughness: 0.02,
    transparent: true,
    opacity: 0.22,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  ghost: new THREE.MeshStandardMaterial({
    color: '#22d3ee',
    transparent: true,
    opacity: 0.12,
    wireframe: false,
    depthWrite: false,
  }),
  ghostWire: new THREE.MeshBasicMaterial({
    color: '#22d3ee',
    wireframe: true,
    transparent: true,
    opacity: 0.4,
  }),
  accent: new THREE.MeshStandardMaterial({
    color: '#0e7490',
    emissive: '#22d3ee',
    emissiveIntensity: 0.9,
    toneMapped: false,
  }),
  rgb: new THREE.MeshStandardMaterial({
    color: '#5b21b6',
    emissive: '#8b5cf6',
    emissiveIntensity: 0.7,
    toneMapped: false,
  }),
  hover: new THREE.MeshBasicMaterial({
    color: '#22d3ee',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }),
};

// ---- Part meshes -----------------------------------------------------------------------------

function Fan({ size, spin = true, rgb = false }: { size: number; spin?: boolean; rgb?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.rotation.z -= dt * 9;
  });
  const r = size / 2;
  return (
    <group>
      <mesh material={MAT.plastic}>
        <boxGeometry args={[size, size, size * 0.22]} />
      </mesh>
      <mesh position={[0, 0, size * 0.111 + 0.001]} material={rgb ? MAT.rgb : MAT.steelDark}>
        <ringGeometry args={[r * 0.9, r * 0.98, 48]} />
      </mesh>
      <group ref={ref} position={[0, 0, size * 0.11]}>
        <mesh material={MAT.plastic}>
          <cylinderGeometry args={[r * 0.28, r * 0.28, size * 0.2, 24]} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            rotation={[0.55, 0, (i / 9) * Math.PI * 2]}
            position={[
              Math.cos((i / 9) * Math.PI * 2) * r * 0.55,
              Math.sin((i / 9) * Math.PI * 2) * r * 0.55,
              0,
            ]}
            material={MAT.steelDark}
          >
            <boxGeometry args={[r * 0.28, r * 0.62, 0.006]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GlassPanel({ exploded }: { exploded: boolean }) {
  const { w, h, d } = CASE;
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (!ref.current) return;
    // Taken off and set aside when the build is exploded, like a real hinged panel
    target.set(exploded ? 1.4 : 0, exploded ? -0.3 : 0, exploded ? 2.6 : 0);
    ref.current.position.lerp(target, Math.min(1, dt * 5));
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0, d / 2 + 0.02]} material={MAT.glass}>
        <boxGeometry args={[w - 0.1, h - 0.1, 0.02]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <mesh
            key={`${sx}${sy}`}
            position={[sx * (w / 2 - 0.22), sy * (h / 2 - 0.22), d / 2 + 0.035]}
            rotation={[Math.PI / 2, 0, 0]}
            material={MAT.alu}
          >
            <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function CaseMesh({ exploded, children }: { exploded: boolean; children: ReactNode }) {
  const { w, h, d, t } = CASE;
  return (
    <group>
      {/* Back (motherboard tray side) */}
      <mesh position={[0, 0, -d / 2 + t / 2]} material={MAT.steel}>
        <boxGeometry args={[w, h, t]} />
      </mesh>
      {/* Tray plate with a cable cut-out lip */}
      <mesh position={[MOBO.x, 0.2, TRAY_Z - 0.01]} material={MAT.steelDark}>
        <boxGeometry args={[MOBO.w + 0.5, h - 0.9, 0.02]} />
      </mesh>
      {/* Top / bottom */}
      <mesh position={[0, h / 2 - t / 2, 0]} material={MAT.steel}>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      <mesh position={[0, -h / 2 + t / 2, 0]} material={MAT.steel}>
        <boxGeometry args={[w, t, d]} />
      </mesh>
      {/* Rear I/O wall (left) & front panel (right) */}
      <mesh position={[-w / 2 + t / 2, 0, 0]} material={MAT.steelDark}>
        <boxGeometry args={[t, h, d]} />
      </mesh>
      <RoundedBox
        args={[0.12, h, d]}
        radius={0.04}
        position={[w / 2 - 0.06, 0, 0]}
        material={MAT.shroud}
      />
      {/* Front mesh intake fans */}
      {[1.2, 0, -1.2].map((y) => (
        <group key={y} position={[w / 2 - 0.2, y + 0.3, 0.15]} rotation={[0, -Math.PI / 2, 0]}>
          <Fan size={1.15} rgb />
        </group>
      ))}
      {/* PSU shroud along the floor — stops short of the PSU bay so the unit stays visible */}
      <mesh position={[1.1, -h / 2 + 0.5, 0]} material={MAT.shroud}>
        <boxGeometry args={[2.3, 0.9, d - 0.15]} />
      </mesh>
      {/* Rear exhaust fan */}
      <group position={[-w / 2 + 0.16, 1.35, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <Fan size={1.15} />
      </group>
      {/* Feet */}
      {[-1.6, 1.6].map((x) =>
        [-0.7, 0.7].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -h / 2 - 0.05, z]} material={MAT.plastic}>
            <cylinderGeometry args={[0.12, 0.14, 0.1, 16]} />
          </mesh>
        )),
      )}
      {children}
      <GlassPanel exploded={exploded} />
    </group>
  );
}

function MotherboardMesh() {
  const { w, h, d } = MOBO;
  return (
    <group>
      <mesh material={MAT.pcb}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* CPU socket + retention frame */}
      <mesh position={[0.15, 0.85, d]} material={MAT.pcbLight}>
        <boxGeometry args={[0.55, 0.55, 0.01]} />
      </mesh>
      {/* VRM heatsinks */}
      <mesh position={[0.15, 1.35, d + 0.08]} material={MAT.alu}>
        <boxGeometry args={[0.9, 0.18, 0.16]} />
      </mesh>
      <mesh position={[-0.45, 0.85, d + 0.08]} material={MAT.alu}>
        <boxGeometry args={[0.18, 0.7, 0.16]} />
      </mesh>
      {/* DIMM slots */}
      {[0.82, 0.92, 1.02, 1.12].map((x) => (
        <mesh key={x} position={[x, 0.85, d + 0.02]} material={MAT.plastic}>
          <boxGeometry args={[0.06, 1.35, 0.04]} />
        </mesh>
      ))}
      {/* PCIe x16 slots */}
      {[-0.2, -0.75, -1.2].map((y) => (
        <mesh key={y} position={[0.55, y, d + 0.02]} material={MAT.plastic}>
          <boxGeometry args={[0.9, 0.08, 0.04]} />
        </mesh>
      ))}
      {/* Chipset heatsink */}
      <mesh position={[0.75, -0.9, d + 0.03]} material={MAT.alu}>
        <boxGeometry args={[0.5, 0.4, 0.06]} />
      </mesh>
      {/* Rear I/O cover */}
      <mesh position={[-1.05, 1.0, d + 0.12]} material={MAT.shroud}>
        <boxGeometry args={[0.3, 1.5, 0.24]} />
      </mesh>
      {/* 24-pin ATX header */}
      <mesh position={[1.12, -0.1, d + 0.04]} material={MAT.plastic}>
        <boxGeometry args={[0.1, 0.5, 0.08]} />
      </mesh>
    </group>
  );
}

function CpuMesh() {
  return (
    <group>
      <mesh material={MAT.pcbLight}>
        <boxGeometry args={[0.4, 0.4, 0.012]} />
      </mesh>
      <mesh position={[0, 0, 0.02]} material={MAT.ihs}>
        <boxGeometry args={[0.32, 0.32, 0.03]} />
      </mesh>
    </group>
  );
}

function CoolerMesh() {
  // Tower air cooler: base, heat-pipes, fin stack, 120 mm fan on the front
  return (
    <group>
      <mesh position={[0, 0, 0.03]} material={MAT.copper}>
        <boxGeometry args={[0.4, 0.4, 0.06]} />
      </mesh>
      {[-0.12, -0.04, 0.04, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.45, 0.55]} material={MAT.copper}>
          <cylinderGeometry args={[0.03, 0.03, 1.0, 12]} />
        </mesh>
      ))}
      {/* Fin stack: a solid core with thin plates protruding so the fins read as ridges */}
      <mesh position={[0, 0.55, 0.85]} material={MAT.alu}>
        <boxGeometry args={[1.12, 0.92, 1.3]} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[0, 0.55, 0.25 + i * 0.09]} material={MAT.alu}>
          <boxGeometry args={[1.22, 1.02, 0.012]} />
        </mesh>
      ))}
      <group position={[0.72, 0.55, 0.85]} rotation={[0, Math.PI / 2, 0]}>
        <Fan size={1.2} rgb />
      </group>
    </group>
  );
}

function RamMesh() {
  return (
    <group>
      {[-0.1, 0.1].map((x) => (
        <group key={x} position={[x, 0, 0.16]}>
          <mesh material={MAT.pcb}>
            <boxGeometry args={[0.012, 1.33, 0.3]} />
          </mesh>
          <mesh material={MAT.steelDark}>
            <boxGeometry args={[0.07, 1.3, 0.26]} />
          </mesh>
          <mesh position={[0, 0, 0.145]} material={MAT.rgb}>
            <boxGeometry args={[0.075, 1.25, 0.03]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GpuMesh() {
  return (
    <group>
      {/* PCB + bracket */}
      <mesh position={[0, 0.1, -0.22]} material={MAT.pcb}>
        <boxGeometry args={[2.8, 1.0, 0.016]} />
      </mesh>
      <mesh position={[-1.42, 0.1, -0.15]} material={MAT.alu}>
        <boxGeometry args={[0.02, 1.2, 0.4]} />
      </mesh>
      {/* Gold edge connector */}
      <mesh position={[-0.5, -0.45, -0.22]} material={MAT.gold}>
        <boxGeometry args={[0.9, 0.1, 0.02]} />
      </mesh>
      {/* Fin stack & shroud */}
      <mesh position={[0.1, 0.1, 0]} material={MAT.alu}>
        <boxGeometry args={[2.7, 1.05, 0.4]} />
      </mesh>
      <RoundedBox
        args={[2.9, 1.2, 0.5]}
        radius={0.05}
        position={[0.05, 0.1, 0.03]}
        material={MAT.shroud}
      />
      {[-0.9, 0.05, 1.0].map((x) => (
        <group key={x} position={[x, 0.1, 0.22]}>
          <Fan size={0.88} />
        </group>
      ))}
      {/* Backplate LED strip */}
      <mesh position={[0.4, 0.68, 0.1]} material={MAT.accent}>
        <boxGeometry args={[1.4, 0.03, 0.2]} />
      </mesh>
    </group>
  );
}

function StorageMesh() {
  return (
    <group>
      <mesh material={MAT.pcb}>
        <boxGeometry args={[0.8, 0.22, 0.012]} />
      </mesh>
      <mesh position={[0, 0, 0.025]} material={MAT.alu}>
        <boxGeometry args={[0.76, 0.2, 0.04]} />
      </mesh>
    </group>
  );
}

function PsuMesh() {
  return (
    <group>
      <mesh material={MAT.steelDark}>
        <boxGeometry args={[1.5, 0.86, 1.4]} />
      </mesh>
      <group position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Fan size={1.2} />
      </group>
      <mesh position={[0, 0, 0.71]} material={MAT.plastic}>
        <boxGeometry args={[1.3, 0.7, 0.02]} />
      </mesh>
    </group>
  );
}

const PART_MESH: Partial<Record<ComponentCategory, () => ReactElement>> = {
  motherboard: MotherboardMesh,
  cpu: CpuMesh,
  cooling: CoolerMesh,
  ram: RamMesh,
  gpu: GpuMesh,
  storage: StorageMesh,
  psu: PsuMesh,
};

// ---- Slot wrapper: positions, explodes, ghosts empty slots, hover/click -----------------------

interface PartSlotProps {
  category: ComponentCategory;
  filled: boolean;
  exploded: boolean;
  hovered: boolean;
  onHover: (c: ComponentCategory | null) => void;
  onClick: (c: ComponentCategory) => void;
}

function PartSlot({ category, filled, exploded, hovered, onHover, onClick }: PartSlotProps) {
  const slot = SLOTS[category]!;
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const Mesh = PART_MESH[category];

  useFrame((_, dt) => {
    if (!group.current) return;
    const k = exploded ? 1 : 0;
    target.set(
      slot.pos[0] + slot.explode[0] * k,
      slot.pos[1] + slot.explode[1] * k,
      slot.pos[2] + slot.explode[2] * k,
    );
    group.current.position.lerp(target, Math.min(1, dt * 6));
  });

  // Where the part's bulk sits relative to its anchor, for the hit box / ghost
  const center: [number, number, number] =
    category === 'cooling'
      ? [0, 0.5, 0.75]
      : category === 'gpu'
        ? [0.05, 0.1, 0.03]
        : category === 'ram'
          ? [0, 0, 0.16]
          : [0, 0, slot.size[2] / 2];

  return (
    <group ref={group} position={slot.pos}>
      {filled && Mesh && <Mesh />}
      {!filled && (
        <mesh position={center} material={MAT.ghostWire}>
          <boxGeometry args={slot.size} />
        </mesh>
      )}
      <mesh
        position={center}
        material={hovered ? MAT.hover : MAT.ghost}
        visible={hovered || !filled}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(category);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onClick(category);
        }}
      >
        <boxGeometry args={[slot.size[0] + 0.04, slot.size[1] + 0.04, slot.size[2] + 0.04]} />
      </mesh>
    </group>
  );
}

// ---- Scene -------------------------------------------------------------------------------------

interface AssemblySceneProps {
  build: BuildSelection;
  exploded: boolean;
  hovered: ComponentCategory | null;
  onHover: (c: ComponentCategory | null) => void;
  onClick: (c: ComponentCategory) => void;
}

export default function AssemblyScene({
  build,
  exploded,
  hovered,
  onHover,
  onClick,
}: AssemblySceneProps) {
  const slots = (Object.keys(SLOTS) as ComponentCategory[]).filter((c) => SLOTS[c] && c !== 'case');
  return (
    <>
      <color attach="background" args={['#06080f']} />
      <fog attach="fog" args={['#06080f', 14, 26]} />
      <hemisphereLight args={['#c7d2fe', '#0b0f1a', 0.35]} />
      <directionalLight position={[6, 8, 6]} intensity={1.8} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-6, 4, -4]} intensity={0.8} color="#a5b4fc" />
      <pointLight position={[-3, 4, 5]} intensity={30} color="#22d3ee" />
      <pointLight position={[4, 3, 4]} intensity={20} color="#8b5cf6" />
      {/* Interior fill so the board and parts are readable behind the glass */}
      <pointLight
        position={[0.3, 0.8, 0.6]}
        intensity={5}
        color="#e0e7ff"
        distance={4}
        decay={1.5}
      />
      {/* Procedural studio environment: gives metals and glass something to reflect, no HDR download */}
      <Environment resolution={256}>
        <Lightformer intensity={1.8} position={[0, 6, -8]} scale={[12, 6, 1]} />
        <Lightformer
          intensity={1.2}
          position={[-8, 2, 0]}
          rotation-y={Math.PI / 2}
          scale={[10, 3, 1]}
        />
        <Lightformer
          intensity={1.2}
          position={[8, 2, 0]}
          rotation-y={-Math.PI / 2}
          scale={[10, 3, 1]}
        />
        <Lightformer intensity={2.2} position={[0, 2, 8]} scale={[8, 4, 1]} />
        <Lightformer color="#22d3ee" intensity={1.5} position={[-4, -3, 4]} scale={[5, 2, 1]} />
        <Lightformer color="#8b5cf6" intensity={1.5} position={[4, -3, 4]} scale={[5, 2, 1]} />
      </Environment>

      <group position={[0, 0.2, 0]}>
        <CaseMesh exploded={exploded}>
          {slots.map((c) => (
            <PartSlot
              key={c}
              category={c}
              filled={!!build[c]}
              exploded={exploded}
              hovered={hovered === c}
              onHover={onHover}
              onClick={onClick}
            />
          ))}
        </CaseMesh>
        {/* Desk surface + soft contact shadow under the feet */}
        <mesh position={[0, -CASE.h / 2 - 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#0a0d16" roughness={0.9} metalness={0.1} />
        </mesh>
        <ContactShadows
          position={[0, -CASE.h / 2 - 0.09, 0]}
          opacity={0.7}
          blur={2.2}
          scale={12}
          far={3}
        />
      </group>
    </>
  );
}
