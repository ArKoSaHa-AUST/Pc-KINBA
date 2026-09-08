import {
  BUILDER_CATALOG,
  type BuilderProduct,
  type ComponentCategory,
  type FormFactor,
} from '../components/builder/builderCatalog';

interface LiveProduct {
  id: string;
  name: string;
  brand: string;
  category: ComponentCategory;
  price: number;
  image: string | null;
  specs: Record<string, string>;
  listings: { id: string; retailer: string; price: number; url: string }[];
}

/** [pattern, performanceScore 0–100, tdp W] — coarse tiers for parts the DB has no benchmark for. */
const GPU_TIERS: [RegExp, number, number][] = [
  [/rtx ?5090/i, 100, 575],
  [/rtx ?5080/i, 94, 360],
  [/rtx ?5070 ?ti/i, 88, 300],
  [/rtx ?5070\b/i, 82, 250],
  [/rtx ?5060 ?ti/i, 72, 180],
  [/rtx ?5060\b/i, 64, 145],
  [/rtx ?4090/i, 100, 450],
  [/rtx ?4080/i, 91, 320],
  [/rtx ?4070 ?ti/i, 86, 285],
  [/rtx ?4070 ?super/i, 80, 220],
  [/rtx ?4070\b/i, 76, 200],
  [/rtx ?4060 ?ti/i, 68, 160],
  [/rtx ?4060\b/i, 62, 115],
  [/rtx ?3090/i, 85, 350],
  [/rtx ?3080/i, 80, 320],
  [/rtx ?3070/i, 70, 220],
  [/rtx ?3060 ?ti/i, 64, 200],
  [/rtx ?3060\b/i, 56, 170],
  [/rtx ?3050/i, 45, 130],
  [/rx ?7900 ?xtx/i, 92, 355],
  [/rx ?7900/i, 88, 315],
  [/rx ?7800/i, 78, 263],
  [/rx ?7700/i, 72, 245],
  [/rx ?7600/i, 58, 165],
  [/rx ?6[567]00/i, 52, 160],
  [/gtx ?1660/i, 40, 125],
  [/gtx ?1650/i, 32, 75],
  [/\bgt ?\d{3}\b/i, 8, 30],
];

const CPU_TIERS: [RegExp, number, number][] = [
  [/ryzen 9 9950x3d/i, 99, 170],
  [/ryzen 9 9950/i, 98, 170],
  [/ryzen 9 79\d0x3d/i, 95, 120],
  [/ryzen 9 79\d0/i, 92, 170],
  [/ryzen 7 9800x3d/i, 96, 120],
  [/ryzen 7 9700/i, 84, 65],
  [/ryzen 7 7800x3d/i, 90, 120],
  [/ryzen 7 7700/i, 80, 65],
  [/ryzen 5 9600/i, 76, 65],
  [/ryzen 5 7600/i, 72, 65],
  [/ryzen [57] 8[67]00g/i, 66, 65],
  [/ryzen 7 5800x3d/i, 78, 105],
  [/ryzen 7 5[78]00/i, 66, 65],
  [/ryzen 5 5600x/i, 60, 65],
  [/ryzen 5 5[56]00/i, 56, 65],
  [/ryzen 5 4[56]00|ryzen 3/i, 40, 65],
  [/core ultra 9|i9-1[34]900/i, 95, 253],
  [/i9-12900/i, 88, 241],
  [/core ultra 7|i7-14700/i, 88, 253],
  [/i7-13700/i, 85, 253],
  [/i7-12700/i, 78, 190],
  [/core ultra 5|i5-14600/i, 80, 181],
  [/i5-13600/i, 78, 181],
  [/i5-1[34]400/i, 68, 148],
  [/i5-12400/i, 62, 117],
  [/i3-1[2345]100/i, 45, 89],
  [/pentium|celeron|athlon/i, 20, 58],
];

const NOT_DESKTOP_PART =
  /laptop|notebook|legion|ideapad|vivobook|zenbook|thinkpad|macbook|nitro\b|aspire|chromebook|\bext\b|external|portable|enclosure|usb flash|pendrive/i;

const CATEGORY_GUARD: Partial<Record<ComponentCategory, RegExp>> = {
  cpu: /ryzen|core|intel|athlon|pentium|celeron|threadripper/i,
  gpu: /rtx|gtx|\brx\b|radeon|geforce|arc|\bgt ?\d{3}/i,
  ram: /\d+\s*gb/i,
  motherboard: /motherboard|mainboard|\b[abhxz]\d{3}\b/i,
  storage: /ssd|hdd|nvme|m\.2|sata|hard disk|drive/i,
  psu: /\d{3,4}\s*w\b|power supply|psu/i,
};
const CATEGORY_REJECT: Partial<Record<ComponentCategory, RegExp>> = {
  ram: /motherboard|mainboard|\b[abhxz]\d{3}(-[a-z]+)?\b|laptop|sodimm|so-dimm/i,
  cpu: /motherboard|combo|cooler/i,
};

const tier = (name: string, tiers: [RegExp, number, number][]) =>
  tiers.find(([re]) => re.test(name));

const num = (s?: string) => (s ? Number(s.replace(/[^\d.]/g, '')) : NaN);
const match = (name: string, re: RegExp) => re.exec(name)?.[1];

function socketOf(p: LiveProduct): string | undefined {
  const s = p.specs.socket;
  if (s) return s.toUpperCase().replace(/\s+/g, '');
  const n = p.name;
  if (/am5|ryzen [3579] [789]\d{3}/i.test(n)) return 'AM5';
  if (/am4|ryzen [3579] [2345]\d{3}/i.test(n)) return 'AM4';
  if (/lga ?1851|core ultra/i.test(n)) return 'LGA1851';
  if (/lga ?1700|i[3579]-1[234]\d{3}/i.test(n)) return 'LGA1700';
  if (/lga ?1200|i[3579]-1[01]\d{3}/i.test(n)) return 'LGA1200';
  return undefined;
}

function formFactorOf(p: LiveProduct): FormFactor | undefined {
  const s = `${p.specs.form_factor ?? ''} ${p.name}`;
  if (/mini-?itx|\bitx\b/i.test(s)) return 'ITX';
  if (/micro-?atx|m-?atx|matx/i.test(s)) return 'mATX';
  if (/\batx\b/i.test(s) || p.category === 'motherboard') return 'ATX';
  return undefined;
}

/** Fills the derived fields (from title/specs) shared by live and curated parts. */
export function enrichProduct(p: BuilderProduct): BuilderProduct {
  const n = `${p.name} ${p.keySpec}`;
  const out: BuilderProduct = { ...p };
  if (p.category === 'ram') {
    const kit = /(\d)\s*[x×]\s*(\d+)\s*gb/i.exec(n);
    out.moduleCount ??= kit ? Number(kit[1]) : 1;
    out.capacityGb ??=
      (kit ? Number(kit[1]) * Number(kit[2]) : Number(match(n, /(\d+)\s*gb/i))) || undefined;
    out.speedMhz ??=
      Number(match(n, /(\d{4})\s*mhz/i) ?? match(n, /ddr[45][- ]?(\d{4})/i)) || undefined;
  }
  if (p.category === 'storage') {
    out.pcieGen ??= (Number(match(n, /(?:gen|pcie) ?([345])/i)) as 3 | 4 | 5) || undefined;
  }
  if (p.category === 'psu') {
    out.psuFormFactor ??= /\bsfx/i.test(n) ? 'SFX' : 'ATX';
  }
  if (p.category === 'cooling' && !p.coolerSockets) {
    const sockets = ['AM5', 'AM4', 'LGA1700', 'LGA1851', 'LGA1200'].filter((s) =>
      new RegExp(s.replace('LGA', 'LGA ?'), 'i').test(n),
    );
    if (sockets.length) out.coolerSockets = sockets;
  }
  return out;
}

function toBuilderProduct(p: LiveProduct, priceRank: number): BuilderProduct | null {
  if (NOT_DESKTOP_PART.test(p.name)) return null;
  const guard = CATEGORY_GUARD[p.category];
  if (guard && !guard.test(p.name)) return null;
  if (CATEGORY_REJECT[p.category]?.test(p.name)) return null;

  const s = p.specs;
  const t =
    p.category === 'gpu'
      ? tier(p.name, GPU_TIERS)
      : p.category === 'cpu'
        ? tier(p.name, CPU_TIERS)
        : undefined;
  const keySpec =
    {
      cpu: [socketOf(p), s.cores].filter(Boolean).join(' · '),
      gpu: [s.vram, s.memory_type].filter(Boolean).join(' '),
      motherboard: [
        socketOf(p),
        s.memory_type ?? match(p.name, /(ddr[45])/i)?.toUpperCase(),
        formFactorOf(p),
      ]
        .filter(Boolean)
        .join(' · '),
      ram: [s.memory_type, s.capacity, s.speed].filter(Boolean).join(' · '),
      storage: [s.capacity, s.form_factor].filter(Boolean).join(' · '),
      psu: [s.wattage, s.efficiency].filter(Boolean).join(' · '),
    }[p.category as string] ||
    p.brand ||
    '';

  const brand = p.name.toLowerCase().includes(p.brand.toLowerCase())
    ? p.brand
    : p.name.split(/\s+/)[0];
  // Server sorts offers cheapest-first; keep one offer per retailer.
  const seenStores = new Set<string>();
  const listings = p.listings.filter(
    (l) => !seenStores.has(l.retailer) && seenStores.add(l.retailer),
  );
  const base: BuilderProduct = {
    id: p.id,
    category: p.category,
    name: p.name,
    brand,
    price: p.price,
    keySpec,
    image: p.image ?? undefined,
    listings,
    popularity: Math.min(100, 40 + listings.length * 12),
    performanceScore: t ? t[1] : priceRank,
    tdp: t?.[2] ?? (p.category === 'gpu' ? 150 : p.category === 'cpu' ? 65 : undefined),
    socket: p.category === 'cpu' || p.category === 'motherboard' ? socketOf(p) : undefined,
    ramType:
      p.category === 'ram' || p.category === 'motherboard'
        ? ((s.memory_type ?? match(p.name, /(ddr[45])/i)?.toUpperCase()) as
            'DDR4' | 'DDR5' | undefined)
        : undefined,
    formFactor: p.category === 'motherboard' || p.category === 'case' ? formFactorOf(p) : undefined,
    wattage:
      p.category === 'psu'
        ? num(s.wattage) || Number(match(p.name, /(\d{3,4})\s*w\b/i)) || undefined
        : undefined,
    storageInterface:
      p.category === 'storage'
        ? /nvme|m\.2|gen ?[345]/i.test(p.name)
          ? 'nvme'
          : 'sata'
        : undefined,
    radiatorMm:
      p.category === 'cooling'
        ? (Number(match(p.name, /\b(120|240|280|360)\s*mm/i)) as 120 | 240 | 280 | 360) || undefined
        : undefined,
  };
  return enrichProduct(base);
}

/** Live builder catalog: normalized products with real retailer offers. Empty array on failure. */
export async function fetchBuilderCatalog(): Promise<BuilderProduct[]> {
  const res = await fetch('/api/builder/catalog');
  if (!res.ok) throw new Error('Failed to load builder catalog');
  const { products } = (await res.json()) as { products: LiveProduct[] };

  // Price percentile within category = fallback performance score for untiered parts.
  const byCategory = new Map<ComponentCategory, number[]>();
  for (const p of products)
    byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p.price]);
  for (const prices of byCategory.values()) prices.sort((a, b) => a - b);
  const rank = (p: LiveProduct) => {
    const prices = byCategory.get(p.category)!;
    return Math.round((prices.indexOf(p.price) / Math.max(1, prices.length - 1)) * 80) + 10;
  };

  return products.map((p) => toBuilderProduct(p, rank(p))).filter((p): p is BuilderProduct => !!p);
}

/** Curated fallback (also resolves legacy share links / saved builds that reference static ids). */
export const FALLBACK_CATALOG: BuilderProduct[] = BUILDER_CATALOG.map(enrichProduct);
