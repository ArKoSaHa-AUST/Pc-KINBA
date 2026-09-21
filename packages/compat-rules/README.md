# @pc-kinba/compat-rules

The single source of truth for PC Kinba's hardware compatibility rules and
purpose-based budget allocation.

## Why this package exists

The rules used to exist twice, in two languages, with no shared source:

| | Before | Now |
|---|---|---|
| React builder | `client/src/components/builder/compatibility.ts` — 15 rules | adapter only |
| Tonima AI validator | `lib/ai/validator.js` — 6 rules | adapter only |
| Budget weights | `autoBuild.ts` **and** `lib/ai/budget.js`, byte-identical | one table here |

They agreed by coincidence, not by construction. Three divergences already existed
when the duplication was removed:

1. The builder's form-factor table had no `E-ATX` and no `Mini-ITX`/`Micro-ATX`
   aliases, so an E-ATX board fell through to the `?? 2` default and read as ATX.
2. `BASE_DRAW_WATTS = 75` and the `1.25` PSU headroom multiplier were written out
   by hand on both sides.
3. The validator inferred sockets and RAM generations by regex over product names
   and **guessed** when the name was uninformative (`"DDR5"`, `"ATX"`), which
   produced false verdicts rather than no verdict.

## The contract

Every rule is a pure function returning `RuleResult | null`:

- `null` — not enough information to judge. **This is not the same as "compatible."**
- `severity: 'ok'` — checked and fine.
- `severity: 'warning' | 'error'` — checked and problematic.

Conflating the first two is precisely how a compatibility engine silently passes a
build it never actually checked, so the distinction is enforced by tests.

## Consumers

Both are adapters. Neither may contain rule logic — CI enforces this via
`scripts/check-no-duplicate-rules.mjs`.

```
client/src/components/builder/compatibility.ts   BuilderProduct  -> CompatPart
lib/ai/validator.js                              Supabase product + specs/bench -> CompatPart
```

## Deliberate divergence

One behaviour is genuinely different between the two sides and is therefore an
explicit option rather than a silent difference — `estimatePowerDraw`'s
`assumeDefaults`:

- **off** (builder): a CPU/GPU present but reporting no TDP contributes 0W. The
  curated catalog always has TDP, so a missing value means an empty slot.
- **on** (Tonima): it contributes 65W / 220W. Scraped listings frequently omit TDP
  and under-sizing a PSU is the more expensive mistake.

## Build

The package ships as compiled ESM + `.d.ts` in `dist/`, which is gitignored.

```bash
npm run build:packages        # from the repo root
```

`npm test` and `npm start` at the root, and `npm run build` in `client/`, all build
it first via pre-scripts. If you run `node server.js` directly on a fresh clone,
build the package once first.

## Tests

```bash
npx vitest run packages/compat-rules   # unit tests for the rules themselves
npx vitest run tests/shared            # cross-adapter parity over 30 fixtures
```

`tests/shared/compat_parity.test.ts` drives one neutral fixture corpus through
**both** adapters and asserts three things: that they map the same facts onto the
same `CompatPart`, that the shared engine reaches the fixture's verdict from either
path, and that each adapter's public surface agrees with that verdict.
