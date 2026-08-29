import argparse
import asyncio
import sys
import os
from playwright.async_api import async_playwright

# Ensure scrapers module can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.startech_scraper import scrape_startech
from scrapers.ryans_scraper import scrape_ryans
from scrapers.db import upsert_listings, init_sqlite_db as init_db

DEFAULT_QUERIES = ["rtx 5060", "ryzen 7", "i7 14700k"]

async def run_all_scrapers(queries: list):
    """Run scrapers for StarTech BD and Ryans Computers on all target queries."""
    init_db()
    print("==================================================")
    print(f"🚀 Starting PC Component Price Scraper Run for queries: {queries}")
    print("==================================================")
    
    all_listings = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        for q in queries:
            print(f"\n--- Scraper Run for Query: '{q}' ---")
            
            # StarTech Scraping
            try:
                startech_data = await scrape_startech(page, q)
                all_listings.extend(startech_data)
            except Exception as e:
                print(f"❌ [StarTech Error] Scraping failed for '{q}': {e}")
                
            # Ryans Scraping
            try:
                ryans_data = await scrape_ryans(page, q)
                all_listings.extend(ryans_data)
            except Exception as e:
                print(f"❌ [Ryans Error] Scraping failed for '{q}': {e}")
                
        await browser.close()
        
    print(f"\nTotal scraped listings collected: {len(all_listings)}")
    
    if all_listings:
        print("\nUpserting scraped listings into database...")
        upsert_listings(all_listings)
        print("✅ Database update completed!")
    else:
        print("⚠️ No listings scraped.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run StarTech BD and Ryans Computers Scrapers")
    parser.add_argument("--query", "-q", type=str, help="Specific search query to scrape (e.g. 'rtx 5060')")
    args = parser.parse_args()
    
    search_queries = [args.query] if args.query else DEFAULT_QUERIES
    asyncio.run(run_all_scrapers(search_queries))
