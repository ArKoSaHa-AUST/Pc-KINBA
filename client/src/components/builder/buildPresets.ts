import type { BuildPurpose } from './buildConfig';
import { BUILDER_CATALOG, type BuilderProduct } from './builderCatalog';

export interface BuildPreset {
  id: string;
  name: string;
  purpose: BuildPurpose;
  tagline: string;
  partIds: string[];
}

/** Curated starting points; every part id must exist in BUILDER_CATALOG and be mutually compatible. */
export const BUILD_PRESETS: BuildPreset[] = [
  {
    id: 'budget-gaming',
    name: 'Budget Gaming',
    purpose: 'Gaming',
    tagline: 'Smooth 1080p esports and AAA on medium — the best value entry point.',
    partIds: [
      'cpu-r5-5600',
      'mobo-b550m',
      'ram-fury-16-d4',
      'ssd-sn770-1tb',
      'gpu-rtx4060',
      'psu-cx650',
      'case-h5flow',
      'cool-ag400',
    ],
  },
  {
    id: 'office-pc',
    name: 'Office & Productivity',
    purpose: 'Office/Productivity',
    tagline: 'Quiet, efficient and GPU-free — integrated graphics handle office work.',
    partIds: [
      'cpu-i5-14600k',
      'mobo-b760m',
      'ram-fury-16-d4',
      'ssd-sn770-1tb',
      'psu-cx650',
      'case-h5flow',
      'cool-hyper212',
    ],
  },
  {
    id: 'editing-workstation',
    name: 'Editing Workstation',
    purpose: 'Content Creation',
    tagline: '4K timelines, colour grading and fast exports with 32GB DDR5.',
    partIds: [
      'cpu-i7-14700k',
      'mobo-z790',
      'ram-tridentz5-32',
      'ssd-980pro-1tb',
      'gpu-rx7800xt',
      'psu-rm850x',
      'case-4000d',
      'cool-ls520',
    ],
  },
  {
    id: 'streaming-rig',
    name: 'Streaming Rig',
    purpose: 'Streaming',
    tagline: 'Game and encode at the same time without dropped frames.',
    partIds: [
      'cpu-r7-7800x3d',
      'mobo-b650m-a',
      'ram-tridentz5-32',
      'ssd-sn770-1tb',
      'gpu-rtx4070ti',
      'psu-mwe750',
      'case-lancool216',
      'cool-ls520',
    ],
  },
  {
    id: 'ai-workstation',
    name: 'AI / ML Workstation',
    purpose: 'AI/ML Workstation',
    tagline: '24GB VRAM for local LLMs and training runs, with headroom to spare.',
    partIds: [
      'cpu-i7-14700k',
      'mobo-z790',
      'ram-tridentz5-32',
      'ssd-p3plus-2tb',
      'gpu-rtx4090',
      'psu-vertex1200',
      'case-4000d',
      'cool-kraken360',
    ],
  },
];

export function resolveParts(partIds: string[]): BuilderProduct[] {
  return partIds
    .map((id) => BUILDER_CATALOG.find((p) => p.id === id))
    .filter((p): p is BuilderProduct => !!p);
}

export function presetTotal(preset: BuildPreset): number {
  return resolveParts(preset.partIds).reduce((sum, p) => sum + p.price, 0);
}
