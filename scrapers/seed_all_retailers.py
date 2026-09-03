"""
PC Kinba - Multi-Retailer Comprehensive Catalog Seeder
Iterates through essential hardware categories and stores scraped products across all 12 Bangladeshi retailers.
"""

import sys
import os
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scrapers.fast_scrapers import scrape_all_fast
from scrapers.db import upsert_listings, init_sqlite_db

CORE_KEYWORDS = [
    # RTX 50 & 40 Series GPUs
    "rtx 5060",
    "rtx 5070",
    "rtx 5080",
    "rtx 4060",
    "rtx 4070",
    # AMD Processors
    "ryzen 5 5600",
    "ryzen 7 7800x3d",
    "ryzen 5 7600",
    # Intel Processors
    "core i5 13400",
    "core i5 12400f",
    "core i7 14700",
    # Motherboards
    "b650 motherboard",
    "b760 motherboard",
    # RAM
    "16gb ddr5",
    "32gb ddr5",
    "16gb ddr4",
    # NVMe SSDs
    "1tb nvme ssd",
    "samsung 990 pro",
    "samsung 980",
    # Power Supplies & Monitors
    "650w power supply",
    "750w power supply",
    "gaming monitor 144hz"
]

def seed_catalog(queries=None):
    init_sqlite_db()
    target_queries = queries or CORE_KEYWORDS
    print(f"🚀 [Catalog Seeder] Beginning crawl for {len(target_queries)} core hardware targets...")

    total_scraped = 0
    for idx, q in enumerate(target_queries, 1):
        print(f"\n[{idx}/{len(target_queries)}] Scraping 12 retailers for: '{q}'...")
        try:
            items = scrape_all_fast(q)
            if items:
                upsert_listings(items)
                total_scraped += len(items)
                print(f"   ✓ Inserted/Updated {len(items)} listings.")
            else:
                print(f"   ⚠️ No items returned for '{q}'.")
        except Exception as e:
            print(f"   ❌ Error crawling '{q}': {e}")
        time.sleep(0.5)

    print(f"\n🎉 [Catalog Seeder Completed] Successfully crawled and indexed {total_scraped} listings across all stores!")

if __name__ == "__main__":
    queries = sys.argv[1:] if len(sys.argv) > 1 else None
    seed_catalog(queries)
