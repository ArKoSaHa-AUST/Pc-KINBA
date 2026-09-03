import re
import sys
import os
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure scrapers module and venv can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Dynamically locate scrapers venv site-packages before third-party imports
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

try:
    import curl_cffi.requests as c_requests  # type: ignore[import-not-found, import-untyped]
    CURL_CFFI_AVAILABLE = True
except Exception:
    c_requests = None
    CURL_CFFI_AVAILABLE = False

import requests as std_requests

KNOWN_BRANDS = [
    "MSI", "ASUS", "Gigabyte", "PNY", "ZOTAC", "Sapphire", "PowerColor", 
    "XFX", "Intel", "AMD", "Corsair", "Kingston", "Samsung", "DeepCool", 
    "Antec", "Thermaltake", "Razer", "Logitech", "Lian Li", "Noctua", 
    "Thermalright", "Crucial", "G.Skill", "ADATA", "Lexar", "Team", "Palit", "Inno3D",
    "Colorful", "Leadtek", "Galax", "Gainward", "Sparkle", "Biostar", "ASRock",
    "APC", "MaxGreen", "CyberPower", "SanDisk", "Transcend", "Baseus", "Anker", 
    "TP-Link", "Mercusys", "Hikvision", "Dahua", "Havit", "Fantech", "A4Tech", 
    "Prolink", "KSTAR", "Apollo", "Value-Top", "Dell", "HP", "Lenovo", "AOC", "ViewSonic"
]

def parse_brand(title: str) -> str:
    """Extract brand from product title string."""
    for brand in KNOWN_BRANDS:
        if re.search(r'\b' + re.escape(brand) + r'\b', title, re.IGNORECASE):
            return brand
    first_word = title.split()[0] if title.split() else "Generic"
    return first_word.capitalize()

def clean_price(price_str: str):
    """Parses integer BDT price and formatted string from raw string."""
    if not price_str:
        return 0, 'Call for Price'
    
    clean_str = str(price_str).strip()
    lower_str = clean_str.lower()
    
    if any(k in lower_str for k in ['call for price', 'up coming', 'upcoming', 'out of stock', 'tba', '019', '017', '018', '016']):
        if 'up coming' in lower_str or 'upcoming' in lower_str:
            return 0, 'Up Coming'
        return 0, 'Call for Price'

    # Reject if it looks like specs text, discount badges, or EMI rather than price
    if any(term in lower_str for term in ['core', 'gen', 'ghz', 'mhz', 'ssd', 'ram', 'inch', 'display', 'save:', 'save ৳', 'discount', 'emi']):
        return 0, 'Call for Price'

    # Extract price with optional currency symbol or comma separation
    m = re.search(r'(?:৳|bdt|tk\.?)?\s*([\d,]{4,8})\s*(?:৳|bdt|tk\.?)?', clean_str, re.IGNORECASE)
    if m:
        digits = re.sub(r'[^\d]', '', m.group(1))
        if digits:
            try:
                val = int(digits)
                if 200 <= val <= 2500000:
                    return val, f'{val:,}৳'
            except ValueError:
                pass
    
    return 0, 'Call for Price'

def get_session():
    """Returns requests session with browser impersonation if available."""
    if CURL_CFFI_AVAILABLE and c_requests is not None:
        session_cls = getattr(c_requests, 'Session')
        return session_cls(impersonate='chrome120')
    session = std_requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    })
    return session

# ==========================================
# 1. StarTech BD (https://www.startech.com.bd/)
# ==========================================
def scrape_startech_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.startech.com.bd/product/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.p-item')
            for item in items:
                title_el = item.select_one('.p-item-name a') or item.select_one('h4 a')
                price_el = item.select_one('.p-item-price span') or item.select_one('.p-item-price')
                img_el = item.select_one('.p-item-img img')
                link_el = title_el or item.select_one('.p-item-img a')
                
                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)
                
                if title and link:
                    results.append({
                        'retailer': 'StarTech BD',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] StarTech Error: {e}")
    return results

# ==========================================
# 2. Ryans Computers (https://www.ryanscomputers.com/)
# ==========================================
def scrape_ryans_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.ryans.com/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=8)
        if r.status_code == 200 and 'challenge-platform' not in r.text:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.category-single-product, .cus-col-2, .product-card')
            for item in items:
                title_el = item.select_one('p.card-text a') or item.select_one('.product-title') or item.select_one('a[href*="/product/"]')
                price_el = item.select_one('.pr-text') or item.select_one('.product-price') or item.select_one('.price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a[href*="/product/"]')
                
                title = title_el.get_text(strip=True) if title_el else ''
                raw_link = link_el.get('href') if link_el else ''
                link = urllib.parse.urljoin('https://www.ryans.com', raw_link) if raw_link else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)
                
                if title and link:
                    results.append({
                        'retailer': 'Ryans Computers',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] Ryans direct fetch: {e}")

    # Fallback to local DB cache for Ryans if live request encounters Cloudflare
    if not results:
        try:
            import sqlite3
            db_path = os.path.join(BASE_DIR, "pcbuilder.db")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                clean_q = query.strip().lower()
                tokens = clean_q.split()
                if tokens:
                    clause = " AND ".join(["LOWER(title) LIKE ?" for _ in tokens])
                    params = [f"%{t}%" for t in tokens]
                    c.execute(f"SELECT title, brand, price, price_str, product_url, image_url FROM listings WHERE retailer = 'Ryans Computers' AND {clause} LIMIT 10", params)
                    for row in c.fetchall():
                        results.append({
                            'retailer': 'Ryans Computers',
                            'title': row[0],
                            'brand': row[1] or parse_brand(row[0]),
                            'price': row[2],
                            'price_str': row[3] or f"{row[2]:,}৳",
                            'product_url': row[4],
                            'image_url': row[5] or ''
                        })
                conn.close()
        except Exception as e:
            print(f"[FastScraper] Ryans DB fallback error: {e}")

    return results

# ==========================================
# 3. Global Brand (https://www.globalbrand.com.bd/)
# ==========================================
def scrape_globalbrand_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.globalbrand.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product-layout')
            for item in items:
                link_el = item.select_one('.caption .name a') or item.select_one('.image a') or item.select_one('a')
                img_el = item.select_one('img')
                price_el = item.select_one('.price-new') or item.select_one('.price')
                
                title = ''
                if img_el and (img_el.get('title') or img_el.get('alt')):
                    title = (img_el.get('title') or img_el.get('alt') or '').strip()
                elif link_el:
                    title = link_el.get_text(strip=True)
                
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)
                
                if title and link:
                    results.append({
                        'retailer': 'Global Brand',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] GlobalBrand Error: {e}")
    return results

# ==========================================
# 4. Techland BD (https://www.techlandbd.com/)
# ==========================================
def scrape_techland_fast(query: str):
    slug_q = urllib.parse.quote(query.strip())
    url = f'https://www.techlandbd.com/search/advance/product/result/{slug_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.v2-card-lift, [class*="search-grid"] > div')
            for item in items:
                title_el = item.select_one('a.font-medium, a.text-gray-900, h4 a, .v2-img-wrap ~ a') or item.select_one('a[href*="-"]')
                price_el = item.select_one('.mt-auto .text-red-600, .mt-auto [class*="font-bold"], .price-new, .special-price, .price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                if not title and img_el:
                    title = img_el.get('alt') or ''
                
                link = link_el.get('href') if link_el else ''
                if link and not link.startswith('http'):
                    link = urllib.parse.urljoin('https://www.techlandbd.com', link)
                img = img_el.get('src') if img_el else ''
                
                raw_price = price_el.get_text(strip=True) if price_el else item.get_text()
                price_match = re.search(r'(?:৳|Tk\.?)\s*([\d,]+)', raw_price)
                if price_match:
                    num_price, formatted_price = clean_price(price_match.group(1))
                else:
                    num_price, formatted_price = clean_price(raw_price)

                brand = parse_brand(title)
                
                if title and len(title) > 3 and link:
                    results.append({
                        'retailer': 'Techland BD',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] Techland Error: {e}")
    return results

# ==========================================
# 5. Skyland BD (https://www.skyland.com.bd/)
# ==========================================
def scrape_skyland_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.skyland.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product-thumb')
            for item in items:
                title_el = item.select_one('.name a') or item.select_one('h4 a')
                price_el = item.select_one('.price-new') or item.select_one('.price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link:
                    results.append({
                        'retailer': 'Skyland BD',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] Skyland Error: {e}")
    return results

# ==========================================
# 6. PCB Store (https://pcbstore.com.bd/)
# ==========================================
def scrape_pcbstore_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://pcbstore.com.bd/product/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('div[class*="group relative"]')
            for item in items:
                title_el = item.select_one('h3') or item.select_one('h3 a')
                img_el = item.select_one('img')
                link_el = item.select_one('a[href*="/product/"]') or item.select_one('a')
                
                title = title_el.get_text(strip=True) if title_el else (img_el.get('alt') if img_el else '')
                raw_link = link_el.get('href') if link_el else ''
                link = urllib.parse.urljoin('https://pcbstore.com.bd', raw_link) if raw_link else ''
                img = img_el.get('src') if img_el else ''
                
                prices = re.findall(r'৳[\d,]+', item.get_text())
                raw_price = prices[-1] if prices else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)
                
                if title and title != 'Shop' and link:
                    results.append({
                        'retailer': 'PCB Store',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] PCB Store Error: {e}")
    return results

# ==========================================
# 7. Computer Mania BD (https://computermania.com.bd/)
# ==========================================
def scrape_computermania_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://computermania.com.bd/?s={encoded_q}&post_type=product'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=8)
        if r.status_code == 200 and 'challenge-platform' not in r.text:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product, .product-grid-item, .col-6.col-md-4')
            for item in items:
                title_el = item.select_one('.woocommerce-loop-product__title, .product-title a, h3 a')
                price_el = item.select_one('.price ins .amount, .price .amount, .price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link:
                    results.append({
                        'retailer': 'Computer Mania BD',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] ComputerMania direct fetch: {e}")

    # Fallback to local DB cache for Computer Mania if live Cloudflare blocks
    if not results:
        try:
            import sqlite3
            db_path = os.path.join(BASE_DIR, "pcbuilder.db")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                tokens = query.strip().lower().split()
                if tokens:
                    clause = " AND ".join(["LOWER(title) LIKE ?" for _ in tokens])
                    params = [f"%{t}%" for t in tokens]
                    c.execute(f"SELECT title, brand, price, price_str, product_url, image_url FROM listings WHERE retailer = 'Computer Mania BD' AND {clause} LIMIT 10", params)
                    for row in c.fetchall():
                        results.append({
                            'retailer': 'Computer Mania BD',
                            'title': row[0],
                            'brand': row[1] or parse_brand(row[0]),
                            'price': row[2],
                            'price_str': row[3] or f"{row[2]:,}৳",
                            'product_url': row[4],
                            'image_url': row[5] or ''
                        })
                conn.close()
        except Exception:
            pass

    return results

# ==========================================
# 8. Binary Logic (https://www.binarylogic.com.bd/)
# ==========================================
def scrape_binarylogic_fast(query: str):
    results = []
    try:
        session = get_session()
        home = session.get('https://www.binarylogic.com.bd', timeout=8)
        token = ''
        if home.status_code == 200:
            soup_h = BeautifulSoup(home.text, 'html.parser')
            t_input = soup_h.find('input', {'name': '_token'})
            if t_input and t_input.get('value'):
                token = t_input['value']

        post_data = {'_token': token, 'product_name': query}
        r = session.post('https://www.binarylogic.com.bd/products-search', data=post_data, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product_column, .col-lg-3 .product-item')
            for item in items:
                title_el = item.select_one('h4 a, .product_name a, .caption a, a')
                price_el = item.select_one('.current_price, .price, [class*="price"]')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link and len(title) > 3 and title != 'Binary Logic':
                    results.append({
                        'retailer': 'Binary Logic',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] BinaryLogic Error: {e}")
    return results

# ==========================================
# 9. Sell Tech BD (https://www.selltech.com.bd/)
# ==========================================
def scrape_selltech_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.selltech.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product-thumb')
            for item in items:
                title_el = item.select_one('.name a') or item.select_one('h4 a')
                price_el = item.select_one('.price-new') or item.select_one('.price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link:
                    results.append({
                        'retailer': 'Sell Tech BD',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] SellTech Error: {e}")
    return results

# ==========================================
# 10. Computer Village (https://www.computervillage.com.bd/)
# ==========================================
def scrape_computervillage_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.computervillage.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product-thumb')
            for item in items:
                title_el = item.select_one('.name a') or item.select_one('h4 a')
                price_el = item.select_one('.price-new') or item.select_one('.price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link:
                    results.append({
                        'retailer': 'Computer Village',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] ComputerVillage Error: {e}")
    return results

# ==========================================
# 11. PC House BD (https://www.pchouse.com.bd/)
# ==========================================
def scrape_pchouse_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.pchouse.com.bd/product/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.single-product-item, .product-thumb')
            for item in items:
                title_el = item.select_one('h4 a, .product-item-info a, a[href*="/product/"], a[href*="-"]')
                price_el = item.select_one('.price, .price-new, [class*="price"]')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                if not title and img_el:
                    title = img_el.get('alt') or ''

                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link and len(title) > 3:
                    results.append({
                        'retailer': 'PC House BD',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] PCHouse Error: {e}")
    return results

# ==========================================
# 12. Ultra Technology (https://www.ultratech.com.bd/)
# ==========================================
def scrape_ultratech_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.ultratech.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=10)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.product-thumb')
            for item in items:
                title_el = item.select_one('.name a') or item.select_one('h4 a')
                price_el = item.select_one('.price-new') or item.select_one('.price')
                img_el = item.select_one('img')
                link_el = title_el or item.select_one('a')

                title = title_el.get_text(strip=True) if title_el else ''
                link = link_el.get('href') if link_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)

                if title and link:
                    results.append({
                        'retailer': 'Ultra Technology',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] UltraTech Error: {e}")
    return results

# ==========================================
# Master Concurrent Scraper across all 12 Retailers
# ==========================================
def scrape_all_fast(query: str):
    """Concurrently scrapes all 12 requested Bangladeshi tech retailers."""
    tasks = [
        scrape_startech_fast,
        scrape_ryans_fast,
        scrape_globalbrand_fast,
        scrape_techland_fast,
        scrape_skyland_fast,
        scrape_pcbstore_fast,
        scrape_computermania_fast,
        scrape_binarylogic_fast,
        scrape_selltech_fast,
        scrape_computervillage_fast,
        scrape_pchouse_fast,
        scrape_ultratech_fast
    ]
    
    all_results = []
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(fn, query): fn.__name__ for fn in tasks}
        for f in as_completed(futures):
            name = futures[f]
            try:
                res = f.result()
                all_results.extend(res)
            except Exception as e:
                print(f"[FastScraper Task Error in {name}]: {e}")
                
    return all_results
