import os
import re
import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')
load_dotenv('.env')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL') or "https://jkooxrfapqvwmoygswjv.supabase.co"
SUPABASE_KEY = (
    os.getenv('SUPABASE_SERVICE_ROLE_KEY') or 
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or 
    os.getenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or 
    os.getenv('SUPABASE_PUBLISHABLE_KEY') or 
    "sb_publishable_WYWNQjk1XWmjAol57TY98A_9MGQNB7C"
)

# Initialize Supabase client
supabase_client = None
try:
    from supabase import create_client
    if SUPABASE_URL and SUPABASE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"[DB] Supabase client initialization error: {e}")

def extract_base_model(title: str, brand: str) -> str:
    """
    Extract base product model for fuzzy matching.
    e.g. 'MSI GeForce RTX 5060 Ventus 2X 8G OC' -> 'RTX 5060'
    'Gigabyte GeForce RTX 5060 Ti EAGLE OC ICE 8G' -> 'RTX 5060 Ti'
    'AMD Ryzen 7 7700 Desktop Processor' -> 'Ryzen 7 7700'
    """
    gpu_match = re.search(r'\b(RTX\s*\d{4}(?:\s*Ti)?|RX\s*\d{4}(?:\s*XT)?|GTX\s*\d{4}(?:\s*Ti)?)\b', title, re.IGNORECASE)
    if gpu_match:
        model = gpu_match.group(1).upper()
        return re.sub(r'\s+', ' ', model)
        
    cpu_match = re.search(r'\b(Ryzen\s*[3579]\s*\d{4}[X3D]*|i[3579]-?\d{4,5}[KFX]*|Core\s*Ultra\s*[579]\s*\d+K?)\b', title, re.IGNORECASE)
    if cpu_match:
        model = cpu_match.group(1)
        return re.sub(r'\s+', ' ', model)
        
    ssd_match = re.search(r'\b(990\s*Pro|980\s*Pro|SN850X|SN770|P3\s*Plus)\b', title, re.IGNORECASE)
    if ssd_match:
        return ssd_match.group(1).upper()
        
    clean_title = re.sub(r'\b(GeForce|Radeon|Graphics Card|Desktop Processor|Gaming|Edition|OC|GDDR7|GDDR6|8GB|12GB|16GB|24GB)\b', '', title, flags=re.IGNORECASE)
    words = [w for w in clean_title.split() if len(w) > 1]
    fallback_model = " ".join(words[:3]) if words else title[:25]
    return fallback_model.strip()

def get_or_create_product_supabase(title: str, brand: str) -> Optional[str]:
    """Find or create matching base product record in Supabase."""
    if not supabase_client:
        return None
        
    base_model = extract_base_model(title, brand)
    try:
        res = supabase_client.table("products").select("id").ilike("name", f"%{base_model}%").limit(1).execute()
        if isinstance(res.data, list) and len(res.data) > 0:
            first = res.data[0]
            if isinstance(first, dict):
                return str(first.get("id") or "")
    except Exception as e:
        print(f"[Supabase Product Lookup Warning]: {e}")
    return None

def upsert_listings(listings: List[Dict[str, Any]]):
    """
    Upsert scraped listings into Supabase PostgreSQL with batching.
    """
    if not listings or not supabase_client:
        return

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    supabase_payloads = []
    
    for item in listings:
        product_url = item.get("product_url")
        if not product_url:
            continue
            
        title = item.get("title", "")
        brand = item.get("brand", "")
        price = item.get("price", 0)
        price_str = item.get("price_str") or f"{price:,}৳"
        retailer = item.get("retailer", "")
        image_url = item.get("image_url", "")
        
        supabase_payloads.append({
            "retailer": retailer,
            "title": title,
            "brand": brand,
            "price": price,
            "price_str": price_str,
            "product_url": product_url,
            "image_url": image_url,
            "last_scraped_at": now_iso,
            "updated_at": now_iso
        })

    # Batch Supabase Upsert in chunks of 50
    try:
        for i in range(0, len(supabase_payloads), 50):
            chunk = supabase_payloads[i:i+50]
            supabase_client.table("listings").upsert(chunk, on_conflict="product_url").execute()
        print(f"[Supabase DB] Successfully synced {len(supabase_payloads)} listings to Supabase Postgres.")
    except Exception as e:
        print(f"[Supabase Batch Upsert Error]: {e}")


# ===========================================================================
# Scraper Health & Run Telemetry Persistence
# ===========================================================================

def save_scraper_runs(runs: List[Dict[str, Any]], client=None) -> bool:
    """
    Persists batch of ScrapeResult records into scraper_runs table.
    """
    sb = client or supabase_client
    if not sb or not runs:
        return False

    try:
        sb.table("scraper_runs").insert(runs).execute()
        return True
    except Exception as e:
        print(f"[Supabase Save Scraper Runs Warning]: {e}")
        return False


def update_scraper_health(health_record: Dict[str, Any], client=None) -> bool:
    """
    Upserts single store status and rolling baseline into scraper_health table.
    """
    sb = client or supabase_client
    if not sb or not health_record:
        return False

    try:
        sb.table("scraper_health").upsert(health_record, on_conflict="store_id").execute()
        return True
    except Exception as e:
        print(f"[Supabase Update Scraper Health Warning]: {e}")
        return False


def get_scraper_health(store_id: Optional[str] = None, client=None) -> List[Dict[str, Any]]:
    """
    Fetches scraper_health records (for all stores or a specific store).
    """
    sb = client or supabase_client
    if not sb:
        return []

    try:
        query = sb.table("scraper_health").select("*")
        if store_id:
            query = query.eq("store_id", store_id)
        res = query.execute()
        return res.data or []
    except Exception as e:
        print(f"[Supabase Get Scraper Health Warning]: {e}")
        return []


def get_recent_runs_for_store(store_id: str, limit: int = 20, client=None) -> List[Dict[str, Any]]:
    """
    Retrieves recent successful runs for a store to compute rolling medians.
    """
    sb = client or supabase_client
    if not sb:
        return []

    try:
        res = (
            sb.table("scraper_runs")
            .select("item_count, ok, failure_reason, created_at")
            .eq("store_id", store_id)
            .eq("ok", True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        print(f"[Supabase Recent Runs Warning]: {e}")
        return []


if __name__ == "__main__":
    print("[DB Handler] Supabase database handler active.")
