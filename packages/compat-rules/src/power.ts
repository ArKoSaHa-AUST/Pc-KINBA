import {
  BASE_DRAW_WATTS,
  DEFAULT_CPU_TDP_WATTS,
  DEFAULT_GPU_TDP_WATTS,
} from './constants.js';
import type { CompatBuild } from './types.js';

export interface PowerDrawOptions {
  /**
   * When true, a CPU or GPU that is PRESENT but reports no TDP contributes a default
   * (65W / 220W) instead of 0W.
   *
   * The two call sites genuinely disagreed here and both readings are defensible, so
   * the difference is explicit rather than silently unified:
   *
   * - The builder (`false`) works from a curated catalog where TDP is always present,
   *   so a missing value means "no such part in this build" and 0W is right.
   * - The Tonima validator (`true`) works from scraped listings where TDP is often
   *   absent, so assuming a typical value is safer than under-sizing the PSU.
   */
  assumeDefaults?: boolean;
}

/** Estimated peak system draw in watts. */
export function estimatePowerDraw(build: CompatBuild, options: PowerDrawOptions = {}): number {
  const assume = options.assumeDefaults === true;

  let draw = BASE_DRAW_WATTS;

  if (build.cpu) {
    draw += build.cpu.tdpWatts ?? (assume ? DEFAULT_CPU_TDP_WATTS : 0);
  }
  if (build.gpu) {
    draw += build.gpu.tdpWatts ?? (assume ? DEFAULT_GPU_TDP_WATTS : 0);
  }

  return draw;
}

/** Headroom as a percentage of estimated draw, e.g. 750W on 500W draw = 50. */
export function headroomPercent(psuWatts: number, drawWatts: number): number {
  if (drawWatts <= 0) return 0;
  return Math.round((psuWatts / drawWatts - 1) * 100);
}
