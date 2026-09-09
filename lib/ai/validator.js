/**
 * PC-KINBA Deterministic Compatibility Engine (Server-side Validator)
 * Validates socket clearances, memory generations, power draw/PSU headroom, and form factors.
 */

const FORM_FACTOR_RANK = {
  ITX: 0,
  "MINI-ITX": 0,
  MATX: 1,
  "MICRO-ATX": 1,
  ATX: 2,
  "E-ATX": 3
};

const BASE_DRAW_WATTS = 75; // Motherboard, RAM, Storage, Fans

/**
 * Extracts socket from product name or specs.
 */
export function extractSocket(product) {
  const specs = product.specs || {};
  if (specs.socket) return specs.socket.toUpperCase().trim();
  if (product.bench?.socket) return product.bench.socket.toUpperCase().trim();

  const name = (product.name || "").toUpperCase();
  if (/\bAM5\b|B650|X670|A620|X870|B850|7\d{3}X?|9\d{3}X?|8\d{3}G/i.test(name)) return "AM5";
  if (/\bAM4\b|B550|B450|A520|X570|5\d{3}[XG]?|3\d{3}[XG]?|4\d{3}G?/i.test(name)) return "AM4";
  if (/\bLGA1851\b|Z890|B860|ULTRA\s*[579]/i.test(name)) return "LGA1851";
  if (/\bLGA1700\b|B760|Z790|H610|B660|Z690|1[234]\d{3}[KkFf]*/i.test(name)) return "LGA1700";
  if (/\bLGA1200\b|B560|H510|Z590|1[01]\d{3}/i.test(name)) return "LGA1200";

  return "UNKNOWN";
}

/**
 * Extracts RAM generation (DDR4 / DDR5) from product.
 */
export function extractRamType(product) {
  const specs = product.specs || {};
  if (specs.ram_type || specs.memory_type) {
    const t = (specs.ram_type || specs.memory_type).toUpperCase();
    if (t.includes("DDR5")) return "DDR5";
    if (t.includes("DDR4")) return "DDR4";
  }

  const name = (product.name || "").toUpperCase();
  if (name.includes("DDR5") || name.includes("D5") || name.includes("6000MHZ") || name.includes("5600MHZ") || name.includes("5200MHZ") || name.includes("B650") || name.includes("X670") || name.includes("Z890") || name.includes("AM5")) {
    return "DDR5";
  }
  if (name.includes("DDR4") || name.includes("D4") || name.includes("3200MHZ") || name.includes("3600MHZ") || name.includes("AM4") || name.includes("B450") || name.includes("B550")) {
    return "DDR4";
  }

  return "DDR5";
}

/**
 * Extracts form factor (ITX / mATX / ATX).
 */
export function extractFormFactor(product) {
  const specs = product.specs || {};
  const raw = (specs.form_factor || product.name || "").toUpperCase();
  if (raw.includes("MINI-ITX") || raw.includes("ITX")) return "ITX";
  if (raw.includes("MICRO-ATX") || raw.includes("MATX") || raw.includes("M-ATX") || /-[ME]\b/.test(raw) || /PRO\s*B\d{3}M/i.test(raw)) return "MATX";
  if (raw.includes("E-ATX") || raw.includes("EATX")) return "E-ATX";
  return "ATX";
}

/**
 * Extracts PSU wattage rating in Watts.
 */
export function extractPsuWattage(psu) {
  if (!psu) return 650;
  const specs = psu.specs || {};
  if (specs.wattage) {
    const num = parseInt(specs.wattage.replace(/\D/g, ""), 10);
    if (num > 0) return num;
  }
  const match = (psu.name || "").match(/(\d{3,4})\s*[wW]/);
  return match ? parseInt(match[1], 10) : 650;
}

/**
 * Estimates peak power draw in Watts for a selected parts list.
 */
export function estimateBuildWattage(partsMap = {}) {
  let draw = BASE_DRAW_WATTS;

  if (partsMap.cpu) {
    const cpuTdp = partsMap.cpu.bench?.tdp_watts || 
      parseInt(partsMap.cpu.specs?.tdp || "65", 10) || 65;
    draw += cpuTdp;
  }

  if (partsMap.gpu) {
    const gpuTdp = partsMap.gpu.bench?.tdp_watts || 
      parseInt(partsMap.gpu.specs?.tdp || partsMap.gpu.specs?.power_consumption || "220", 10) || 220;
    draw += gpuTdp;
  }

  return draw;
}

/**
 * Validates a PC build against deterministic hardware compatibility rules.
 * 
 * @param {Object} build - Build object with parts map or IDs
 * @param {Record<string, import("./schemas.js").Candidate>} candidateLookup - Lookup of id -> Candidate
 * @param {number} [budgetBDT] - Target user budget in BDT
 * @returns {{ ok: boolean, violations: Array<{ rule: string, detail: string }>, wattage: number, psuWattage: number, score: number }}
 */
export function validateBuild(build, candidateLookup = {}, budgetBDT = 0) {
  const parts = build.parts || {};
  const violations = [];

  const cpu = candidateLookup[parts.cpu];
  const gpu = parts.gpu ? candidateLookup[parts.gpu] : null;
  const motherboard = candidateLookup[parts.motherboard];
  const ram = candidateLookup[parts.ram];
  const psu = candidateLookup[parts.psu];
  const pcCase = candidateLookup[parts.case];
  const cooler = parts.cooler ? candidateLookup[parts.cooler] : null;

  // 1. Socket Compatibility (CPU ↔ Motherboard)
  if (cpu && motherboard) {
    const cpuSocket = extractSocket(cpu);
    const moboSocket = extractSocket(motherboard);

    if (cpuSocket !== "UNKNOWN" && moboSocket !== "UNKNOWN" && cpuSocket !== moboSocket) {
      violations.push({
        rule: "socket_mismatch",
        detail: `Socket mismatch: CPU is ${cpuSocket} (${cpu.name}), but Motherboard is ${moboSocket} (${motherboard.name}).`
      });
    }
  }

  // 2. RAM Generation Compatibility (Motherboard ↔ RAM)
  if (motherboard && ram) {
    const moboRam = extractRamType(motherboard);
    const ramType = extractRamType(ram);

    if (moboRam !== ramType) {
      violations.push({
        rule: "ram_mismatch",
        detail: `Memory type conflict: Motherboard supports ${moboRam}, but selected RAM is ${ramType}.`
      });
    }
  }

  // 3. Power Supply Wattage & 25% Headroom
  const estimatedWattage = estimateBuildWattage({ cpu, gpu });
  const psuWattage = extractPsuWattage(psu);

  if (psu) {
    if (psuWattage < estimatedWattage) {
      violations.push({
        rule: "psu_insufficient",
        detail: `PSU wattage insufficient: Estimated draw is ~${estimatedWattage}W, but PSU is rated for ${psuWattage}W.`
      });
    } else if (psuWattage < estimatedWattage * 1.25) {
      violations.push({
        rule: "psu_headroom",
        detail: `Tight PSU headroom: ~${estimatedWattage}W draw on ${psuWattage}W PSU (${Math.round((psuWattage / estimatedWattage - 1) * 100)}% headroom, recommended >= 25%).`
      });
    }
  }

  // 4. Form Factor Fit (Motherboard ↔ Case)
  if (motherboard && pcCase) {
    const moboFF = extractFormFactor(motherboard);
    const caseFF = extractFormFactor(pcCase);
    const moboRank = FORM_FACTOR_RANK[moboFF] ?? 2;
    const caseRank = FORM_FACTOR_RANK[caseFF] ?? 2;

    if (moboRank > caseRank) {
      violations.push({
        rule: "form_factor",
        detail: `Form factor collision: ${moboFF} motherboard (${motherboard.name}) will not fit into ${caseFF} casing (${pcCase.name}).`
      });
    }
  }

  // 5. CPU Cooling Requirement
  if (cpu) {
    const cpuTdp = cpu.bench?.tdp_watts || parseInt(cpu.specs?.tdp || "65", 10) || 65;
    if (cpuTdp > 105 && !cooler) {
      violations.push({
        rule: "cooling_required",
        detail: `High-TDP CPU (${cpuTdp}W) requires a dedicated air/AIO cooler, but none was chosen.`
      });
    }
  }

  // 6. Budget Check (3% tolerance)
  if (budgetBDT > 0 && build.total_bdt) {
    const ceiling = Math.round(budgetBDT * 1.03);
    if (build.total_bdt > ceiling) {
      violations.push({
        rule: "budget_exceeded",
        detail: `Total price ৳${build.total_bdt.toLocaleString("en-IN")} exceeds budget ৳${budgetBDT.toLocaleString("en-IN")} by ৳${(build.total_bdt - budgetBDT).toLocaleString("en-IN")}.`
      });
    }
  }

  const ok = violations.length === 0;
  const score = ok ? 100 : Math.max(60, 100 - violations.length * 15);

  return {
    ok,
    violations,
    wattage: estimatedWattage,
    psuWattage,
    score
  };
}
