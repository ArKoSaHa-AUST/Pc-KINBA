# PC-KINBA Scraper Architecture & Health Monitoring Runbook

## Overview

PC-KINBA monitors live pricing across 12 major Bangladeshi technology hardware retailers:
1. **StarTech BD** (`startech`)
2. **Ryans Computers** (`ryans`)
3. **Global Brand** (`globalbrand`)
4. **Techland BD** (`techland`)
5. **Skyland BD** (`skyland`)
6. **PCB Store** (`pcbstore`)
7. **Computer Mania BD** (`computermania`)
8. **Binary Logic** (`binarylogic`)
9. **Sell Tech BD** (`selltech`)
10. **Computer Village** (`computervillage`)
11. **PC House BD** (`pchouse`)
12. **Ultra Technology** (`ultratech`)

---

## Core Modules & Architecture

- **`scrapers/selectors.py`**: The immutable, centralized selector registry for all 12 retailers. Over-broad fallbacks (e.g. bare `'a'`) are strictly banned. Shared OpenCart clones are explicitly annotated.
- **`scrapers/fast_scrapers.py`**: High-performance HTTP parser engine leveraging `curl_cffi` (Chrome TLS fingerprint impersonation) and `BeautifulSoup`. Returns structured `ScrapeResult` telemetry.
- **`scrapers/health.py`**: Scraper health evaluation state machine (`healthy`, `degraded`, `broken`, `unknown`). Tracks rolling-median item count baselines, detects subtle low-yield degradation, and handles alert deduplication / 24-hour cooldowns.
- **`scrapers/smoke_test.py`**: Scheduled canary runner testing `CANARY_QUERIES = ["rtx 4060", "ryzen 5", "ddr5 16gb", "850w psu"]` without catalog mutation. Exits `0` (healthy), `1` (broken), `2` (system error).
- **`scrapers/run_scrapers.py`**: Ingestion entrypoint with per-store reporting and non-blocking upsert on partial failure.
- **`scrapers/db.py`**: Supabase persistence layer for `scraper_runs` and `scraper_health`.

---

## Incident Response & Failure Diagnosis

### Differentiating Retailer Redesigns vs. Temporary Outages

| `failure_reason` | Symptoms | Root Cause | Action Required |
|---|---|---|---|
| `container_missing` | Persists across consecutive runs, HTTP 200 returned, 0 items parsed | **Retailer Redesign.** The store altered card/grid container class names. | **High Priority:** Update selector in `scrapers/selectors.py`. |
| `all_unpriced` | Container matches, titles extracted, but `priced_count == 0` | **Price DOM Structure Change.** Price class or currency format changed. | **High Priority:** Update price selector in `scrapers/selectors.py`. |
| `low_yield` | Yield < 40% of rolling 20-run median on common hardware query | **Partial Redesign / Pagination / Filter Change.** | Investigate store search result markup. |
| `http_error` | Status 500, 502, 503, 504 | **Store Server Down.** Temporary retailer hosting outage. | Monitor; usually resolves automatically. |
| `blocked` | HTTP 403 / Cloudflare Turnstile / Captcha challenge body detected | **Anti-Bot Challenge.** Bot mitigation triggered. | Verify `curl_cffi` browser impersonation headers. |
| `unknown` | Store health unupdated for > 48 hours | **Canary Runner Stalled.** CI cron job or worker halted. | Check GitHub Actions workflows and scheduler. |

---

## How to Update a Broken Selector

When an alert fires for store `<store_id>`:

1. **Capture Live Markup**:
   Fetch search results for the store in a browser or via `curl_cffi` and inspect the updated DOM elements (card container, title link, price wrapper, image).

2. **Update Registry (`scrapers/selectors.py`)**:
   Modify the `StoreSelectors` entry for the store. Add new primary classes and preserve valid secondary fallbacks:
   ```python
   "skyland": StoreSelectors(
       store_id="skyland",
       display_name="Skyland BD",
       item=".new-product-thumb, .product-thumb",
       title=(".new-name a", ".name a"),
       ...
   )
   ```

3. **Update Golden HTML Fixture**:
   Save a representative HTML snapshot of the search results to `tests/fixtures/scraper_html/<store_id>.html`.

4. **Run Parser Unit Tests**:
   ```bash
   python -m pytest tests/scrapers/test_scrapers_parsers.py -k <store_id>
   ```

5. **Execute Manual Canary Test**:
   ```bash
   python -m scrapers.smoke_test --dry-run --query "rtx 4060"
   ```

---

## Coupled Stores Note (OpenCart Clones)

Five retailers share the OpenCart base template:
- `skyland`
- `selltech`
- `computervillage`
- `ultratech`
- `globalbrand`

**Warning:** A theme or plugin update by any of these retailers' common web agency will likely break multiple stores simultaneously. If one breaks, proactively inspect the other four.

---

## Admin API & Telemetry

- **Endpoint**: `GET /api/admin/scraper-health`
- **Header**: `x-admin-key: <ADMIN_API_KEY>` (or `Authorization: Bearer <ADMIN_API_KEY>`)
- **Response**: JSON payload containing `health` records and `recent_runs_24h` aggregated per store.
