"""
PC Kinba - Parallel Product Scraping & Matching Engine

Performs:
1. Web Search targeting e-commerce domains in Bangladesh (StarTech, Ryans, Techland, PCB Store, UCC, Binary Logic, EIT, Vibe Gaming, etc.)
2. Parallel URL extraction using asyncio & aiohttp (concurrent fetching)
3. Real price parsing (removes "Call for Price" / 0 -> null)
4. Attribute extraction (manufacturer, brand, base_model, type, capacity, speed)
5. Canonical fingerprint matching & confidence scoring
6. Idempotent storage in local database & clean JSON output
"""

import asyncio
import aiohttp
import re
import sys
import json
import urllib.parse
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional

from scrapers.normalizer import (
    extract_attributes,
    generate_fingerprint,
    normalize_price,
    calculate_match_confidence
)
from scrapers.db import get_sqlite_conn, init_sqlite_db, get_or_create_product_sqlite
from scrapers.fast_scrapers import scrape_all_fast

TARGET_DOMAINS = [
    'startech.com.bd',
    'ryans.com',
    'techlandbd.com',
    'pcbstore.com.bd',
    'ucc.com.bd',
    'binarylogic.com.bd',
    'eit.com.bd',
    'applegadgetsbd.com',
    'vibegaming.com.bd',
    'globalbrand.com.bd'
]

STORE_NAMES = {
    'startech.com.bd': 'StarTech BD',
    'ryans.com': 'Ryans Computers',
    'techlandbd.com': 'Techland BD',
    'pcbstore.com.bd': 'PCB Store',
    'ucc.com.bd': 'UCC BD',
    'binarylogic.com.bd': 'Binary Logic',
    'eit.com.bd': 'Eastern IT',
    'applegadgetsbd.com': 'Apple Gadgets',
    'vibegaming.com.bd': 'Vibe Gaming',
    'globalbrand.com.bd': 'Global Brand'
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

def identify_store(url: str) -> str:
    for domain, name in STORE_NAMES.items():
        if domain in url:
            return name
    return 'Retailer'

def is_product_url(url: str) -> bool:
    if not url or not url.startswith('http'):
        return False
    lower = url.lower()
    if any(x in lower for x in ['youtube.com', 'facebook.com', 'forum', 'blog', 'news', 'category', 'search', 'cart', 'checkout', 'login']):
        return False
    for domain in TARGET_DOMAINS:
        if domain in lower:
            return True
    return False

def search_web_urls(query: str, num_results: int = 20) -> List[str]:
    """Gather product page URLs using Google / DuckDuckGo Search."""
    urls = []
    
    # 1. Try googlesearch-python
    try:
        from googlesearch import search
        search_query = f"{query} price in bangladesh"
        print(f"[Search Engine] Executing web search: '{search_query}'")
        for u in search(search_query, num_results=num_results):
            if is_product_url(u) and u not in urls:
                urls.append(u)
    except Exception as e:
        print(f"[Search Engine Warning] Google search failed: {e}")

    # 2. Try DuckDuckGo
    if len(urls) < 4:
        try:
            from duckduckgo_search import DDGS
            ddg_query = f"{query} price in bangladesh site:.bd"
            print(f"[Search Engine] Executing DuckDuckGo search: '{ddg_query}'")
            results = DDGS().text(ddg_query, max_results=20)
            for r in results:
                u = r.get('href', '')
                if is_product_url(u) and u not in urls:
                    urls.append(u)
        except Exception as e:
            print(f"[Search Engine Warning] DDG search failed: {e}")

    print(f"[Search Engine] Found {len(urls)} target URLs across Bangladesh e-commerce sites.")
    return urls[:15]

async def scrape_single_url(session: aiohttp.ClientSession, url: str) -> Optional[Dict[str, Any]]:
    """Fetch HTML concurrently and parse title, price, stock, store."""
    try:
        async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=8)) as resp:
            if resp.status != 200:
                return None
            html = await resp.text()

        soup = BeautifulSoup(html, 'html.parser')
        store_name = identify_store(url)

        # Title
        title = ''
        og_title = soup.find('meta', property='og:title')
        if og_title and og_title.get('content'):
            title = og_title['content'].strip()
        elif soup.h1:
            title = soup.h1.get_text(strip=True)
        elif soup.title:
            title = soup.title.get_text(strip=True)

        if not title:
            return None

        title = re.sub(r'\s*\|\s*.*$', '', title)
        title = re.sub(r'\s*-\s*.* Price.*$', '', title, flags=re.IGNORECASE)

        # Price
        price_num = None
        meta_price = soup.find('meta', property='product:price:amount') or soup.find('meta', property='og:price:amount')
        if meta_price and meta_price.get('content'):
            price_num = normalize_price(meta_price['content'])

        if price_num is None:
            price_nodes = soup.select('.product-price, .price, .product-price-new, .price-new, .p-price, ins .amount, span.price')
            for p_node in price_nodes:
                text = p_node.get_text(strip=True)
                if any(c.isdigit() for c in text):
                    p = normalize_price(text)
                    if p and p > 1000:
                        price_num = p
                        break

        if price_num is None:
            body_matches = re.findall(r'(?:৳|BDT|TK\.?)\s*([\d,]{4,8})', html, re.IGNORECASE)
            for m in body_matches:
                p = normalize_price(m)
                if p and p > 1000:
                    price_num = p
                    break

        # Stock / Availability
        stock = True
        body_text = soup.get_text().lower()
        if any(x in body_text for x in ['out of stock', 'stock out', 'upcoming', 'discontinued']):
            stock = False

        price_str = f"{price_num:,}৳" if price_num else "Call for Price"

        return {
            'store': store_name,
            'title': title,
            'price': price_num,
            'price_str': price_str,
            'url': url,
            'stock': stock and (price_num is not None)
        }

    except Exception:
        return None

async def parallel_scrape_urls(urls: List[str]) -> List[Dict[str, Any]]:
    """Execute parallel scraping across all URLs using aiohttp."""
    results = []
    conn = aiohttp.TCPConnector(limit=10, ssl=False)
    async with aiohttp.ClientSession(connector=conn) as session:
        tasks = [scrape_single_url(session, u) for u in urls]
        completed = await asyncio.gather(*tasks, return_exceptions=True)
        for res in completed:
            if isinstance(res, dict) and res.get('title'):
                results.append(res)
    return results

def run_parallel_scraping_engine(query: str) -> Dict[str, Any]:
    """
    Main Orchestrator:
    1. Search web for target URLs
    2. Scrape in parallel
    3. Normalize & extract attributes
    4. Group offers by canonical fingerprint
    5. Save to local SQLite database
    6. Return clean aggregated output payload
    """
    urls = search_web_urls(query)

    # Scrape fast fallback scrapers as well to ensure complete store coverage
    fast_results = scrape_all_fast(query)

    # Run parallel scraping for direct search URLs
    scraped_items = []
    if urls:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        scraped_items = loop.run_until_complete(parallel_scrape_urls(urls))
        loop.close()

    # Combine web-scraped items and fast scraper items
    for f in fast_results:
        p_val = normalize_price(f['price'])
        scraped_items.append({
            'store': f['retailer'],
            'title': f['title'],
            'price': p_val,
            'price_str': p_val and f"{p_val:,}৳" or "Call for Price",
            'url': f['product_url'],
            'stock': p_val is not None
        })

    print(f"[Parallel Engine] Total scraped product pages: {len(scraped_items)}.")

    if not scraped_items:
        return {
            'query': query,
            'normalized_product': {},
            'best_price': None,
            'best_price_str': 'Call for Price',
            'offers': []
        }

    primary_title = scraped_items[0]['title']
    fp_data = generate_fingerprint(primary_title)
    attrs = fp_data['attributes']

    store_map = {}
    valid_prices = []

    init_sqlite_db()
    db_conn = get_sqlite_conn()

    for item in scraped_items:
        t = item['title']
        p = item['price']
        store = item['store']
        url = item['url']

        confidence = calculate_match_confidence(primary_title, t)
        item['confidence'] = confidence

        if confidence >= 0.75:
            # Prefer non-null price for store
            if store not in store_map or (p is not None and store_map[store]['price'] is None):
                store_map[store] = item
                if p is not None:
                    valid_prices.append(p)

            # Save listing into local SQLite database
            try:
                prod_id = get_or_create_product_sqlite(db_conn, t, item['store'])
                cursor = db_conn.cursor()
                cursor.execute("""
                INSERT INTO listings (id, product_id, retailer, title, brand, price, price_str, product_url, last_scraped_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'), DATETIME('now'))
                ON CONFLICT(product_url) DO UPDATE SET
                    price = excluded.price,
                    price_str = excluded.price_str,
                    updated_at = DATETIME('now')
                """, (
                    str(hash(url)), prod_id, store, t, attrs['brand'] or 'Generic',
                    p or 0, item['price_str'], url
                ))
                db_conn.commit()
            except Exception:
                pass

    db_conn.close()

    best_price = min(valid_prices) if valid_prices else None
    best_price_str = f"{best_price:,}৳" if best_price else "Call for Price"

    offers_list = list(store_map.values())
    offers_list.sort(key=lambda x: (x['price'] is None, x['price'] or float('inf')))

    return {
        'query': query,
        'normalized_product': {
            'manufacturer': attrs['manufacturer'],
            'brand': attrs['brand'],
            'base_model': attrs['baseModel'],
            'type': attrs['type'],
            'capacity': attrs['capacity'],
            'speed': attrs['speed'],
            'fingerprint': fp_data['fingerprint'],
            'canonical_name': fp_data['canonical_name']
        },
        'best_price': best_price,
        'best_price_str': best_price_str,
        'offers': offers_list
    }

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "PNY GeForce RTX 5060 8GB Dual Fan GDDR7"
    res = run_parallel_scraping_engine(q)
    print(json.dumps(res, indent=2, ensure_ascii=False))
