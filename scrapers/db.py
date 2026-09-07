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
        if res.data and len(res.data) > 0:
            return res.data[0]["id"]
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

if __name__ == "__main__":
    print("[DB Handler] Supabase database handler active.")
