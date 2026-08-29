import re
import sys
import os
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

# Ensure scrapers module can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Dynamically locate scrapers venv site-packages
venv_lib = os.path.join(BASE_DIR, "scrapers", "venv", "lib")
if os.path.exists(venv_lib):
    for py_dir in os.listdir(venv_lib):
        sp = os.path.join(venv_lib, py_dir, "site-packages")
        if os.path.exists(sp) and sp not in sys.path:
            sys.path.insert(0, sp)

try:
    from curl_cffi import requests as c_requests
    CURL_CFFI_AVAILABLE = True
except ImportError:
    import requests as c_requests
    CURL_CFFI_AVAILABLE = False

import requests as std_requests

KNOWN_BRANDS = [
    "MSI", "ASUS", "Gigabyte", "PNY", "ZOTAC", "Sapphire", "PowerColor", 
    "XFX", "Intel", "AMD", "Corsair", "Kingston", "Samsung", "DeepCool", 
    "Antec", "Thermaltake", "Razer", "Logitech", "Lian Li", "Noctua", 
    "Thermalright", "Crucial", "G.Skill", "ADATA", "Lexar", "Team", "Palit", "Inno3D",
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
    
    if any(k in lower_str for k in ['call for price', 'up coming', 'upcoming', 'out of stock', '019', '017', '018', '016']):
        if 'up coming' in lower_str or 'upcoming' in lower_str:
            return 0, 'Up Coming'
        return 0, 'Call for Price'

    digits = re.sub(r'[^\d]', '', clean_str)
    if digits and len(digits) <= 8:
        val = int(digits)
        return val, f'{val:,}৳'
    
    return 0, clean_str if clean_str else 'Call for Price'

def get_session():
    """Returns requests session with browser impersonation if available."""
    if CURL_CFFI_AVAILABLE:
        return c_requests.Session(impersonate='chrome120')
    session = std_requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    })
    return session

def scrape_startech_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.startech.com.bd/product/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=12)
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
        print(f"[FastScraper] Startech Error: {e}")
    return results

def scrape_ryans_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.ryans.com/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=12)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.category-single-product') or soup.select('.cus-col-2')
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
        print(f"[FastScraper] Ryans Error: {e}")
    return results

def scrape_ucc_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.ucc.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=12)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.p-item') or soup.select('.product-thumb')
            for item in items:
                title_el = item.select_one('.p-item-name a') or item.select_one('.name a') or item.select_one('h4 a')
                price_el = item.select_one('.p-item-price span') or item.select_one('.price-new') or item.select_one('.price')
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
                        'retailer': 'UCC',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] UCC Error: {e}")
    return results

def scrape_eit_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://www.eit.com.bd/index.php?route=product/search&search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=12)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.f-item-details') or soup.select('.p-item')
            for item in items:
                title_el = item.select_one('a')
                price_el = item.select_one('[class*="price"]') or (item.parent.select_one('[class*="price"]') if item.parent else None)
                img_el = item.parent.select_one('img') if item.parent else None
                
                title = title_el.get_text(strip=True) if title_el else ''
                link = title_el.get('href') if title_el else ''
                img = img_el.get('src') if img_el else ''
                raw_price = price_el.get_text(strip=True) if price_el else ''
                num_price, formatted_price = clean_price(raw_price)
                brand = parse_brand(title)
                
                if title and link:
                    results.append({
                        'retailer': 'EIT',
                        'title': title,
                        'brand': brand,
                        'price': num_price,
                        'price_str': formatted_price,
                        'product_url': link,
                        'image_url': img
                    })
    except Exception as e:
        print(f"[FastScraper] EIT Error: {e}")
    return results

def scrape_pcbstore_fast(query: str):
    encoded_q = urllib.parse.quote_plus(query)
    url = f'https://pcbstore.com.bd/product/search?search={encoded_q}'
    results = []
    try:
        session = get_session()
        r = session.get(url, timeout=12)
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

def scrape_all_fast(query: str):
    """Concurrently scrapes all 6 Bangladeshi tech retailers."""
    tasks = [
        scrape_startech_fast,
        scrape_ryans_fast,
        scrape_ucc_fast,
        scrape_eit_fast,
        scrape_pcbstore_fast
    ]
    
    all_results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fn, query) for fn in tasks]
        for f in as_completed(futures):
            try:
                res = f.result()
                all_results.extend(res)
            except Exception as e:
                print(f"[FastScraper Task Error]: {e}")
                
    return all_results
