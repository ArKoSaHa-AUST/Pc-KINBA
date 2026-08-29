import asyncio
import re
from typing import List, Dict, Any
from playwright.async_api import Page, async_playwright

KNOWN_BRANDS = [
    "MSI", "ASUS", "Gigabyte", "PNY", "ZOTAC", "Sapphire", "PowerColor", 
    "XFX", "Intel", "AMD", "Corsair", "Kingston", "Samsung", "DeepCool", 
    "Antec", "Thermaltake", "Razer", "Logitech", "Lian Li", "Noctua", 
    "Thermalright", "Crucial", "G.Skill", "ADATA", "Lexar", "Team", "Palit", "Inno3D"
]

def parse_brand(title: str) -> str:
    """Extract brand from product title string."""
    title_upper = title.upper()
    for brand in KNOWN_BRANDS:
        if re.search(r'\b' + re.escape(brand) + r'\b', title, re.IGNORECASE):
            return brand
    first_word = title.split()[0] if title.split() else "Generic"
    return first_word.capitalize()

def parse_price(price_str: str) -> int:
    """Parse numeric integer price from Bangladeshi Taka string format e.g. '57,500৳ 58,000৳' -> 57500."""
    matches = re.findall(r'[\d,]+', price_str)
    if not matches:
        return 0
    # Take the first number (discounted price)
    first_num = matches[0].replace(',', '')
    try:
        return int(first_num)
    except ValueError:
        return 0

async def scrape_startech(page: Page, query: str) -> List[Dict[Any, Any]]:
    """Scrape product listings from StarTech BD search results."""
    encoded_query = query.replace(" ", "+")
    search_url = f"https://www.startech.com.bd/product/search?search={encoded_query}"
    
    print(f"[StarTech Scraper] Fetching: {search_url}")
    await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(2000)
    
    items = await page.query_selector_all(".p-item")
    print(f"[StarTech Scraper] Found {len(items)} product items.")
    
    results = []
    for item in items:
        try:
            title_el = await item.query_selector(".p-item-name a")
            price_el = await item.query_selector(".p-item-price")
            img_el = await item.query_selector(".p-item-img img")
            
            if not title_el:
                continue
                
            title = (await title_el.inner_text()).strip()
            product_url = await title_el.get_attribute("href") or ""
            
            price_raw = (await price_el.inner_text()).strip() if price_el else "0"
            price = parse_price(price_raw)
            
            image_url = await img_el.get_attribute("src") if img_el else ""
            brand = parse_brand(title)
            
            if title and product_url and price > 0:
                results.append({
                    "retailer": "StarTech BD",
                    "title": title,
                    "brand": brand,
                    "price": price,
                    "price_str": f"{price:,}৳",
                    "product_url": product_url,
                    "image_url": image_url,
                })
        except Exception as e:
            print(f"[StarTech Scraper] Error parsing item: {e}")
            continue
            
    print(f"[StarTech Scraper] Successfully extracted {len(results)} valid listings.")
    return results

if __name__ == "__main__":
    async def main():
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            data = await scrape_startech(page, "rtx 5060")
            print("Sample result:", data[:2] if data else "None")
            await browser.close()
            
    asyncio.run(main())
