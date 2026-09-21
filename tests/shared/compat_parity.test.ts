import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  evaluateBuild,
  type CompatBuild,
  type CompatPart,
  type RuleResult,
  type Severity,
} from '@pc-kinba/compat-rules';

// The two adapters under test. Neither may contain rule logic; this suite is what
// proves it, by driving one fixture corpus through both and demanding they agree.
import {
  getBuildChecks,
  toCompatPart as builderToCompatPart,
  type BuildSelection,
} from '../../client/src/components/builder/compatibility';
import type { BuilderProduct, ComponentCategory } from '../../client/src/components/builder/builderCatalog';
// @ts-expect-error -- JS module with JSDoc types only
import { toCompatPart as tonimaToCompatPart, validateBuild } from '../../lib/ai/validator.js';

interface FixtureExpectation {
  rule: string;
  severity: Severity;
}

interface FixturePart {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface ParityCase {
  id: string;
  description: string;
  budgetBDT?: number;
  parts: Record<string, FixturePart>;
  expected: FixtureExpectation[];
}

const fixtures = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/compatibility_fixtures.json'), 'utf-8'),
) as { parity_cases: ParityCase[] };

const CASES = fixtures.parity_cases;

/** Fixture slot -> the builder's own slot vocabulary ('cooler' is 'cooling' there). */
const BUILDER_SLOT: Record<string, ComponentCategory> = {
  cpu: 'cpu',
  gpu: 'gpu',
  motherboard: 'motherboard',
  ram: 'ram',
  storage: 'storage',
  storage2: 'storage2',
  psu: 'psu',
  case: 'case',
  cooler: 'cooling',
};

/** Projects neutral fixture facts onto a `BuilderProduct`. */
function toBuilderProduct(slot: string, f: FixturePart): BuilderProduct {
  return {
    id: f.id,
    category: BUILDER_SLOT[slot],
    name: f.name,
    brand: 'Test',
    price: (f.priceBDT as number) ?? 0,
    keySpec: '',
    popularity: 50,
    performanceScore: 50,
    socket: f.socket as string | undefined,
    ramType: f.memoryType as BuilderProduct['ramType'],
    formFactor: f.formFactor as BuilderProduct['formFactor'],
    released: f.releasedYearMonth as string | undefined,
    tdp: f.tdpWatts as number | undefined,
    wattage: f.psuWatts as number | undefined,
    lengthMm: f.lengthMm as number | undefined,
    heightMm: f.heightMm as number | undefined,
    radiatorMm: f.radiatorMm as BuilderProduct['radiatorMm'],
    maxGpuLengthMm: f.maxGpuLengthMm as number | undefined,
    maxCoolerHeightMm: f.maxCoolerHeightMm as number | undefined,
    radiatorSupportMm: f.radiatorSupportMm as number[] | undefined,
    gpuPower: f.gpuPower as BuilderProduct['gpuPower'],
    pcie8pin: f.pcie8pin as number | undefined,
    has12vhpwr: f.has12vhpwr as boolean | undefined,
    sataPower: f.sataPower as number | undefined,
    psuFormFactor: f.psuFormFactor as BuilderProduct['psuFormFactor'],
    psuSupport: f.psuSupport as BuilderProduct['psuSupport'],
    storageInterface: f.storageInterface as BuilderProduct['storageInterface'],
    pcieGen: f.pcieGen as BuilderProduct['pcieGen'],
    m2Slots: f.m2Slots as number | undefined,
    sataPorts: f.sataPorts as number | undefined,
    m2SataShared: f.m2SataShared as string | undefined,
    m2SharesGpuLanes: f.m2SharesGpuLanes as string | undefined,
    ramSlots: f.ramSlots as number | undefined,
    maxRamGb: f.maxRamGb as number | undefined,
    moduleCount: f.moduleCount as number | undefined,
    capacityGb: f.capacityGb as number | undefined,
    speedMhz: f.speedMhz as number | undefined,
    coolerSockets: f.coolerSockets as string[] | undefined,
    frontUsbC: f.frontUsbC as boolean | undefined,
    usbCHeader: f.usbCHeader as boolean | undefined,
  };
}

/**
 * Projects the same facts onto a Supabase-style candidate, with everything in the
 * `specs` blob under the snake_case keys the ingestion pipeline produces. This is
 * deliberately the *hard* path: it forces the Tonima extractors to do real work
 * rather than reading pre-typed fields.
 */
function toCandidate(f: FixturePart): Record<string, unknown> {
  const specs: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined) specs[key] = value;
  };

  put('socket', f.socket);
  put('ram_type', f.memoryType);
  put('form_factor', f.formFactor);
  put('tdp', f.tdpWatts);
  put('wattage', f.psuWatts);
  put('released', f.releasedYearMonth);
  put('length_mm', f.lengthMm);
  put('height_mm', f.heightMm);
  put('radiator_mm', f.radiatorMm);
  put('max_gpu_length', f.maxGpuLengthMm);
  put('max_cooler_height', f.maxCoolerHeightMm);
  put('radiator_support', f.radiatorSupportMm);
  put('gpu_power', f.gpuPower);
  put('pcie_8pin', f.pcie8pin);
  put('has_12vhpwr', f.has12vhpwr);
  put('sata_power', f.sataPower);
  put('psu_form_factor', f.psuFormFactor);
  put('psu_support', f.psuSupport);
  put('storage_interface', f.storageInterface);
  put('pcie_gen', f.pcieGen);
  put('m2_slots', f.m2Slots);
  put('sata_ports', f.sataPorts);
  put('m2_sata_shared', f.m2SataShared);
  put('m2_shares_gpu_lanes', f.m2SharesGpuLanes);
  put('ram_slots', f.ramSlots);
  put('max_ram_gb', f.maxRamGb);
  put('module_count', f.moduleCount);
  put('capacity_gb', f.capacityGb);
  put('speed_mhz', f.speedMhz);
  put('supported_sockets', f.coolerSockets);
  put('front_usb_c', f.frontUsbC);
  put('usb_c_header', f.usbCHeader);

  return { id: f.id, name: f.name, best_price: (f.priceBDT as number) ?? 0, specs };
}

const normalise = (results: Array<{ rule: string; severity: Severity }>) =>
  results
    .map((r) => `${r.rule}:${r.severity}`)
    .sort()
    .join(' | ');

function buildViaBuilder(c: ParityCase): CompatBuild {
  const build: CompatBuild = {};
  for (const [slot, facts] of Object.entries(c.parts)) {
    const mapped = builderToCompatPart(toBuilderProduct(slot, facts));
    if (mapped) build[slot as keyof CompatBuild] = mapped;
  }
  return build;
}

function buildViaTonima(c: ParityCase): CompatBuild {
  const build: CompatBuild = {};
  for (const [slot, facts] of Object.entries(c.parts)) {
    const mapped = tonimaToCompatPart(slot, toCandidate(facts)) as CompatPart | undefined;
    if (mapped) build[slot as keyof CompatBuild] = mapped;
  }
  return build;
}

/** Fields that genuinely mean something to at least one rule. */
const SIGNIFICANT_FIELDS: Array<keyof CompatPart> = [
  'category',
  'socket',
  'memoryType',
  'formFactor',
  'releasedYearMonth',
  'tdpWatts',
  'psuWatts',
  'pcie8pin',
  'has12vhpwr',
  'sataPower',
  'psuFormFactor',
  'psuSupport',
  'lengthMm',
  'heightMm',
  'radiatorMm',
  'maxGpuLengthMm',
  'maxCoolerHeightMm',
  'radiatorSupportMm',
  'ramSlots',
  'maxRamGb',
  'moduleCount',
  'capacityGb',
  'speedMhz',
  'storageInterface',
  'pcieGen',
  'm2Slots',
  'sataPorts',
  'm2SataShared',
  'm2SharesGpuLanes',
  'coolerSockets',
  'frontUsbC',
  'usbCHeader',
];

function significant(p: CompatPart | undefined) {
  if (!p) return null;
  const out: Record<string, unknown> = {};
  for (const key of SIGNIFICANT_FIELDS) {
    if (p[key] !== undefined) out[key] = p[key];
  }
  return out;
}

describe('Shared > Compatibility rule parity (builder adapter vs Tonima adapter)', () => {
  it('SHARED-PARITY-000: the corpus covers at least 25 scenarios', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(25);
  });

  describe('Layer A: both adapters map the same facts onto the same CompatPart', () => {
    for (const c of CASES) {
      it(`${c.id} — mapping parity`, () => {
        const viaBuilder = buildViaBuilder(c);
        const viaTonima = buildViaTonima(c);

        expect(Object.keys(viaTonima).sort()).toEqual(Object.keys(viaBuilder).sort());

        for (const slot of Object.keys(viaBuilder) as Array<keyof CompatBuild>) {
          expect(significant(viaTonima[slot]), `${c.id} / ${slot}`).toEqual(
            significant(viaBuilder[slot]),
          );
        }
      });
    }
  });

  describe('Layer B: the shared engine reaches the fixture verdict from either adapter', () => {
    for (const c of CASES) {
      it(`${c.id} — ${c.description}`, () => {
        const opts = { budgetBDT: c.budgetBDT, power: { assumeDefaults: false } };

        const fromBuilder = evaluateBuild(buildViaBuilder(c), opts);
        const fromTonima = evaluateBuild(buildViaTonima(c), opts);

        const expected = normalise(c.expected as Array<{ rule: string; severity: Severity }>);

        expect(normalise(fromBuilder.results), `${c.id} builder path`).toBe(expected);
        expect(normalise(fromTonima.results), `${c.id} Tonima path`).toBe(expected);
        expect(fromTonima.wattage).toBe(fromBuilder.wattage);
        expect(fromTonima.ok).toBe(fromBuilder.ok);
      });
    }
  });

  describe("Layer C: each adapter's public surface agrees with the shared verdict", () => {
    /** Builder check id -> shared rule id. */
    const CHECK_TO_RULE: Record<string, string> = {
      socket: 'socket_mismatch',
      ram: 'ram_mismatch',
      form: 'form_factor',
      cooling: 'cooling_required',
      gpu_fit: 'gpu_clearance',
      cooler_fit: 'cooler_clearance',
      psu_connectors: 'psu_connectors',
      bios: 'bios_support',
      m2_sata: 'm2_sata_shared',
      ram_fit: 'ram_fit',
      cooler_socket: 'cooler_socket',
      psu_form: 'psu_form_factor',
      pcie: 'pcie_lanes',
      usb_c: 'front_usb_c',
    };

    for (const c of CASES) {
      it(`${c.id} — validateBuild() violations match the shared problems`, () => {
        const candidateLookup: Record<string, unknown> = {};
        const parts: Record<string, string> = {};
        for (const [slot, facts] of Object.entries(c.parts)) {
          candidateLookup[facts.id] = toCandidate(facts);
          parts[slot] = facts.id;
        }
        const totalBdt = Object.values(c.parts).reduce(
          (sum, p) => sum + ((p.priceBDT as number) ?? 0),
          0,
        );

        const result = validateBuild(
          { parts, total_bdt: totalBdt },
          candidateLookup,
          c.budgetBDT ?? 0,
        ) as { violations: Array<{ rule: string }> };

        const expectedProblems = (c.expected as FixtureExpectation[])
          .filter((e) => e.severity !== 'ok')
          .map((e) => e.rule)
          .sort();

        expect(result.violations.map((v) => v.rule).sort()).toEqual(expectedProblems);
      });

      it(`${c.id} — getBuildChecks() statuses match the shared severities`, () => {
        const selection: BuildSelection = {};
        for (const [slot, facts] of Object.entries(c.parts)) {
          selection[BUILDER_SLOT[slot]] = toBuilderProduct(slot, facts);
        }

        const bySeverity = new Map(
          (c.expected as FixtureExpectation[]).map((e) => [e.rule, e.severity]),
        );
        const STATUS_FOR: Record<Severity, string> = {
          ok: 'compatible',
          warning: 'warning',
          error: 'incompatible',
        };

        for (const check of getBuildChecks(selection)) {
          const rule = CHECK_TO_RULE[check.id];
          if (!rule || !bySeverity.has(rule)) continue; // not exercised by this fixture
          expect(check.status, `${c.id} / check ${check.id}`).toBe(
            STATUS_FOR[bySeverity.get(rule)!],
          );
        }
      });
    }
  });

  describe('Documented divergences', () => {
    it('SHARED-PARITY-POWER: the two sides disagree on a present-but-TDP-less part, deliberately', () => {
      const build: CompatBuild = {
        cpu: { id: 'c', category: 'cpu', name: 'Mystery CPU' },
        gpu: { id: 'g', category: 'gpu', name: 'Mystery GPU' },
      };

      // Builder: a missing TDP in the curated catalog means an empty slot -> 0W.
      expect(evaluateBuild(build, { power: { assumeDefaults: false } }).wattage).toBe(75);
      // Tonima: scraped listings often omit TDP, and under-sizing a PSU is costlier.
      expect(evaluateBuild(build, { power: { assumeDefaults: true } }).wattage).toBe(75 + 65 + 220);
    });

    it('SHARED-PARITY-UNKNOWN: an unknown input yields no verdict, never a pass', () => {
      const results: Array<RuleResult | null> = evaluateBuild({
        cpu: { id: 'c', category: 'cpu', name: 'CPU', socket: 'AM5' },
        motherboard: { id: 'm', category: 'motherboard', name: 'Board' },
      }).results;

      expect(results.some((r) => r?.rule === 'socket_mismatch')).toBe(false);
    });
  });
});
