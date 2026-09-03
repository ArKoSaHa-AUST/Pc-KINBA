import os
import sqlite3
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

# Initialize Supabase client if package is available
supabase_client = None
try:
    from supabase import create_client
    if SUPABASE_URL and SUPABASE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"[DB] Supabase client initialization warning: {e}")

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pcbuilder.db")

def get_sqlite_conn():
    """Get local SQLite fallback connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_sqlite_db():
    """Initialize local SQLite database tables for products and product_offers."""
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        canonical_name TEXT NOT NULL,
        fingerprint TEXT UNIQUE NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT '',
        capacity TEXT NOT NULL DEFAULT '',
        speed TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        product_id TEXT,
        retailer TEXT NOT NULL,
        title TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL DEFAULT 0,
        price_str TEXT NOT NULL DEFAULT '',
        product_url TEXT NOT NULL UNIQUE,
        image_url TEXT NOT NULL DEFAULT '',
        last_scraped_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );
    """)
    
    # Ensure existing SQLite tables are upgraded with new fingerprint & attribute columns
    cursor.execute("PRAGMA table_info(products)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    
    for col, col_type in [
        ('canonical_name', "TEXT NOT NULL DEFAULT ''"),
        ('fingerprint', "TEXT NOT NULL DEFAULT ''"),
        ('manufacturer', "TEXT NOT NULL DEFAULT 'Generic'"),
        ('base_model', "TEXT NOT NULL DEFAULT ''"),
        ('type', "TEXT NOT NULL DEFAULT ''"),
        ('capacity', "TEXT NOT NULL DEFAULT ''"),
        ('speed', "TEXT NOT NULL DEFAULT ''"),
        ('model', "TEXT NOT NULL DEFAULT ''")
    ]:
        if col not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE products ADD COLUMN {col} {col_type}")
            except Exception:
                pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS product_aliases (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        alias_text TEXT NOT NULL UNIQUE,
        confidence REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS merge_history (
        id TEXT PRIMARY KEY,
        source_product_id TEXT NOT NULL,
        target_product_id TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        timestamp TEXT NOT NULL
    );
    """)
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_fingerprint ON products(fingerprint);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_canonical ON products(canonical_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_mfg ON products(manufacturer);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_title ON listings(title);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_retailer ON listings(retailer);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_product_id ON listings(product_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_aliases_text ON product_aliases(alias_text);")
    
    conn.commit()
    conn.close()

def extract_base_model(title: str, brand: str) -> str:
    """
    Extract base product model for fuzzy matching.
    e.g. 'MSI GeForce RTX 5060 Ventus 2X 8G OC' -> 'RTX 5060'
    'Gigabyte GeForce RTX 5060 Ti EAGLE OC ICE 8G' -> 'RTX 5060 Ti'
    'AMD Ryzen 7 7700 Desktop Processor' -> 'Ryzen 7 7700'
    """
    # GPU patterns
    gpu_match = re.search(r'\b(RTX\s*\d{4}(?:\s*Ti)?|RX\s*\d{4}(?:\s*XT)?|GTX\s*\d{4}(?:\s*Ti)?)\b', title, re.IGNORECASE)
    if gpu_match:
        model = gpu_match.group(1).upper()
        return re.sub(r'\s+', ' ', model)
        
    # CPU patterns
    cpu_match = re.search(r'\b(Ryzen\s*[3579]\s*\d{4}[X3D]*|i[3579]-?\d{4,5}[KFX]*|Core\s*Ultra\s*[579]\s*\d+K?)\b', title, re.IGNORECASE)
    if cpu_match:
        model = cpu_match.group(1)
        return re.sub(r'\s+', ' ', model)
        
    # Storage patterns
    ssd_match = re.search(r'\b(990\s*Pro|980\s*Pro|SN850X|SN770|P3\s*Plus)\b', title, re.IGNORECASE)
    if ssd_match:
        return ssd_match.group(1).upper()
        
    # Fallback to Brand + clean keywords
    clean_title = re.sub(r'\b(GeForce|Radeon|Graphics Card|Desktop Processor|Gaming|Edition|OC|GDDR7|GDDR6|8GB|12GB|16GB|24GB)\b', '', title, flags=re.IGNORECASE)
    words = [w for w in clean_title.split() if len(w) > 1]
    fallback_model = " ".join(words[:3]) if words else title[:25]
    return fallback_model.strip()

def get_or_create_product_supabase(title: str, brand: str) -> Optional[str]:
    """Find or create matching base product record in Supabase."""
    if not supabase_client:
        return None
        
    base_model = extract_base_model(title, brand)
    product_name = f"{brand} {base_model}".strip() if brand and not base_model.startswith(brand) else base_model
    
    try:
        # Check existing matching product
        res = supabase_client.table("products").select("id").ilike("name", base_model).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]["id"]
            
        category = "GPU" if "RTX" in base_model or "RX" in base_model or "GTX" in base_model else "Component"
        if "Ryzen" in base_model or "i7" in base_model or "i5" in base_model or "i9" in base_model:
            category = "CPU"
            
        new_prod = supabase_client.table("products").insert({
            "name": base_model,
            "brand": brand,
            "category": category
        }).execute()
        
        if new_prod.data and len(new_prod.data) > 0:
            return new_prod.data[0]["id"]
    except Exception as e:
        err_str = str(e)
        if "PGRST205" not in err_str:
            print(f"[Supabase Products Error] {e}")
        return None
    return None

def get_or_create_product_sqlite(conn: sqlite3.Connection, title: str, brand: str) -> str:
    """Find or create matching base product record in SQLite via normalizer fingerprint."""
    from scrapers.normalizer import generate_fingerprint
    cursor = conn.cursor()
    
    fp_data = generate_fingerprint(title, brand)
    fp = fp_data['fingerprint']
    canonical_name = fp_data['canonical_name']
    attrs = fp_data['attributes']
    
    cursor.execute("SELECT id FROM products WHERE fingerprint = ?", (fp,))
    row = cursor.fetchone()
    
    if row:
        return row["id"]
        
    import uuid
    product_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    try:
        cursor.execute("""
        INSERT INTO products (id, canonical_name, fingerprint, brand, type, capacity, speed, model, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (product_id, canonical_name, fp, attrs['brand'] or brand, attrs['type'], attrs['capacity'], attrs['speed'], attrs['model'], now_iso, now_iso))
        
        # Populate Master Product Dictionary (product_aliases)
        aliases = list(set([canonical_name, title, attrs['baseModel'], attrs['model']]))
        for alias in aliases:
            if alias and len(alias) > 2:
                try:
                    alias_id = str(uuid.uuid4())
                    cursor.execute("""
                    INSERT OR IGNORE INTO product_aliases (id, product_id, alias_text, confidence, created_at)
                    VALUES (?, ?, ?, 1.0, ?)
                    """, (alias_id, product_id, alias.strip(), now_iso))
                except Exception:
                    pass

    except sqlite3.IntegrityError:
        cursor.execute("SELECT id FROM products WHERE fingerprint = ?", (fp,))
        row = cursor.fetchone()
        if row:
            return row["id"]
            
    return product_id

def upsert_listings(listings: List[Dict[str, Any]]):
    """
    Upsert scraped listings into database with product matching and last_scraped_at timestamp.
    Supports both Supabase Postgres and local SQLite persistence with batching.
    """
    if not listings:
        return

    # 1. Local SQLite Sync
    init_sqlite_db()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    sqlite_upserted = 0
    supabase_payloads = []
    
    for item in listings:
        product_url = item["product_url"]
        title = item["title"]
        brand = item["brand"]
        price = item["price"]
        price_str = item["price_str"]
        retailer = item["retailer"]
        image_url = item.get("image_url", "")
        
        # SQLite Upsert
        try:
            p_id_sqlite = get_or_create_product_sqlite(conn, title, brand)
            cursor.execute("SELECT id FROM listings WHERE product_url = ?", (product_url,))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("""
                UPDATE listings
                SET product_id = ?, retailer = ?, title = ?, brand = ?, price = ?, price_str = ?, image_url = ?, last_scraped_at = ?, updated_at = ?
                WHERE product_url = ?
                """, (p_id_sqlite, retailer, title, brand, price, price_str, image_url, now_iso, now_iso, product_url))
            else:
                import uuid
                listing_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO listings (id, product_id, retailer, title, brand, price, price_str, product_url, image_url, last_scraped_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (listing_id, p_id_sqlite, retailer, title, brand, price, price_str, product_url, image_url, now_iso, now_iso, now_iso))
            sqlite_upserted += 1
        except Exception as e:
            print(f"[SQLite Upsert Error] {e}")
            
        if supabase_client:
            supabase_payloads.append({
                "retailer": retailer,
                "title": title,
                "brand": brand,
                "price": price,
                "price_str": price_str,
                "product_url": product_url,
                "image_url": image_url,
                "last_scraped_at": now_iso
            })

    conn.commit()
    conn.close()
    print(f"[DB Handler] Successfully synced {sqlite_upserted} listings to SQLite database.")

    # 2. Batch Supabase Upsert
    if supabase_client and supabase_payloads:
        try:
            # Batch in chunks of 50
            for i in range(0, len(supabase_payloads), 50):
                chunk = supabase_payloads[i:i+50]
                supabase_client.table("listings").upsert(chunk, on_conflict="product_url").execute()
            print(f"[DB Handler] Successfully batch synced {len(supabase_payloads)} listings to Supabase Postgres.")
        except Exception as e:
            err_str = str(e)
            if "PGRST" not in err_str:
                print(f"[Supabase Batch Upsert Warning] {e}")

if __name__ == "__main__":
    init_sqlite_db()
    print("Database initialized successfully.")
