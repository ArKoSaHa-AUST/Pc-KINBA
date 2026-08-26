import type { BuilderProduct, ComponentCategory, FormFactor } from './builderCatalog';

export type BuildSelection = Partial<Record<ComponentCategory, BuilderProduct>>;

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
