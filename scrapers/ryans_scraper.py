import sys
import os
import asyncio
import re
from typing import List, Dict, Any
from playwright.async_api import Page, async_playwright

# Add root directory to sys.path if needed
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from scrapers.startech_scraper import parse_brand, parse_price
except ImportError:
    from startech_scraper import parse_brand, parse_price

async def parse_items_from_page(page: Page) -> List[Dict[Any, Any]]:
    """Helper to extract product data from card items on current page."""
    selectors = [
        ".category-single-product",
        ".grid-view-main .card"
    ]
    
    items = []
    print(f"[parse_items_from_page] Page URL: {page.url}")
    for sel in selectors:
        found = await page.query_selector_all(sel)
        if found and len(found) > 0:
            print(f"[parse_items_from_page] Matched {len(found)} items with '{sel}'.")
            items = found
            break
            
    results = []
    for item in items:
        try:
            card_text = await item.inner_text()
            lines = [l.strip() for l in card_text.split('\n') if l.strip()]
            if not lines:
                continue
                
            title = lines[0]
            # Clean up trailing '#' or product code artifacts in titles
            title = re.sub(r'\s+#\s*\.+$', '', title)
            title = re.sub(r'\s+', ' ', title).strip()
            
            if not title or len(title) < 3 or any(w in title.lower() for w in ["view all", "category", "compare", "add to cart", "no products"]):
                continue
                
            # Product link
            link = await item.query_selector("a[href]")
            if not link:
                continue
            product_url = await link.get_attribute("href") or ""
            if product_url and not product_url.startswith("http"):
                product_url = f"https://www.ryans.com{product_url}"
                
            # Image URL
            img_el = await item.query_selector("img")
            image_url = await img_el.get_attribute("src") if img_el else ""
            
            # Price
            price_match = re.search(r'(?:Tk|৳)\s*([\d,]+)', card_text) or re.search(r'([\d,]+)\s*(?:Tk|৳)', card_text) or re.search(r'[\d,]+', card_text)
            price = parse_price(price_match.group(1)) if price_match else 0
            
            brand = parse_brand(title)
            
            if title and product_url and price > 0:
                results.append({
                    "retailer": "Ryans Computers",
                    "title": title,
                    "brand": brand,
                    "price": price,
                    "price_str": f"{price:,}৳",
                    "product_url": product_url,
                    "image_url": image_url,
                })
        except Exception as e:
            print(f"[parse_items_from_page] Error parsing item: {e}")
            continue
    return results

async def scrape_ryans(page: Page, query: str) -> List[Dict[Any, Any]]:
    """Scrape product listings from Ryans Computers search results with category fallback."""
    encoded_query = query.replace(" ", "+")
    search_url = f"https://www.ryans.com/search?q={encoded_query}"
    
    # Determine fallback category URL if query matches known component types
    q_lower = query.lower()
    fallback_url = None
    if any(k in q_lower for k in ["rtx", "gtx", "rx", "5060", "4060", "3060", "gpu", "graphics", "card"]):
        fallback_url = "https://www.ryans.com/category/desktop-component-graphics-card"
    elif any(k in q_lower for k in ["ryzen", "intel", "i7", "i5", "i9", "cpu", "processor"]):
        fallback_url = "https://www.ryans.com/category/desktop-component-processor"
    elif any(k in q_lower for k in ["ssd", "nvme", "storage"]):
        fallback_url = "https://www.ryans.com/category/desktop-component-ssd"
        
    # Prefer category URL when available for higher reliability on Ryans site structure
    target_url = fallback_url or search_url
    print(f"[Ryans Scraper] Fetching: {target_url}")
    for attempt in range(2):
        try:
            await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            if page.url != "about:blank":
                break
        except Exception as e:
            print(f"[Ryans Scraper] Navigation attempt {attempt+1} warning: {e}")
            await asyncio.sleep(2)
            
    if page.url == "about:blank":
        print("[Ryans Scraper] Failed to navigate to target URL.")
        return []
    
    results = await parse_items_from_page(page)
    print(f"[Ryans Scraper] Primary navigation extracted {len(results)} valid listings.")
    
    if len(results) == 0 and fallback_url and target_url != fallback_url:
        print(f"[Ryans Scraper] Search URL yielded 0 items. Retrying category URL: {fallback_url}")
        try:
            await page.wait_for_timeout(2000)
            await page.goto(fallback_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            results = await parse_items_from_page(page)
        except Exception as e:
            print(f"[Ryans Scraper] Fallback error: {e}")
            
    print(f"[Ryans Scraper] Final extracted {len(results)} valid listings.")
    return results

if __name__ == "__main__":
    async def main():
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled']
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
            page = await context.new_page()
            data = await scrape_ryans(page, "rtx 5060")
            print("Sample result:", data[:2] if data else "None")
            await browser.close()
            
    asyncio.run(main())
