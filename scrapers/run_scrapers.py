"""
PC-KINBA — Production Multi-Retailer Component Price Scraper Entrypoint

Concurrently scrapes all 12 Bangladeshi tech retailers for specified product queries.
Persists listings to Supabase Postgres (idempotently).
Logs per-store health telemetry and exits with honest non-zero code on partial failure.
"""

import argparse
import sys
import os
import time
from typing import List, Dict, Any

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

from scrapers.fast_scrapers import scrape_all_fast_detailed, ScrapeResult
from scrapers.health import record_run
from scrapers.db import upsert_listings, supabase_client

DEFAULT_QUERIES = ["rtx 5060", "rtx 4060", "ryzen 7"]


def run_scrapers(queries: List[str]) -> int:
    """
    Executes full ingestion pipeline with per-store breakdown and health tracking:
    1. Concurrently scrapes listings across all 12 stores for each query.
    2. Upserts all successful listings into database (never blocking on partial store failure).
    3. Records telemetry into scraper_runs & scraper_health.
    4. Prints a detailed per-store breakdown table.
    5. Returns exit code 0 if all stores healthy, or 1 if any store was broken.
    """
    print("=" * 80)
    print(f"🚀 PC-KINBA — Multi-Retailer Scraper Pipeline")
    print(f"📋 Target Queries: {queries}")
    print("=" * 80)

    t0 = time.time()
    all_scrape_results: List[ScrapeResult] = []
    all_successful_listings: List[Dict[str, Any]] = []

    for q in queries:
        print(f"\n--- Scraping 12 Stores for Query: '{q}' ---")
        detailed_batch = scrape_all_fast_detailed(q)
        all_scrape_results.extend(detailed_batch)
        
        for r in detailed_batch:
            if r.items:
                all_successful_listings.extend(r.items)

    total_duration = round(time.time() - t0, 2)

    # 1. Upsert whatever succeeded into Supabase (graceful degradation)
    if all_successful_listings:
        print(f"\n💾 Upserting {len(all_successful_listings)} scraped listings into Supabase database...")
        upsert_listings(all_successful_listings)
        print("✅ Supabase database listings upsert completed!")
    else:
        print("⚠️ No listings collected to upsert.")

    # 2. Record Scraper Health Telemetry
    health_summary = record_run(all_scrape_results, client=supabase_client)

    # 3. Print Per-Store Breakdown Table
    print("\n" + "=" * 90)
    print(f"{'STORE ID':<16} | {'ITEMS':<6} | {'PRICED':<6} | {'STATUS':<10} | {'FAILURE REASON'}")
    print("-" * 90)

    records_map = {r["store_id"]: r for r in health_summary.get("records", [])}
    unique_stores = sorted(list(set(r.store_id for r in all_scrape_results)))

    for store_id in unique_stores:
        store_res = [r for r in all_scrape_results if r.store_id == store_id]
        total_items = sum(r.item_count for r in store_res)
        total_priced = sum(r.priced_count for r in store_res)
        
        h_info = records_map.get(store_id, {})
        status = h_info.get("status", "unknown").upper()
        fail_reason = h_info.get("last_failure_reason") or "none"
        
        status_icon = "🟢" if status == "HEALTHY" else ("🟡" if status == "DEGRADED" else "🔴")
        print(f"{store_id:<16} | {total_items:<6} | {total_priced:<6} | {status_icon} {status:<8} | {fail_reason}")

    print("=" * 90)
    print(f"⏱️ Pipeline Finished in {total_duration}s | Total Collected Listings: {len(all_successful_listings)}")
    print(f"📊 Health Overview: {health_summary['healthy_count']} Healthy, {health_summary['degraded_count']} Degraded, {health_summary['broken_count']} Broken")

    broken_stores = health_summary.get("broken_stores", [])
    if broken_stores:
        print(f"\n⚠️ Notice: {len(broken_stores)} store(s) flagged BROKEN: {', '.join(broken_stores)}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Multi-Retailer Component Price Scrapers")
    parser.add_argument("--query", "-q", type=str, help="Specific search query to scrape (e.g. 'rtx 5060')")
    args = parser.parse_args()

    search_queries = [args.query] if args.query else DEFAULT_QUERIES
    code = run_scrapers(search_queries)
    sys.exit(code)
