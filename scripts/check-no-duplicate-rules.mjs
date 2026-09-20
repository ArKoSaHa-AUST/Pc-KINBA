#!/usr/bin/env node
/**
 * Guards the single-source-of-truth invariant for hardware compatibility rules.
 *
 * The rules and their magic numbers live in `packages/compat-rules`. The React
 * builder and the Tonima AI validator are adapters: they map product shapes, and
 * nothing else. This script fails if a constant or rule table reappears in an
 * adapter -- which is exactly how the two implementations drifted apart before.
 *
 * Run: node scripts/check-no-duplicate-rules.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

/** Files that may only contain shape mapping. */
const ADAPTERS = [
  'lib/ai/validator.js',
  'lib/ai/budget.js',
  'client/src/components/builder/compatibility.ts',
  'client/src/components/builder/autoBuild.ts',
];

const FORBIDDEN = [
  {
    id: 'base-draw-constant',
    pattern: /BASE_DRAW_WATTS\s*=\s*\d+/,
    reason: 'The base system draw is BASE_DRAW_WATTS in @pc-kinba/compat-rules.',
  },
  {
    id: 'psu-headroom-multiplier',
    pattern: /draw\w*\s*\*\s*1\.25|1\.25\s*\*\s*draw/i,
    reason: 'The PSU headroom ratio is PSU_HEADROOM_RATIO in @pc-kinba/compat-rules.',
  },
  {
    id: 'form-factor-rank-table',
    pattern: /(FORM_FACTOR_(RANK|SIZE))\s*[:=]/,
    reason: 'The form-factor ranks are FORM_FACTOR_RANK in @pc-kinba/compat-rules.',
  },
  {
    id: 'budget-tolerance',
    pattern: /\*\s*1\.03|1\.03\s*\*/,
    reason: 'The budget tolerance is BUDGET_TOLERANCE in @pc-kinba/compat-rules.',
  },
  {
    id: 'purpose-budget-table',
    pattern: /(PURPOSE_BUDGET_WEIGHTS|BUDGET_SPLIT)\s*(:|=)\s*\{[\s\S]{0,80}?(cpu|gpu)\s*:\s*0?\.\d/,
    reason: 'The purpose budget weights are PURPOSE_BUDGET_SPLIT in @pc-kinba/compat-rules.',
  },
  {
    id: 'high-tdp-cooler-threshold',
    pattern: /tdp\w*\s*>\s*105|105\s*<\s*\w*tdp/i,
    reason:
      'The dedicated-cooler threshold is HIGH_TDP_COOLER_THRESHOLD_WATTS in @pc-kinba/compat-rules.',
  },
  {
    id: 'ram-sweet-spot-table',
    pattern: /RAM_SWEET_SPOT\w*\s*[:=]\s*\{/,
    reason: 'The DDR sweet spots are RAM_SWEET_SPOT_MHZ in @pc-kinba/compat-rules.',
  },
];

/**
 * Lines the adapters are allowed to keep, with the reason. The builder's cooling
 * check keeps its own optimistic reading for a CPU that reports no TDP, which is
 * a presentation decision rather than a rule; it is annotated in the source.
 */
const ALLOWLIST = [
  {
    file: 'client/src/components/builder/compatibility.ts',
    ruleId: 'high-tdp-cooler-threshold',
    reason:
      'getBuildChecks keeps the builder-specific fallback for a TDP-less CPU; annotated in place.',
  },
];

let failures = 0;

for (const relative of ADAPTERS) {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) {
    console.error(`MISSING  ${relative}`);
    failures++;
    continue;
  }

  const source = fs.readFileSync(absolute, 'utf8');
  const lines = source.split('\n');

  for (const rule of FORBIDDEN) {
    const allowed = ALLOWLIST.some((a) => a.file === relative && a.ruleId === rule.id);
    if (allowed) continue;

    lines.forEach((line, index) => {
      // Comments are documentation, not logic.
      const stripped = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
      if (!stripped.trim()) return;
      if (rule.pattern.test(stripped)) {
        console.error(`RULE LEAK  ${relative}:${index + 1}  [${rule.id}]`);
        console.error(`           ${line.trim()}`);
        console.error(`           ${rule.reason}\n`);
        failures++;
      }
    });
  }

  if (!/@pc-kinba\/compat-rules/.test(source)) {
    console.error(`NOT AN ADAPTER  ${relative} does not import @pc-kinba/compat-rules.\n`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} problem(s) found. Compatibility rules belong in packages/compat-rules.`);
  process.exit(1);
}

console.log(`OK - ${ADAPTERS.length} adapter(s) contain shape mapping only.`);
