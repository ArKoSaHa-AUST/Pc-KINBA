import sys
import os
import asyncio
import re
from typing import List, Dict, Any

# Add root directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Dynamically locate and add scrapers venv site-packages to sys.path
venv_lib = os.path.join(BASE_DIR, "scrapers", "venv", "lib")
if os.path.exists(venv_lib):
    for py_dir in os.listdir(venv_lib):
        sp = os.path.join(venv_lib, py_dir, "site-packages")
        if os.path.exists(sp) and sp not in sys.path:
            sys.path.insert(0, sp)

try:
    from playwright.async_api import Page, async_playwright  # type: ignore
except ImportError:
    from typing import Any as Page  # type: ignore
    async_playwright = None

try:
    from scrapers.startech_scraper import parse_brand, parse_price
except ImportError:
    from startech_scraper import parse_brand, parse_price

async def parse_items_from_page(page: Page) -> List[Dict[Any, Any]]:
    """Helper to extract product data from card items on current page."""
    selectors = [
        "[class*='category-single-product']",
        "[class*='product-card']",
        ".grid-view-main .card",
        ".cus-col-2",
        ".card"
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
            
            if not title or len(title) < 3 or any(w in title.lower() for w in ["view all", "category", "compare", "no products"]):
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
            continue
            
    return results

async def scrape_ryans(page: Page, query: str) -> List[Dict[Any, Any]]:
    """Scrape product listings from Ryans Computers search results with universal category fallback."""
    encoded_query = query.replace(" ", "+")
    search_url = f"https://www.ryans.com/search?search={encoded_query}"
    
    # Universal category mapping dictionary for any tech product
    q_lower = query.lower()
    fallback_url = None
    category_map = [
        (["rtx", "gtx", "rx", "5060", "4060", "3060", "gpu", "graphics", "vga"], "https://www.ryans.com/category/desktop-component-graphics-card"),
        (["ryzen", "intel", "i7", "i5", "i9", "cpu", "processor"], "https://www.ryans.com/category/desktop-component-processor"),
        (["ssd", "nvme", "m.2"], "https://www.ryans.com/category/desktop-component-ssd"),
        (["ram", "memory", "ddr4", "ddr5"], "https://www.ryans.com/category/desktop-component-ram"),
        (["ups", "ips", "online ups", "offline ups"], "https://www.ryans.com/category/desktop-component-ups"),
        (["pendrive", "pen drive", "flash drive", "usb drive"], "https://www.ryans.com/category/storage-pen-drive"),
        (["charger", "adapter", "power adapter"], "https://www.ryans.com/category/accessories-power-adapter"),
        (["psu", "power supply"], "https://www.ryans.com/category/desktop-component-power-supply"),
        (["motherboard", "mainboard"], "https://www.ryans.com/category/desktop-component-motherboard"),
        (["monitor"], "https://www.ryans.com/category/desktop-component-monitor"),
        (["keyboard"], "https://www.ryans.com/category/accessories-keyboard"),
        (["mouse"], "https://www.ryans.com/category/accessories-mouse"),
        (["router", "wifi", "access point"], "https://www.ryans.com/category/networking-router"),
    ]
    
    for keywords, cat_url in category_map:
        if any(k in q_lower for k in keywords):
            fallback_url = cat_url
            break
        
    print(f"[Ryans Scraper] Fetching search URL: {search_url}")
    for attempt in range(3):
        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2500)
            if page.url != "about:blank" and not page.url.startswith("chrome-error"):
                break
        except Exception as e:
            print(f"[Ryans Scraper] Navigation attempt {attempt+1} warning: {e}")
            await asyncio.sleep(1.5)
            
    results = await parse_items_from_page(page)
    
    if len(results) == 0 and fallback_url:
        print(f"[Ryans Scraper] Search URL yielded 0 items. Trying fallback category: {fallback_url}")
        try:
            await page.goto(fallback_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2500)
            results = await parse_items_from_page(page)
        except Exception as e:
            print(f"[Ryans Scraper] Fallback navigation error: {e}")
            
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
