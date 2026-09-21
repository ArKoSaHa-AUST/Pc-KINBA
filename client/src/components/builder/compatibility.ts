/**
 * PC Builder compatibility — React builder adapter.
 *
 * ---------------------------------------------------------------------------
 * Compatibility rules live in `@pc-kinba/compat-rules` (packages/compat-rules).
 * Do NOT add rule logic here — this file only maps `BuilderProduct` onto the
 * shared `CompatPart`, and maps the shared `RuleResult` back onto the
 * `CompatResult` / `BuildCheck` shapes this app's components render.
 * ---------------------------------------------------------------------------
 */
import {
  estimatePowerDraw as sharedEstimatePowerDraw,
  ruleBios,
  ruleCoolerClearance,
  ruleCoolerSocket,
  ruleFormFactor,
  ruleFrontUsbC,
  ruleGpuClearance,
  ruleM2Sata,
  rulePcieLanes,
  rulePsuConnectors,
  rulePsuFormFactor,
  rulePsuHeadroom,
  ruleRamFit,
  type CompatBuild,
  type CompatPart,
  type RuleResult,
  type Severity,
} from '@pc-kinba/compat-rules';
import type { BuilderProduct, ComponentCategory } from './builderCatalog';

export type BuildSelection = Partial<Record<ComponentCategory, BuilderProduct>>;

/**
 * Rebuild a selection from a comma-separated id list (share links / checkout URLs).
 * A second storage id lands in the `storage2` slot.
 */
export function selectionFromPartIds(
  param: string | null,
  byId: Map<string, BuilderProduct>,
): BuildSelection {
  const selection: BuildSelection = {};
  for (const id of param?.split(',') ?? []) {
    const product = byId.get(id);
    if (!product) continue;
    const slot: ComponentCategory =
      product.category === 'storage' && selection.storage ? 'storage2' : product.category;
    selection[slot] = product;
  }
  return selection;
}

export function partIdsOf(build: BuildSelection): string[] {
  return Object.values(build)
    .filter((p): p is BuilderProduct => !!p)
    .map((p) => p.id);
}

/** Sums every slot, including peripherals, which the shared rules do not model. */
export function totalPriceOf(build: BuildSelection): number {
  return Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0);
}

export type CompatStatus = 'compatible' | 'warning' | 'incompatible';

export interface CompatResult {
  status: CompatStatus;
  message: string;
}

// ---------------------------------------------------------------------------
// Adapter: BuilderProduct <-> CompatPart, RuleResult <-> CompatResult
// ---------------------------------------------------------------------------

const STATUS_FOR_SEVERITY: Record<Severity, CompatStatus> = {
  ok: 'compatible',
  warning: 'warning',
  error: 'incompatible',
};

/** The builder's slot vocabulary differs from the shared one in two places. */
function compatCategoryOf(category: ComponentCategory): CompatPart['category'] | null {
  switch (category) {
    case 'cooling':
      return 'cooler';
    case 'storage2':
      return 'storage';
    case 'cpu':
    case 'gpu':
    case 'motherboard':
    case 'ram':
    case 'storage':
    case 'psu':
    case 'case':
      return category;
    default:
      return null; // monitor / keyboard / mouse are not part of compatibility
  }
}

/** Exported for the cross-adapter parity suite; not used by app code. */
export function toCompatPart(product: BuilderProduct | undefined): CompatPart | undefined {
  if (!product) return undefined;
  const category = compatCategoryOf(product.category);
  if (!category) return undefined;

  return {
    id: product.id,
    category,
    name: product.name,
    priceBDT: product.price,
    socket: product.socket,
    memoryType: product.ramType,
    formFactor: product.formFactor,
    releasedYearMonth: product.released,
    tdpWatts: product.tdp,
    psuWatts: product.wattage,
    pcie8pin: product.pcie8pin,
    has12vhpwr: product.has12vhpwr,
    sataPower: product.sataPower,
    gpuPower: product.gpuPower,
    psuFormFactor: product.psuFormFactor,
    psuSupport: product.psuSupport,
    lengthMm: product.lengthMm,
    heightMm: product.heightMm,
    radiatorMm: product.radiatorMm,
    maxGpuLengthMm: product.maxGpuLengthMm,
    maxCoolerHeightMm: product.maxCoolerHeightMm,
    radiatorSupportMm: product.radiatorSupportMm,
    ramSlots: product.ramSlots,
    maxRamGb: product.maxRamGb,
    moduleCount: product.moduleCount,
    capacityGb: product.capacityGb,
    speedMhz: product.speedMhz,
    storageInterface: product.storageInterface,
    pcieGen: product.pcieGen,
    m2Slots: product.m2Slots,
    sataPorts: product.sataPorts,
    m2SataShared: product.m2SataShared,
    m2SharesGpuLanes: product.m2SharesGpuLanes,
    coolerSockets: product.coolerSockets,
    frontUsbC: product.frontUsbC,
    usbCHeader: product.usbCHeader,
  };
}

/** `null` in, `null` out: "not enough information" must never become "compatible". */
function toCompatResult(result: RuleResult | null): CompatResult | null {
  if (!result) return null;
  return { status: STATUS_FOR_SEVERITY[result.severity], message: result.message };
}

type P = BuilderProduct | undefined;

const part = toCompatPart;

// --- Rule wrappers: shape mapping only, no logic ---------------------------

export function estimatePowerDraw(build: BuildSelection): number {
  const compat: CompatBuild = { cpu: part(build.cpu), gpu: part(build.gpu) };
  // `assumeDefaults` stays off: in the curated catalog a missing TDP means the slot
  // is empty, so it should contribute 0W. The Tonima validator flips this on because
  // scraped listings often omit TDP and under-sizing a PSU is the costlier mistake.
  return sharedEstimatePowerDraw(compat, { assumeDefaults: false });
}

function checkPsuHeadroom(wattage: number, draw: number): CompatResult {
  return (
    toCompatResult(rulePsuHeadroom(wattage, draw)) ?? {
      status: 'compatible',
      message: 'Compatible',
    }
  );
}

const checkGpuClearance = (gpu: P, pcCase: P) =>
  toCompatResult(ruleGpuClearance(part(gpu), part(pcCase)));
const checkCoolerClearance = (cooler: P, pcCase: P) =>
  toCompatResult(ruleCoolerClearance(part(cooler), part(pcCase)));
const checkPsuConnectors = (psu: P, gpu: P, storage: P) =>
  toCompatResult(rulePsuConnectors(part(psu), part(gpu), part(storage)));
const checkBios = (cpu: P, motherboard: P) =>
  toCompatResult(ruleBios(part(cpu), part(motherboard)));
const checkM2Sata = (storage: P, motherboard: P) =>
  toCompatResult(ruleM2Sata(part(storage), part(motherboard)));
const checkRamFit = (ram: P, motherboard: P, cpu: P) =>
  toCompatResult(ruleRamFit(part(ram), part(motherboard), part(cpu)));
const checkCoolerSocket = (cooler: P, cpu: P) =>
  toCompatResult(ruleCoolerSocket(part(cooler), part(cpu)));
const checkPsuFormFactor = (psu: P, pcCase: P) =>
  toCompatResult(rulePsuFormFactor(part(psu), part(pcCase)));
const checkPcieLanes = (storage: P, storage2: P, motherboard: P) =>
  toCompatResult(rulePcieLanes(part(storage), part(storage2), part(motherboard)));
const checkFrontUsbC = (pcCase: P, motherboard: P) =>
  toCompatResult(ruleFrontUsbC(part(pcCase), part(motherboard)));

const SEVERITY: Record<CompatStatus, number> = { compatible: 0, warning: 1, incompatible: 2 };

function worst(results: (CompatResult | null)[]): CompatResult {
  return results.reduce<CompatResult>(
    (acc, r) => (r && SEVERITY[r.status] > SEVERITY[acc.status] ? r : acc),
    { status: 'compatible', message: 'Compatible' },
  );
}

/** True when the shared form-factor rule says the board does not fit the case. */
function formFactorClash(motherboard: P, pcCase: P): boolean {
  return ruleFormFactor(part(motherboard), part(pcCase))?.severity === 'error';
}

/** Checks a candidate against the rest of the build; `slot` is the slot being filled (its current part is ignored). */
export function checkCompatibility(
  candidate: BuilderProduct,
  build: BuildSelection,
  slot: ComponentCategory = candidate.category,
): CompatResult {
  const b: BuildSelection = { ...build };
  delete b[slot];
  const results: (CompatResult | null)[] = [];

  switch (candidate.category) {
    case 'cpu': {
      if (b.motherboard && b.motherboard.socket !== candidate.socket) {
        return { status: 'incompatible', message: `Socket ${candidate.socket} ≠ motherboard` };
      }
      results.push(checkBios(candidate, b.motherboard), checkCoolerSocket(b.cooling, candidate));
      if (b.psu?.wattage)
        results.push(checkPsuHeadroom(b.psu.wattage, estimatePowerDraw({ ...b, cpu: candidate })));
      break;
    }
    case 'gpu': {
      if (b.psu?.wattage)
        results.push(checkPsuHeadroom(b.psu.wattage, estimatePowerDraw({ ...b, gpu: candidate })));
      results.push(
        checkGpuClearance(candidate, b.case),
        checkPsuConnectors(b.psu, candidate, b.storage),
      );
      break;
    }
    case 'motherboard': {
      if (b.cpu && b.cpu.socket !== candidate.socket) {
        return {
          status: 'incompatible',
          message: `Socket ${candidate.socket} ≠ CPU (${b.cpu.socket})`,
        };
      }
      if (b.ram && b.ram.ramType !== candidate.ramType) {
        return {
          status: 'incompatible',
          message: `${candidate.ramType} board, ${b.ram.ramType} RAM selected`,
        };
      }
      if (formFactorClash(candidate, b.case)) {
        return {
          status: 'incompatible',
          message: `${candidate.formFactor} won't fit ${b.case?.formFactor} case`,
        };
      }
      results.push(
        checkBios(b.cpu, candidate),
        checkM2Sata(b.storage, candidate),
        checkRamFit(b.ram, candidate, b.cpu),
        checkPcieLanes(b.storage, b.storage2, candidate),
        checkFrontUsbC(b.case, candidate),
      );
      break;
    }
    case 'ram': {
      if (b.motherboard && b.motherboard.ramType !== candidate.ramType) {
        return {
          status: 'incompatible',
          message: `${candidate.ramType} RAM, board needs ${b.motherboard.ramType}`,
        };
      }
      results.push(checkRamFit(candidate, b.motherboard, b.cpu));
      break;
    }
    case 'storage': {
      const [primary, secondary] =
        slot === 'storage2' ? [b.storage, candidate] : [candidate, b.storage2];
      results.push(
        checkM2Sata(candidate, b.motherboard),
        checkPsuConnectors(b.psu, b.gpu, candidate),
        checkPcieLanes(primary, secondary, b.motherboard),
      );
      break;
    }
    case 'psu': {
      if (candidate.wattage)
        results.push(checkPsuHeadroom(candidate.wattage, estimatePowerDraw(b)));
      results.push(
        checkPsuConnectors(candidate, b.gpu, b.storage),
        checkPsuFormFactor(candidate, b.case),
      );
      break;
    }
    case 'case': {
      if (formFactorClash(b.motherboard, candidate)) {
        return { status: 'incompatible', message: `${b.motherboard?.formFactor} board won't fit` };
      }
      results.push(
        checkGpuClearance(b.gpu, candidate),
        checkCoolerClearance(b.cooling, candidate),
        checkPsuFormFactor(b.psu, candidate),
        checkFrontUsbC(candidate, b.motherboard),
      );
      break;
    }
    case 'cooling': {
      results.push(checkCoolerClearance(candidate, b.case), checkCoolerSocket(candidate, b.cpu));
      break;
    }
    default:
      break;
  }
  return worst(results);
}

export type BuildCheckStatus = CompatStatus | 'pending';

export interface BuildCheck {
  id: string;
  label: string;
  status: BuildCheckStatus;
  detail: string;
}

/** Whole-build checks for the analytics dashboard (pending = parts not selected yet). */
export function getBuildChecks(build: BuildSelection): BuildCheck[] {
  const { cpu, motherboard, ram, psu, cooling, gpu, storage, storage2 } = build;
  const pcCase = build.case;
  const draw = estimatePowerDraw(build);

  const toCheck = (
    id: string,
    label: string,
    result: CompatResult | null,
    pendingDetail: string,
  ): BuildCheck =>
    result
      ? { id, label, status: result.status, detail: result.message }
      : { id, label, status: 'pending', detail: pendingDetail };

  const socket: BuildCheck =
    !cpu || !motherboard
      ? {
          id: 'socket',
          label: 'Socket match (CPU ↔ Motherboard)',
          status: 'pending',
          detail: 'Select CPU and motherboard',
        }
      : cpu.socket === motherboard.socket
        ? {
            id: 'socket',
            label: 'Socket match (CPU ↔ Motherboard)',
            status: 'compatible',
            detail: `${cpu.socket} matched`,
          }
        : {
            id: 'socket',
            label: 'Socket match (CPU ↔ Motherboard)',
            status: 'incompatible',
            detail: `${cpu.socket} ≠ ${motherboard.socket}`,
          };

  const ramType: BuildCheck =
    !ram || !motherboard
      ? {
          id: 'ram',
          label: 'RAM type compatibility (DDR4/DDR5)',
          status: 'pending',
          detail: 'Select RAM and motherboard',
        }
      : ram.ramType === motherboard.ramType
        ? {
            id: 'ram',
            label: 'RAM type compatibility (DDR4/DDR5)',
            status: 'compatible',
            detail: `${ram.ramType} supported`,
          }
        : {
            id: 'ram',
            label: 'RAM type compatibility (DDR4/DDR5)',
            status: 'incompatible',
            detail: `${ram.ramType} RAM on ${motherboard.ramType} board`,
          };

  const psuCheck: BuildCheck = !psu?.wattage
    ? {
        id: 'psu',
        label: 'PSU wattage sufficiency',
        status: 'pending',
        detail: `Estimated draw ~${draw}W`,
      }
    : {
        id: 'psu',
        label: 'PSU wattage sufficiency',
        ...checkPsuHeadroom(psu.wattage, draw),
        detail: `~${draw}W draw on ${psu.wattage}W PSU`,
      };

  const formResult = ruleFormFactor(part(motherboard), part(pcCase));
  const formFit: BuildCheck = !formResult
    ? {
        id: 'form',
        label: 'Form factor fit (Motherboard ↔ Case)',
        status: 'pending',
        detail: 'Select motherboard and case',
      }
    : formResult.severity === 'ok'
      ? {
          id: 'form',
          label: 'Form factor fit (Motherboard ↔ Case)',
          status: 'compatible',
          detail: `${motherboard?.formFactor} fits ${pcCase?.formFactor} case`,
        }
      : {
          id: 'form',
          label: 'Form factor fit (Motherboard ↔ Case)',
          status: 'incompatible',
          detail: `${motherboard?.formFactor} board won't fit ${pcCase?.formFactor} case`,
        };

  // The shared rule declines to judge a CPU that reports no TDP. Every CPU in the
  // curated catalog has one, so the builder keeps its long-standing optimistic
  // reading rather than showing "pending" for a slot the user has actually filled.
  const coolingCheck: BuildCheck = !cpu
    ? { id: 'cooling', label: 'CPU cooling coverage', status: 'pending', detail: 'Select a CPU' }
    : cooling
      ? {
          id: 'cooling',
          label: 'CPU cooling coverage',
          status: 'compatible',
          detail: `${cooling.name} installed`,
        }
      : (cpu.tdp ?? 0) > 105
        ? {
            id: 'cooling',
            label: 'CPU cooling coverage',
            status: 'warning',
            detail: `${cpu.tdp}W CPU has no cooler selected`,
          }
        : {
            id: 'cooling',
            label: 'CPU cooling coverage',
            status: 'compatible',
            detail: 'Stock cooling sufficient',
          };

  return [
    socket,
    ramType,
    psuCheck,
    formFit,
    coolingCheck,
    toCheck(
      'gpu_fit',
      'GPU length clearance (GPU ↔ Case)',
      checkGpuClearance(gpu, pcCase),
      'Select GPU and case',
    ),
    toCheck(
      'cooler_fit',
      'Cooler height / radiator support (Cooler ↔ Case)',
      checkCoolerClearance(cooling, pcCase),
      'Select cooler and case',
    ),
    toCheck(
      'psu_connectors',
      'PSU connectors (PCIe 8-pin / 12VHPWR / SATA)',
      checkPsuConnectors(psu, gpu, storage),
      'Select PSU and GPU or storage',
    ),
    toCheck(
      'bios',
      'BIOS support (CPU ↔ Motherboard)',
      checkBios(cpu, motherboard),
      'Select CPU and motherboard',
    ),
    toCheck(
      'm2_sata',
      'M.2 / SATA port sharing',
      checkM2Sata(storage, motherboard),
      'Select storage and motherboard',
    ),
    toCheck(
      'ram_fit',
      'RAM slots, capacity & speed',
      checkRamFit(ram, motherboard, cpu),
      'Select RAM and motherboard',
    ),
    toCheck(
      'cooler_socket',
      'Cooler bracket (Cooler ↔ CPU socket)',
      checkCoolerSocket(cooling, cpu),
      'Select cooler and CPU',
    ),
    toCheck(
      'psu_form',
      'PSU form factor (ATX / SFX ↔ Case)',
      checkPsuFormFactor(psu, pcCase),
      'Select PSU and case',
    ),
    toCheck(
      'pcie',
      'PCIe generation & lane sharing',
      checkPcieLanes(storage, storage2, motherboard),
      'Select storage and motherboard',
    ),
    toCheck(
      'usb_c',
      'Front USB-C header (Case ↔ Motherboard)',
      checkFrontUsbC(pcCase, motherboard),
      'Select case and motherboard',
    ),
  ];
}

/**
 * Dashboard percentage: the share of applicable checks that pass, warnings counting
 * half. Deliberately NOT the same metric as the Tonima validator's `score`, which
 * deducts a flat 15 points per violation with a floor of 60.
 */
export function getCompatibilityScore(checks: BuildCheck[]): number {
  const applicable = checks.filter((c) => c.status !== 'pending');
  if (applicable.length === 0) return 100;
  const points = applicable.reduce((sum, c) => sum + SCORE_WEIGHT[c.status], 0);
  return Math.round((points / applicable.length) * 100);
}

/** Points each check contributes; pending checks are excluded from the denominator. */
export const SCORE_WEIGHT: Record<BuildCheckStatus, number> = {
  compatible: 1,
  warning: 0.5,
  incompatible: 0,
  pending: 0,
};

export function summarizeChecks(checks: BuildCheck[]): Record<BuildCheckStatus, number> {
  const counts: Record<BuildCheckStatus, number> = {
    compatible: 0,
    warning: 0,
    incompatible: 0,
    pending: 0,
  };
  for (const c of checks) counts[c.status] += 1;
  return counts;
}
