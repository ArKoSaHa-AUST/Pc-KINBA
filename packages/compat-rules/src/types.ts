/**
 * Canonical domain types for the PC Kinba hardware compatibility engine.
 *
 * This package is the SINGLE source of truth for compatibility rules. Both the React
 * builder (client/src/components/builder/compatibility.ts) and the Tonima AI validator
 * (lib/ai/validator.js) map their own product shape onto `CompatPart` and call in here.
 *
 * Design contract: every rule returns `null` when its required inputs are missing.
 * "Not enough information" is NOT the same verdict as "compatible", and conflating the
 * two is how an engine silently passes an incompatible pair.
 */

export type CompatCategory =
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'ram'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooler';

/**
 * CPU / motherboard socket. Open string rather than a closed union: new sockets ship
 * every year and an unrecognised one must not become a type error. Always upper-cased
 * by `parseSocket`.
 */
export type Socket = string;

export type MemoryType = 'DDR3' | 'DDR4' | 'DDR5';

/**
 * Motherboard form factor, or for a case the LARGEST board it accepts.
 * Canonical casing is exactly these four strings; `parseFormFactor` accepts the
 * many spellings retailers use ('Micro-ATX', 'MATX', 'Mini-ITX', 'EATX', ...).
 */
export type FormFactor = 'ITX' | 'mATX' | 'ATX' | 'E-ATX';

export type PsuFormFactor = 'ATX' | 'SFX';

export type StorageInterface = 'nvme' | 'sata';

export type GpuPowerType = '8pin' | '12vhpwr';

export interface GpuPowerRequirement {
  type: GpuPowerType;
  /** Number of PCIe 8-pin (6+2) connectors required, directly or via adapter. */
  pcie8pin: number;
}

/**
 * Normalised part shape. Only `id`, `category` and `name` are required: every other
 * field is genuinely optional because neither the curated catalog nor the scraped
 * Supabase catalog can guarantee it.
 */
export interface CompatPart {
  id: string;
  category: CompatCategory;
  name: string;
  priceBDT?: number;

  // Platform
  socket?: Socket; // cpu, motherboard, (cooler via coolerSockets)
  memoryType?: MemoryType; // ram, motherboard
  formFactor?: FormFactor; // motherboard; case = largest supported
  /** 'YYYY-MM'. A CPU newer than its board is the classic BIOS trap. */
  releasedYearMonth?: string; // cpu, motherboard

  // Power
  tdpWatts?: number; // cpu, gpu
  psuWatts?: number; // psu rated output
  pcie8pin?: number; // psu: PCIe 8-pin (6+2) connectors available
  has12vhpwr?: boolean; // psu: native 12VHPWR / 12V-2x6
  sataPower?: number; // psu: SATA power connectors available
  gpuPower?: GpuPowerRequirement; // gpu: what it needs
  psuFormFactor?: PsuFormFactor; // psu
  psuSupport?: PsuFormFactor[]; // case

  // Physical clearance (mm)
  lengthMm?: number; // gpu
  heightMm?: number; // air cooler
  radiatorMm?: number; // aio cooler
  maxGpuLengthMm?: number; // case
  maxCoolerHeightMm?: number; // case
  radiatorSupportMm?: number[]; // case

  // Memory detail
  ramSlots?: number; // motherboard
  maxRamGb?: number; // motherboard
  moduleCount?: number; // ram kit
  capacityGb?: number; // ram kit total
  speedMhz?: number; // ram

  // Storage & lanes
  storageInterface?: StorageInterface; // storage
  pcieGen?: number; // storage drive, or motherboard M.2 slot
  m2Slots?: number; // motherboard
  sataPorts?: number; // motherboard
  /** e.g. 'M2_2 disables SATA 5/6' */
  m2SataShared?: string; // motherboard
  /** e.g. 'M.2_2 drops the GPU slot to x8' */
  m2SharesGpuLanes?: string; // motherboard

  // Cooler / case extras
  coolerSockets?: Socket[]; // cooler bracket support
  frontUsbC?: boolean; // case
  usbCHeader?: boolean; // motherboard front-panel USB-C header
}

/**
 * A build under evaluation. `storage2` is a second drive slot; everything else is
 * one part per category.
 */
export interface CompatBuild {
  cpu?: CompatPart;
  gpu?: CompatPart;
  motherboard?: CompatPart;
  ram?: CompatPart;
  storage?: CompatPart;
  storage2?: CompatPart;
  psu?: CompatPart;
  case?: CompatPart;
  cooler?: CompatPart;
}

export type BuildSlot = keyof CompatBuild;

/**
 * Stable machine identifiers. The first seven are BYTE-IDENTICAL to the strings
 * lib/ai/validator.js has always emitted in `violations[].rule`; tests, the Tonima
 * HUD and stored AI sessions depend on them. Never rename one — add a new id instead.
 */
export type RuleId =
  // --- shared with the backend validator, ids frozen ---
  | 'socket_mismatch'
  | 'ram_mismatch'
  | 'psu_insufficient'
  | 'psu_headroom'
  | 'form_factor'
  | 'cooling_required'
  | 'budget_exceeded'
  // --- ported from the builder, now available to both sides ---
  | 'gpu_clearance'
  | 'cooler_clearance'
  | 'cooler_socket'
  | 'psu_connectors'
  | 'psu_form_factor'
  | 'bios_support'
  | 'm2_sata_shared'
  | 'ram_fit'
  | 'pcie_lanes'
  | 'front_usb_c';

export type Severity = 'ok' | 'warning' | 'error';

export interface RuleResult {
  rule: RuleId;
  severity: Severity;
  /** Human-readable English. Callers localise via `detail` where they need to. */
  message: string;
  /** Structured values behind the message, for i18n and richer UI. */
  detail?: Record<string, unknown>;
}

export interface CompatReport {
  /** True when no rule returned `warning` or `error`. */
  ok: boolean;
  /** Every rule that had enough input to run, including the `ok` ones. */
  results: RuleResult[];
  /** Estimated peak system draw in watts. */
  wattage: number;
  /** PSU rated output in watts, or `undefined` when unknown. */
  psuWattage?: number;
}
