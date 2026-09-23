import {
  BUDGET_TOLERANCE,
  COOLER_CLEARANCE_WARN_MM,
  GPU_CLEARANCE_WARN_MM,
  HIGH_TDP_COOLER_THRESHOLD_WATTS,
  PSU_HEADROOM_RATIO,
  RAM_SWEET_SPOT_MHZ,
} from './constants.js';
import { formFactorFits, isValidYearMonth } from './parse.js';
import { headroomPercent } from './power.js';
import type { CompatPart, RuleId, RuleResult } from './types.js';

/**
 * Every compatibility rule, as a pure function.
 *
 * Contract, enforced by tests:
 *   - returns `null`            -> not enough information to judge
 *                                  (NOT the same verdict as "compatible")
 *   - returns `severity: 'ok'`  -> checked and fine
 *   - returns `'warning'`/`'error'` -> checked and problematic
 *
 * `message` is the short string the builder UI shows. `detail` carries the structured
 * values behind it so callers can localise or render their own phrasing; the Tonima
 * validator turns `detail` into its long-form sentence via `formatViolationDetail`.
 */

type P = CompatPart | undefined;

const ok = (rule: RuleId, message: string, detail?: RuleResult['detail']): RuleResult => ({
  rule,
  severity: 'ok',
  message,
  ...(detail ? { detail } : {}),
});

const warn = (rule: RuleId, message: string, detail?: RuleResult['detail']): RuleResult => ({
  rule,
  severity: 'warning',
  message,
  ...(detail ? { detail } : {}),
});

const err = (rule: RuleId, message: string, detail?: RuleResult['detail']): RuleResult => ({
  rule,
  severity: 'error',
  message,
  ...(detail ? { detail } : {}),
});

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

/** CPU socket must match the motherboard socket. */
export function ruleSocketMatch(cpu: P, motherboard: P): RuleResult | null {
  if (!cpu?.socket || !motherboard?.socket) return null;

  if (cpu.socket !== motherboard.socket) {
    return err('socket_mismatch', `Socket ${cpu.socket} ≠ motherboard (${motherboard.socket})`, {
      cpuSocket: cpu.socket,
      moboSocket: motherboard.socket,
      cpuName: cpu.name,
      moboName: motherboard.name,
    });
  }
  return ok('socket_mismatch', `${cpu.socket} matched`, {
    cpuSocket: cpu.socket,
    moboSocket: motherboard.socket,
  });
}

/** RAM generation must match what the motherboard supports. */
export function ruleMemoryType(ram: P, motherboard: P): RuleResult | null {
  if (!ram?.memoryType || !motherboard?.memoryType) return null;

  if (ram.memoryType !== motherboard.memoryType) {
    return err('ram_mismatch', `${ram.memoryType} RAM on a ${motherboard.memoryType} board`, {
      ramType: ram.memoryType,
      moboRamType: motherboard.memoryType,
      ramName: ram.name,
      moboName: motherboard.name,
    });
  }
  return ok('ram_mismatch', `${ram.memoryType} supported`, {
    ramType: ram.memoryType,
    moboRamType: motherboard.memoryType,
  });
}

/** Motherboard must fit inside the case. */
export function ruleFormFactor(motherboard: P, pcCase: P): RuleResult | null {
  const fits = formFactorFits(motherboard?.formFactor, pcCase?.formFactor);
  if (fits === undefined) return null;

  const moboFF = motherboard?.formFactor;
  const caseFF = pcCase?.formFactor;

  if (!fits) {
    return err('form_factor', `${moboFF} board won't fit a ${caseFF} case`, {
      moboFormFactor: moboFF,
      caseFormFactor: caseFF,
      moboName: motherboard?.name,
      caseName: pcCase?.name,
    });
  }
  return ok('form_factor', `${moboFF} fits ${caseFF} case`, {
    moboFormFactor: moboFF,
    caseFormFactor: caseFF,
  });
}

/**
 * A CPU newer than its motherboard may need a BIOS flash on older retail stock.
 * 'YYYY-MM' strings compare lexicographically, which is all this rule needs.
 */
export function ruleBios(cpu: P, motherboard: P): RuleResult | null {
  const cpuDate = cpu?.releasedYearMonth;
  const moboDate = motherboard?.releasedYearMonth;
  if (!isValidYearMonth(cpuDate) || !isValidYearMonth(moboDate)) return null;
  // Only meaningful on a matched platform.
  if (cpu?.socket && motherboard?.socket && cpu.socket !== motherboard.socket) return null;

  if (cpuDate > moboDate) {
    return warn(
      'bios_support',
      'CPU is newer than this board — older stock may need a BIOS update (ask the retailer to flash it)',
      { cpuReleased: cpuDate, moboReleased: moboDate },
    );
  }
  return ok('bios_support', 'Supported out of the box', {
    cpuReleased: cpuDate,
    moboReleased: moboDate,
  });
}

// ---------------------------------------------------------------------------
// Power
// ---------------------------------------------------------------------------

/** PSU must cover estimated draw, with headroom above it. */
export function rulePsuHeadroom(psuWatts: number | undefined, drawWatts: number): RuleResult | null {
  if (psuWatts === undefined || !Number.isFinite(psuWatts) || psuWatts <= 0) return null;

  if (psuWatts < drawWatts) {
    return err('psu_insufficient', `Needs ~${drawWatts}W, PSU is ${psuWatts}W`, {
      drawWatts,
      psuWatts,
    });
  }
  if (psuWatts < drawWatts * PSU_HEADROOM_RATIO) {
    return warn(
      'psu_headroom',
      `Under ${Math.round((PSU_HEADROOM_RATIO - 1) * 100)}% PSU headroom (~${drawWatts}W draw)`,
      { drawWatts, psuWatts, headroomPercent: headroomPercent(psuWatts, drawWatts) },
    );
  }
  return ok('psu_headroom', `~${drawWatts}W draw on ${psuWatts}W PSU`, {
    drawWatts,
    psuWatts,
    headroomPercent: headroomPercent(psuWatts, drawWatts),
  });
}

/** PCIe / SATA power connector availability. */
export function rulePsuConnectors(psu: P, gpu: P, storage: P): RuleResult | null {
  if (psu?.pcie8pin === undefined) return null;

  if (storage?.storageInterface === 'sata' && !psu.sataPower) {
    return err('psu_connectors', 'PSU has no SATA power connector for the drive', {
      storageInterface: storage.storageInterface,
      sataPower: psu.sataPower ?? 0,
    });
  }

  if (!gpu) {
    return storage?.storageInterface
      ? ok('psu_connectors', 'No PCIe power required', {
          storageInterface: storage.storageInterface,
        })
      : null;
  }
  if (!gpu.gpuPower) return null; // connector requirement unknown for this GPU

  const { type, pcie8pin } = gpu.gpuPower;

  if (type === '12vhpwr') {
    if (psu.has12vhpwr) {
      return ok('psu_connectors', 'Native 12VHPWR cable', { connector: '12vhpwr', native: true });
    }
    return psu.pcie8pin >= pcie8pin
      ? warn(
          'psu_connectors',
          `12VHPWR via ${pcie8pin}×8-pin adapter — an ATX 3.0 PSU is safer`,
          {
            connector: '12vhpwr',
            native: false,
            required8pin: pcie8pin,
            available8pin: psu.pcie8pin,
          },
        )
      : err('psu_connectors', `Adapter needs ${pcie8pin}×8-pin, PSU has ${psu.pcie8pin}`, {
          connector: '12vhpwr',
          native: false,
          required8pin: pcie8pin,
          available8pin: psu.pcie8pin,
        });
  }

  return psu.pcie8pin >= pcie8pin
    ? ok('psu_connectors', `${pcie8pin}×8-pin available`, {
        connector: '8pin',
        required8pin: pcie8pin,
        available8pin: psu.pcie8pin,
      })
    : err('psu_connectors', `GPU needs ${pcie8pin}×8-pin, PSU has ${psu.pcie8pin}`, {
        connector: '8pin',
        required8pin: pcie8pin,
        available8pin: psu.pcie8pin,
      });
}

/** PSU physical format must be one the case accepts. */
export function rulePsuFormFactor(psu: P, pcCase: P): RuleResult | null {
  if (!psu?.psuFormFactor || !pcCase?.psuSupport?.length) return null;

  return pcCase.psuSupport.includes(psu.psuFormFactor)
    ? ok('psu_form_factor', `${psu.psuFormFactor} PSU fits`, {
        psuFormFactor: psu.psuFormFactor,
        caseSupports: pcCase.psuSupport,
      })
    : err(
        'psu_form_factor',
        `Case takes ${pcCase.psuSupport.join('/')} PSUs, not ${psu.psuFormFactor}`,
        { psuFormFactor: psu.psuFormFactor, caseSupports: pcCase.psuSupport },
      );
}

// ---------------------------------------------------------------------------
// Cooling
// ---------------------------------------------------------------------------

/** A high-TDP CPU needs a dedicated cooler rather than the stock one. */
export function ruleCoolingRequired(cpu: P, cooler: P): RuleResult | null {
  const tdp = cpu?.tdpWatts;
  if (!cpu || tdp === undefined) return null;

  if (cooler) {
    return ok('cooling_required', `${cooler.name} installed`, { cpuTdp: tdp, cooler: cooler.name });
  }
  if (tdp > HIGH_TDP_COOLER_THRESHOLD_WATTS) {
    return warn('cooling_required', `${tdp}W CPU has no cooler selected`, {
      cpuTdp: tdp,
      threshold: HIGH_TDP_COOLER_THRESHOLD_WATTS,
    });
  }
  return ok('cooling_required', 'Stock cooling sufficient', { cpuTdp: tdp });
}

/** Cooler height, or AIO radiator size, against what the case accepts. */
export function ruleCoolerClearance(cooler: P, pcCase: P): RuleResult | null {
  if (!cooler || !pcCase) return null;

  if (cooler.radiatorMm) {
    if (!pcCase.radiatorSupportMm?.length) return null;
    return pcCase.radiatorSupportMm.includes(cooler.radiatorMm)
      ? ok('cooler_clearance', `${cooler.radiatorMm}mm radiator mount available`, {
          radiatorMm: cooler.radiatorMm,
          caseSupports: pcCase.radiatorSupportMm,
        })
      : err(
          'cooler_clearance',
          `No ${cooler.radiatorMm}mm mount (case takes ${pcCase.radiatorSupportMm.join('/')}mm)`,
          { radiatorMm: cooler.radiatorMm, caseSupports: pcCase.radiatorSupportMm },
        );
  }

  if (cooler.heightMm === undefined || pcCase.maxCoolerHeightMm === undefined) return null;

  const spare = pcCase.maxCoolerHeightMm - cooler.heightMm;
  if (spare < 0) {
    return err(
      'cooler_clearance',
      `${cooler.heightMm}mm cooler exceeds ${pcCase.maxCoolerHeightMm}mm clearance`,
      {
        coolerHeightMm: cooler.heightMm,
        maxCoolerHeightMm: pcCase.maxCoolerHeightMm,
        spareMm: spare,
      },
    );
  }
  if (spare < COOLER_CLEARANCE_WARN_MM) {
    return warn('cooler_clearance', `${spare}mm spare — side panel may touch the cooler`, {
      coolerHeightMm: cooler.heightMm,
      maxCoolerHeightMm: pcCase.maxCoolerHeightMm,
      spareMm: spare,
    });
  }
  return ok('cooler_clearance', `${cooler.heightMm}mm cooler, ${spare}mm spare`, {
    coolerHeightMm: cooler.heightMm,
    maxCoolerHeightMm: pcCase.maxCoolerHeightMm,
    spareMm: spare,
  });
}

/** Cooler must ship a bracket for the CPU socket. */
export function ruleCoolerSocket(cooler: P, cpu: P): RuleResult | null {
  if (!cooler?.coolerSockets?.length || !cpu?.socket) return null;

  return cooler.coolerSockets.includes(cpu.socket)
    ? ok('cooler_socket', `${cpu.socket} bracket included`, {
        cpuSocket: cpu.socket,
        coolerSockets: cooler.coolerSockets,
      })
    : err('cooler_socket', `No ${cpu.socket} bracket (supports ${cooler.coolerSockets.join('/')})`, {
        cpuSocket: cpu.socket,
        coolerSockets: cooler.coolerSockets,
      });
}

// ---------------------------------------------------------------------------
// Physical fit
// ---------------------------------------------------------------------------

/** GPU length against the case limit. */
export function ruleGpuClearance(gpu: P, pcCase: P): RuleResult | null {
  if (gpu?.lengthMm === undefined || pcCase?.maxGpuLengthMm === undefined) return null;

  const spare = pcCase.maxGpuLengthMm - gpu.lengthMm;
  if (spare < 0) {
    return err('gpu_clearance', `${gpu.lengthMm}mm GPU exceeds ${pcCase.maxGpuLengthMm}mm case limit`, {
      gpuLengthMm: gpu.lengthMm,
      maxGpuLengthMm: pcCase.maxGpuLengthMm,
      spareMm: spare,
    });
  }
  if (spare < GPU_CLEARANCE_WARN_MM) {
    return warn('gpu_clearance', `Only ${spare}mm spare — a front radiator may block it`, {
      gpuLengthMm: gpu.lengthMm,
      maxGpuLengthMm: pcCase.maxGpuLengthMm,
      spareMm: spare,
    });
  }
  return ok('gpu_clearance', `${gpu.lengthMm}mm GPU, ${spare}mm spare`, {
    gpuLengthMm: gpu.lengthMm,
    maxGpuLengthMm: pcCase.maxGpuLengthMm,
    spareMm: spare,
  });
}

// ---------------------------------------------------------------------------
// Memory, storage, ports
// ---------------------------------------------------------------------------

/** RAM module count, total capacity and speed against the board's limits. */
export function ruleRamFit(ram: P, motherboard: P, cpu: P): RuleResult | null {
  if (!ram || !motherboard) return null;

  if (ram.moduleCount && motherboard.ramSlots && ram.moduleCount > motherboard.ramSlots) {
    return err(
      'ram_fit',
      `${ram.moduleCount} modules but the board has ${motherboard.ramSlots} DIMM slots`,
      { moduleCount: ram.moduleCount, ramSlots: motherboard.ramSlots },
    );
  }
  if (ram.capacityGb && motherboard.maxRamGb && ram.capacityGb > motherboard.maxRamGb) {
    return err('ram_fit', `${ram.capacityGb}GB exceeds the board's ${motherboard.maxRamGb}GB max`, {
      capacityGb: ram.capacityGb,
      maxRamGb: motherboard.maxRamGb,
    });
  }

  const socket = cpu?.socket ?? motherboard.socket;
  const sweet = socket ? RAM_SWEET_SPOT_MHZ[socket] : undefined;
  if (ram.speedMhz && sweet && ram.speedMhz > sweet) {
    return warn(
      'ram_fit',
      `${ram.memoryType}-${ram.speedMhz} is above the ${socket} sweet spot (${sweet}) — may need manual tuning`,
      { speedMhz: ram.speedMhz, sweetSpotMhz: sweet, socket },
    );
  }

  if (!ram.speedMhz && !ram.moduleCount) return null;

  return ok(
    'ram_fit',
    ram.speedMhz ? `${ram.memoryType}-${ram.speedMhz} within platform range` : 'Kit fits the board',
    { speedMhz: ram.speedMhz, moduleCount: ram.moduleCount },
  );
}

/** M.2 slots that disable SATA ports when populated. */
export function ruleM2Sata(storage: P, motherboard: P): RuleResult | null {
  if (!storage?.storageInterface || motherboard?.m2Slots === undefined) return null;

  const ports = `${motherboard.m2Slots}× M.2 · ${motherboard.sataPorts ?? 0}× SATA`;
  if (!motherboard.m2SataShared) {
    return ok('m2_sata_shared', `${ports}, no shared lanes`, {
      m2Slots: motherboard.m2Slots,
      sataPorts: motherboard.sataPorts ?? 0,
    });
  }
  return storage.storageInterface === 'sata'
    ? warn('m2_sata_shared', `${motherboard.m2SataShared} — keep the drive on SATA 1–4`, {
        shared: motherboard.m2SataShared,
        storageInterface: storage.storageInterface,
      })
    : ok('m2_sata_shared', `${motherboard.m2SataShared} — use M.2_1 to keep all SATA ports`, {
        shared: motherboard.m2SataShared,
        storageInterface: storage.storageInterface,
      });
}

/** PCIe generation and lane sharing between a second NVMe drive and the GPU slot. */
export function rulePcieLanes(storage: P, storage2: P, motherboard: P): RuleResult | null {
  if (!motherboard || (!storage && !storage2)) return null;

  if (storage2?.storageInterface === 'nvme' && motherboard.m2SharesGpuLanes) {
    return warn('pcie_lanes', `${motherboard.m2SharesGpuLanes} — a 2nd NVMe drive may slow the GPU`, {
      shared: motherboard.m2SharesGpuLanes,
    });
  }

  const drive = [storage, storage2].find((d) => d?.pcieGen && motherboard.pcieGen);
  if (drive?.pcieGen && motherboard.pcieGen && drive.pcieGen > motherboard.pcieGen) {
    return warn(
      'pcie_lanes',
      `Gen${drive.pcieGen} SSD will run at Gen${motherboard.pcieGen} speed on this board`,
      { drivePcieGen: drive.pcieGen, boardPcieGen: motherboard.pcieGen },
    );
  }

  if (!drive && !storage2) return null;

  return ok(
    'pcie_lanes',
    drive ? `Gen${drive.pcieGen} SSD fully supported` : 'No lane sharing issues',
    drive?.pcieGen ? { drivePcieGen: drive.pcieGen, boardPcieGen: motherboard.pcieGen } : undefined,
  );
}

/** A case front USB-C port is dead without a board header. */
export function ruleFrontUsbC(pcCase: P, motherboard: P): RuleResult | null {
  if (pcCase?.frontUsbC === undefined || motherboard?.usbCHeader === undefined) return null;

  if (!pcCase.frontUsbC) {
    return ok('front_usb_c', 'Case has no front USB-C port', { frontUsbC: false });
  }
  return motherboard.usbCHeader
    ? ok('front_usb_c', 'Front USB-C header available', { frontUsbC: true, usbCHeader: true })
    : warn('front_usb_c', 'Case front USB-C port has no header on this board — it will be dead', {
        frontUsbC: true,
        usbCHeader: false,
      });
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/** Ceiling a build total may reach before `budget_exceeded` fires. */
export function getBudgetCeiling(budgetBDT: number | undefined): number {
  if (!budgetBDT || budgetBDT <= 0) return Number.POSITIVE_INFINITY;
  return Math.round(budgetBDT * (1 + BUDGET_TOLERANCE));
}

/** Build total against the user's stated budget. */
export function ruleBudget(
  totalBDT: number | undefined,
  budgetBDT: number | undefined,
): RuleResult | null {
  if (!budgetBDT || budgetBDT <= 0) return null;
  if (totalBDT === undefined || !Number.isFinite(totalBDT) || totalBDT <= 0) return null;

  const ceiling = getBudgetCeiling(budgetBDT);
  const overBy = totalBDT - budgetBDT;

  if (totalBDT > ceiling) {
    return err('budget_exceeded', `৳${totalBDT.toLocaleString('en-IN')} is over budget`, {
      totalBDT,
      budgetBDT,
      ceiling,
      overBy,
    });
  }
  return ok('budget_exceeded', `৳${totalBDT.toLocaleString('en-IN')} within budget`, {
    totalBDT,
    budgetBDT,
    ceiling,
    overBy,
  });
}
