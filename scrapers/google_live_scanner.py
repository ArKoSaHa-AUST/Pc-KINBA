"""
PC Kinba - Open-Discovery Live Store Price Comparison Agent
1. Multi-Engine Search across Google, DuckDuckGo & Bing for "<product> price in bd"
2. AI-Powered Analysis (Open Model via Ollama + Groq Cloud Fallback)
3. Discovers ANY shop/retailer selling the product in Bangladesh (no hardcoded restrictions)
4. Deep page scraping for live prices & in-stock verification
5. Only displays shops that actually carry or list the product
"""

import sys
import os
import re
import json
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

venv_lib = os.path.join(BASE_DIR, "scrapers", "venv", "lib")
if os.path.exists(venv_lib):
    for py_dir in os.listdir(venv_lib):
        sp = os.path.join(venv_lib, py_dir, "site-packages")
        if os.path.exists(sp) and sp not in sys.path:
            sys.path.insert(0, sp)

try:
    from bs4 import BeautifulSoup  # type: ignore[import-not-found, import-untyped]
except ImportError:
    from bs4 import BeautifulSoup  # type: ignore

from scrapers.ai_extractor import ai_extract_listing, clean_extracted_shop_name
from scrapers.fast_scrapers import get_session, scrape_all_fast
from scrapers.db import get_sqlite_conn, init_sqlite_db, get_or_create_product_sqlite

# Vibrant cyber/neon palette for dynamically discovered shops
PALETTE = [
    '#00e5ff', '#10b981', '#6366f1', '#ec4899', '#f59e0b',
    '#8b5cf6', '#14b8a6', '#06b6d4', '#f97316', '#3b82f6',
    '#84cc16', '#e11d48', '#d946ef', '#0284c7'
]

KNOWN_STORES = {
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
    'computermania.com.bd': {'name': 'Computer Mania BD', 'logo': 'CM', 'color': '#f59e0b'},
    'daraz.com.bd': {'name': 'Daraz BD', 'logo': 'DZ', 'color': '#f97316'},
    'pickaboo.com': {'name': 'Pickaboo', 'logo': 'PK', 'color': '#3b82f6'},
    'gadgetandgear.com': {'name': 'Gadget & Gear', 'logo': 'GG', 'color': '#00e5ff'},
    'potakait.com': {'name': 'Potaka IT', 'logo': 'PI', 'color': '#10b981'},
    'nexus.com.bd': {'name': 'Nexus Computer', 'logo': 'NX', 'color': '#8b5cf6'}
}

# Domains to skip (reviews, videos, blogs, non-shops)
NON_STORE_DOMAINS = [
    'youtube.com', 'facebook.com', 'reddit.com', 'quora.com', 'wikipedia.org',
    'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'pinterest.com',
    'medium.com', 'techtarget.com', 'tomshardware.com', 'anandtech.com',
    'guru3d.com', 'wccftech.com', 'notebookcheck.net', 'github.com',
    'bdprice.com.bd', 'mobilebazaar.com', 'mobiledokan.com'
]

def identify_store_from_url(url: str, ai_suggested_name: str = ""):
    """
    Dynamically identifies store name, logo, color, and verified status.
    Works for any store discovered on the web.
    """
    clean_url = url.lower()
    for domain, meta in KNOWN_STORES.items():
        if domain in clean_url:
            return meta['name'], meta['logo'], meta['color'], True

    # Generic extraction for unknown / open-web shops
    domain_match = re.search(r'https?://(?:www\.)?([^/]+)', clean_url)
    domain_name = domain_match.group(1) if domain_match else "retailer.com"
    domain_root = domain_name.split('.')[0]

    # Use AI-extracted store name if reliable, else clean domain
    if ai_suggested_name and len(ai_suggested_name) >= 3 and ai_suggested_name.lower() not in ['retailer', 'store', 'shop', 'online']:
        store_name = clean_extracted_shop_name(ai_suggested_name, domain_name)
    else:
        words = re.findall(r'[A-Za-z]+|\d+', domain_root)
        store_name = ' '.join(w.capitalize() for w in words)
        if not store_name or len(store_name) < 3:
            store_name = domain_root.capitalize()

    words = store_name.split()
    logo = (words[0][0] + (words[1][0] if len(words) > 1 else words[0][1:2])).upper()
    color_idx = abs(hash(domain_root)) % len(PALETTE)
    color = PALETTE[color_idx]

    return store_name, logo, color, False

def unquote_ddg_url(raw_href: str) -> str:
    """Extracts clean destination URL from search redirect wrapper."""
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
        resp = requests.get(url, headers=headers, timeout=3.5)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            price_el = soup.select_one(
                '.product-price, .p-price, .ins-price, .price, .product-price-new, '
                '.price-new, .price-box, .special-price, .sale-price, .current-price, '
                '.price-current, [data-price], [itemprop="price"]'
            )
            if price_el:
                txt = price_el.get_text(strip=True)
                m = re.search(r'([\d,]{4,7})\s*(?:৳|bdt|tk\.?)', txt, re.IGNORECASE)
                if m:
                    return int(re.sub(r'[^\d]', '', m.group(1)))

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
    Multi-Engine Search across DuckDuckGo and Bing for '<product> price in bd'
    Returns list of {title, url, snippet}
    """
    import requests
    results = []
    seen_urls = set()
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    })
    search_term = f"{query} price in bd"
    encoded = urllib.parse.quote(search_term)

    # 1. DuckDuckGo Search
    try:
        ddg_url = f"https://html.duckduckgo.com/html/?q={encoded}"
        r = session.get(ddg_url, timeout=5)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            for res_card in soup.select('.result'):
                a = res_card.select_one('.result__title a')
                snippet_el = res_card.select_one('.result__snippet')
                if a and a.get('href'):
                    clean_url = unquote_ddg_url(a['href'])
                    if clean_url not in seen_urls:
                        seen_urls.add(clean_url)
                        results.append({
                            'title': a.get_text(strip=True),
                            'url': clean_url,
                            'snippet': snippet_el.get_text(strip=True) if snippet_el else ''
                        })
    except Exception as e:
        print(f"[Google Scanner] DuckDuckGo search error: {e}")

    # 2. Bing Search (for broader coverage)
    if len(results) < 12:
        try:
            bing_url = f"https://www.bing.com/search?q={encoded}"
            r = session.get(bing_url, timeout=5)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'html.parser')
                for li in soup.select('li.b_algo'):
                    a = li.select_one('h2 a')
                    snippet_el = li.select_one('.b_caption p, p')
                    if a and a.get('href'):
                        clean_url = a['href']
                        if clean_url not in seen_urls:
                            seen_urls.add(clean_url)
                            results.append({
                                'title': a.get_text(strip=True),
                                'url': clean_url,
                                'snippet': snippet_el.get_text(strip=True) if snippet_el else ''
                            })
        except Exception as e:
            print(f"[Google Scanner] Bing search error: {e}")

    return results

def process_single_candidate(item: dict, clean_title: str, product_title: str, model_tokens: list):
    """Processes a single search engine candidate with AI and validation."""
    url = item['url']
    title = item['title']
    snippet = item['snippet']

    if any(skip in url.lower() for skip in NON_STORE_DOMAINS):
        return None

    combined_lower = f"{title} {url}".lower()
    if any(term in combined_lower for term in ['cable', 'fiber', 'adapter', 'case cover', 'charger', 'sleeve']):
        return None

    if model_tokens:
        if not any(token in combined_lower for token in model_tokens):
            return None

    is_known = any(d in url.lower() for d in KNOWN_STORES.keys())

    # Multi-tier AI extraction
    ai_res = ai_extract_listing(title, snippet, url, clean_title, has_known_shop=is_known)
    if not ai_res.get('is_relevant', True):
        return None

    ai_shop = ai_res.get('shop_name', '')
    price = ai_res.get('price', 0)
    in_stock = ai_res.get('in_stock', True)
    ai_source = ai_res.get('source', 'unknown')

    # If price still 0 and URL is a product page, attempt quick direct page fetch
    if price == 0 and url.startswith('http'):
        direct_price = extract_price_from_page_html(url)
        if direct_price > 0:
            price = direct_price
            in_stock = True

    if price == 0:
        return None

    # Sanity check: Avoid matching full prebuilts if querying a bare component
    if 'desktop pc' in title.lower() and ('processor' in product_title.lower() or 'cpu' in product_title.lower()):
        if price > 50000:
            return None

    store_name, logo, color, is_verified = identify_store_from_url(url, ai_shop)
    return {
        'name': store_name,
        'store': store_name,
        'logo': logo,
        'color': color,
        'price': price,
        'price_str': f"{price:,}৳",
        'product_url': url,
        'stock': in_stock and (price > 0),
        'availability': 'In Stock' if in_stock and price > 0 else 'Call for Price',
        'is_verified': is_verified,
        'source': ai_source
    }

def scan_live_store_prices(product_title: str):
    """
    Open-Discovery Agent Pipeline:
    1. Searches search engines for '<clean_product_title> price in bd'
    2. Discovers all retail shops (known or unknown) selling the product
    3. Runs AI extraction (Local Qwen via Ollama first, Groq cloud fallback)
    4. Fetches live product pages directly when prices are hidden
    5. Direct parallel scrapers run to ensure complete market coverage
    6. Returns only real shops with discovered prices or verified stock
    """
    clean_title = re.sub(r'[\(\[\{].*?[\)\]\}]', '', product_title)
    clean_title = re.sub(r'\b\d+(\.\d+)?\s*(ghz|mhz|core|threads|cache|ca\.\.\.)\b.*', '', clean_title, flags=re.I).strip()
    if len(clean_title) < 5:
        clean_title = product_title.strip()

    print(f"🔍 [Open-Discovery Agent] Searching live market for '{clean_title}'...")
    raw_search_items = fetch_search_results(clean_title)
    print(f"   ✓ Search engines returned {len(raw_search_items)} candidate web listings.")

    offers_by_store = {}
    valid_prices = []
    model_tokens = [t.lower() for t in re.findall(r'\b\d{3,5}[a-z]?\b', product_title.lower())]

    # Process search engine results concurrently
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(process_single_candidate, item, clean_title, product_title, model_tokens)
            for item in raw_search_items
        ]
        for fut in as_completed(futures):
            try:
                res = fut.result()
                if res:
                    s_name = res['name']
                    p_val = res['price']
                    if s_name not in offers_by_store or (p_val > 0 and offers_by_store[s_name]['price'] == 0):
                        offers_by_store[s_name] = res
                        if p_val > 0 and p_val not in valid_prices:
                            valid_prices.append(p_val)
            except Exception as e:
                pass

    # Supplement with direct retailer scrapers for high-speed completeness
    try:
        direct_items = scrape_all_fast(clean_title)
        for d in direct_items:
            d_title = d['title'].lower()
            d_url = d['product_url'].lower()
            d_path = d_url.split('?')[0]

            if model_tokens and not (any(token in d_title for token in model_tokens) or any(token in d_path for token in model_tokens)):
                continue

            mismatched_categories = ['laptop', 'notebook', 'desktop pc', 'combo', 'cable', 'fiber', 'motherboard', 'mainboard', 'cooler', 'casing']
            if any(term in d_title for term in mismatched_categories) and not any(term in clean_title.lower() for term in mismatched_categories):
                continue

            s_name = d['retailer']
            p_val = d['price']
            url = d['product_url']

            if p_val > 500000 or p_val < 500:
                continue

            meta = next((v for k, v in KNOWN_STORES.items() if v['name'] == s_name), {'logo': s_name[:2].upper(), 'color': '#00e5ff'})

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
                    'availability': 'In Stock' if p_val > 0 else 'Call for Price',
                    'is_verified': True,
                    'source': 'direct_scraper'
                }
                if p_val > 0 and p_val not in valid_prices:
                    valid_prices.append(p_val)
    except Exception as e:
        print(f"[Google Scanner] Direct scraper warning: {e}")

    # Calculate best price
    best_price = min(valid_prices) if valid_prices else 0
    best_price_str = f"৳{best_price:,}" if best_price > 0 else "Price on Request"
    best_store = next((s['name'] for s in offers_by_store.values() if s['price'] == best_price), "Retailer")

    # Sort shops: lowest price first
    sorted_shops = sorted(offers_by_store.values(), key=lambda x: (x['price'] <= 0, x['price'] if x['price'] > 0 else float('inf')))

    verified_count = sum(1 for s in sorted_shops if s.get('is_verified'))
    discovered_count = len(sorted_shops) - verified_count

    # Persist newly found listings into SQLite database
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
                    VALUES (?, ?, ?, ?, 'Hardware', ?, ?, ?, DATETIME('now'), DATETIME('now'), DATETIME('now'))
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
        'verified_stores': verified_count,
        'discovered_stores': discovered_count,
        'shops': sorted_shops
    }

if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "AMD Ryzen 7 7700"
    result = scan_live_store_prices(q)
    print(json.dumps(result, indent=2, ensure_ascii=False))
