import type { BuilderProduct, ComponentCategory, FormFactor } from './builderCatalog';

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

export function totalPriceOf(build: BuildSelection): number {
  return Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0);
}

export type CompatStatus = 'compatible' | 'warning' | 'incompatible';

export interface CompatResult {
  status: CompatStatus;
  message: string;
}

const FORM_FACTOR_SIZE: Record<FormFactor, number> = { ITX: 0, mATX: 1, ATX: 2 };
const BASE_DRAW_WATTS = 75; // mobo, ram, storage, fans

export function estimatePowerDraw(build: BuildSelection): number {
  return BASE_DRAW_WATTS + (build.cpu?.tdp ?? 0) + (build.gpu?.tdp ?? 0);
}

function checkPsuHeadroom(wattage: number, draw: number): CompatResult {
  if (wattage < draw) {
    return { status: 'incompatible', message: `Needs ~${draw}W, PSU is ${wattage}W` };
  }
  if (wattage < draw * 1.25) {
    return { status: 'warning', message: `Under 25% PSU headroom (~${draw}W draw)` };
  }
  return { status: 'compatible', message: 'Compatible' };
}

// ---- Rule functions: return null when the required parts/specs aren't selected yet ----

type P = BuilderProduct | undefined;

function checkGpuClearance(gpu: P, pcCase: P): CompatResult | null {
  if (!gpu?.lengthMm || !pcCase?.maxGpuLengthMm) return null;
  const spare = pcCase.maxGpuLengthMm - gpu.lengthMm;
  if (spare < 0) {
    return {
      status: 'incompatible',
      message: `${gpu.lengthMm}mm GPU exceeds ${pcCase.maxGpuLengthMm}mm case limit`,
    };
  }
  if (spare < 15) {
    return { status: 'warning', message: `Only ${spare}mm spare — a front radiator may block it` };
  }
  return { status: 'compatible', message: `${gpu.lengthMm}mm GPU, ${spare}mm spare` };
}

function checkCoolerClearance(cooler: P, pcCase: P): CompatResult | null {
  if (!cooler || !pcCase) return null;
  if (cooler.radiatorMm) {
    if (!pcCase.radiatorSupportMm) return null;
    return pcCase.radiatorSupportMm.includes(cooler.radiatorMm)
      ? { status: 'compatible', message: `${cooler.radiatorMm}mm radiator mount available` }
      : {
          status: 'incompatible',
          message: `No ${cooler.radiatorMm}mm mount (case takes ${pcCase.radiatorSupportMm.join('/')}mm)`,
        };
  }
  if (!cooler.heightMm || !pcCase.maxCoolerHeightMm) return null;
  const spare = pcCase.maxCoolerHeightMm - cooler.heightMm;
  if (spare < 0) {
    return {
      status: 'incompatible',
      message: `${cooler.heightMm}mm cooler exceeds ${pcCase.maxCoolerHeightMm}mm clearance`,
    };
  }
  if (spare < 5) {
    return { status: 'warning', message: `${spare}mm spare — side panel may touch the cooler` };
  }
  return { status: 'compatible', message: `${cooler.heightMm}mm cooler, ${spare}mm spare` };
}

function checkPsuConnectors(psu: P, gpu: P, storage: P): CompatResult | null {
  if (!psu?.pcie8pin) return null;
  if (storage?.storageInterface === 'sata' && !psu.sataPower) {
    return { status: 'incompatible', message: 'PSU has no SATA power connector for the drive' };
  }
  if (!gpu) {
    return storage?.storageInterface
      ? { status: 'compatible', message: 'No PCIe power required' }
      : null;
  }
  if (!gpu.gpuPower) return null; // connector requirement unknown for this GPU
  const { type, pcie8pin } = gpu.gpuPower;
  if (type === '12vhpwr') {
    if (psu.has12vhpwr) return { status: 'compatible', message: 'Native 12VHPWR cable' };
    return psu.pcie8pin >= pcie8pin
      ? {
          status: 'warning',
          message: `12VHPWR via ${pcie8pin}×8-pin adapter — an ATX 3.0 PSU is safer`,
        }
      : {
          status: 'incompatible',
          message: `Adapter needs ${pcie8pin}×8-pin, PSU has ${psu.pcie8pin}`,
        };
  }
  return psu.pcie8pin >= pcie8pin
    ? { status: 'compatible', message: `${pcie8pin}×8-pin available` }
    : { status: 'incompatible', message: `GPU needs ${pcie8pin}×8-pin, PSU has ${psu.pcie8pin}` };
}

/** 'YYYY-MM' strings compare lexicographically; a CPU newer than its board is the classic BIOS trap. */
function checkBios(cpu: P, motherboard: P): CompatResult | null {
  if (!cpu?.released || !motherboard?.released || cpu.socket !== motherboard.socket) return null;
  return cpu.released > motherboard.released
    ? {
        status: 'warning',
        message:
          'CPU is newer than this board — older stock may need a BIOS update (ask the retailer to flash it)',
      }
    : { status: 'compatible', message: 'Supported out of the box' };
}

function checkM2Sata(storage: P, motherboard: P): CompatResult | null {
  if (!storage?.storageInterface || !motherboard?.m2Slots) return null;
  const ports = `${motherboard.m2Slots}× M.2 · ${motherboard.sataPorts ?? 0}× SATA`;
  if (!motherboard.m2SataShared)
    return { status: 'compatible', message: `${ports}, no shared lanes` };
  return storage.storageInterface === 'sata'
    ? { status: 'warning', message: `${motherboard.m2SataShared} — keep the drive on SATA 1–4` }
    : {
        status: 'compatible',
        message: `${motherboard.m2SataShared} — use M.2_1 to keep all SATA ports`,
      };
}

const SEVERITY: Record<CompatStatus, number> = { compatible: 0, warning: 1, incompatible: 2 };

/** DDR sweet spots per platform; faster kits often need manual tuning or fall back to JEDEC. */
const RAM_SWEET_SPOT: Record<string, number> = {
  AM5: 6000,
  AM4: 3600,
  LGA1700: 6400,
  LGA1851: 6400,
};

function checkRamFit(ram: P, motherboard: P, cpu: P): CompatResult | null {
  if (!ram || !motherboard) return null;
  if (ram.moduleCount && motherboard.ramSlots && ram.moduleCount > motherboard.ramSlots) {
    return {
      status: 'incompatible',
      message: `${ram.moduleCount} modules but the board has ${motherboard.ramSlots} DIMM slots`,
    };
  }
  if (ram.capacityGb && motherboard.maxRamGb && ram.capacityGb > motherboard.maxRamGb) {
    return {
      status: 'incompatible',
      message: `${ram.capacityGb}GB exceeds the board's ${motherboard.maxRamGb}GB max`,
    };
  }
  const socket = cpu?.socket ?? motherboard.socket;
  const sweet = socket ? RAM_SWEET_SPOT[socket] : undefined;
  if (ram.speedMhz && sweet && ram.speedMhz > sweet) {
    return {
      status: 'warning',
      message: `${ram.ramType}-${ram.speedMhz} is above the ${socket} sweet spot (${sweet}) — may need manual tuning`,
    };
  }
  if (!ram.speedMhz && !ram.moduleCount) return null;
  return {
    status: 'compatible',
    message: ram.speedMhz
      ? `${ram.ramType}-${ram.speedMhz} within platform range`
      : 'Kit fits the board',
  };
}

function checkCoolerSocket(cooler: P, cpu: P): CompatResult | null {
  if (!cooler?.coolerSockets || !cpu?.socket) return null;
  return cooler.coolerSockets.includes(cpu.socket)
    ? { status: 'compatible', message: `${cpu.socket} bracket included` }
    : {
        status: 'incompatible',
        message: `No ${cpu.socket} bracket (supports ${cooler.coolerSockets.join('/')})`,
      };
}

function checkPsuFormFactor(psu: P, pcCase: P): CompatResult | null {
  if (!psu?.psuFormFactor || !pcCase?.psuSupport) return null;
  return pcCase.psuSupport.includes(psu.psuFormFactor)
    ? { status: 'compatible', message: `${psu.psuFormFactor} PSU fits` }
    : {
        status: 'incompatible',
        message: `Case takes ${pcCase.psuSupport.join('/')} PSUs, not ${psu.psuFormFactor}`,
      };
}

function checkPcieLanes(storage: P, storage2: P, motherboard: P): CompatResult | null {
  if (!motherboard || (!storage && !storage2)) return null;
  if (storage2?.storageInterface === 'nvme' && motherboard.m2SharesGpuLanes) {
    return {
      status: 'warning',
      message: `${motherboard.m2SharesGpuLanes} — a 2nd NVMe drive may slow the GPU`,
    };
  }
  const drive = [storage, storage2].find((d) => d?.pcieGen && motherboard.pcieGen);
  if (drive?.pcieGen && motherboard.pcieGen && drive.pcieGen > motherboard.pcieGen) {
    return {
      status: 'warning',
      message: `Gen${drive.pcieGen} SSD will run at Gen${motherboard.pcieGen} speed on this board`,
    };
  }
  if (!drive && !storage2) return null;
  return {
    status: 'compatible',
    message: drive ? `Gen${drive.pcieGen} SSD fully supported` : 'No lane sharing issues',
  };
}

function checkFrontUsbC(pcCase: P, motherboard: P): CompatResult | null {
  if (pcCase?.frontUsbC === undefined || motherboard?.usbCHeader === undefined) return null;
  if (!pcCase.frontUsbC) return { status: 'compatible', message: 'Case has no front USB-C port' };
  return motherboard.usbCHeader
    ? { status: 'compatible', message: 'Front USB-C header available' }
    : {
        status: 'warning',
        message: 'Case front USB-C port has no header on this board — it will be dead',
      };
}

function worst(results: (CompatResult | null)[]): CompatResult {
  return results.reduce<CompatResult>(
    (acc, r) => (r && SEVERITY[r.status] > SEVERITY[acc.status] ? r : acc),
    { status: 'compatible', message: 'Compatible' },
  );
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
      if (
        b.case?.formFactor &&
        candidate.formFactor &&
        FORM_FACTOR_SIZE[candidate.formFactor] > FORM_FACTOR_SIZE[b.case.formFactor]
      ) {
        return {
          status: 'incompatible',
          message: `${candidate.formFactor} won't fit ${b.case.formFactor} case`,
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
      if (
        b.motherboard?.formFactor &&
        candidate.formFactor &&
        FORM_FACTOR_SIZE[b.motherboard.formFactor] > FORM_FACTOR_SIZE[candidate.formFactor]
      ) {
        return { status: 'incompatible', message: `${b.motherboard.formFactor} board won't fit` };
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

  const formFit: BuildCheck =
    !motherboard?.formFactor || !pcCase?.formFactor
      ? {
          id: 'form',
          label: 'Form factor fit (Motherboard ↔ Case)',
          status: 'pending',
          detail: 'Select motherboard and case',
        }
      : FORM_FACTOR_SIZE[motherboard.formFactor] <= FORM_FACTOR_SIZE[pcCase.formFactor]
        ? {
            id: 'form',
            label: 'Form factor fit (Motherboard ↔ Case)',
            status: 'compatible',
            detail: `${motherboard.formFactor} fits ${pcCase.formFactor} case`,
          }
        : {
            id: 'form',
            label: 'Form factor fit (Motherboard ↔ Case)',
            status: 'incompatible',
            detail: `${motherboard.formFactor} board won't fit ${pcCase.formFactor} case`,
          };

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
