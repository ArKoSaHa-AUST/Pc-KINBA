import { z } from "zod";

/**
 * Zod schemas for Tonima AI Build Agent
 */

export const PurposeEnum = z.enum([
  "ai_ml",
  "gaming",
  "content_creation",
  "streaming",
  "office",
  "general"
]);

export const LanguageEnum = z.enum(["en", "bn"]);

export const BrandPreferenceSchema = z.object({
  cpu: z.enum(["amd", "intel"]).optional(),
  gpu: z.enum(["nvidia", "amd", "intel"]).optional()
}).optional();

export const FormFactorEnum = z.enum(["ITX", "mATX", "ATX"]);

export const ConstraintsSchema = z.object({
  min_vram_gb: z.number().optional(),
  min_ram_gb: z.number().optional(),
  min_storage_gb: z.number().optional(),
  prefer_brand: BrandPreferenceSchema,
  form_factor: FormFactorEnum.optional(),
  quiet: z.boolean().optional(),
  rgb: z.boolean().optional()
}).default({});

export const IntentTypeEnum = z.enum(["build", "greeting", "chat", "refine"]);

export const BuildRequestSchema = z.object({
  type: IntentTypeEnum.default("build"),
  budget_bdt: z.number().min(0).default(0),
  purpose: PurposeEnum.default("general"),
  constraints: ConstraintsSchema,
  include_peripherals: z.boolean().default(false),
  language: LanguageEnum.default("en")
});

export const BuySignalEnum = z.enum(["buy", "fair", "wait", "neutral"]);

export const CandidateBenchmarkSchema = z.object({
  score: z.number().optional(),
  tdp_watts: z.number().optional(),
  vram_gb: z.number().optional(),
  cores: z.number().optional(),
  socket: z.string().optional(),
  has_igpu: z.boolean().optional(),
  generation: z.string().optional()
}).optional();

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  brand: z.string().default(""),
  best_price: z.number().min(0),
  best_retailer: z.string().default("Tech Store"),
  best_listing_id: z.string().default(""),
  best_url: z.string().default(""),
  store_count: z.number().default(1),
  price_as_of: z.string().default(() => new Date().toISOString()),
  specs: z.record(z.string(), z.string()).default({}),
  bench: CandidateBenchmarkSchema,
  buy_signal: BuySignalEnum.default("fair")
});

export const CandidatesMapSchema = z.record(z.string(), z.array(CandidateSchema));

export const BuildPartsSchema = z.object({
  cpu: z.string(),
  gpu: z.string().optional(),
  motherboard: z.string(),
  ram: z.string(),
  storage: z.string(),
  psu: z.string(),
  case: z.string(),
  cooler: z.string().optional()
});

export const BuildRationaleItemSchema = z.object({
  category: z.string(),
  why: z.string()
});

export const BuildAlternativeItemSchema = z.object({
  category: z.string(),
  id: z.string(),
  delta_bdt: z.number(),
  label: z.string()
});

export const BuildSchema = z.object({
  parts: BuildPartsSchema,
  total_bdt: z.number(),
  rationale: z.array(BuildRationaleItemSchema).default([]),
  alternatives: z.array(BuildAlternativeItemSchema).default([])
});

export const RefineActionSchema = z.object({
  op: z.enum(["replace", "downgrade", "upgrade", "budget_adjust", "custom"]),
  category: z.string().optional(),
  query: z.string().optional(),
  target_id: z.string().optional(),
  budget_delta: z.number().optional()
});
