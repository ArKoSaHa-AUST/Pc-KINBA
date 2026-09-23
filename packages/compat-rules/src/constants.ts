import type { FormFactor, Severity } from './types.js';

/**
 * Every shared magic number in the compatibility domain lives here, exactly once.
 * Before this package these were duplicated across
 * client/src/components/builder/compatibility.ts and lib/ai/validator.js.
 */

/** Motherboard, RAM, storage, fans and other always-on draw, in watts. */
export const BASE_DRAW_WATTS = 75;

/** A PSU should be rated at least this multiple of estimated peak draw. */
export const PSU_HEADROOM_RATIO = 1.25;

/** Above this CPU TDP a dedicated cooler is required rather than stock. */
export const HIGH_TDP_COOLER_THRESHOLD_WATTS = 105;

/** Assumed CPU TDP when the part does not report one. */
export const DEFAULT_CPU_TDP_WATTS = 65;

/** Assumed GPU TDP when the part does not report one. */
export const DEFAULT_GPU_TDP_WATTS = 220;

/** GPU-to-case spare length below this is a warning, not a pass. */
export const GPU_CLEARANCE_WARN_MM = 15;

/** Cooler-to-side-panel spare height below this is a warning. */
export const COOLER_CLEARANCE_WARN_MM = 5;

/**
 * Larger rank must fit into an equal-or-larger case.
 * The backend table was the more complete of the two — the builder's had no E-ATX
 * and no Mini-ITX / Micro-ATX aliases, so an E-ATX board silently read as ATX.
 */
export const FORM_FACTOR_RANK: Record<FormFactor, number> = {
  ITX: 0,
  mATX: 1,
  ATX: 2,
  'E-ATX': 3,
};

/**
 * DDR sweet spots per platform. Faster kits usually need manual tuning or fall back
 * to JEDEC timings.
 */
export const RAM_SWEET_SPOT_MHZ: Record<string, number> = {
  AM5: 6000,
  AM4: 3600,
  LGA1700: 6400,
  LGA1851: 6400,
};

/** Ordering used to reduce a list of results to its worst outcome. */
export const SEVERITY_RANK: Record<Severity, number> = { ok: 0, warning: 1, error: 2 };

/**
 * Budget overshoot tolerated before `budget_exceeded` fires.
 *
 * NOTE: 0.03 preserves the behaviour lib/ai/validator.js has always had. It is the
 * reason Tonima can return a build a few thousand taka over a stated budget. Making
 * the budget a hard constraint is a separate, deliberate change (see the Tonima
 * budget-adherence task) — this constant exists so that change is a one-line edit
 * rather than a hunt through three files.
 */
export const BUDGET_TOLERANCE = 0.03;
