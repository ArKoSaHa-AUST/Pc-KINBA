/**
 * @pc-kinba/compat-rules
 *
 * The single source of truth for PC Kinba hardware compatibility rules and
 * purpose-based budget allocation.
 *
 * Two call sites consume it, and neither may hold rule logic of its own:
 *   - client/src/components/builder/compatibility.ts  (React builder)
 *   - lib/ai/validator.js                             (Tonima AI validator)
 *
 * Both are thin adapters: they map their own product shape onto `CompatPart`,
 * call in here, and map `RuleResult` back onto their own output shape.
 *
 * The package is intentionally dependency-free and environment-agnostic: no React,
 * no Supabase, no Express, no Node built-ins. It has to be cheap in a browser bundle
 * and importable from a bare Node process.
 */

export * from './types.js';
export * from './constants.js';
export * from './parse.js';
export * from './power.js';
export * from './rules.js';
export * from './evaluate.js';
export * from './budget.js';
