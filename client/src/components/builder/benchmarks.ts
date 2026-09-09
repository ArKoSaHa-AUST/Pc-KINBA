import type { BuildPurpose } from './buildConfig';
import type { BuilderProduct } from './builderCatalog';
import type { BuildSelection } from './compatibility';

/**
 * Indicative benchmark table. Every figure is relative to a reference part with a
 * `performanceScore` of 100 — a tier estimate, not a measured result. Swap the tables for the
 * `component_benchmarks` data once real per-part numbers exist; the estimate functions stay.
 */

export type PerfMode = 'gaming' | 'creator' | 'ml';

export const PERF_MODES: { id: PerfMode; label: string; title: string }[] = [
  { id: 'gaming', label: 'Gaming', title: 'Estimated FPS' },
  { id: 'creator', label: 'Creator', title: 'Render Time Index' },
  { id: 'ml', label: 'AI / ML', title: 'ML VRAM Fit' },
];

export const MODE_FOR_PURPOSE: Record<BuildPurpose, PerfMode> = {
  Gaming: 'gaming',
  Streaming: 'gaming',
  'Content Creation': 'creator',
  'Office/Productivity': 'creator',
  'AI/ML Workstation': 'ml',
};

export type Resolution = '1080p' | '1440p' | '4K';
export const RESOLUTIONS: Resolution[] = ['1080p', '1440p', '4K'];
const RES_FACTOR: Record<Resolution, number> = { '1080p': 1, '1440p': 0.68, '4K': 0.42 };

export interface GameBenchmark {
  title: string;
  /** FPS at 1080p on a 100-score GPU with a 100-score CPU. */
  fps1080: number;
  /** How much a slow CPU holds this title back at 1080p (0 = pure GPU-bound). */
  cpuWeight: number;
}

export const GAME_BENCHMARKS: GameBenchmark[] = [
  { title: 'Cyberpunk 2077', fps1080: 110, cpuWeight: 0.3 },
  { title: 'Valorant', fps1080: 420, cpuWeight: 0.7 },
  { title: 'Elden Ring', fps1080: 125, cpuWeight: 0.45 },
  { title: 'Fortnite', fps1080: 240, cpuWeight: 0.5 },
];

export interface RenderWorkload {
  title: string;
  /** Share of the workload that runs on the CPU (1 = CPU only, 0 = GPU only). */
  cpuWeight: number;
}

export const RENDER_WORKLOADS: RenderWorkload[] = [
  { title: 'Blender · CPU render', cpuWeight: 1 },
  { title: 'Blender · GPU render', cpuWeight: 0 },
  { title: 'Premiere · 4K export', cpuWeight: 0.6 },
  { title: 'Code compile', cpuWeight: 1 },
];

export interface MlWorkload {
  title: string;
  vramGb: number;
}

export const ML_WORKLOADS: MlWorkload[] = [
  { title: '7B LLM · 4-bit', vramGb: 6 },
  { title: 'Stable Diffusion XL', vramGb: 8 },
  { title: '13B LLM · 4-bit', vramGb: 10 },
  { title: '7B LoRA fine-tune', vramGb: 16 },
  { title: '70B LLM · 4-bit', vramGb: 40 },
];

const score = (p: BuilderProduct | undefined, fallback = 0.85) =>
  p ? p.performanceScore / 100 : fallback;

export function estimateFps(build: BuildSelection, game: GameBenchmark, res: Resolution): number {
  if (!build.gpu) return 0;
  // The CPU matters less as resolution rises and the GPU becomes the limit.
  const w = game.cpuWeight * RES_FACTOR[res];
  const cpuFactor = 1 - w + w * score(build.cpu);
  return Math.round(game.fps1080 * RES_FACTOR[res] * score(build.gpu) * cpuFactor);
}

/** Time relative to the reference system (1.0×, lower is better); 0 when a required part is missing. */
export function renderTimeIndex(build: BuildSelection, workload: RenderWorkload): number {
  if ((workload.cpuWeight > 0 && !build.cpu) || (workload.cpuWeight < 1 && !build.gpu)) return 0;
  const s = workload.cpuWeight * score(build.cpu) + (1 - workload.cpuWeight) * score(build.gpu);
  return Math.round((1 / Math.max(0.05, s)) * 10) / 10;
}

export type VramFit = 'fits' | 'tight' | 'no';

export function vramFit(vramGb: number, workload: MlWorkload): VramFit {
  if (vramGb >= workload.vramGb * 1.25) return 'fits';
  return vramGb >= workload.vramGb ? 'tight' : 'no';
}
