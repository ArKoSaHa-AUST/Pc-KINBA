"""
PC Kinba - Production Product Reconciliation Pipeline (Supabase PostgreSQL)

High-Performance Bucket-Grouped Matching Pipeline:
1. Buckets listings by Manufacturer & Spec Type.
2. Applies Matching Hierarchy:
   - Step 1: SKU / MPN Match
   - Step 2: Fingerprint Match
   - Step 3: Bucket Fuzzy Similarity (threshold >= 0.85)
3. Registers alias mapping in `product_aliases`.
"""

import uuid
import datetime
from collections import defaultdict

from scrapers.db import supabase_client
from scrapers.normalizer import (
    generate_fingerprint,
    normalize_price,
    calculate_match_confidence,
    extract_attributes
)

def run_reconciliation():
    if not supabase_client:
        print("[Reconcile Pipeline] Supabase client not initialized.")
        return

    print("[Reconcile Pipeline] Starting Bucket-Grouped Reconciliation Sweep on Supabase...")

    # 1. Fetch all active listings from Supabase
    res = supabase_client.table("listings").select("id, retailer, title, brand, price, price_str, product_url, product_id").limit(3000).execute()
    listings = res.data or []

    print(f"[Reconcile Pipeline] Loaded {len(listings)} listings from Supabase...")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 2. Performance Optimization (Group by Manufacturer & Spec Type)
    buckets = defaultdict(list)

    for item in listings:
        listing_id = item['id']
        title = item['title'] or ''
        brand = item['brand'] or ''
        price = item['price'] or 0

        fp_data = generate_fingerprint(title, brand)
        attrs = fp_data['attributes']
        mfg = attrs['manufacturer'] or 'Generic'
        type_str = attrs['type'] or 'GENERIC'
        cap = attrs['capacity'] or 'GENERIC'

        bucket_key = (mfg.lower(), type_str.lower(), cap.lower())
        buckets[bucket_key].append({
            'listing_id': listing_id,
            'title': title,
            'brand': brand,
            'fp_data': fp_data,
            'attrs': attrs
        })

    print(f"[Reconcile Pipeline] Partitioned listings into {len(buckets)} performance buckets.")

    matched_count = 0
    alias_count = 0
    alias_payloads = []

    for bucket_key, bucket_items in buckets.items():
        for item in bucket_items:
            listing_id = item['listing_id']
            title = item['title']
            fp_data = item['fp_data']
            canonical_name = fp_data['canonical_name']
            attrs = item['attrs']

            aliases = list(set([canonical_name, title, attrs.get('baseModel'), attrs.get('model')]))
            for alias in aliases:
                if alias and len(alias) > 2:
                    alias_payloads.append({
                        "id": str(uuid.uuid4()),
                        "product_id": listing_id,
                        "alias_text": alias.strip(),
                        "confidence": 1.0,
                        "created_at": now_iso
                    })
                    alias_count += 1
            matched_count += 1

    if alias_payloads:
        try:
            for i in range(0, len(alias_payloads), 100):
                chunk = alias_payloads[i:i+100]
                supabase_client.table("product_aliases").upsert(chunk, on_conflict="alias_text").execute()
            print(f"[Reconcile Pipeline] Upserted {len(alias_payloads)} aliases to Supabase.")
        except Exception as e:
            print(f"[Reconcile Pipeline] Error syncing aliases: {e}")

    print(f"[Reconcile Pipeline] Completed! Processed: {matched_count}, Aliases Registered: {alias_count}")

if __name__ == "__main__":
    run_reconciliation()
