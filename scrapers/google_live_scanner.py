"""
PC Kinba - Google & Multi-Engine Live Price Comparison Agent
Scrapes search engine results (Google/DuckDuckGo/Bing) for "<product> price in bd"
Extracts store name, direct product link, real price, and stock status across all BD retailers.
"""

import sys
import os
import re
import json
import urllib.parse
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

# Ensure scrapers module can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scrapers.ai_extractor import extract_price_and_stock
from scrapers.fast_scrapers import get_session, scrape_all_fast
from scrapers.db import get_sqlite_conn, init_sqlite_db, get_or_create_product_sqlite

STORE_DIRECTORY = {
    'startech.com.bd': {'name': 'StarTech BD', 'logo': 'ST', 'color': '#ef4444'},
    'ryans.com': {'name': 'Ryans Computers', 'logo': 'RY', 'color': '#10b981'},
    'ryanscomputers.com': {'name': 'Ryans Computers', 'logo': 'RY', 'color': '#10b981'},
    'ultratech.com.bd': {'name': 'Ultra Technology', 'logo': 'UT', 'color': '#8b5cf6'},
    'selltech.com.bd': {'name': 'Sell Tech BD', 'logo': 'ST', 'color': '#f97316'},
    'pcbstore.com.bd': {'name': 'PCB Store', 'logo': 'PC', 'color': '#a855f7'},
    'techlandbd.com': {'name': 'Techland BD', 'logo': 'TL', 'color': '#ec4899'},
    'eit.com.bd': {'name': 'Eastern IT', 'logo': 'EI', 'color': '#06b6d4'},
    'applegadgetsbd.com': {'name': 'Apple Gadgets', 'logo': 'AG', 'color': '#64748b'},
    'creatus.com.bd': {'name': 'Creatus Computer', 'logo': 'CC', 'color': '#dc2626'},
    'ucc.com.bd': {'name': 'UCC BD', 'logo': 'UC', 'color': '#0ea5e9'},
    'skyland.com.bd': {'name': 'Skyland BD', 'logo': 'SK', 'color': '#6366f1'},
    'globalbrand.com.bd': {'name': 'Global Brand', 'logo': 'GB', 'color': '#3b82f6'},
    'binarylogic.com.bd': {'name': 'Binary Logic', 'logo': 'BL', 'color': '#14b8a6'},
    'computervillage.com.bd': {'name': 'Computer Village', 'logo': 'CV', 'color': '#0284c7'},
    'pchouse.com.bd': {'name': 'PC House BD', 'logo': 'PH', 'color': '#84cc16'},
    'computermania.com.bd': {'name': 'Computer Mania BD', 'logo': 'CM', 'color': '#f59e0b'}
}

def identify_store_from_url(url: str):
    """Matches URL domain against known Bangladeshi retailer directory."""
    clean_url = url.lower()
    for domain, meta in STORE_DIRECTORY.items():
        if domain in clean_url:
            return meta['name'], meta['logo'], meta['color']
    
    # Generic extraction if unknown store
    domain_match = re.search(r'https?://(?:www\.)?([^/]+)', clean_url)
    domain_name = domain_match.group(1) if domain_match else "Retailer"
    store_name = domain_name.split('.')[0].capitalize()
    return store_name, store_name[:2].upper(), '#00e5ff'

def unquote_ddg_url(raw_href: str) -> str:
    """Extracts actual clean destination URL from search redirect wrapper."""
    if 'uddg=' in raw_href:
        m = re.search(r'uddg=([^&]+)', raw_href)
        if m:
            return urllib.parse.unquote(m.group(1))
    return raw_href

def extract_price_from_page_html(url: str) -> int:
    """Quick direct page fetch if search snippet didn't contain explicit price."""
    try:
        import requests
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        resp = requests.get(url, headers=headers, timeout=4)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            # Look for common product price classes across StarTech, Techland, SellTech, Ryans, etc.
            price_el = soup.select_one('.product-price, .p-price, .ins-price, .price, .product-price-new, .price-new, .price-box')
            if price_el:
                txt = price_el.get_text(strip=True)
                m = re.search(r'([\d,]{4,7})\s*(?:৳|bdt|tk\.?)', txt, re.IGNORECASE)
                if m:
                    return int(re.sub(r'[^\d]', '', m.group(1)))
            
            # Fallback regex search on first 10k chars of HTML
            m2 = re.search(r'(?:price|special-price|final_price)\D{0,20}(?:৳|bdt|tk\.?)?\s*([\d,]{4,7})', resp.text[:12000], re.IGNORECASE)
            if m2:
                digits = int(re.sub(r'[^\d]', '', m2.group(1)))
                if 500 <= digits <= 2500000:
                    return digits
    except Exception:
        pass
    return 0

def fetch_search_results(query: str):
    """
    Executes search engine queries for '<product> price in bd'
    Returns list of {title, url, snippet}
    """
    import requests
    results = []
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    })
    search_term = f"{query} price in bd"
    encoded = urllib.parse.quote(search_term)

    # 1. Search via DuckDuckGo HTML
    try:
        ddg_url = f"https://html.duckduckgo.com/html/?q={encoded}"
        r = session.get(ddg_url, timeout=6)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            for res_card in soup.select('.result'):
                a = res_card.select_one('.result__title a')
                snippet_el = res_card.select_one('.result__snippet')
                if a and a.get('href'):
                    clean_url = unquote_ddg_url(a['href'])
                    title = a.get_text(strip=True)
                    snippet = snippet_el.get_text(strip=True) if snippet_el else ''
                    results.append({
                        'title': title,
                        'url': clean_url,
                        'snippet': snippet
                    })
    except Exception as e:
        print(f"[Google Scanner] DuckDuckGo search error: {e}")

    # 2. Search via Bing if results are scarce
    if len(results) < 6:
        try:
            bing_url = f"https://www.bing.com/search?q={encoded}"
            r = session.get(bing_url, timeout=6)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                for li in soup.select('li.b_algo'):
                    a = li.select_one('h2 a')
                    snippet_el = li.select_one('.b_caption p, p')
                    if a and a.get('href'):
                        results.append({
                            'title': a.get_text(strip=True),
                            'url': a['href'],
                            'snippet': snippet_el.get_text(strip=True) if snippet_el else ''
                        })
        except Exception as e:
            print(f"[Google Scanner] Bing fallback search error: {e}")

    return results

def scan_live_store_prices(product_title: str):
    """
    Main Agent Orchestration:
    1. Searches Google / search engines for '<clean_product_title> price in bd'
    2. Identifies all Bangladeshi tech stalls/stores
    3. Extracts direct product URLs and real prices
    4. Also queries fast retailer scrapers to guarantee 100% coverage
    5. Saves offers to SQLite DB and returns clean payload
    """
    # Clean product title to brand + model (e.g. "AMD Ryzen 7 7700 3.8GHz-5.3GHz 8 Core..." -> "AMD Ryzen 7 7700")
    clean_title = re.sub(r'[\(\[\{].*?[\)\]\}]', '', product_title)
    clean_title = re.sub(r'\b\d+(\.\d+)?\s*(ghz|mhz|core|threads|cache|mb|gb|tb|ca\.\.\.)\b.*', '', clean_title, flags=re.I).strip()
    if len(clean_title) < 5:
        clean_title = product_title.strip()

    print(f"🔍 [Live Google Scanner] Searching BD retailers for '{clean_title}' (raw: '{product_title}')...")
    raw_search_items = fetch_search_results(clean_title)
    print(f"   ✓ Search engine returned {len(raw_search_items)} candidate web listings.")

    offers_by_store = {}
    valid_prices = []

    # Process search engine results
    for item in raw_search_items:
        url = item['url']
        title = item['title']
        snippet = item['snippet']

        # Skip irrelevant non-store results
        if any(skip in url.lower() for skip in ['youtube.com', 'facebook.com', 'reddit.com', 'quora.com', 'wikipedia.org']):
            continue

        # Skip accessories/cables/miscellaneous products if looking for high-end component
        combined_lower = f"{title} {url}".lower()
        if any(term in combined_lower for term in ['cable', 'fiber', 'adapter', 'case cover', 'charger', 'sleeve']):
            continue

        # Strict model validation: extract numbers from query (e.g. '7700', '4060', '5060')
        query_model_tokens = [t.lower() for t in re.findall(r'\b\d{3,5}[a-z]?\b', product_title.lower())]
        if query_model_tokens:
            combined_search_item = f"{title} {url}".lower()
            # If none of the specific model numbers are in title or URL, skip to prevent false matches (e.g. 2200G instead of 7700)
            if not any(token in combined_search_item for token in query_model_tokens):
                continue

        store_name, logo, color = identify_store_from_url(url)
        price, in_stock = extract_price_and_stock(snippet, title, product_title)

        # If snippet didn't contain explicit price, verify directly from product page
        if price == 0 and url.startswith('http'):
            direct_price = extract_price_from_page_html(url)
            if direct_price > 0:
                price = direct_price
                in_stock = True

        # Sanity check: avoid matching a full prebuilt desktop PC (100k+) if user searched a bare CPU (< 50k)
        if 'desktop pc' in title.lower() and ('processor' in product_title.lower() or 'cpu' in product_title.lower()):
            if price > 50000:
                continue

        if store_name not in offers_by_store or (price > 0 and offers_by_store[store_name]['price'] == 0):
            offers_by_store[store_name] = {
                'name': store_name,
                'store': store_name,
                'logo': logo,
                'color': color,
                'price': price,
                'price_str': f"{price:,}৳" if price > 0 else "Call for Price",
                'product_url': url,
                'stock': in_stock and (price > 0),
                'availability': 'In Stock' if in_stock and price > 0 else 'Call for Price'
            }
            if price > 0:
                valid_prices.append(price)

    # Supplement with direct fast scrapers to ensure all stores are verified
    try:
        direct_items = scrape_all_fast(clean_title)
        query_model_tokens = [t.lower() for t in re.findall(r'\b\d{3,5}[a-z]?\b', clean_title.lower())]

        for d in direct_items:
            d_title = d['title'].lower()
            d_url = d['product_url'].lower()
            d_path = d_url.split('?')[0]

            # Must contain the query's model number (e.g. '7700') in title or URL path
            if query_model_tokens and not (any(token in d_title for token in query_model_tokens) or any(token in d_path for token in query_model_tokens)):
                continue

            # Reject mismatched category components (e.g. motherboard, cooler, laptop, prebuilt, desktop, cables)
            mismatched_categories = ['laptop', 'notebook', 'desktop pc', 'combo', 'cable', 'fiber', 'motherboard', 'mainboard', 'cooler', 'casing']
            if any(term in d_title for term in mismatched_categories) and not any(term in clean_title.lower() for term in mismatched_categories):
                continue

            s_name = d['retailer']
            p_val = d['price']
            url = d['product_url']

            # Reject insane price spikes or sub-5000 outliers for high-end CPUs
            if p_val > 500000 or p_val < 5000:
                p_val = 0

            meta = next((v for k, v in STORE_DIRECTORY.items() if v['name'] == s_name), {'logo': s_name[:2].upper(), 'color': '#00e5ff'})

            # If store wasn't found on search engine or direct scraper has a real price
            if s_name not in offers_by_store or (p_val > 0 and offers_by_store[s_name]['price'] == 0):
                offers_by_store[s_name] = {
                    'name': s_name,
                    'store': s_name,
                    'logo': meta['logo'],
                    'color': meta['color'],
                    'price': p_val,
                    'price_str': f"{p_val:,}৳" if p_val > 0 else "Call for Price",
                    'product_url': url,
                    'stock': p_val > 0,
                    'availability': 'In Stock' if p_val > 0 else 'Call for Price'
                }
                if p_val > 0 and p_val not in valid_prices:
                    valid_prices.append(p_val)
    except Exception as e:
        print(f"[Google Scanner] Direct scraper supplement warning: {e}")

    # Ensure all core 12 stores exist in the comparison view (even if Call for Price)
    core_stores = [
        'StarTech BD', 'Ryans Computers', 'Ultra Technology', 'Sell Tech BD',
        'PCB Store', 'Techland BD', 'Eastern IT', 'Skyland BD', 'Global Brand',
        'Binary Logic', 'Computer Village', 'PC House BD'
    ]

    for store_name in core_stores:
        if store_name not in offers_by_store:
            meta = next((v for k, v in STORE_DIRECTORY.items() if v['name'] == store_name), {'logo': store_name[:2].upper(), 'color': '#00e5ff'})
            default_domain = next((k for k, v in STORE_DIRECTORY.items() if v['name'] == store_name), 'google.com')
            offers_by_store[store_name] = {
                'name': store_name,
                'store': store_name,
                'logo': meta['logo'],
                'color': meta['color'],
                'price': 0,
                'price_str': 'Call for Price',
                'product_url': f"https://www.{default_domain}/search?search={urllib.parse.quote_plus(clean_title)}",
                'stock': False,
                'availability': 'Check Retailer'
            }

    # Calculate best price
    best_price = min(valid_prices) if valid_prices else 0
    best_price_str = f"৳{best_price:,}" if best_price > 0 else "Price on Request"
    best_store = next((s['name'] for s in offers_by_store.values() if s['price'] == best_price), "Retailer")

    # Sort offers: priced items first (lowest to highest), then unpriced
    sorted_shops = sorted(offers_by_store.values(), key=lambda x: (x['price'] <= 0, x['price'] if x['price'] > 0 else float('inf')))

    # Idempotently persist newly scraped listings to SQLite DB
    try:
        init_sqlite_db()
        conn = get_sqlite_conn()
        c = conn.cursor()
        for shop in sorted_shops:
            if shop['price'] > 0 and shop['product_url'] and 'http' in shop['product_url']:
                prod_id = get_or_create_product_sqlite(conn, product_title, shop['store'])
                url_hash = str(abs(hash(shop['product_url'])))
                c.execute("""
                    INSERT INTO listings (id, product_id, retailer, title, brand, price, price_str, product_url, last_scraped_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'AMD', ?, ?, ?, DATETIME('now'), DATETIME('now'), DATETIME('now'))
                    ON CONFLICT(product_url) DO UPDATE SET
                        price = excluded.price,
                        price_str = excluded.price_str,
                        updated_at = DATETIME('now')
                """, (url_hash, prod_id, shop['store'], product_title, shop['price'], shop['price_str'], shop['product_url']))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Google Scanner] DB save warning: {e}")

    return {
        'query': product_title,
        'best_price': best_price,
        'best_price_str': best_price_str,
        'best_price_store': best_store,
        'total_stores': len(sorted_shops),
        'shops': sorted_shops
    }

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "AMD Ryzen 7 7700"
    result = scan_live_store_prices(q)
    print(json.dumps(result, indent=2, ensure_ascii=False))
