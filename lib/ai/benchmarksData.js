/**
 * PC-KINBA Component Knowledge & Curated Benchmarks
 * Seeded specs and relative performance scores (0–100) for modern CPU and GPU SKUs in Bangladesh.
 */

/**
 * @typedef {Object} ComponentBenchmark
 * @property {string} fingerprint
 * @property {'cpu'|'gpu'} category
 * @property {string} display_name
 * @property {string} [socket]
 * @property {number} tdp_watts
 * @property {number} [vram_gb]
 * @property {number} [cores]
 * @property {boolean} [has_igpu]
 * @property {number} score - 0-100 relative performance score
 * @property {string} generation
 */

/** @type {ComponentBenchmark[]} */
export const COMPONENT_BENCHMARKS = [
  // --- AMD CPUs (AM5 & AM4) ---
  { fingerprint: "ryzen-9-9950x", category: "cpu", display_name: "AMD Ryzen 9 9950X", socket: "AM5", tdp_watts: 170, cores: 16, has_igpu: true, score: 99.0, generation: "Zen 5" },
  { fingerprint: "ryzen-9-9900x", category: "cpu", display_name: "AMD Ryzen 9 9900X", socket: "AM5", tdp_watts: 120, cores: 12, has_igpu: true, score: 95.0, generation: "Zen 5" },
  { fingerprint: "ryzen-7-9800x3d", category: "cpu", display_name: "AMD Ryzen 7 9800X3D", socket: "AM5", tdp_watts: 120, cores: 8, has_igpu: true, score: 98.5, generation: "Zen 5" },
  { fingerprint: "ryzen-7-9700x", category: "cpu", display_name: "AMD Ryzen 7 9700X", socket: "AM5", tdp_watts: 65, cores: 8, has_igpu: true, score: 90.0, generation: "Zen 5" },
  { fingerprint: "ryzen-5-9600x", category: "cpu", display_name: "AMD Ryzen 5 9600X", socket: "AM5", tdp_watts: 65, cores: 6, has_igpu: true, score: 84.0, generation: "Zen 5" },

  { fingerprint: "ryzen-9-7950x3d", category: "cpu", display_name: "AMD Ryzen 9 7950X3D", socket: "AM5", tdp_watts: 120, cores: 16, has_igpu: true, score: 98.0, generation: "Zen 4" },
  { fingerprint: "ryzen-9-7950x", category: "cpu", display_name: "AMD Ryzen 9 7950X", socket: "AM5", tdp_watts: 170, cores: 16, has_igpu: true, score: 96.0, generation: "Zen 4" },
  { fingerprint: "ryzen-9-7900x3d", category: "cpu", display_name: "AMD Ryzen 9 7900X3D", socket: "AM5", tdp_watts: 120, cores: 12, has_igpu: true, score: 93.0, generation: "Zen 4" },
  { fingerprint: "ryzen-9-7900x", category: "cpu", display_name: "AMD Ryzen 9 7900X", socket: "AM5", tdp_watts: 170, cores: 12, has_igpu: true, score: 92.0, generation: "Zen 4" },
  { fingerprint: "ryzen-9-7900", category: "cpu", display_name: "AMD Ryzen 9 7900", socket: "AM5", tdp_watts: 65, cores: 12, has_igpu: true, score: 89.0, generation: "Zen 4" },

  { fingerprint: "ryzen-7-7800x3d", category: "cpu", display_name: "AMD Ryzen 7 7800X3D", socket: "AM5", tdp_watts: 120, cores: 8, has_igpu: true, score: 95.0, generation: "Zen 4" },
  { fingerprint: "ryzen-7-7700x", category: "cpu", display_name: "AMD Ryzen 7 7700X", socket: "AM5", tdp_watts: 105, cores: 8, has_igpu: true, score: 87.0, generation: "Zen 4" },
  { fingerprint: "ryzen-7-7700", category: "cpu", display_name: "AMD Ryzen 7 7700", socket: "AM5", tdp_watts: 65, cores: 8, has_igpu: true, score: 85.0, generation: "Zen 4" },
  { fingerprint: "ryzen-5-7600x", category: "cpu", display_name: "AMD Ryzen 5 7600X", socket: "AM5", tdp_watts: 105, cores: 6, has_igpu: true, score: 80.0, generation: "Zen 4" },
  { fingerprint: "ryzen-5-7600", category: "cpu", display_name: "AMD Ryzen 5 7600", socket: "AM5", tdp_watts: 65, cores: 6, has_igpu: true, score: 78.0, generation: "Zen 4" },
  { fingerprint: "ryzen-5-7500f", category: "cpu", display_name: "AMD Ryzen 5 7500F", socket: "AM5", tdp_watts: 65, cores: 6, has_igpu: false, score: 77.0, generation: "Zen 4" },

  { fingerprint: "ryzen-7-8700g", category: "cpu", display_name: "AMD Ryzen 7 8700G", socket: "AM5", tdp_watts: 65, cores: 8, has_igpu: true, score: 81.0, generation: "Zen 4 APU" },
  { fingerprint: "ryzen-5-8600g", category: "cpu", display_name: "AMD Ryzen 5 8600G", socket: "AM5", tdp_watts: 65, cores: 6, has_igpu: true, score: 75.0, generation: "Zen 4 APU" },
  { fingerprint: "ryzen-5-8500g", category: "cpu", display_name: "AMD Ryzen 5 8500G", socket: "AM5", tdp_watts: 65, cores: 6, has_igpu: true, score: 70.0, generation: "Zen 4 APU" },

  { fingerprint: "ryzen-7-5800x3d", category: "cpu", display_name: "AMD Ryzen 7 5800X3D", socket: "AM4", tdp_watts: 105, cores: 8, has_igpu: false, score: 82.0, generation: "Zen 3" },
  { fingerprint: "ryzen-7-5700x3d", category: "cpu", display_name: "AMD Ryzen 7 5700X3D", socket: "AM4", tdp_watts: 105, cores: 8, has_igpu: false, score: 79.0, generation: "Zen 3" },
  { fingerprint: "ryzen-7-5700x", category: "cpu", display_name: "AMD Ryzen 7 5700X", socket: "AM4", tdp_watts: 65, cores: 8, has_igpu: false, score: 72.0, generation: "Zen 3" },
  { fingerprint: "ryzen-7-5700g", category: "cpu", display_name: "AMD Ryzen 7 5700G", socket: "AM4", tdp_watts: 65, cores: 8, has_igpu: true, score: 70.0, generation: "Zen 3 APU" },
  { fingerprint: "ryzen-5-5600x", category: "cpu", display_name: "AMD Ryzen 5 5600X", socket: "AM4", tdp_watts: 65, cores: 6, has_igpu: false, score: 66.0, generation: "Zen 3" },
  { fingerprint: "ryzen-5-5600", category: "cpu", display_name: "AMD Ryzen 5 5600", socket: "AM4", tdp_watts: 65, cores: 6, has_igpu: false, score: 64.0, generation: "Zen 3" },
  { fingerprint: "ryzen-5-5600g", category: "cpu", display_name: "AMD Ryzen 5 5600G", socket: "AM4", tdp_watts: 65, cores: 6, has_igpu: true, score: 62.0, generation: "Zen 3 APU" },
  { fingerprint: "ryzen-5-5500", category: "cpu", display_name: "AMD Ryzen 5 5500", socket: "AM4", tdp_watts: 65, cores: 6, has_igpu: false, score: 58.0, generation: "Zen 3" },
  { fingerprint: "ryzen-5-4600g", category: "cpu", display_name: "AMD Ryzen 5 4600G", socket: "AM4", tdp_watts: 65, cores: 6, has_igpu: true, score: 54.0, generation: "Zen 2 APU" },
  { fingerprint: "ryzen-5-3600", category: "cpu", display_name: "AMD Ryzen 5 3600", socket: "AM4", tdp_watts: 65, cores: 6, has_igpu: false, score: 50.0, generation: "Zen 2" },
  { fingerprint: "ryzen-3-3200g", category: "cpu", display_name: "AMD Ryzen 3 3200G", socket: "AM4", tdp_watts: 65, cores: 4, has_igpu: true, score: 36.0, generation: "Zen+" },

  // --- Intel CPUs (LGA1851 & LGA1700) ---
  { fingerprint: "core-ultra-9-285k", category: "cpu", display_name: "Intel Core Ultra 9 285K", socket: "LGA1851", tdp_watts: 250, cores: 24, has_igpu: true, score: 98.0, generation: "Arrow Lake" },
  { fingerprint: "core-ultra-7-265k", category: "cpu", display_name: "Intel Core Ultra 7 265K", socket: "LGA1851", tdp_watts: 250, cores: 20, has_igpu: true, score: 92.0, generation: "Arrow Lake" },
  { fingerprint: "core-ultra-5-245k", category: "cpu", display_name: "Intel Core Ultra 5 245K", socket: "LGA1851", tdp_watts: 159, cores: 14, has_igpu: true, score: 83.0, generation: "Arrow Lake" },

  { fingerprint: "core-i9-14900k", category: "cpu", display_name: "Intel Core i9-14900K", socket: "LGA1700", tdp_watts: 253, cores: 24, has_igpu: true, score: 97.0, generation: "14th Gen" },
  { fingerprint: "core-i9-14900kf", category: "cpu", display_name: "Intel Core i9-14900KF", socket: "LGA1700", tdp_watts: 253, cores: 24, has_igpu: false, score: 97.0, generation: "14th Gen" },
  { fingerprint: "core-i7-14700k", category: "cpu", display_name: "Intel Core i7-14700K", socket: "LGA1700", tdp_watts: 253, cores: 20, has_igpu: true, score: 92.0, generation: "14th Gen" },
  { fingerprint: "core-i7-14700kf", category: "cpu", display_name: "Intel Core i7-14700KF", socket: "LGA1700", tdp_watts: 253, cores: 20, has_igpu: false, score: 92.0, generation: "14th Gen" },
  { fingerprint: "core-i7-14700", category: "cpu", display_name: "Intel Core i7-14700", socket: "LGA1700", tdp_watts: 219, cores: 20, has_igpu: true, score: 89.0, generation: "14th Gen" },
  { fingerprint: "core-i5-14600k", category: "cpu", display_name: "Intel Core i5-14600K", socket: "LGA1700", tdp_watts: 181, cores: 14, has_igpu: true, score: 85.0, generation: "14th Gen" },
  { fingerprint: "core-i5-14600kf", category: "cpu", display_name: "Intel Core i5-14600KF", socket: "LGA1700", tdp_watts: 181, cores: 14, has_igpu: false, score: 85.0, generation: "14th Gen" },
  { fingerprint: "core-i5-14500", category: "cpu", display_name: "Intel Core i5-14500", socket: "LGA1700", tdp_watts: 154, cores: 14, has_igpu: true, score: 79.0, generation: "14th Gen" },
  { fingerprint: "core-i5-14400", category: "cpu", display_name: "Intel Core i5-14400", socket: "LGA1700", tdp_watts: 148, cores: 10, has_igpu: true, score: 72.0, generation: "14th Gen" },
  { fingerprint: "core-i5-14400f", category: "cpu", display_name: "Intel Core i5-14400F", socket: "LGA1700", tdp_watts: 148, cores: 10, has_igpu: false, score: 72.0, generation: "14th Gen" },
  { fingerprint: "core-i3-14100", category: "cpu", display_name: "Intel Core i3-14100", socket: "LGA1700", tdp_watts: 110, cores: 4, has_igpu: true, score: 55.0, generation: "14th Gen" },
  { fingerprint: "core-i3-14100f", category: "cpu", display_name: "Intel Core i3-14100F", socket: "LGA1700", tdp_watts: 110, cores: 4, has_igpu: false, score: 55.0, generation: "14th Gen" },

  { fingerprint: "core-i9-13900k", category: "cpu", display_name: "Intel Core i9-13900K", socket: "LGA1700", tdp_watts: 253, cores: 24, has_igpu: true, score: 95.0, generation: "13th Gen" },
  { fingerprint: "core-i7-13700k", category: "cpu", display_name: "Intel Core i7-13700K", socket: "LGA1700", tdp_watts: 253, cores: 16, has_igpu: true, score: 89.0, generation: "13th Gen" },
  { fingerprint: "core-i5-13600k", category: "cpu", display_name: "Intel Core i5-13600K", socket: "LGA1700", tdp_watts: 181, cores: 14, has_igpu: true, score: 83.0, generation: "13th Gen" },
  { fingerprint: "core-i5-13500", category: "cpu", display_name: "Intel Core i5-13500", socket: "LGA1700", tdp_watts: 154, cores: 14, has_igpu: true, score: 76.0, generation: "13th Gen" },
  { fingerprint: "core-i5-13400", category: "cpu", display_name: "Intel Core i5-13400", socket: "LGA1700", tdp_watts: 148, cores: 10, has_igpu: true, score: 70.0, generation: "13th Gen" },
  { fingerprint: "core-i5-13400f", category: "cpu", display_name: "Intel Core i5-13400F", socket: "LGA1700", tdp_watts: 148, cores: 10, has_igpu: false, score: 70.0, generation: "13th Gen" },
  { fingerprint: "core-i3-13100", category: "cpu", display_name: "Intel Core i3-13100", socket: "LGA1700", tdp_watts: 89, cores: 4, has_igpu: true, score: 52.0, generation: "13th Gen" },
  { fingerprint: "core-i3-13100f", category: "cpu", display_name: "Intel Core i3-13100F", socket: "LGA1700", tdp_watts: 89, cores: 4, has_igpu: false, score: 52.0, generation: "13th Gen" },

  { fingerprint: "core-i5-12400", category: "cpu", display_name: "Intel Core i5-12400", socket: "LGA1700", tdp_watts: 117, cores: 6, has_igpu: true, score: 62.0, generation: "12th Gen" },
  { fingerprint: "core-i5-12400f", category: "cpu", display_name: "Intel Core i5-12400F", socket: "LGA1700", tdp_watts: 117, cores: 6, has_igpu: false, score: 62.0, generation: "12th Gen" },
  { fingerprint: "core-i3-12100", category: "cpu", display_name: "Intel Core i3-12100", socket: "LGA1700", tdp_watts: 89, cores: 4, has_igpu: true, score: 48.0, generation: "12th Gen" },
  { fingerprint: "core-i3-12100f", category: "cpu", display_name: "Intel Core i3-12100F", socket: "LGA1700", tdp_watts: 89, cores: 4, has_igpu: false, score: 48.0, generation: "12th Gen" },

  // --- NVIDIA GPUs ---
  { fingerprint: "rtx-5090-32gb", category: "gpu", display_name: "NVIDIA GeForce RTX 5090 32GB", vram_gb: 32, tdp_watts: 600, score: 100.0, generation: "Blackwell" },
  { fingerprint: "rtx-5080-16gb", category: "gpu", display_name: "NVIDIA GeForce RTX 5080 16GB", vram_gb: 16, tdp_watts: 400, score: 92.0, generation: "Blackwell" },
  { fingerprint: "rtx-5070-ti-16gb", category: "gpu", display_name: "NVIDIA GeForce RTX 5070 Ti 16GB", vram_gb: 16, tdp_watts: 300, score: 86.0, generation: "Blackwell" },
  { fingerprint: "rtx-5070-12gb", category: "gpu", display_name: "NVIDIA GeForce RTX 5070 12GB", vram_gb: 12, tdp_watts: 250, score: 80.0, generation: "Blackwell" },

  { fingerprint: "rtx-4090-24gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4090 24GB", vram_gb: 24, tdp_watts: 450, score: 96.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4080-super-16gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4080 Super 16GB", vram_gb: 16, tdp_watts: 320, score: 88.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4080-16gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4080 16GB", vram_gb: 16, tdp_watts: 320, score: 86.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4070-ti-super-16gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4070 Ti Super 16GB", vram_gb: 16, tdp_watts: 285, score: 82.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4070-ti-12gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4070 Ti 12GB", vram_gb: 12, tdp_watts: 285, score: 79.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4070-super-12gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4070 Super 12GB", vram_gb: 12, tdp_watts: 220, score: 76.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4070-12gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4070 12GB", vram_gb: 12, tdp_watts: 200, score: 72.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4060-ti-16gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4060 Ti 16GB", vram_gb: 16, tdp_watts: 165, score: 65.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4060-ti-8gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4060 Ti 8GB", vram_gb: 8, tdp_watts: 160, score: 63.0, generation: "Ada Lovelace" },
  { fingerprint: "rtx-4060-8gb", category: "gpu", display_name: "NVIDIA GeForce RTX 4060 8GB", vram_gb: 8, tdp_watts: 115, score: 55.0, generation: "Ada Lovelace" },

  { fingerprint: "rtx-3090-24gb", category: "gpu", display_name: "NVIDIA GeForce RTX 3090 24GB", vram_gb: 24, tdp_watts: 350, score: 78.0, generation: "Ampere" },
  { fingerprint: "rtx-3080-10gb", category: "gpu", display_name: "NVIDIA GeForce RTX 3080 10GB", vram_gb: 10, tdp_watts: 320, score: 72.0, generation: "Ampere" },
  { fingerprint: "rtx-3070-8gb", category: "gpu", display_name: "NVIDIA GeForce RTX 3070 8GB", vram_gb: 8, tdp_watts: 220, score: 60.0, generation: "Ampere" },
  { fingerprint: "rtx-3060-ti-8gb", category: "gpu", display_name: "NVIDIA GeForce RTX 3060 Ti 8GB", vram_gb: 8, tdp_watts: 200, score: 56.0, generation: "Ampere" },
  { fingerprint: "rtx-3060-12gb", category: "gpu", display_name: "NVIDIA GeForce RTX 3060 12GB", vram_gb: 12, tdp_watts: 170, score: 48.0, generation: "Ampere" },
  { fingerprint: "rtx-3050-8gb", category: "gpu", display_name: "NVIDIA GeForce RTX 3050 8GB", vram_gb: 8, tdp_watts: 130, score: 35.0, generation: "Ampere" },
  { fingerprint: "gtx-1650-4gb", category: "gpu", display_name: "NVIDIA GeForce GTX 1650 4GB", vram_gb: 4, tdp_watts: 75, score: 22.0, generation: "Turing" },

  // --- AMD GPUs ---
  { fingerprint: "rx-7900-xtx-24gb", category: "gpu", display_name: "AMD Radeon RX 7900 XTX 24GB", vram_gb: 24, tdp_watts: 355, score: 90.0, generation: "RDNA 3" },
  { fingerprint: "rx-7900-xt-20gb", category: "gpu", display_name: "AMD Radeon RX 7900 XT 20GB", vram_gb: 20, tdp_watts: 315, score: 84.0, generation: "RDNA 3" },
  { fingerprint: "rx-7900-gre-16gb", category: "gpu", display_name: "AMD Radeon RX 7900 GRE 16GB", vram_gb: 16, tdp_watts: 260, score: 77.0, generation: "RDNA 3" },
  { fingerprint: "rx-7800-xt-16gb", category: "gpu", display_name: "AMD Radeon RX 7800 XT 16GB", vram_gb: 16, tdp_watts: 263, score: 74.0, generation: "RDNA 3" },
  { fingerprint: "rx-7700-xt-12gb", category: "gpu", display_name: "AMD Radeon RX 7700 XT 12GB", vram_gb: 12, tdp_watts: 245, score: 67.0, generation: "RDNA 3" },
  { fingerprint: "rx-7600-xt-16gb", category: "gpu", display_name: "AMD Radeon RX 7600 XT 16GB", vram_gb: 16, tdp_watts: 190, score: 56.0, generation: "RDNA 3" },
  { fingerprint: "rx-7600-8gb", category: "gpu", display_name: "AMD Radeon RX 7600 8GB", vram_gb: 8, tdp_watts: 165, score: 52.0, generation: "RDNA 3" },
  { fingerprint: "rx-6700-xt-12gb", category: "gpu", display_name: "AMD Radeon RX 6700 XT 12GB", vram_gb: 12, tdp_watts: 230, score: 58.0, generation: "RDNA 2" },
  { fingerprint: "rx-6600-8gb", category: "gpu", display_name: "AMD Radeon RX 6600 8GB", vram_gb: 8, tdp_watts: 132, score: 44.0, generation: "RDNA 2" },

  // --- Intel GPUs ---
  { fingerprint: "arc-b580-12gb", category: "gpu", display_name: "Intel Arc B580 12GB", vram_gb: 12, tdp_watts: 190, score: 54.0, generation: "Battlemage" },
  { fingerprint: "arc-a770-16gb", category: "gpu", display_name: "Intel Arc A770 16GB", vram_gb: 16, tdp_watts: 225, score: 52.0, generation: "Alchemist" },
  { fingerprint: "arc-a750-8gb", category: "gpu", display_name: "Intel Arc A750 8GB", vram_gb: 8, tdp_watts: 225, score: 47.0, generation: "Alchemist" },
  { fingerprint: "arc-a580-8gb", category: "gpu", display_name: "Intel Arc A580 8GB", vram_gb: 8, tdp_watts: 185, score: 42.0, generation: "Alchemist" }
];

const BENCHMARKS_MAP = new Map(COMPONENT_BENCHMARKS.map(b => [b.fingerprint, b]));

/**
 * Finds benchmark and spec info for a product name or fingerprint.
 * @param {string} nameOrFingerprint 
 * @returns {ComponentBenchmark|null}
 */
export function findBenchmark(nameOrFingerprint) {
  if (!nameOrFingerprint) return null;
  const fp = nameOrFingerprint.toLowerCase().trim();
  
  if (BENCHMARKS_MAP.has(fp)) {
    return BENCHMARKS_MAP.get(fp);
  }

  // Fuzzy search by substring
  for (const b of COMPONENT_BENCHMARKS) {
    if (fp.includes(b.fingerprint) || fp.includes(b.display_name.toLowerCase())) {
      return b;
    }
  }

  // Model-specific regex heuristics
  if (/7800x3d/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-7-7800x3d");
  if (/9800x3d/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-7-9800x3d");
  if (/7700x/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-7-7700x");
  if (/7700/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-7-7700");
  if (/7600x/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-7600x");
  if (/7600/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-7600");
  if (/7500f/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-7500f");
  if (/5600g/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-5600g");
  if (/5600x/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-5600x");
  if (/5600/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-5600");
  if (/5500/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-5500");
  if (/8600g/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-5-8600g");
  if (/8700g/i.test(fp)) return BENCHMARKS_MAP.get("ryzen-7-8700g");

  if (/14900k/i.test(fp)) return BENCHMARKS_MAP.get("core-i9-14900k");
  if (/14700k/i.test(fp)) return BENCHMARKS_MAP.get("core-i7-14700k");
  if (/14700/i.test(fp)) return BENCHMARKS_MAP.get("core-i7-14700");
  if (/14600k/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-14600k");
  if (/14500/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-14500");
  if (/14400f/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-14400f");
  if (/14400/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-14400");
  if (/13400f/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-13400f");
  if (/13400/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-13400");
  if (/12400f/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-12400f");
  if (/12400/i.test(fp)) return BENCHMARKS_MAP.get("core-i5-12400");
  if (/12100f/i.test(fp)) return BENCHMARKS_MAP.get("core-i3-12100f");
  if (/12100/i.test(fp)) return BENCHMARKS_MAP.get("core-i3-12100");

  if (/4090/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4090-24gb");
  if (/4080\s*super/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4080-super-16gb");
  if (/4080/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4080-16gb");
  if (/4070\s*ti\s*super/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4070-ti-super-16gb");
  if (/4070\s*ti/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4070-ti-12gb");
  if (/4070\s*super/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4070-super-12gb");
  if (/4070/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4070-12gb");
  if (/4060\s*ti.*16g/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4060-ti-16gb");
  if (/4060\s*ti/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4060-ti-8gb");
  if (/4060/i.test(fp)) return BENCHMARKS_MAP.get("rtx-4060-8gb");
  if (/3060.*12g/i.test(fp)) return BENCHMARKS_MAP.get("rtx-3060-12gb");
  if (/3060/i.test(fp)) return BENCHMARKS_MAP.get("rtx-3060-12gb");
  if (/3050/i.test(fp)) return BENCHMARKS_MAP.get("rtx-3050-8gb");

  if (/7900\s*xtx/i.test(fp)) return BENCHMARKS_MAP.get("rx-7900-xtx-24gb");
  if (/7900\s*xt/i.test(fp)) return BENCHMARKS_MAP.get("rx-7900-xt-20gb");
  if (/7800\s*xt/i.test(fp)) return BENCHMARKS_MAP.get("rx-7800-xt-16gb");
  if (/7700\s*xt/i.test(fp)) return BENCHMARKS_MAP.get("rx-7700-xt-12gb");
  if (/7600\s*xt/i.test(fp)) return BENCHMARKS_MAP.get("rx-7600-xt-16gb");
  if (/7600/i.test(fp)) return BENCHMARKS_MAP.get("rx-7600-8gb");
  if (/6600/i.test(fp)) return BENCHMARKS_MAP.get("rx-6600-8gb");

  return null;
}
