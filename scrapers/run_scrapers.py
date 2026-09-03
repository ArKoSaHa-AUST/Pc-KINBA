import argparse
import sys
import os

# Ensure scrapers module can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scrapers.fast_scrapers import scrape_all_fast
from scrapers.db import upsert_listings, init_sqlite_db as init_db

DEFAULT_QUERIES = ["rtx 5060", "rtx 4060", "ryzen 7"]

def run_scrapers(queries: list):
    """Run concurrent scrapers for all Bangladeshi tech retailers."""
    init_db()
    print("==================================================")
    print(f"🚀 Starting PC Component Price Scraper Run for: {queries}")
    print("==================================================")
    
    all_listings = []
    for q in queries:
        print(f"\n--- Scraper Run for Query: '{q}' ---")
        try:
            listings = scrape_all_fast(q)
            all_listings.extend(listings)
            print(f"Collected {len(listings)} items for query '{q}'")
        except Exception as e:
            print(f"❌ Scraper error for query '{q}': {e}")
            
    print(f"\nTotal scraped listings collected across stores: {len(all_listings)}")
    
    if all_listings:
        print("\nUpserting scraped listings into SQLite & Supabase...")
        upsert_listings(all_listings)
        print("✅ Database update completed!")
    else:
        print("⚠️ No listings scraped.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Multi-Retailer Component Price Scrapers")
    parser.add_argument("--query", "-q", type=str, help="Specific search query to scrape (e.g. 'rtx 5060')")
    args = parser.parse_args()
    
    search_queries = [args.query] if args.query else DEFAULT_QUERIES
    run_scrapers(search_queries)
