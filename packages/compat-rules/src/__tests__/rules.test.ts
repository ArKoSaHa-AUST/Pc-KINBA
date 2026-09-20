import { describe, expect, it } from 'vitest';
import {
  BASE_DRAW_WATTS,
  BUDGET_TOLERANCE,
  DEFAULT_CPU_TDP_WATTS,
  DEFAULT_GPU_TDP_WATTS,
  FORM_FACTOR_RANK,
  HIGH_TDP_COOLER_THRESHOLD_WATTS,
  PSU_HEADROOM_RATIO,
  allocateSubBudgets,
  budgetSplitFor,
  builderPurposeToCanonical,
  canonicalToBuilderPurpose,
  estimatePowerDraw,
  evaluateBuild,
  formFactorFits,
  formatViolationDetail,
  getBudgetCeiling,
  parseFormFactor,
  parseMemoryType,
  parseSocket,
  parseWattage,
  problemsOf,
  ruleBudget,
  ruleCoolingRequired,
  ruleFormFactor,
  ruleGpuClearance,
  ruleMemoryType,
  rulePsuHeadroom,
  ruleSocketMatch,
  scoreViolations,
  worstResult,
  PURPOSE_BUDGET_SPLIT,
  type CompatPart,
} from '../index.js';

const p = (over: Partial<CompatPart> & Pick<CompatPart, 'category'>): CompatPart => ({
  id: 'x',
  name: 'Part',
  ...over,
});

describe('compat-rules > the null-when-unknown contract', () => {
  it('PKG-NULL-001: socket rule declines to judge when either side is unknown', () => {
    expect(ruleSocketMatch(p({ category: 'cpu', socket: 'AM5' }), p({ category: 'motherboard' }))).toBeNull();
    expect(ruleSocketMatch(p({ category: 'cpu' }), p({ category: 'motherboard', socket: 'AM5' }))).toBeNull();
  });

  it('PKG-NULL-002: memory rule declines to judge when either side is unknown', () => {
    expect(ruleMemoryType(p({ category: 'ram', memoryType: 'DDR5' }), p({ category: 'motherboard' }))).toBeNull();
  });

  it('PKG-NULL-003: form factor rule declines to judge when either side is unknown', () => {
    expect(ruleFormFactor(p({ category: 'motherboard', formFactor: 'ATX' }), p({ category: 'case' }))).toBeNull();
    expect(formFactorFits('ATX', undefined)).toBeUndefined();
  });

  it('PKG-NULL-004: PSU headroom rule declines to judge an unrated PSU', () => {
    expect(rulePsuHeadroom(undefined, 400)).toBeNull();
    expect(rulePsuHeadroom(0, 400)).toBeNull();
  });

  it('PKG-NULL-005: GPU clearance declines to judge without both measurements', () => {
    expect(ruleGpuClearance(p({ category: 'gpu', lengthMm: 320 }), p({ category: 'case' }))).toBeNull();
  });

  it('PKG-NULL-006: cooling rule declines to judge a CPU that reports no TDP', () => {
    expect(ruleCoolingRequired(p({ category: 'cpu' }), undefined)).toBeNull();
  });

  it('PKG-NULL-007: an unknown pair never produces a pass in a whole-build report', () => {
    const report = evaluateBuild({
      cpu: p({ category: 'cpu', socket: 'AM5' }),
      motherboard: p({ category: 'motherboard' }),
    });
    expect(report.results.some((r) => r.rule === 'socket_mismatch')).toBe(false);
  });
});

describe('compat-rules > PSU headroom boundaries', () => {
  it.each([
    [399, 'psu_insufficient', 'error'],
    [400, 'psu_headroom', 'warning'],
    [499, 'psu_headroom', 'warning'],
    [500, 'psu_headroom', 'ok'],
    [800, 'psu_headroom', 'ok'],
  ])('PKG-PSU: %dW against a 400W draw -> %s/%s', (watts, rule, severity) => {
    const result = rulePsuHeadroom(watts as number, 400);
    expect(result?.rule).toBe(rule);
    expect(result?.severity).toBe(severity);
  });

  it('PKG-PSU-RATIO: the headroom bar is a single shared constant', () => {
    expect(PSU_HEADROOM_RATIO).toBe(1.25);
  });
});

describe('compat-rules > form factor', () => {
  it('PKG-FF-001: ranks all four sizes, including the E-ATX the builder used to lack', () => {
    expect(FORM_FACTOR_RANK).toEqual({ ITX: 0, mATX: 1, ATX: 2, 'E-ATX': 3 });
  });

  it.each([
    ['Mini-ITX', 'ITX'],
    ['MINI ITX', 'ITX'],
    ['ITX', 'ITX'],
    ['Micro-ATX', 'mATX'],
    ['MICRO ATX', 'mATX'],
    ['mATX', 'mATX'],
    ['M-ATX', 'mATX'],
    ['MATX', 'mATX'],
    ['ATX', 'ATX'],
    ['E-ATX', 'E-ATX'],
    ['EATX', 'E-ATX'],
    ['Extended ATX', 'E-ATX'],
  ])('PKG-FF-PARSE: %s -> %s', (raw, expected) => {
    expect(parseFormFactor(raw as string)).toBe(expected);
  });

  it('PKG-FF-002: an unrecognised spelling is unknown, not ATX', () => {
    expect(parseFormFactor('Proprietary OEM')).toBeUndefined();
    expect(parseFormFactor('')).toBeUndefined();
    expect(parseFormFactor(null)).toBeUndefined();
  });

  it('PKG-FF-003: E-ATX does not fit an ATX case', () => {
    expect(formFactorFits('E-ATX', 'ATX')).toBe(false);
    expect(formFactorFits('ATX', 'E-ATX')).toBe(true);
    expect(formFactorFits('ITX', 'ITX')).toBe(true);
  });
});

describe('compat-rules > power', () => {
  it('PKG-PWR-001: base draw is one shared constant', () => {
    expect(BASE_DRAW_WATTS).toBe(75);
    expect(estimatePowerDraw({})).toBe(75);
  });

  it('PKG-PWR-002: assumeDefaults off treats a TDP-less part as 0W', () => {
    const build = { cpu: p({ category: 'cpu' }), gpu: p({ category: 'gpu' }) };
    expect(estimatePowerDraw(build, { assumeDefaults: false })).toBe(BASE_DRAW_WATTS);
  });

  it('PKG-PWR-003: assumeDefaults on substitutes the documented defaults', () => {
    const build = { cpu: p({ category: 'cpu' }), gpu: p({ category: 'gpu' }) };
    expect(estimatePowerDraw(build, { assumeDefaults: true })).toBe(
      BASE_DRAW_WATTS + DEFAULT_CPU_TDP_WATTS + DEFAULT_GPU_TDP_WATTS,
    );
  });

  it('PKG-PWR-004: a declared TDP always wins over the default', () => {
    const build = { cpu: p({ category: 'cpu', tdpWatts: 105 }) };
    expect(estimatePowerDraw(build, { assumeDefaults: true })).toBe(180);
  });
});

describe('compat-rules > cooling threshold', () => {
  it('PKG-COOL-001: 105W is the boundary and is not over it', () => {
    expect(HIGH_TDP_COOLER_THRESHOLD_WATTS).toBe(105);
    expect(ruleCoolingRequired(p({ category: 'cpu', tdpWatts: 105 }), undefined)?.severity).toBe('ok');
    expect(ruleCoolingRequired(p({ category: 'cpu', tdpWatts: 106 }), undefined)?.severity).toBe('warning');
  });

  it('PKG-COOL-002: any cooler satisfies the rule', () => {
    expect(
      ruleCoolingRequired(p({ category: 'cpu', tdpWatts: 250 }), p({ category: 'cooler', name: 'AIO' }))
        ?.severity,
    ).toBe('ok');
  });
});

describe('compat-rules > budget', () => {
  it('PKG-BUDGET-001: the tolerance is a single constant', () => {
    expect(BUDGET_TOLERANCE).toBe(0.03);
    expect(getBudgetCeiling(150000)).toBe(154500);
  });

  it('PKG-BUDGET-002: no stated budget means no ceiling and no verdict', () => {
    expect(getBudgetCeiling(0)).toBe(Number.POSITIVE_INFINITY);
    expect(ruleBudget(100000, 0)).toBeNull();
    expect(ruleBudget(100000, undefined)).toBeNull();
  });

  it('PKG-BUDGET-003: within the ceiling passes, beyond it errors', () => {
    expect(ruleBudget(154500, 150000)?.severity).toBe('ok');
    expect(ruleBudget(154501, 150000)?.severity).toBe('error');
  });
});

describe('compat-rules > scoring and reporting', () => {
  it('PKG-SCORE-001: matches the validator formula, floor included', () => {
    expect(scoreViolations([])).toBe(100);
    expect(scoreViolations([{} as never])).toBe(85);
    expect(scoreViolations([{}, {}] as never[])).toBe(70);
    expect(scoreViolations([{}, {}, {}] as never[])).toBe(60);
    expect(scoreViolations(Array(10).fill({}) as never[])).toBe(60);
  });

  it('PKG-SCORE-002: warnings count toward the deduction, as they always have', () => {
    const report = evaluateBuild({
      cpu: p({ category: 'cpu', socket: 'AM5', tdpWatts: 65 }),
      motherboard: p({ category: 'motherboard', socket: 'AM5', memoryType: 'DDR5' }),
      psu: p({ category: 'psu', psuWatts: 145 }),
    });
    const problems = problemsOf(report);
    expect(problems.map((x) => x.rule)).toContain('psu_headroom');
    expect(scoreViolations(problems)).toBeLessThan(100);
  });

  it('PKG-WORST-001: reduces a mixed list to its worst entry', () => {
    const results = [
      ruleSocketMatch(p({ category: 'cpu', socket: 'AM5' }), p({ category: 'motherboard', socket: 'AM5' })),
      rulePsuHeadroom(400, 400),
    ];
    expect(worstResult(results)?.severity).toBe('warning');
    expect(worstResult([null, null])).toBeNull();
  });

  it('PKG-DETAIL-001: rebuilds the validator long-form sentences from structured detail', () => {
    const socket = ruleSocketMatch(
      p({ category: 'cpu', name: 'Ryzen 7 7700', socket: 'AM5' }),
      p({ category: 'motherboard', name: 'Z790-P', socket: 'LGA1700' }),
    )!;
    expect(formatViolationDetail(socket)).toBe(
      'Socket mismatch: CPU is AM5 (Ryzen 7 7700), but Motherboard is LGA1700 (Z790-P).',
    );

    const budget = ruleBudget(160000, 150000)!;
    expect(formatViolationDetail(budget)).toContain('exceeds budget');
  });
});

describe('compat-rules > parsers', () => {
  it('PKG-PARSE-001: socket parsing normalises case and rejects sentinels', () => {
    expect(parseSocket(' am5 ')).toBe('AM5');
    expect(parseSocket('UNKNOWN')).toBeUndefined();
    expect(parseSocket('')).toBeUndefined();
  });

  it('PKG-PARSE-002: memory parsing reads a generation out of free text', () => {
    expect(parseMemoryType('DDR5-6000 CL30')).toBe('DDR5');
    expect(parseMemoryType('288-pin DDR4')).toBe('DDR4');
    expect(parseMemoryType('SO-DIMM')).toBeUndefined();
  });

  it('PKG-PARSE-003: wattage parsing prefers an explicit W suffix', () => {
    expect(parseWattage('Corsair RM750e 750W 80+ Gold')).toBe(750);
    expect(parseWattage('650')).toBe(650);
    expect(parseWattage('Call for price')).toBeUndefined();
  });
});

describe('compat-rules > budget allocation', () => {
  it('PKG-ALLOC-001: every purpose row sums to 1.0', () => {
    for (const [purpose, split] of Object.entries(PURPOSE_BUDGET_SPLIT)) {
      const sum = Object.values(split).reduce((a, b) => a + b, 0);
      expect(sum, purpose).toBeCloseTo(1, 6);
    }
  });

  it('PKG-ALLOC-002: the two purpose vocabularies round-trip', () => {
    expect(builderPurposeToCanonical('AI/ML Workstation')).toBe('ai_ml');
    expect(canonicalToBuilderPurpose('ai_ml')).toBe('AI/ML Workstation');
    expect(canonicalToBuilderPurpose('general')).toBeUndefined();
  });

  it('PKG-ALLOC-003: an unknown purpose falls back to the general split', () => {
    expect(budgetSplitFor('nonsense')).toEqual(PURPOSE_BUDGET_SPLIT.general);
  });

  it('PKG-ALLOC-004: sub-budgets keep the documented -35%/+45% band', () => {
    const alloc = allocateSubBudgets('gaming', 150000);
    expect(alloc.gpu.target).toBe(60000);
    expect(alloc.gpu.min).toBe(39000);
    expect(alloc.gpu.max).toBe(87000);
  });

  it('PKG-ALLOC-005: a zero-weight slot allocates nothing', () => {
    expect(allocateSubBudgets('office', 100000).gpu).toEqual({ target: 0, min: 0, max: 0 });
  });
});
