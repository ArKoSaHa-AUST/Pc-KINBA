import re
import sys
import os
import time
import urllib.parse
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
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

# Also check Windows venv Lib directory
win_venv_lib = os.path.join(BASE_DIR, "scrapers", "venv", "Lib", "site-packages")
if os.path.exists(win_venv_lib) and win_venv_lib not in sys.path:
    sys.path.insert(0, win_venv_lib)

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

from scrapers.selectors import SELECTORS, StoreSelectors, get_selectors

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


@dataclass
class ScrapeResult:
    """Structured telemetry output returned by every parser run."""
    store_id: str
    query: str
    ok: bool
    items: List[Dict[str, Any]] = field(default_factory=list)
    item_count: int = 0
    priced_count: int = 0              # items with valid price > 0
    unpriced_count: int = 0            # items with price == 0 / unpriced
    http_status: Optional[int] = None
    duration_ms: int = 0
    container_matched: bool = False    # did the item selector match anything?
    selector_hits: Dict[str, str] = field(default_factory=dict)  # field -> which fallback matched
    failure_reason: Optional[str] = None  # 'http_error'|'container_missing'|'all_unpriced'|'low_yield'|'exception'|'blocked'
    error: Optional[str] = None
    sample_titles: List[str] = field(default_factory=list)       # first 3 titles for inspection


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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    })
    return session


def parse_html_with_selectors(
    html: str,
    selectors: StoreSelectors,
    query: str,
    http_status: int = 200,
    duration_ms: int = 0
) -> ScrapeResult:
    """
    Core parsing engine with rich observability:
    - Identifies bot challenges / Cloudflare blocks
    - Validates container selector matches (primary silent failure guard)
    - Records which selector fallbacks hit
    - Detects all_unpriced and low_yield failure modes
    """
    store_id = selectors.store_id
    
    # 1. Bot Protection / Block Detection
    lower_html = html.lower() if html else ""
    if (
        "challenge-platform" in html
        or "cf-chl-widget" in html
        or "cf-challenge" in lower_html
        or "turnstile" in lower_html
        or "ray id:" in lower_html
        or ("just a moment" in lower_html and ("cloudflare" in lower_html or "security" in lower_html or "connection" in lower_html))
        or "attention required! | cloudflare" in lower_html
    ):
        return ScrapeResult(
            store_id=store_id,
            query=query,
            ok=False,
            http_status=http_status,
            duration_ms=duration_ms,
            container_matched=False,
            failure_reason="blocked",
            error="Bot protection / Cloudflare challenge encountered",
        )

    # 2. HTTP Error handling
    if http_status != 200:
        return ScrapeResult(
            store_id=store_id,
            query=query,
            ok=False,
            http_status=http_status,
            duration_ms=duration_ms,
            container_matched=False,
            failure_reason="http_error",
            error=f"HTTP status {http_status}",
        )

    soup = BeautifulSoup(html, "html.parser")
    items = soup.select(selectors.item)
    container_matched = len(items) > 0

    # 3. Container Missing Check (Primary Silent Failure Detection)
    if not container_matched:
        return ScrapeResult(
            store_id=store_id,
            query=query,
            ok=False,
            http_status=http_status,
            duration_ms=duration_ms,
            container_matched=False,
            failure_reason="container_missing",
            error=f"Container selector '{selectors.item}' matched 0 elements",
        )

    extracted_items = []
    selector_hits: Dict[str, str] = {}

    for item in items:
        # Title Extraction
        title = ""
        title_el = None
        for t_sel in selectors.title:
            title_el = item.select_one(t_sel)
            if title_el and title_el.get_text(strip=True):
                title = title_el.get_text(strip=True)
                selector_hits["title"] = t_sel
                break
        
        # If title empty, try img alt
        if not title:
            img_el_tmp = item.select_one("img")
            if img_el_tmp and (img_el_tmp.get("title") or img_el_tmp.get("alt")):
                title = (img_el_tmp.get("title") or img_el_tmp.get("alt") or "").strip()
                selector_hits["title"] = "img[alt/title]"

        # Price Extraction
        raw_price = ""
        for p_sel in selectors.price:
            price_el = item.select_one(p_sel)
            if price_el and price_el.get_text(strip=True):
                raw_price = price_el.get_text(strip=True)
                selector_hits["price"] = p_sel
                break
        
        # Link Extraction
        link = ""
        for l_sel in selectors.link:
            link_el = item.select_one(l_sel)
            if link_el and link_el.get("href"):
                link = link_el.get("href")
                selector_hits["link"] = l_sel
                break
        
        if not link and title_el and title_el.get("href"):
            link = title_el.get("href")

        # Resolve relative URLs
        if link and not link.startswith("http") and selectors.base_url:
            link = urllib.parse.urljoin(selectors.base_url, link)

        # Image Extraction
        img = ""
        for i_sel in selectors.image:
            img_el = item.select_one(i_sel)
            if img_el and (img_el.get("src") or img_el.get("data-src")):
                img = img_el.get("src") or img_el.get("data-src") or ""
                selector_hits["image"] = i_sel
                break

        # Specific price extraction regex fallback for complex cards (e.g. PCB Store / Techland)
        if not raw_price:
            price_match = re.search(r'(?:৳|Tk\.?)\s*([\d,]+)', item.get_text())
            if price_match:
                raw_price = price_match.group(0)

        num_price, formatted_price = clean_price(raw_price)
        brand = parse_brand(title)

        if title and len(title) > 2 and link:
            extracted_items.append({
                "retailer": selectors.display_name,
                "title": title,
                "brand": brand,
                "price": num_price,
                "price_str": formatted_price,
                "product_url": link,
                "image_url": img
            })

    item_count = len(extracted_items)
    priced_count = sum(1 for x in extracted_items if x["price"] > 0)
    unpriced_count = item_count - priced_count
    sample_titles = [x["title"] for x in extracted_items[:3]]

    # 4. Failure Classification
    failure_reason = None
    ok = True

    if item_count == 0:
        ok = False
        failure_reason = "container_missing"
    elif priced_count == 0 and item_count > 0:
        ok = False
        failure_reason = "all_unpriced"
    elif item_count < selectors.expects_min_items:
        failure_reason = "low_yield"
        ok = True  # Yield is low but parsing succeeded

    return ScrapeResult(
        store_id=store_id,
        query=query,
        ok=ok,
        items=extracted_items,
        item_count=item_count,
        priced_count=priced_count,
        unpriced_count=unpriced_count,
        http_status=http_status,
        duration_ms=duration_ms,
        container_matched=container_matched,
        selector_hits=selector_hits,
        failure_reason=failure_reason,
        sample_titles=sample_titles,
    )


# ==========================================
# Generic Single Store Scraper Dispatcher
# ==========================================
def scrape_store_internal(store_id: str, query: str) -> ScrapeResult:
    """Executes search request and parsing for a given store_id."""
    selectors = get_selectors(store_id)
    if not selectors:
        return ScrapeResult(
            store_id=store_id,
            query=query,
            ok=False,
            failure_reason="exception",
            error=f"No selectors registered for store '{store_id}'",
        )

    t0 = time.time()
    try:
        session = get_session()
        encoded_q = urllib.parse.quote_plus(query)
        slug_q = urllib.parse.quote(query.strip())

        if selectors.is_post:
            # Binary Logic CSRF flow
            home = session.get(selectors.base_url, timeout=8)
            token = ""
            if home.status_code == 200:
                soup_h = BeautifulSoup(home.text, "html.parser")
                t_input = soup_h.find("input", {"name": "_token"})
                if t_input and t_input.get("value"):
                    token = t_input["value"]
            post_data = {"_token": token, "product_name": query}
            r = session.post(selectors.search_url, data=post_data, timeout=10)
        else:
            url = selectors.search_url.format(query=encoded_q, slug_query=slug_q)
            r = session.get(url, timeout=10)

        duration_ms = int((time.time() - t0) * 1000)
        return parse_html_with_selectors(
            html=r.text,
            selectors=selectors,
            query=query,
            http_status=r.status_code,
            duration_ms=duration_ms,
        )
    except Exception as e:
        duration_ms = int((time.time() - t0) * 1000)
        return ScrapeResult(
            store_id=store_id,
            query=query,
            ok=False,
            duration_ms=duration_ms,
            failure_reason="exception",
            error=str(e),
        )


# ==========================================
# 1. StarTech BD
# ==========================================
def scrape_startech_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("startech", query)
    return res if detailed else res.items


# ==========================================
# 2. Ryans Computers (with Supabase fallback on challenge)
# ==========================================
def scrape_ryans_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("ryans", query)
    if not res.items and not detailed:
        # Fallback to Supabase cache for Ryans if live request encounters Cloudflare
        try:
            from scrapers.db import supabase_client
            if supabase_client:
                clean_q = query.strip()
                sb_res = supabase_client.table("listings").select("title, brand, price, price_str, product_url, image_url").eq("retailer", "Ryans Computers").ilike("title", f"%{clean_q}%").limit(10).execute()
                if sb_res.data:
                    for row in sb_res.data:
                        res.items.append({
                            'retailer': 'Ryans Computers',
                            'title': row['title'],
                            'brand': row.get('brand') or parse_brand(row['title']),
                            'price': row['price'],
                            'price_str': row.get('price_str') or f"{row['price']:,}৳",
                            'product_url': row['product_url'],
                            'image_url': row.get('image_url') or ''
                        })
        except Exception as e:
            print(f"[FastScraper] Ryans Supabase fallback error: {e}")

    return res if detailed else res.items


# ==========================================
# 3. Global Brand
# ==========================================
def scrape_globalbrand_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("globalbrand", query)
    return res if detailed else res.items


# ==========================================
# 4. Techland BD
# ==========================================
def scrape_techland_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("techland", query)
    return res if detailed else res.items


# ==========================================
# 5. Skyland BD
# ==========================================
def scrape_skyland_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("skyland", query)
    return res if detailed else res.items


# ==========================================
# 6. PCB Store
# ==========================================
def scrape_pcbstore_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("pcbstore", query)
    return res if detailed else res.items


# ==========================================
# 7. Computer Mania BD
# ==========================================
def scrape_computermania_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("computermania", query)
    if not res.items and not detailed:
        try:
            from scrapers.db import supabase_client
            if supabase_client:
                clean_q = query.strip()
                sb_res = supabase_client.table("listings").select("title, brand, price, price_str, product_url, image_url").eq("retailer", "Computer Mania BD").ilike("title", f"%{clean_q}%").limit(10).execute()
                if sb_res.data:
                    for row in sb_res.data:
                        res.items.append({
                            'retailer': 'Computer Mania BD',
                            'title': row['title'],
                            'brand': row.get('brand') or parse_brand(row['title']),
                            'price': row['price'],
                            'price_str': row.get('price_str') or f"{row['price']:,}৳",
                            'product_url': row['product_url'],
                            'image_url': row.get('image_url') or ''
                        })
        except Exception:
            pass
    return res if detailed else res.items


# ==========================================
# 8. Binary Logic
# ==========================================
def scrape_binarylogic_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("binarylogic", query)
    return res if detailed else res.items


# ==========================================
# 9. Sell Tech BD
# ==========================================
def scrape_selltech_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("selltech", query)
    return res if detailed else res.items


# ==========================================
# 10. Computer Village
# ==========================================
def scrape_computervillage_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("computervillage", query)
    return res if detailed else res.items


# ==========================================
# 11. PC House BD
# ==========================================
def scrape_pchouse_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("pchouse", query)
    return res if detailed else res.items


# ==========================================
# 12. Ultra Technology
# ==========================================
def scrape_ultratech_fast(query: str, detailed: bool = False):
    res = scrape_store_internal("ultratech", query)
    return res if detailed else res.items


ALL_SCRAPER_FUNCS = [
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


# ==========================================
# Master Concurrent Scraper across all 12 Retailers
# ==========================================
def scrape_all_fast(query: str) -> List[Dict[str, Any]]:
    """Concurrently scrapes all 12 requested Bangladeshi tech retailers (flat list)."""
    all_results = []
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(fn, query, False): fn.__name__ for fn in ALL_SCRAPER_FUNCS}
        for f in as_completed(futures):
            name = futures[f]
            try:
                res = f.result()
                if isinstance(res, list):
                    all_results.extend(res)
            except Exception as e:
                print(f"[FastScraper Task Error in {name}]: {e}")
                
    return all_results


def scrape_all_fast_detailed(query: str) -> List[ScrapeResult]:
    """Concurrently scrapes all 12 retailers returning structured ScrapeResult telemetry."""
    detailed_results: List[ScrapeResult] = []
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(fn, query, True): fn.__name__ for fn in ALL_SCRAPER_FUNCS}
        for f in as_completed(futures):
            name = futures[f]
            try:
                res = f.result()
                if isinstance(res, ScrapeResult):
                    detailed_results.append(res)
            except Exception as e:
                print(f"[FastScraper Detailed Task Error in {name}]: {e}")
                
    return detailed_results
