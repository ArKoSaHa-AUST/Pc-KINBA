# PC-KINBA — Tonima AI Build Agent: Design & Implementation Plan

> **Goal:** a conversational AI agent that turns _"I want an AI/ML workstation, budget ~2 lakh taka"_ into a complete, compatible PC build with a **live, lowest-price-across-all-retailers** parts list — using a **team of models** (cheap open models for routine steps, one closed/frontier model for the hard step) so token cost stays low.

---

## Table of contents

1. [Example scenario](#1-example-scenario)
2. [What already exists in the codebase](#2-what-already-exists-in-the-codebase)
3. [Do we need a Kaggle dataset?](#3-do-we-need-a-kaggle-dataset)
4. [Architecture — the model team](#4-architecture--the-model-team)
5. [Data flow (end to end)](#5-data-flow-end-to-end)
6. [Real-time lowest-price guarantee](#6-real-time-lowest-price-guarantee)
7. [Budget allocation heuristics](#7-budget-allocation-heuristics)
8. [Database changes](#8-database-changes)
9. [Backend API & module design](#9-backend-api--module-design)
10. [Prompts](#10-prompts)
11. [Frontend integration](#11-frontend-integration)
12. [Cost, latency & model selection](#12-cost-latency--model-selection)
13. [Guardrails & failure handling](#13-guardrails--failure-handling)
14. [Evaluation](#14-evaluation)
15. [Implementation roadmap](#15-implementation-roadmap)
16. [Environment variables](#16-environment-variables)
17. [Decisions & open questions](#17-decisions--open-questions)

---

## 1. Example scenario

**User:** _"I need a PC for machine learning and deep learning. Budget is around 2 lakh taka."_

**Agent (Tonima):**

> For ML/DL the GPU's VRAM is the single most important part, so I put ~45% of the budget there.
>
> | Category    | Part                                      | Best price     | Store    |
> | ----------- | ----------------------------------------- | -------------- | -------- |
> | GPU         | Gigabyte RTX 4070 Super 12GB WindForce OC | ৳ 82,500       | Techland |
> | CPU         | AMD Ryzen 7 7700                          | ৳ 34,000       | StarTech |
> | Motherboard | MSI PRO B650M-A WiFi                      | ৳ 23,500       | Ryans    |
> | RAM         | Corsair Vengeance 32GB (2×16) DDR5-5600   | ৳ 14,200       | Skyland  |
> | Storage     | WD Black SN770 1TB NVMe                   | ৳ 9,800        | StarTech |
> | PSU         | Cooler Master MWE 750W Gold               | ৳ 11,500       | PC House |
> | Case        | NZXT H5 Flow                              | ৳ 9,800        | StarTech |
> | Cooler      | Deepcool AG400                            | ৳ 2,800        | Ryans    |
> | **Total**   |                                           | **৳ 1,88,100** | 6 stores |
>
> ✅ AM5 socket ↔ B650 · ✅ DDR5 ↔ DDR5 · ✅ ~430 W draw on 750 W PSU (43% headroom) · ✅ mATX fits mid-tower
>
> 💡 Prices checked 12 minutes ago. The RTX 4070 Super is at its **lowest price in 30 days** — good time to buy.
>
> _Refine:_ 🔼 16GB VRAM instead (+৳ 35k) · 💾 64GB RAM (+৳ 14k) · 💸 Trim to ৳ 1.75L

Every price in that table must come from the `listings` table (scraped from the 12 BD retailers), never from the model's memory.

---

## 2. What already exists in the codebase

The agent is mostly **orchestration** on top of pieces that are already built:

| Capability                                                                                          | Where                                                                                            | Status                                                                   |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Groq multi-key rotation pool (`callGroqWithRotation`)                                               | [lib/groq.js](lib/groq.js)                                                                       | ✅ Used for autosuggest today                                            |
| Local open model (Qwen 2.5 1.5B via Ollama)                                                         | [scrapers/ai_extractor.py](scrapers/ai_extractor.py)                                             | ✅ Python only — needs a JS twin                                         |
| Live retailer listings (12 stores, price, stock, URL)                                               | Supabase `listings`                                                                              | ✅ Populated by scrapers                                                 |
| Canonical product catalog with structured specs (`chipset`, `vram`, `socket`, `recommended_psu`, …) | Supabase `products`, `product_specs`, `categories`, `brands`                                     | ✅ 2,500+ products                                                       |
| Price history + buy signal (`buy`/`fair`/`wait`)                                                    | `price_history`, `GET /api/product/:id/price-history`                                            | ✅                                                                       |
| Deterministic compatibility engine (socket, RAM gen, PSU headroom, form factor, cooling)            | [client/src/components/builder/compatibility.ts](client/src/components/builder/compatibility.ts) | ✅ Client-only — must be ported to server                                |
| On-demand scrapers (`run_scrapers.py`, `google_live_scanner.py`)                                    | [scrapers/](scrapers)                                                                            | ✅ Spawned from `server.js`                                              |
| Tonima chat UI (`ChatWorkspace`, `BuildPreviewHUD`, `CompatibilityGauge`)                           | [client/src/components/ai/](client/src/components/ai)                                            | ⚠️ **Hard-coded mock replies** (`setTimeout` in `ChatWorkspace.tsx:199`) |
| FastAPI "AI service" container                                                                      | [docker/ai/main.py](docker/ai/main.py)                                                           | ⚠️ Empty placeholder                                                     |

**Conclusion:** we do _not_ need a new AI service. The agent lives in `server.js` (Node) as a `lib/ai/` module, reusing the Groq pool and Supabase client that are already there.

---

## 3. Do we need a Kaggle dataset?

**For prices — No.** Kaggle PC-parts datasets (PCPartPicker scrapes, "GPU specs 2024", etc.) are US-priced, months stale and have no Bangladeshi retailers. Using them for prices would defeat the product's core promise. **Prices must come only from our own `listings` table.**

**For component _knowledge_ — Partially, yes.** The model needs facts that are not in a retailer title, e.g. _"RTX 4070 Super has 12 GB VRAM and ~220 W TDP"_, _"Ryzen 7 7700 is AM5, 65 W"_, relative performance tiers. We have two sources:

| Source                                                                                  | What it gives                                                                       | How we use it                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Our `product_specs` table** (already extracted by `scripts/sync_retailer_catalog.js`) | socket, chipset, VRAM, memory type, capacity, wattage, form factor, recommended PSU | Primary. Already keyed to our products.                                                             |
| **A small curated `component_benchmarks` table** seeded from open datasets              | TDP, benchmark score (0–100), VRAM, cores, generation, tier                         | Enrichment for ranking/compatibility. ~300 rows covering current CPU/GPU SKUs. Refreshed quarterly. |

Recommended open sources for seeding `component_benchmarks` (spec/benchmark only, never price):

- Kaggle _"PC Parts / PCPartPicker components"_ datasets — CPU/GPU/RAM/PSU spec columns (socket, TDP, wattage, memory type).
- Kaggle _"GPU benchmarks compilation"_ / _"CPU benchmarks (PassMark-style)"_ — relative performance scores.
- Tom's Hardware GPU/CPU hierarchy tables (manual, ~100 rows).

Matching is done with the existing `generateFingerprint()` in [lib/normalizer.js](lib/normalizer.js) (chipset + VRAM/cores), so _"GIGABYTE GeForce RTX 4070 Super WindForce OC 12G"_ → `rtx-4070-super-12gb` → one benchmark row.

> The LLM is **never** the source of truth for specs or prices. It only _chooses_ among candidates we hand it.

---

## 4. Architecture — the model team

Five roles. Only **one** of them uses an expensive closed model; the rest are cheap open models or plain code.

```
                      ┌──────────────────────────────────────────────────────────┐
 user message ──────► │ 1. INTENT PARSER          open model (Qwen 27B on Groq,  │
                      │    → BuildRequest JSON     fallback: local Qwen 1.5B)     │
                      └───────────────┬──────────────────────────────────────────┘
                                      ▼
                      ┌──────────────────────────────────────────────────────────┐
                      │ 2. RETRIEVER              no LLM — SQL                    │
                      │    budget split → per-category candidate lists with      │
                      │    lowest live price, stock, specs, benchmark, buy-signal │
                      └───────────────┬──────────────────────────────────────────┘
                                      ▼
                      ┌──────────────────────────────────────────────────────────┐
                      │ 3. PLANNER (ARCHITECT)    closed model (gpt-oss-120b     │
                      │    picks exactly one candidate per category → Build JSON │  ◄─┐
                      └───────────────┬──────────────────────────────────────────┘    │
                                      ▼                                                │ violations
                      ┌──────────────────────────────────────────────────────────┐    │ (max 2 loops)
                      │ 4. VALIDATOR              no LLM — compatibility.ts port │ ───┘
                      │    socket · RAM gen · PSU headroom · form factor · budget │
                      └───────────────┬──────────────────────────────────────────┘
                                      ▼
                      ┌──────────────────────────────────────────────────────────┐
                      │ 5. EXPLAINER              open model (Qwen 27B), streamed │
 SSE to browser ◄──── │    validated Build JSON → friendly markdown + refine chips│
                      └──────────────────────────────────────────────────────────┘
```

### Why this split saves money

| Step               | Tokens in → out (typical) | Model class           | Why                                                                                                           |
| ------------------ | ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Intent             | 300 → 120                 | open / small          | Extracting `{budget, purpose, constraints}` is trivial; a 1.5B–27B model does it reliably in JSON mode.       |
| Retriever          | 0                         | code                  | Pure SQL. Also shrinks the context the planner sees (≈8 candidates × 8 categories instead of 2,500 products). |
| **Planner**        | **~2,500 → 400**          | **closed / frontier** | The only step requiring real reasoning (trade-offs, VRAM vs budget, bottlenecks). One call.                   |
| Validator          | 0                         | code                  | Never trust the LLM for compatibility. Deterministic and instant.                                             |
| Explainer          | 700 → 350                 | open                  | Turning validated JSON into prose is easy; streaming makes it feel fast.                                      |
| Refine (follow-up) | 400 → 150                 | open                  | _"swap GPU to 4060"_ → a diff, re-validated by code. No planner call unless the diff breaks compatibility.    |

≈ 4,000–5,000 total tokens per build, of which only ~2,900 hit the expensive model. Follow-up turns typically cost < 800 tokens and stay on open models.

### Role → model mapping

| Role                                                                                             | Primary                                                     | Fallback 1                          | Fallback 2                                             |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Intent                                                                                           | `qwen/qwen3.8-27b` (Groq)                                   | local Ollama `qwen2.5:1.5b`         | regex heuristics (budget numbers, purpose keywords)    |
| Planner   | `openai/gpt-oss-120b` (Groq)        | `llama-3.3-70b-versatile` (Groq)       | `qwen/qwen3.8-27b` (Groq) + stricter validator loop    |
| Explainer | `qwen/qwen3.8-27b` (Groq, streamed) | local Ollama `qwen2.5:7b` if installed | template-rendered markdown (no LLM)                    |
| Refiner   | `qwen/qwen3.8-27b` (Groq)           | local Ollama                           | keyword rules (existing `swap_gpu_4060`-style actions) |

All Groq calls go through the existing `callGroqWithRotation()` so the 17-key pool, cooldowns and 429 handling are reused as-is. Add a `stream: true` variant for the explainer.

---

## 5. Data flow (end to end)

```
Browser (ChatWorkspace)                 server.js (lib/ai/*)                      Supabase / Groq / Ollama
──────────────────────                  ─────────────────────                     ─────────────────────────
POST /api/ai/build  ───────────────────►  orchestrator.run()
  { message, sessionId? }                   │
                                            ├─ intent.parse(message, history) ──► Groq qwen-27b (JSON mode)
                                            │     └─ BuildRequest { budget:200000,
                                            │           purpose:"ai_ml", must:{vram_gb>=12},
                                            │           prefer:{brand:null}, currency:"BDT" }
                                            │
                                            ├─ retriever.candidates(req) ────────► SQL: products ⨝ product_specs
                                            │     per category: top-8 by value      ⨝ v_best_prices ⨝ component_benchmarks
                                            │     within allocated sub-budget       ⨝ latest price_history signal
                                            │     (stale > 24h ⇒ enqueue rescrape)
                                            │
  ◄── SSE event: "thinking" ────────────────┤
                                            ├─ planner.plan(req, candidates) ────► Groq gpt-oss-120b (JSON mode)
                                            │     └─ Build { parts:{cpu:id, gpu:id,…}, rationale[] }
                                            │
                                            ├─ validator.check(build) ── code ─── compatibility rules + budget
                                            │     violations? → planner.plan(req, candidates, violations)  (≤ 2×)
                                            │
  ◄── SSE event: "build" (JSON) ────────────┤  ← HUD renders parts table, gauge, wattage immediately
                                            │
  ◄── SSE events: "token" … "done" ─────────┤─ explainer.stream(build) ─────────► Groq qwen-27b (stream)
                                            │
                                            └─ persist ai_sessions / ai_messages (optional)

POST /api/ai/refine ───────────────────►  refiner.apply(session, "swap GPU to RTX 4060")
  { sessionId, message }                    ├─ small model → { op:"replace", category:"gpu", query:"RTX 4060" }
                                            ├─ retriever.find("gpu","RTX 4060") → candidate
                                            ├─ validator.check(newBuild)  (if fails → one planner call)
                                            └─ explainer.stream(diff)
```

The HUD receives the structured `build` event **before** the prose finishes streaming, so the parts table and price total appear in ~2–3 s even though the full answer takes ~6 s.

---

## 6. Real-time lowest-price guarantee

The user requirement: _"real time price list, the lowest price after comparing all tech stores."_

### 6.1 Where the price comes from

A materialized view gives one row per canonical product with the **minimum live price across all retailers**:

```sql
create materialized view public.v_best_prices as
select
  l.product_id,
  min(l.price) filter (where l.price > 0)                       as best_price,
  (array_agg(l.retailer order by l.price) filter (where l.price > 0))[1]    as best_retailer,
  (array_agg(l.id       order by l.price) filter (where l.price > 0))[1]    as best_listing_id,
  (array_agg(l.product_url order by l.price) filter (where l.price > 0))[1] as best_url,
  count(*) filter (where l.price > 0)                           as store_count,
  max(l.last_scraped_at)                                        as freshest_at
from public.listings l
where l.product_id is not null
group by l.product_id;

create unique index on public.v_best_prices (product_id);
-- refresh after every scraper run (cheap, ~2.5k products):
-- refresh materialized view concurrently public.v_best_prices;
```

The retriever joins `products → v_best_prices`, so every candidate the planner sees already carries `best_price`, `best_retailer`, `store_count`, `freshest_at`.

### 6.2 Freshness policy

| `freshest_at` age           | Behaviour                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ≤ 6 h                       | Use as is. Label: _"Prices checked N minutes ago"_.                                                                                                                                               |
| 6–24 h                      | Use as is, but **enqueue** a background `run_scrapers.py --query "<part name>"` for each chosen part (fire-and-forget, same pattern as `/api/search`). Label: _"Prices from today; refreshing…"_. |
| > 24 h or `store_count = 0` | Trigger the scrape **synchronously** for that category's top candidates (≤ 3 names, 20 s cap) before planning. If it times out, proceed and label _"Last seen price — verify on store page"_.     |

The response always includes `price_as_of` per part so the UI can show a freshness badge. Every part links to `/product/<best_listing_id>` where the user sees all stores, the history chart and the buy signal.

### 6.3 Buy-signal integration

`retriever` reuses `deriveBuySignal()` from `server.js` (extract it into `lib/priceInsights.js`) so each candidate carries `buy_signal: buy|fair|wait`. The planner is told to prefer `buy`/`fair` when two candidates are otherwise equivalent, and the explainer surfaces _"at its 30-day low"_ callouts — a trust builder that no competitor site offers.

---

## 7. Budget allocation heuristics

The retriever needs a per-category sub-budget to fetch sensible candidates. Percentages are starting points; the planner may shift ±10% between categories.

| Purpose (`BuildRequest.purpose`) | CPU     | GPU     | Mobo | RAM | Storage | PSU | Case | Cooler | Notes fed to planner                                                                       |
| -------------------------------- | ------- | ------- | ---- | --- | ------- | --- | ---- | ------ | ------------------------------------------------------------------------------------------ |
| `ai_ml`                          | 17%     | **45%** | 10%  | 9%  | 7%      | 5%  | 4%   | 3%     | VRAM ≥ 12 GB hard floor; 16 GB+ if budget ≥ ৳2.5L; 32 GB RAM min; NVIDIA preferred (CUDA). |
| `gaming`                         | 20%     | **40%** | 11%  | 7%  | 7%      | 6%  | 5%   | 4%     | Prefer X3D / high single-core; 1080p vs 1440p from prompt.                                 |
| `content_creation`               | **25%** | 30%     | 11%  | 10% | 10%     | 5%  | 5%   | 4%     | Core count > clocks; 32 GB RAM min; 2 TB NVMe preferred.                                   |
| `streaming`                      | 22%     | 35%     | 11%  | 9%  | 7%      | 6%  | 5%   | 5%     | NVENC-capable GPU; 32 GB RAM.                                                              |
| `office`                         | 35%     | 0%      | 20%  | 12% | 15%     | 8%  | 10%  | 0%     | CPU **must** have iGPU (Intel non-F, AMD G/8000-series); stock cooler allowed.             |

Rules that always apply: PSU wattage ≥ 1.25 × estimated draw; RAM generation must match motherboard; case form factor ≥ motherboard form factor; the total must be ≤ budget × 1.03 (3% tolerance, stated to the user).

---

## 8. Database changes

One migration, three objects:

```sql
-- 1. Curated component knowledge (seeded from open spec/benchmark datasets — no prices)
create table if not exists public.component_benchmarks (
  fingerprint   text primary key,          -- e.g. 'rtx-4070-super-12gb', 'ryzen-7-7700'
  category      text not null,             -- cpu | gpu
  display_name  text not null,
  socket        text,                      -- cpu
  tdp_watts     integer,
  vram_gb       integer,                   -- gpu
  cores         integer,                   -- cpu
  has_igpu      boolean,                   -- cpu
  score         numeric(5,1),              -- 0–100 relative performance
  generation    text,
  updated_at    timestamptz not null default now()
);
alter table public.component_benchmarks enable row level security;
create policy "public read benchmarks" on public.component_benchmarks for select to anon, authenticated using (true);

-- 2. Best price per product (see §6.1)  → v_best_prices

-- 3. Conversation persistence (lets users resume, and gives us an eval corpus)
create table if not exists public.ai_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,   -- null for guests
  request      jsonb not null,            -- latest BuildRequest
  build        jsonb,                     -- latest validated Build
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create table if not exists public.ai_messages (
  id           bigint generated always as identity primary key,
  session_id   uuid not null references public.ai_sessions (id) on delete cascade,
  role         text not null check (role in ('user','assistant','system')),
  content      text not null,
  tokens_in    integer,
  tokens_out   integer,
  model        text,
  created_at   timestamptz not null default now()
);
create index on public.ai_messages (session_id, created_at);
alter table public.ai_sessions  enable row level security;
alter table public.ai_messages  enable row level security;
create policy "own sessions" on public.ai_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own messages" on public.ai_messages for select to authenticated
  using (exists (select 1 from public.ai_sessions s where s.id = session_id and s.user_id = (select auth.uid())));
-- server writes with service role
```

`tokens_in / tokens_out / model` per message give us real cost telemetry from day one.

---

## 9. Backend API & module design

### 9.1 Endpoints (in `server.js`, rate-limited with the existing `commandLimiter`)

| Method & path             | Body                                                       | Response                                                                                         |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /api/ai/build`      | `{ message: string, sessionId?: string, userId?: string }` | **SSE** stream: `event: thinking`, `event: build` (Build JSON), `event: token` ×N, `event: done` |
| `POST /api/ai/refine`     | `{ sessionId: string, message: string }`                   | Same SSE shape; `build` carries `diff`                                                           |
| `GET /api/ai/session/:id` | —                                                          | `{ request, build, messages[] }` for resume                                                      |

### 9.2 Module layout

```
lib/ai/
├── orchestrator.js   run(message, session) → async generator of SSE events
├── intent.js         parse(message, history) → BuildRequest          (open model, JSON mode)
├── retriever.js      candidates(BuildRequest) → Candidates            (SQL only)
├── planner.js        plan(request, candidates, violations?) → Build   (closed model, JSON mode)
├── validator.js      check(Build) → { ok, violations[], wattage, score } (port of compatibility.ts)
├── explainer.js      stream(build, request) → AsyncIterable<string>   (open model, streamed)
├── refiner.js        apply(session, message) → { build, diff }
├── budget.js         allocate(purpose, budget) → per-category caps   (§7 table)
├── schemas.js        zod schemas: BuildRequest, Candidates, Build
└── llm.js            thin wrappers: groqJson(), groqStream(), ollamaJson()  (over lib/groq.js)
```

### 9.3 Core schemas (zod — validated on every LLM output)

```ts
BuildRequest = {
  budget_bdt: number,                   // 200000
  purpose: 'ai_ml'|'gaming'|'content_creation'|'streaming'|'office'|'general',
  constraints: {
    min_vram_gb?: number, min_ram_gb?: number, min_storage_gb?: number,
    prefer_brand?: { cpu?: 'amd'|'intel', gpu?: 'nvidia'|'amd' },
    form_factor?: 'ITX'|'mATX'|'ATX', quiet?: boolean, rgb?: boolean
  },
  include_peripherals: boolean,         // monitor/keyboard/mouse only if asked
  language: 'en'|'bn'
}

Candidate = {
  id: string,            // products.id
  name: string, category: string, brand: string,
  best_price: number, best_retailer: string, best_listing_id: string, store_count: number,
  price_as_of: string,   // ISO
  specs: Record<string,string>,      // from product_specs
  bench?: { score, tdp_watts, vram_gb, cores, socket, has_igpu },
  buy_signal: 'buy'|'fair'|'wait'|'neutral'
}

Build = {
  parts: { cpu: string, gpu?: string, motherboard: string, ram: string,
           storage: string, psu: string, case: string, cooler?: string },   // candidate ids ONLY
  total_bdt: number,
  rationale: { category: string, why: string }[],
  alternatives: { category: string, id: string, delta_bdt: number, label: string }[]  // for refine chips
}
```

The planner may **only** return ids that were present in `Candidates`. Anything else is rejected and the call is retried with the violation appended — this is what makes price hallucination impossible.

### 9.4 Validator (server port of `compatibility.ts`)

Rules, in order: socket match → RAM generation → PSU ≥ 1.25 × draw (draw = 75 W base + CPU TDP + GPU TDP from `component_benchmarks`, falling back to `product_specs.recommended_psu`) → case ≥ motherboard form factor → cooler present unless office → `total ≤ budget × 1.03`. Returns machine-readable violations, e.g. `{ rule:'psu_headroom', detail:'~430W draw on 550W PSU (28% headroom, need 25%) ✓' }`, which are fed back verbatim to the planner on retry.

---

## 10. Prompts

### Intent parser (open model, `response_format: json_object`)

```
You extract PC-build requirements for the Bangladesh market. Output ONLY JSON matching:
{budget_bdt:number, purpose:"ai_ml"|"gaming"|"content_creation"|"streaming"|"office"|"general",
 constraints:{min_vram_gb?,min_ram_gb?,min_storage_gb?,prefer_brand?:{cpu?,gpu?},form_factor?,quiet?,rgb?},
 include_peripherals:boolean, language:"en"|"bn"}
Rules: "lakh"/"lac" = 100000; "k" = 1000; if no budget, use 0. Bengali input allowed.
Machine learning / deep learning / LLM / training → "ai_ml". Video editing / Premiere / Blender → "content_creation".
```

### Planner (closed model, JSON mode)

```
You are a senior PC hardware architect for Bangladesh. Choose EXACTLY ONE candidate id per category
from the CANDIDATES list to satisfy REQUEST. You may not invent parts or prices.
Hard rules: same socket for cpu+motherboard; same RAM generation; PSU ≥ 1.25× (75 + cpu_tdp + gpu_tdp) W;
case form factor ≥ motherboard; total ≤ budget×1.03. For ai_ml: maximise VRAM, NVIDIA preferred,
≥32GB RAM. For office: cpu must have iGPU, no gpu. Prefer candidates with buy_signal "buy"/"fair"
when equivalent. Output JSON {parts, total_bdt, rationale[], alternatives[]}. rationale: one sentence
per category, plain language. alternatives: up to 3 sensible swaps with price delta.
{VIOLATIONS_FROM_PREVIOUS_ATTEMPT if any}
```

### Explainer (open model, streamed)

```
Write Tonima's reply in {language}. Input is a validated build JSON with live prices from Bangladeshi
stores. Structure: 1 sentence on the strategy; a markdown table (Category | Part | Best price | Store);
a compatibility line with ✅ marks; a freshness line ("Prices checked N min ago"); one 💡 tip if any part
has buy_signal "buy" ("at its 30-day low") or "wait". Never change any number. Max 180 words.
```

---

## 11. Frontend integration

Minimal changes — the UI already has the right shapes.

1. **`ChatWorkspace.tsx`** — replace the `setTimeout` mock (lines ~120–222) with an `EventSource`/`fetch` + `ReadableStream` consumer of `POST /api/ai/build`. `event: build` → `setBuild()`; `event: token` → append to the streaming bubble; `event: done` → finalize and render `alternatives` as the existing `highlightChips`.
2. **`BuildPreviewHUD.tsx`** — its `BuildComponentItem { category, name, priceBDT, retailer, inStock }` maps 1:1 from `Build.parts` + candidate data. Add `priceAsOf` and `buySignal` badges (reuse the styles from `PriceHistoryChart`).
3. **Refine chips** — `onRefineBuild` already exists; route it to `POST /api/ai/refine` instead of the hard-coded `swap_gpu_4060` cases.
4. **"Track price" / "Subscribe alert"** on each part — reuse `WishlistButton` (needs `products.id`, which we have) and `PriceAlertButton` (needs `best_listing_id`, which we have).
5. **"Open in PC Builder"** — the builder currently uses a static catalog (`builderCatalog.ts`) whose ids differ from `products.id`. Short-term: match by name to a catalog id where possible and build the `?parts=` link; long-term: migrate the builder to live products (already flagged as a separate improvement).
6. **Bengali** — pass `language: 'bn'` from `i18n.language`; the explainer writes Bengali, numbers stay in Latin digits with ৳.

---

## 12. Cost, latency & model selection

Per full build request (steady state, Groq pricing as of 2026, rounded):

| Step                                  | Model             | Tokens         | Est. cost          | Latency                                  |
| ------------------------------------- | ----------------- | -------------- | ------------------ | ---------------------------------------- |
| Intent                                | qwen3.8-27b       | 420            | ~$0.0001           | 0.4 s                                    |
| Retriever                             | —                 | —              | —                  | 0.15 s (SQL)                             |
| Planner                               | gpt-oss-120b      | 2,900          | ~$0.0015           | 2.0–3.5 s                                |
| Validator (+1 retry, 30% of requests) | — / gpt-oss-120b  | 0 / 3,100      | 0 / ~$0.0016       | 0 / 2.5 s                                |
| Explainer                             | qwen3.8- (stream) | 1,050          | ~$0.0003           | first token 0.5 s, done 3 s              |
| **Total**                             |                   | **~4.4k–7.5k** | **≈ $0.002–0.004** | **build JSON ≈ 2.5 s, full reply ≈ 6 s** |

Follow-up refinements: ~600 tokens on open models ≈ $0.0002.

At 10,000 builds/month that is ≈ **$20–40/month** in tokens — trivially covered by the free-tier key pool for a long time. If the closed model becomes the bottleneck (429s), the pool rotates; if _all_ keys are exhausted the planner falls back to `qwen3.8-27b` with a tighter validator loop (quality drops slightly, service stays up).

**Local Ollama:** `qwen2.5:1.5b` is only good enough for intent parsing and as an explainer-of-last-resort. If the server has ≥ 8 GB RAM, `qwen2.5:7b` makes a reasonable offline explainer. Do **not** use local small models as the planner — that is where quality is decided.

---

## 13. Guardrails & failure handling

| Risk                                  | Mitigation                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hallucinated parts/prices             | Planner can only return candidate ids; zod-validated; retried with violation on mismatch. Prices are copied from candidates by code, never from model text.                              |
| Incompatible build                    | Deterministic validator, ≤ 2 planner retries, then return best-effort with explicit ⚠️ list instead of failing.                                                                          |
| Stale prices                          | Freshness policy (§6.2) + `price_as_of` on every part + background rescrape.                                                                                                             |
| Groq outage / all keys exhausted      | Existing pool cooldowns → model fallback chain (§4) → template-rendered explanation.                                                                                                     |
| Prompt injection via user message     | User text goes only into the `user` role; candidates are inserted by code; output is JSON-schema validated.                                                                              |
| Cost spikes                           | `commandLimiter` (30 req / 5 min / IP); 15-minute in-memory cache keyed on `(purpose, budget bucket ৳5k, constraints hash)` for identical anonymous requests; per-message token logging. |
| Empty category (e.g. no PSU in stock) | Retriever widens the sub-budget ±25%, then falls back to any in-stock item; planner is told the category is constrained.                                                                 |
| Windows dev machines                  | Scraper spawn path is POSIX (`scrapers/venv/bin/python`); make it env-configurable (`PYTHON_BIN`) so the freshness rescrape works locally.                                               |

---

## 14. Evaluation

A `tests/ai/golden.json` with ~25 prompts (EN + BN), e.g. _"ML workstation 2 lakh"_, _"গেমিং পিসি ৮০ হাজার"_, _"office pc 60k no gpu"_, _"4K editing 3.5 lakh Intel only"_, _"ITX build 1.5 lakh"_. A script runs the pipeline against the live DB and asserts:

- **Compatibility:** validator score = 100 for ≥ 95% of prompts.
- **Budget adherence:** total within +3% for 100%; within −15% (not under-spending) for ≥ 90%.
- **Purpose fit:** `ai_ml` builds have ≥ 12 GB VRAM & ≥ 32 GB RAM; `office` builds have iGPU CPU and no GPU.
- **Grounding:** every part id exists in candidates; every price equals `v_best_prices.best_price`.
- **Latency:** p95 `build` event < 4 s; p95 `done` < 8 s.
- **Cost:** mean tokens per build < 6k; closed-model share < 65%.

Run it in CI weekly (not on every push — it hits live services) and on every prompt change.

---

## 15. Implementation roadmap

| Phase                           | Scope                                                                                                                                                                                            | Effort                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| **0. Foundations**              | Migration (§8) · `v_best_prices` + refresh hook at end of `upsert_listings()` · seed `component_benchmarks` (~300 rows) · extract `deriveBuySignal` to `lib/priceInsights.js` · `PYTHON_BIN` env | 1–2 days                |
| **1. Pipeline (non-streaming)** | `lib/ai/*` modules · zod schemas · validator port · `POST /api/ai/build` returning JSON · golden tests                                                                                           | 3–4 days                |
| **2. Streaming + UI**           | SSE endpoint · `groqStream()` · wire `ChatWorkspace` + `BuildPreviewHUD` · freshness & buy-signal badges · Bengali                                                                               | 2–3 days                |
| **3. Refinement loop**          | `POST /api/ai/refine` · refiner module · chips from `alternatives` · session persistence & resume                                                                                                | 2 days                  |
| **4. Hardening**                | Fallback chain · cache · token telemetry dashboard (simple SQL) · weekly eval job · Ollama 7B option                                                                                             | 2 days                  |
| **5. Builder bridge**           | "Open in PC Builder" mapping; later: migrate builder catalog to live products                                                                                                                    | 1 day (+ separate epic) |

≈ 2–3 weeks for one developer to production quality.

---

## 16. Environment variables

```env
# already used
GROQ_API_KEYS="gsk_...,gsk_...,..."           # rotation pool (lib/groq.js)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...                  # server-side writes (ai_sessions, refresh view)

# new
AI_PLANNER_MODEL=openai/gpt-oss-120b           # closed / frontier
AI_PLANNER_FALLBACK=llama-3.3-70b-versatile
AI_OPEN_MODEL=qwen/qwen               # intent, explainer, refiner
OLLAMA_API_URL=http://127.0.0.1:11434          # optional local fallback
OLLAMA_MODEL=qwen2.5:7b                        # or qwen2.5:1.5b on small hosts
AI_PRICE_STALE_HOURS=24                        # §6.2 threshold
AI_CACHE_TTL_MIN=15
PYTHON_BIN=scrapers/venv/bin/python            # scrapers\venv\Scripts\python.exe on Windows
```

---

## 17. Decisions & open questions

- **Peripherals (monitor/keyboard/mouse):** excluded unless the user asks; when included they get a separate 10–15% carve-out so the core build is not starved.
- **Used / refurbished parts:** out of scope — listings only cover new retail stock.
- **Guest vs signed-in:** guests get the full agent (sessions kept in memory for 30 min); signed-in users get persisted sessions, "Track price" on parts, and history in the profile.
- **Where does refresh of `v_best_prices` run?** Simplest: Python `upsert_listings()` executes `refresh materialized view concurrently` via the service role after each batch. Alternative: a `pg_cron` job every 15 min.
- **Should the planner ever call tools?** Not in v1. Retrieval-before-planning keeps a single, predictable, cheap planner call. If later we want the planner to _ask_ for more candidates in a category, expose one tool `more_candidates(category, budget_delta)` and cap it at 2 calls.

---

_Document owner: PC-KINBA engineering. Update this file whenever prompts, model choices or schemas change._
