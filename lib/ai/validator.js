/**
 * PC-KINBA Deterministic Compatibility Engine — Tonima AI adapter.
 *
 * ---------------------------------------------------------------------------
 * Compatibility rules live in `@pc-kinba/compat-rules` (packages/compat-rules).
 * Do NOT add rule logic here — this file only maps this side's product shape
 * (a Supabase product + `specs` blob + `bench` blob) onto `CompatPart`, and maps
 * the shared `RuleResult` back onto the `{ ok, violations, wattage, psuWattage,
 * score }` shape that planner.js, refiner.js and the SSE build event expect.
 * ---------------------------------------------------------------------------
 *
 * The `extract*` helpers below are the adapter layer: best-effort inference from
 * free-text retailer product names. They return `undefined` when the name is
 * uninformative — a guessed value presented as a fact is how a compatibility
 * engine silently passes a build it never actually checked.
 */

import {
  evaluateBuild,
  formatViolationDetail,
  parseFormFactor,
  parseMemoryType,
  parsePsuFormFactor,
  parseSocket,
  parseStorageInterface,
  parseWattage,
  problemsOf,
  scoreViolations,
  estimatePowerDraw as sharedEstimatePowerDraw,
  formFactorRank,
  DEFAULT_CPU_TDP_WATTS,
  DEFAULT_GPU_TDP_WATTS
} from "@pc-kinba/compat-rules";
import { getBudgetCeiling } from "./budget.js";

/** PSU wattage assumed when a PSU is present but its rating cannot be read. */
const FALLBACK_PSU_WATTS = 650;

/**
 * Reads a value from the several places a scraped product may carry it:
 * a top-level column, the `specs` blob, or the `bench` blob.
 */
function readField(product, ...keys) {
  if (!product) return undefined;
  const specs = product.specs || {};
  const bench = product.bench || {};
  for (const key of keys) {
    for (const source of [product, specs, bench]) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

/**
 * Extracts the CPU / motherboard socket.
 * @returns {string|undefined} Canonical upper-case socket, or undefined when unknown.
 */
export function extractSocket(product) {
  const declared = parseSocket(readField(product, "socket"));
  if (declared) return declared;

  const name = (product?.name || "").toUpperCase();
  if (!name) return undefined;

  if (/\bAM5\b|B650|X670|A620|X870|B850|7\d{3}X?|9\d{3}X?|8\d{3}G/i.test(name)) return "AM5";
  if (/\bAM4\b|B550|B450|A520|X570|5\d{3}[XG]?|3\d{3}[XG]?|4\d{3}G?/i.test(name)) return "AM4";
  if (/\bLGA1851\b|Z890|B860|ULTRA\s*[579]/i.test(name)) return "LGA1851";
  if (/\bLGA1700\b|B760|Z790|H610|B660|Z690|1[234]\d{3}[KkFf]*/i.test(name)) return "LGA1700";
  if (/\bLGA1200\b|B560|H510|Z590|1[01]\d{3}/i.test(name)) return "LGA1200";

  return undefined;
}

/**
 * Extracts the memory generation (DDR4 / DDR5).
 *
 * BEHAVIOUR CHANGE (2026-09): this used to fall back to "DDR5" when it could not
 * tell. That guess produced false `ram_mismatch` violations whenever one side of
 * the pair was genuinely known and the other was not — e.g. a known DDR4 kit next
 * to a board whose name says nothing would be reported as a conflict. It now
 * returns undefined and the rule declines to judge.
 *
 * @returns {'DDR3'|'DDR4'|'DDR5'|undefined}
 */
export function extractRamType(product) {
  const declared = parseMemoryType(readField(product, "ram_type", "memory_type"));
  if (declared) return declared;

  const name = (product?.name || "").toUpperCase();
  if (!name) return undefined;

  if (
    name.includes("DDR5") ||
    name.includes("D5") ||
    name.includes("6000MHZ") ||
    name.includes("5600MHZ") ||
    name.includes("5200MHZ") ||
    name.includes("B650") ||
    name.includes("X670") ||
    name.includes("Z890") ||
    name.includes("AM5")
  ) {
    return "DDR5";
  }
  if (
    name.includes("DDR4") ||
    name.includes("D4") ||
    name.includes("3200MHZ") ||
    name.includes("3600MHZ") ||
    name.includes("AM4") ||
    name.includes("B450") ||
    name.includes("B550")
  ) {
    return "DDR4";
  }

  return undefined;
}

/**
 * Extracts the form factor. For a case this is the LARGEST board it accepts, so a
 * list of supported sizes reduces to its biggest entry.
 *
 * BEHAVIOUR CHANGE (2026-09): this used to fall back to "ATX". That guess produced
 * false `form_factor` violations for an unknown board in a known ITX case, and
 * false passes for an unknown case. It now returns undefined when it cannot tell.
 *
 * @returns {'ITX'|'mATX'|'ATX'|'E-ATX'|undefined}
 */
export function extractFormFactor(product) {
  const supported = readField(product, "supported_form_factors", "form_factors");
  if (Array.isArray(supported) && supported.length > 0) {
    let best;
    let bestRank = -1;
    for (const entry of supported) {
      const parsed = parseFormFactor(String(entry));
      const rank = formFactorRank(parsed);
      if (parsed && rank !== undefined && rank > bestRank) {
        best = parsed;
        bestRank = rank;
      }
    }
    if (best) return best;
  }

  const declared = parseFormFactor(readField(product, "form_factor"));
  if (declared) return declared;

  return parseFormFactor(product?.name);
}

/**
 * Extracts the PSU rated output in watts.
 *
 * Unlike the other extractors this keeps a numeric fallback: `validateBuild` has
 * always reported a `psuWattage` number and the Tonima HUD renders it directly.
 * @returns {number}
 */
export function extractPsuWattage(psu) {
  if (!psu) return FALLBACK_PSU_WATTS;
  return parseWattage(readField(psu, "wattage")) ?? parseWattage(psu.name) ?? FALLBACK_PSU_WATTS;
}

/** @returns {number|undefined} TDP in watts, or undefined when the part does not report one. */
function extractTdp(product) {
  const raw = readField(product, "tdp_watts", "tdp", "power_consumption");
  if (raw === undefined) return undefined;
  const value = typeof raw === "number" ? raw : Number.parseInt(String(raw).replace(/\D/g, ""), 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** @returns {number|undefined} */
function extractNumber(product, ...keys) {
  const raw = readField(product, ...keys);
  if (raw === undefined) return undefined;
  const value = typeof raw === "number" ? raw : Number.parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Like `extractNumber` but accepts 0, for connector/slot COUNTS where zero is a
 * real answer ("this PSU has no SATA leads") rather than a missing value.
 * @returns {number|undefined}
 */
function extractCount(product, ...keys) {
  const raw = readField(product, ...keys);
  if (raw === undefined) return undefined;
  const value = typeof raw === "number" ? raw : Number.parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Coerces the several ways a boolean arrives from Postgres / a specs blob. */
function toBoolean(raw) {
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

/** @returns {string[]|undefined} */
function extractSocketList(product, ...keys) {
  const raw = readField(product, ...keys);
  if (!raw) return undefined;
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,/|]/);
  const sockets = list.map((s) => parseSocket(String(s))).filter(Boolean);
  return sockets.length > 0 ? sockets : undefined;
}

/**
 * Maps a Tonima candidate onto the shared `CompatPart` shape.
 *
 * @param {string} category - canonical slot key ('cpu' | 'gpu' | ... | 'cooler')
 * @param {any} candidate - Supabase product enriched with `specs` / `bench`
 * @returns {import("@pc-kinba/compat-rules").CompatPart|undefined}
 */
export function toCompatPart(category, candidate) {
  if (!candidate) return undefined;

  /** @type {any} */
  const part = {
    id: String(candidate.id ?? ""),
    category,
    name: candidate.name || "",
    priceBDT: typeof candidate.best_price === "number" ? candidate.best_price : undefined
  };

  // Extract each attribute ONLY for the categories it means something on. The
  // name-regex fallbacks are deliberately loose so they can read a socket out of
  // "Ryzen 5 5600"; applied to the wrong category they produce nonsense, e.g. a
  // "DDR4-3200" kit matching the Ryzen-3000 pattern and coming back as AM4.
  if (category === "cpu" || category === "motherboard") {
    const socket = extractSocket(candidate);
    if (socket) part.socket = socket;
  }

  if (category === "ram" || category === "motherboard") {
    const memoryType = extractRamType(candidate);
    if (memoryType) part.memoryType = memoryType;
  }

  if (category === "motherboard" || category === "case") {
    const formFactor = extractFormFactor(candidate);
    if (formFactor) part.formFactor = formFactor;
  }

  if (category === "cpu" || category === "gpu") {
    const tdp = extractTdp(candidate);
    if (tdp !== undefined) part.tdpWatts = tdp;
  }

  if (category === "psu") {
    part.psuWatts = extractPsuWattage(candidate);
  }

  // Physical clearance — present on curated data, usually absent on scraped listings.
  // The shared rules decline to judge when these are missing, which is the point.
  const lengthMm = extractNumber(candidate, "length_mm", "length", "card_length");
  if (category === "gpu" && lengthMm !== undefined) part.lengthMm = lengthMm;

  const heightMm = extractNumber(candidate, "height_mm", "height");
  if (category === "cooler" && heightMm !== undefined) part.heightMm = heightMm;

  const radiatorMm = extractNumber(candidate, "radiator_mm", "radiator");
  if (category === "cooler" && radiatorMm !== undefined) part.radiatorMm = radiatorMm;

  if (category === "cooler") {
    const sockets = extractSocketList(candidate, "supported_sockets", "cooler_sockets");
    if (sockets) part.coolerSockets = sockets;
  }

  if (category === "case") {
    const maxGpu = extractNumber(candidate, "max_gpu_length", "max_gpu_length_mm");
    if (maxGpu !== undefined) part.maxGpuLengthMm = maxGpu;

    const maxCooler = extractNumber(candidate, "max_cooler_height", "max_cooler_height_mm");
    if (maxCooler !== undefined) part.maxCoolerHeightMm = maxCooler;

    const radiators = readField(candidate, "radiator_support", "radiator_support_mm");
    if (Array.isArray(radiators) && radiators.length > 0) {
      part.radiatorSupportMm = radiators.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    }

    const psuSupport = readField(candidate, "psu_support", "supported_psu_form_factors");
    if (Array.isArray(psuSupport) && psuSupport.length > 0) {
      part.psuSupport = psuSupport.map((v) => parsePsuFormFactor(String(v))).filter(Boolean);
    }

    const frontUsbC = readField(candidate, "front_usb_c");
    if (frontUsbC !== undefined) part.frontUsbC = toBoolean(frontUsbC);
  }

  // Power connectors. Absent from scraped listings today; mapped so the shared
  // connector rules light up the moment the ingestion pipeline supplies them.
  if (category === "psu") {
    const pcie8pin = extractCount(candidate, "pcie_8pin", "pcie8pin");
    if (pcie8pin !== undefined) part.pcie8pin = pcie8pin;

    const has12vhpwr = readField(candidate, "has_12vhpwr", "12vhpwr");
    if (has12vhpwr !== undefined) part.has12vhpwr = toBoolean(has12vhpwr);

    const sataPower = extractCount(candidate, "sata_power", "sata_power_connectors");
    if (sataPower !== undefined) part.sataPower = sataPower;

    const psuFormFactor = parsePsuFormFactor(readField(candidate, "psu_form_factor"));
    if (psuFormFactor) part.psuFormFactor = psuFormFactor;
  }

  if (category === "gpu") {
    const connector = readField(candidate, "gpu_power", "power_connector");
    if (connector && typeof connector === "object" && connector.type) {
      part.gpuPower = {
        type: String(connector.type) === "12vhpwr" ? "12vhpwr" : "8pin",
        pcie8pin: Number(connector.pcie8pin) || 0
      };
    }
  }

  if (category === "storage") {
    const iface = parseStorageInterface(
      readField(candidate, "storage_interface", "interface") || candidate.name
    );
    if (iface) part.storageInterface = iface;

    const gen = extractNumber(candidate, "pcie_gen", "pcie_generation");
    if (gen !== undefined) part.pcieGen = gen;
  }

  if (category === "motherboard") {
    const m2Slots = extractCount(candidate, "m2_slots");
    if (m2Slots !== undefined) part.m2Slots = m2Slots;

    const sataPorts = extractCount(candidate, "sata_ports");
    if (sataPorts !== undefined) part.sataPorts = sataPorts;

    const m2SataShared = readField(candidate, "m2_sata_shared");
    if (m2SataShared) part.m2SataShared = String(m2SataShared);

    const m2SharesGpuLanes = readField(candidate, "m2_shares_gpu_lanes");
    if (m2SharesGpuLanes) part.m2SharesGpuLanes = String(m2SharesGpuLanes);

    const ramSlots = extractNumber(candidate, "ram_slots");
    if (ramSlots !== undefined) part.ramSlots = ramSlots;

    const maxRamGb = extractNumber(candidate, "max_ram_gb");
    if (maxRamGb !== undefined) part.maxRamGb = maxRamGb;

    const gen = extractNumber(candidate, "pcie_gen", "pcie_generation");
    if (gen !== undefined) part.pcieGen = gen;

    const usbCHeader = readField(candidate, "usb_c_header");
    if (usbCHeader !== undefined) part.usbCHeader = toBoolean(usbCHeader);
  }

  if (category === "ram") {
    const moduleCount = extractNumber(candidate, "module_count", "modules");
    if (moduleCount !== undefined) part.moduleCount = moduleCount;

    const capacityGb = extractNumber(candidate, "capacity_gb", "capacity");
    if (capacityGb !== undefined) part.capacityGb = capacityGb;

    const speedMhz = extractNumber(candidate, "speed_mhz", "speed");
    if (speedMhz !== undefined) part.speedMhz = speedMhz;
  }

  if (category === "cpu" || category === "motherboard") {
    const released = readField(candidate, "released", "release_date");
    if (typeof released === "string" && /^\d{4}-\d{2}/.test(released)) {
      part.releasedYearMonth = released.slice(0, 7);
    }
  }

  return part;
}

/**
 * Estimates peak power draw in watts for a selected parts map of raw candidates.
 *
 * Kept on the Tonima side of the boundary because it uses `assumeDefaults: true`:
 * scraped listings frequently carry no TDP, and under-sizing a PSU is the more
 * expensive mistake. The builder uses the same shared function with defaults off.
 *
 * @param {Record<string, any>} partsMap
 * @returns {number}
 */
export function estimateBuildWattage(partsMap = {}) {
  return sharedEstimatePowerDraw(
    {
      cpu: partsMap.cpu ? toCompatPart("cpu", partsMap.cpu) : undefined,
      gpu: partsMap.gpu ? toCompatPart("gpu", partsMap.gpu) : undefined
    },
    { assumeDefaults: true }
  );
}

/**
 * Validates a PC build against the shared compatibility rules.
 *
 * @param {Object} build - `{ parts: Record<string, candidateId>, total_bdt?: number }`
 * @param {Record<string, any>} candidateLookup - id -> Candidate
 * @param {number} [budgetBDT] - target user budget in BDT
 * @returns {{ ok: boolean, violations: Array<{ rule: string, detail: string }>, wattage: number, psuWattage: number, score: number }}
 */
export function validateBuild(build, candidateLookup = {}, budgetBDT = 0) {
  const parts = build?.parts || {};

  /** @type {import("@pc-kinba/compat-rules").CompatBuild} */
  const compatBuild = {};
  for (const category of ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooler"]) {
    const candidate = candidateLookup[parts[category]];
    if (candidate) compatBuild[category] = toCompatPart(category, candidate);
  }

  const report = evaluateBuild(compatBuild, {
    power: { assumeDefaults: true }
  });

  // Filter out any default budget checks and apply agent's hard ceiling
  const problems = problemsOf(report).filter((p) => p.rule !== "budget_exceeded");
  const ceiling = getBudgetCeiling(budgetBDT);
  const totalBDT = build?.total_bdt ?? Object.values(compatBuild).reduce((sum, p) => sum + (p?.priceBDT ?? 0), 0);

  if (budgetBDT > 0 && totalBDT > ceiling) {
    const overBy = totalBDT - budgetBDT;
    problems.push({
      rule: "budget_exceeded",
      severity: "error",
      message: `৳${totalBDT.toLocaleString("en-IN")} is over budget`,
      detail: {
        totalBDT,
        budgetBDT,
        ceiling,
        overBy
      }
    });
  }

  return {
    ok: problems.length === 0,
    violations: problems.map((p) => ({ rule: p.rule, detail: formatViolationDetail(p) })),
    wattage: report.wattage,
    psuWattage: report.psuWattage ?? FALLBACK_PSU_WATTS,
    score: scoreViolations(problems)
  };
}

export { DEFAULT_CPU_TDP_WATTS, DEFAULT_GPU_TDP_WATTS };
