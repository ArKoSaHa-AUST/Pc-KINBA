import { SEVERITY_RANK } from './constants.js';
import { estimatePowerDraw, type PowerDrawOptions } from './power.js';
import {
  ruleBios,
  ruleBudget,
  ruleCoolerClearance,
  ruleCoolerSocket,
  ruleCoolingRequired,
  ruleFormFactor,
  ruleFrontUsbC,
  ruleGpuClearance,
  ruleM2Sata,
  ruleMemoryType,
  rulePcieLanes,
  rulePsuConnectors,
  rulePsuFormFactor,
  rulePsuHeadroom,
  ruleRamFit,
  ruleSocketMatch,
} from './rules.js';
import type { CompatBuild, CompatReport, RuleResult, Severity } from './types.js';

export interface EvaluateOptions {
  /** User's stated budget in BDT. Omit to skip the budget rule. */
  budgetBDT?: number;
  /** Build total in BDT. Defaults to the sum of the parts' `priceBDT`. */
  totalBDT?: number;
  /** How a present-but-TDP-less CPU/GPU contributes to the power estimate. */
  power?: PowerDrawOptions;
}

/** Sums `priceBDT` across the build, ignoring parts that carry no price. */
export function totalPriceOf(build: CompatBuild): number {
  return Object.values(build).reduce((sum, part) => sum + (part?.priceBDT ?? 0), 0);
}

/**
 * Runs every whole-build rule.
 *
 * Rules that lacked the inputs to judge are simply absent from `results` — they are
 * never reported as passes. `ok` is true only when nothing came back `warning`/`error`.
 */
export function evaluateBuild(build: CompatBuild, options: EvaluateOptions = {}): CompatReport {
  const draw = estimatePowerDraw(build, options.power);
  const psuWatts = build.psu?.psuWatts;
  const total = options.totalBDT ?? totalPriceOf(build);

  const candidates: Array<RuleResult | null> = [
    ruleSocketMatch(build.cpu, build.motherboard),
    ruleMemoryType(build.ram, build.motherboard),
    rulePsuHeadroom(psuWatts, draw),
    ruleFormFactor(build.motherboard, build.case),
    ruleCoolingRequired(build.cpu, build.cooler),
    ruleGpuClearance(build.gpu, build.case),
    ruleCoolerClearance(build.cooler, build.case),
    ruleCoolerSocket(build.cooler, build.cpu),
    rulePsuConnectors(build.psu, build.gpu, build.storage),
    rulePsuFormFactor(build.psu, build.case),
    ruleBios(build.cpu, build.motherboard),
    ruleM2Sata(build.storage, build.motherboard),
    ruleRamFit(build.ram, build.motherboard, build.cpu),
    rulePcieLanes(build.storage, build.storage2, build.motherboard),
    ruleFrontUsbC(build.case, build.motherboard),
    ruleBudget(total, options.budgetBDT),
  ];

  const results = candidates.filter((r): r is RuleResult => r !== null);

  return {
    ok: results.every((r) => r.severity === 'ok'),
    results,
    wattage: draw,
    psuWattage: psuWatts,
  };
}

/** Everything that is not a clean pass. */
export function problemsOf(report: CompatReport): RuleResult[] {
  return report.results.filter((r) => r.severity !== 'ok');
}

/** Reduces a list of results to the worst severity present. */
export function worstSeverity(results: Array<RuleResult | null>): Severity {
  return results.reduce<Severity>(
    (acc, r) => (r && SEVERITY_RANK[r.severity] > SEVERITY_RANK[acc] ? r.severity : acc),
    'ok',
  );
}

/** The worst result in a list, or `null` when the list holds nothing but nulls. */
export function worstResult(results: Array<RuleResult | null>): RuleResult | null {
  return results.reduce<RuleResult | null>((acc, r) => {
    if (!r) return acc;
    if (!acc) return r;
    return SEVERITY_RANK[r.severity] > SEVERITY_RANK[acc.severity] ? r : acc;
  }, null);
}

/**
 * The Tonima validator's 0-100 score: 100 when clean, otherwise 15 points off per
 * problem with a floor of 60. Warnings count, because the validator has always
 * collected them into the same `violations` array as errors.
 */
export function scoreViolations(problems: RuleResult[]): number {
  return problems.length === 0 ? 100 : Math.max(60, 100 - problems.length * 15);
}

/**
 * Long-form sentence for a problem, rebuilt from its structured `detail`.
 *
 * These strings are byte-compatible with what lib/ai/validator.js has always put in
 * `violations[].detail`; the Tonima explainer and stored AI sessions read them.
 */
export function formatViolationDetail(result: RuleResult): string {
  const d = (result.detail ?? {}) as Record<string, never>;
  const taka = (n: unknown) => `৳${Number(n).toLocaleString('en-IN')}`;

  switch (result.rule) {
    case 'socket_mismatch':
      return `Socket mismatch: CPU is ${d.cpuSocket} (${d.cpuName}), but Motherboard is ${d.moboSocket} (${d.moboName}).`;
    case 'ram_mismatch':
      return `Memory type conflict: Motherboard supports ${d.moboRamType}, but selected RAM is ${d.ramType}.`;
    case 'psu_insufficient':
      return `PSU wattage insufficient: Estimated draw is ~${d.drawWatts}W, but PSU is rated for ${d.psuWatts}W.`;
    case 'psu_headroom':
      return `Tight PSU headroom: ~${d.drawWatts}W draw on ${d.psuWatts}W PSU (${d.headroomPercent}% headroom, recommended >= 25%).`;
    case 'form_factor':
      return `Form factor collision: ${d.moboFormFactor} motherboard (${d.moboName}) will not fit into ${d.caseFormFactor} casing (${d.caseName}).`;
    case 'cooling_required':
      return `High-TDP CPU (${d.cpuTdp}W) requires a dedicated air/AIO cooler, but none was chosen.`;
    case 'budget_exceeded':
      return `Total price ${taka(d.totalBDT)} exceeds budget ${taka(d.budgetBDT)} by ${taka(d.overBy)}.`;
    default:
      return result.message;
  }
}
