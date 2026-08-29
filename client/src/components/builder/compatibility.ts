import {
  BUILDER_CATALOG,
  type BuilderProduct,
  type ComponentCategory,
  type FormFactor,
} from './builderCatalog';

export type BuildSelection = Partial<Record<ComponentCategory, BuilderProduct>>;

/** Rebuild a selection from a comma-separated id list (share links / checkout URLs). */
export function selectionFromPartIds(param: string | null): BuildSelection {
  const selection: BuildSelection = {};
  for (const id of param?.split(',') ?? []) {
    const product = BUILDER_CATALOG.find((p) => p.id === id);
    if (product) selection[product.category] = product;
  }
  return selection;
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

/** Checks a candidate product against the rest of the build (its own slot is ignored). */
export function checkCompatibility(candidate: BuilderProduct, build: BuildSelection): CompatResult {
  const b: BuildSelection = { ...build };
  delete b[candidate.category];

  switch (candidate.category) {
    case 'cpu': {
      if (b.motherboard && b.motherboard.socket !== candidate.socket) {
        return { status: 'incompatible', message: `Socket ${candidate.socket} ≠ motherboard` };
      }
      if (b.psu?.wattage)
        return checkPsuHeadroom(b.psu.wattage, estimatePowerDraw({ ...b, cpu: candidate }));
      break;
    }
    case 'gpu': {
      if (b.psu?.wattage)
        return checkPsuHeadroom(b.psu.wattage, estimatePowerDraw({ ...b, gpu: candidate }));
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
      break;
    }
    case 'ram': {
      if (b.motherboard && b.motherboard.ramType !== candidate.ramType) {
        return {
          status: 'incompatible',
          message: `${candidate.ramType} RAM, board needs ${b.motherboard.ramType}`,
        };
      }
      break;
    }
    case 'psu': {
      if (candidate.wattage) return checkPsuHeadroom(candidate.wattage, estimatePowerDraw(b));
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
      break;
    }
    default:
      break;
  }
  return { status: 'compatible', message: 'Compatible' };
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
  const { cpu, motherboard, ram, psu, cooling } = build;
  const pcCase = build.case;
  const draw = estimatePowerDraw(build);

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

  return [socket, ramType, psuCheck, formFit, coolingCheck];
}

export function getCompatibilityScore(checks: BuildCheck[]): number {
  const applicable = checks.filter((c) => c.status !== 'pending');
  if (applicable.length === 0) return 100;
  const points = applicable.reduce(
    (sum, c) => sum + (c.status === 'compatible' ? 1 : c.status === 'warning' ? 0.5 : 0),
    0,
  );
  return Math.round((points / applicable.length) * 100);
}
