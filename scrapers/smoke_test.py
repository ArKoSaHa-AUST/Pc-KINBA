"""
PC-KINBA — Scheduled Scraper Canary Smoke Test

Runs concurrent canary queries against all 12 Bangladeshi tech retailers.
Does NOT upsert into the catalog listings.
Persists telemetry into scraper_runs and scraper_health.
Exits 0 when healthy, 1 when any retailer is broken, 2 on runtime failure.
"""

import sys
import os
import argparse
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

# Ensure scrapers module can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from scrapers.fast_scrapers import scrape_store_internal, ScrapeResult
from scrapers.selectors import SELECTORS
from scrapers.health import record_run, CANARY_QUERIES
from scrapers.db import supabase_client


def run_canary_for_store(store_id: str, queries: List[str]) -> List[ScrapeResult]:
    """Runs canary queries sequentially for a single store with safety pauses."""
    store_results = []
    for q in queries:
        res = scrape_store_internal(store_id, q)
        store_results.append(res)
        # Small courteous delay between consecutive queries to the same store
        time.sleep(0.3)
    return store_results


def run_smoke_test(
    queries: Optional[List[str]] = None,
    dry_run: bool = False,
    output_json: bool = False
) -> int:
    """
    Main canary executor:
    1. Runs concurrent checks across all 12 stores (1 thread per store).
    2. Collects all ScrapeResult records.
    3. Evaluates health and updates database (unless dry-run).
    4. Prints formatted summary table.
    5. Returns exit code (0: healthy, 1: broken, 2: error).
    """
    active_queries = queries or CANARY_QUERIES
    all_store_ids = list(SELECTORS.keys())
    
    print("=" * 80)
    print("🔍 PC-KINBA — Multi-Retailer Scraper Canary Smoke Test")
    print(f"📡 Target Retailers: {len(all_store_ids)} stores")
    print(f"🔎 Canary Queries: {active_queries}")
    print(f"🛡️  Mode: {'DRY RUN (No DB updates)' if dry_run else 'LIVE PERSISTENCE'}")
    print("=" * 80)

    start_time = time.time()
    all_results: List[ScrapeResult] = []

    try:
        # Run each store in its own worker thread (max 12 concurrent store workers)
        with ThreadPoolExecutor(max_workers=12) as executor:
            future_map = {
                executor.submit(run_canary_for_store, s_id, active_queries): s_id 
                for s_id in all_store_ids
            }
            for future in as_completed(future_map):
                s_id = future_map[future]
                try:
                    res_list = future.result()
                    all_results.extend(res_list)
                except Exception as e:
                    print(f"❌ [Canary Error for store {s_id}]: {e}", file=sys.stderr)
                    all_results.append(
                        ScrapeResult(
                            store_id=s_id,
                            query=active_queries[0] if active_queries else "canary",
                            ok=False,
                            failure_reason="exception",
                            error=str(e),
                        )
                    )

        total_elapsed = round(time.time() - start_time, 2)

        # Evaluate and record health
        health_summary = record_run(all_results, client=supabase_client, dry_run=dry_run)

        # Print per-store breakdown table
        print("\n" + "=" * 95)
        print(f"{'STORE ID':<16} | {'ITEMS':<6} | {'PRICED':<6} | {'STATUS':<10} | {'FAIL REASON':<18} | {'AVG DURATION'}")
        print("-" * 95)

        records_map = {r["store_id"]: r for r in health_summary.get("records", [])}

        for store_id in all_store_ids:
            store_res = [r for r in all_results if r.store_id == store_id]
            items_total = sum(r.item_count for r in store_res)
            priced_total = sum(r.priced_count for r in store_res)
            avg_ms = int(sum(r.duration_ms for r in store_res) / max(len(store_res), 1))
            
            h_info = records_map.get(store_id, {})
            status = h_info.get("status", "unknown").upper()
            fail_reason = h_info.get("last_failure_reason") or "none"

            status_icon = "🟢" if status == "HEALTHY" else ("🟡" if status == "DEGRADED" else "🔴")
            print(f"{store_id:<16} | {items_total:<6} | {priced_total:<6} | {status_icon} {status:<8} | {fail_reason:<18} | {avg_ms} ms")

        print("=" * 95)
        print(f"⏱️ Total Canary Duration: {total_elapsed}s")
        print(f"📊 Summary: Healthy: {health_summary['healthy_count']} | Degraded: {health_summary['degraded_count']} | Broken: {health_summary['broken_count']}")

        broken_stores = health_summary.get("broken_stores", [])
        if broken_stores:
            print(f"\n🚨 [CRITICAL ALERT] {len(broken_stores)} store(s) BROKEN: {', '.join(broken_stores)}", file=sys.stderr)
            if output_json:
                with open("scraper_health_report.json", "w") as f:
                    json.dump(health_summary, f, indent=2)
            return 1

        if output_json:
            with open("scraper_health_report.json", "w") as f:
                json.dump(health_summary, f, indent=2)

        print("\n✅ All monitored Bangladeshi tech retailers are functional.")
        return 0

    except Exception as e:
        print(f"\n💥 Fatal error during Canary Smoke Test execution: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PC-KINBA Scraper Canary Smoke Test")
    parser.add_argument("--dry-run", action="store_true", help="Run without persisting to database")
    parser.add_argument("--json", action="store_true", help="Save health report to scraper_health_report.json")
    parser.add_argument("--query", "-q", action="append", help="Specific query to test (can be passed multiple times)")
    args = parser.parse_args()

    exit_code = run_smoke_test(queries=args.query, dry_run=args.dry_run, output_json=args.json)
    sys.exit(exit_code)
