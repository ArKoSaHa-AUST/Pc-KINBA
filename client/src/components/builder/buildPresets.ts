import type { BuildPurpose } from './buildConfig';
import type { BuilderProduct, ComponentCategory } from './builderCatalog';
import { checkCompatibility, type BuildSelection } from './compatibility';

/** `q` tokens must all appear in a live product name; `fallback` is the curated id used otherwise. */
export type PresetPart = { q: string; fallback: string };

export interface BuildPreset {
  id: string;
  name: string;
  purpose: BuildPurpose;
  tagline: string;
  parts: Partial<Record<ComponentCategory, PresetPart>>;
}

export const BUILD_PRESETS: BuildPreset[] = [
  {
    id: 'budget-gaming',
    name: 'Budget Gaming',
    purpose: 'Gaming',
    tagline: 'Smooth 1080p esports and AAA on medium — the best value entry point.',
    parts: {
      cpu: { q: 'Ryzen 5 5600', fallback: 'cpu-r5-5600' },
      motherboard: { q: 'B550M', fallback: 'mobo-b550m' },
      ram: { q: 'DDR4 16GB 3200', fallback: 'ram-fury-16-d4' },
      storage: { q: '1TB NVMe', fallback: 'ssd-sn770-1tb' },
      gpu: { q: 'RTX 4060 8GB', fallback: 'gpu-rtx4060' },
      psu: { q: '650W', fallback: 'psu-cx650' },
      case: { q: 'H5 Flow', fallback: 'case-h5flow' },
      cooling: { q: 'AG400', fallback: 'cool-ag400' },
    },
  },
  {
    id: 'office-pc',
    name: 'Office & Productivity',
    purpose: 'Office/Productivity',
    tagline: 'Quiet, efficient and GPU-free — integrated graphics handle office work.',
    parts: {
      cpu: { q: 'i5-14600K', fallback: 'cpu-i5-14600k' },
      motherboard: { q: 'B760M DDR4', fallback: 'mobo-b760m' },
      ram: { q: 'DDR4 16GB 3200', fallback: 'ram-fury-16-d4' },
      storage: { q: '1TB NVMe', fallback: 'ssd-sn770-1tb' },
      psu: { q: '650W', fallback: 'psu-cx650' },
      case: { q: 'H5 Flow', fallback: 'case-h5flow' },
      cooling: { q: 'Hyper 212', fallback: 'cool-hyper212' },
    },
  },
  {
    id: 'editing-workstation',
    name: 'Editing Workstation',
    purpose: 'Content Creation',
    tagline: '4K timelines, colour grading and fast exports with 32GB DDR5.',
    parts: {
      cpu: { q: 'i7-14700K', fallback: 'cpu-i7-14700k' },
      motherboard: { q: 'Z790 DDR5', fallback: 'mobo-z790' },
      ram: { q: 'DDR5 32GB 6000', fallback: 'ram-tridentz5-32' },
      storage: { q: '980 Pro 1TB', fallback: 'ssd-980pro-1tb' },
      gpu: { q: 'RX 7800 XT', fallback: 'gpu-rx7800xt' },
      psu: { q: '850W Gold', fallback: 'psu-rm850x' },
      case: { q: '4000D', fallback: 'case-4000d' },
      cooling: { q: 'LS520', fallback: 'cool-ls520' },
    },
  },
  {
    id: 'streaming-rig',
    name: 'Streaming Rig',
    purpose: 'Streaming',
    tagline: 'Game and encode at the same time without dropped frames.',
    parts: {
      cpu: { q: 'Ryzen 7 7800X3D', fallback: 'cpu-r7-7800x3d' },
      motherboard: { q: 'B650M', fallback: 'mobo-b650m-a' },
      ram: { q: 'DDR5 32GB 6000', fallback: 'ram-tridentz5-32' },
      storage: { q: '1TB NVMe', fallback: 'ssd-sn770-1tb' },
      gpu: { q: 'RTX 4070 Ti', fallback: 'gpu-rtx4070ti' },
      psu: { q: '750W Gold', fallback: 'psu-mwe750' },
      case: { q: 'Lancool 216', fallback: 'case-lancool216' },
      cooling: { q: 'LS520', fallback: 'cool-ls520' },
    },
  },
  {
    id: 'ai-workstation',
    name: 'AI / ML Workstation',
    purpose: 'AI/ML Workstation',
    tagline: '24GB VRAM for local LLMs and training runs, with headroom to spare.',
    parts: {
      cpu: { q: 'i7-14700K', fallback: 'cpu-i7-14700k' },
      motherboard: { q: 'Z790 DDR5', fallback: 'mobo-z790' },
      ram: { q: 'DDR5 32GB 6000', fallback: 'ram-tridentz5-32' },
      storage: { q: '2TB NVMe', fallback: 'ssd-p3plus-2tb' },
      gpu: { q: 'RTX 4090 24GB', fallback: 'gpu-rtx4090' },
      psu: { q: '1200W', fallback: 'psu-vertex1200' },
      case: { q: '4000D', fallback: 'case-4000d' },
      cooling: { q: 'Kraken 360', fallback: 'cool-kraken360' },
    },
  },
];

const SLOT_ORDER: ComponentCategory[] = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'psu',
  'case',
  'cooling',
  'storage',
];

/** Cheapest live product matching every query token that is compatible with what's picked so far. */
function findMatch(
  q: string,
  category: ComponentCategory,
  catalog: BuilderProduct[],
  build: BuildSelection,
): BuilderProduct | undefined {
  const tokens = q.toLowerCase().split(/\s+/);
  return catalog
    .filter((p) => p.category === category && p.listings?.length)
    .filter((p) => tokens.every((t) => p.name.toLowerCase().includes(t)))
    .filter((p) => checkCompatibility(p, build).status !== 'incompatible')
    .sort((a, b) => a.price - b.price)[0];
}

/** Resolves a preset to concrete parts: live matches where available, curated fallbacks otherwise. */
export function resolvePreset(
  preset: BuildPreset,
  catalog: BuilderProduct[],
  byId: Map<string, BuilderProduct>,
): BuildSelection {
  const build: BuildSelection = {};
  for (const slot of SLOT_ORDER) {
    const part = preset.parts[slot];
    if (!part) continue;
    const product = findMatch(part.q, slot, catalog, build) ?? byId.get(part.fallback);
    if (product) build[slot] = product;
  }
  return build;
}
