"""
PC Kinba - Production Python Attribute Normalization & Fingerprinting Engine

Rules:
1. Extract manufacturer (NVIDIA, AMD, Intel, etc.) vs brand (ASUS, MSI, etc.)
2. Strip noise words to isolate base_model
3. Generate canonical fingerprint WITHOUT vendor brand (order-independent):
   fingerprint = sorted([manufacturer, base_model, type, capacity]).join("-")
4. MPN / SKU extraction for exact matching
5. Strict price normalization (0, "৳0", "Call for Price" -> None)
6. Match confidence score (0.0 - 1.0)
"""

import re
from typing import Dict, Any, List, Optional, Tuple

MANUFACTURERS = [
    {'name': 'NVIDIA', 'keywords': ['NVIDIA', 'GeForce', 'RTX', 'GTX', 'QUADRO']},
    {'name': 'AMD', 'keywords': ['AMD', 'Radeon', 'Ryzen', 'RX', 'Threadripper']},
    {'name': 'Intel', 'keywords': ['Intel', 'Core', 'Arc', 'Xeon', 'Pentium', 'Celeron', 'i3', 'i5', 'i7', 'i9']},
    {'name': 'Samsung', 'keywords': ['Samsung', '990 Pro', '980 Pro', '870 EVO']},
    {'name': 'Corsair', 'keywords': ['Corsair', 'Vengeance', 'Dominator', 'MP600']},
    {'name': 'Kingston', 'keywords': ['Kingston', 'Fury', 'NV2', 'KC3000']},
    {'name': 'Western Digital', 'keywords': ['Western Digital', 'WD', 'SN850X', 'SN770', 'Blue', 'Black']}
]

BRANDS_LIST = [
    'Corsair', 'Kingston', 'ASUS', 'MSI', 'Gigabyte', 'PNY', 'Zotac', 'Sapphire',
    'PowerColor', 'AMD', 'Intel', 'Samsung', 'Team', 'TeamGroup', 'Western Digital',
    'WD', 'G.Skill', 'Aorus', 'XPG', 'ADATA', 'DeepCool', 'Antec', 'Thermalright',
    'Colorful', 'Inno3D', 'Galax', 'Palit', 'Lian Li', 'Thermaltake', 'Crucial',
    'Transcend', 'Lexar', 'Noctua', 'Cougar', 'Fantech', 'Montech'
]

NOISE_WORDS = [
    r'\bram\b', r'\bmemory\b', r'\bdesktop\b', r'\blaptop\b', r'\bgraphics\s*card\b',
    r'\bgpu\b', r'\bprocessor\b', r'\bcpu\b', r'\bmotherboard\b', r'\bcasing\b',
    r'\bcase\b', r'\bpower\s*supply\b', r'\bpsu\b', r'\bcooler\b', r'\bssd\b', r'\bhard\s*drive\b'
]

EDITION_NOISE = [
    r'\b(oc|edition|dual|gaming|pro|ultra|evo|ice|super|slim|windforce|tuf|strix|eagle|ventus|mech|shadow|shade|t-force|trident|aegis)\b'
]

def normalize_price(raw_price: Any) -> Optional[int]:
    """Strict Price Normalizer: Converts 0, '0', '৳0', 'Call for Price' to None."""
    if raw_price is None:
        return None
    if isinstance(raw_price, (int, float)):
        return int(raw_price) if raw_price > 0 else None
    digits = re.sub(r'[^0-9]', '', str(raw_price))
    if digits:
        val = int(digits)
        return val if val > 0 else None
    return None

def extract_attributes(raw_title: str) -> Dict[str, str]:
    """
    Extract structured attributes: manufacturer, brand, capacity, type, speed, model, baseModel, mpn.
    """
    if not raw_title:
        return {'manufacturer': '', 'brand': '', 'capacity': '', 'type': '', 'speed': '', 'model': '', 'baseModel': '', 'mpn': '', 'raw': ''}

    title = raw_title.strip()

    # 1. Manufacturer
    manufacturer = 'Generic'
    for m in MANUFACTURERS:
        if any(re.search(r'\b' + re.escape(k) + r'\b', title, re.IGNORECASE) for k in m['keywords']):
            manufacturer = m['name']
            break

    # 2. Vendor Brand
    brand = ''
    for b in BRANDS_LIST:
        if re.search(r'\b' + re.escape(b) + r'\b', title, re.IGNORECASE):
            brand = b
            break

    # 3. Capacity
    capacity = ''
    cap_match = re.search(r'\b(\d+)\s*(GB|G|TB)\b', title, re.IGNORECASE)
    if cap_match:
        val = cap_match.group(1)
        unit = cap_match.group(2).upper()
        if unit == 'TB':
            capacity = f"{val}TB"
        elif unit in ('G', 'GB'):
            capacity = f"{val}GB"

    # 4. Type
    type_str = ''
    type_match = re.search(r'\b(DDR5|DDR4|DDR3|GDDR7|GDDR6X|GDDR6|GDDR5|NVMe|SATA)\b', title, re.IGNORECASE)
    if type_match:
        type_str = type_match.group(1).upper()

    # 5. Speed
    speed = ''
    speed_match = re.search(r'\b(\d{4})\s*(MHz|MHz/s)?\b', title, re.IGNORECASE)
    if speed_match:
        speed = f"{speed_match.group(1)}MHz"

    # 6. MPN
    mpn = ''
    mpn_match = re.search(r'\b([A-Z0-9]{5,15}-[A-Z0-9]{3,10}|[A-Z0-9]{8,18})\b', title)
    if mpn_match and mpn_match.group(1) not in ('GRAPHICS', 'DESKTOP', 'PROCESSOR', 'GEFORCE'):
        mpn = mpn_match.group(1)

    # 7. Model
    model = ''
    gpu_match = re.search(r'\b(RTX\s*\d{4}(?:\s*Ti)?|RX\s*\d{4}(?:\s*XT)?|GTX\s*\d{4}(?:\s*Ti)?)\b', title, re.IGNORECASE)
    if gpu_match:
        model = re.sub(r'\s+', ' ', gpu_match.group(1)).upper()

    if not model:
        cpu_match = re.search(r'\b(Ryzen\s*[3579]\s*\d{4}[X3D]*|i[3579]-?\d{4,5}[KFX]*|Core\s*Ultra\s*[579]\s*\d+K?)\b', title, re.IGNORECASE)
        if cpu_match:
            model = re.sub(r'\s+', ' ', cpu_match.group(1))

    if not model:
        series_match = re.search(r'\b(Vengeance\s*LPX|Vengeance|Fury\s*Beast|T-Force\s*Delta|Dominator|990\s*Pro|980\s*Pro|SN850X|SN770)\b', title, re.IGNORECASE)
        if series_match:
            model = series_match.group(1)

    if not model:
        clean = title
        if brand:
            clean = re.sub(r'\b' + re.escape(brand) + r'\b', '', clean, flags=re.IGNORECASE)
        for nw in NOISE_WORDS:
            clean = re.sub(nw, '', clean, flags=re.IGNORECASE)
        words = [w for w in clean.strip().split() if len(w) > 1]
        model = ' '.join(words[:3])

    base_model = model
    for en in EDITION_NOISE:
        base_model = re.sub(en, '', base_model, flags=re.IGNORECASE)
    base_model = re.sub(r'\s+', ' ', base_model).strip()

    return {
        'manufacturer': manufacturer,
        'brand': brand,
        'capacity': capacity,
        'type': type_str,
        'speed': speed,
        'model': model.strip(),
        'baseModel': base_model or model.strip(),
        'mpn': mpn,
        'raw': title
    }

def generate_fingerprint(title: str, manufacturer_hint: str = '') -> Dict[str, Any]:
    """
    Generate Order-Independent Canonical Fingerprint WITHOUT vendor brand.
    fingerprint = sorted([manufacturer, base_model, type, capacity]).join("-")
    """
    attrs = extract_attributes(title)
    manufacturer = (attrs['manufacturer'] or manufacturer_hint or 'generic').lower()
    manufacturer = re.sub(r'[^a-z0-9]', '', manufacturer)
    base_model = re.sub(r'[^a-z0-9]', '', attrs['baseModel'].lower())
    type_str = attrs['type'].lower()
    capacity = attrs['capacity'].lower()

    parts = sorted(list(set([p for p in [manufacturer, base_model, type_str, capacity] if p])))
    fp = '-'.join(parts)

    canonical_name = re.sub(r'\s+', ' ', f"{attrs['manufacturer'] if attrs['manufacturer'] != 'Generic' else ''} {attrs['baseModel']} {attrs['type']} {attrs['capacity']}").strip()

    return {
        'fingerprint': fp,
        'canonical_name': canonical_name,
        'attributes': attrs
    }

def calculate_similarity(str1: str, str2: str) -> float:
    """Jaccard Token Similarity."""
    norm1 = re.sub(r'[^a-z0-9\s]', '', str1.lower())
    norm2 = re.sub(r'[^a-z0-9\s]', '', str2.lower())

    if norm1 == norm2:
        return 1.0

    set1 = set([w for w in norm1.split() if w])
    set2 = set([w for w in norm2.split() if w])

    if not set1 or not set2:
        return 0.0

    intersection = set1.intersection(set2)
    union = set1.union(set2)

    return len(intersection) / len(union)

def calculate_match_confidence(title1: str, title2: str) -> float:
    """
    Calculate Match Confidence (0.0 to 1.0)
    Step 1: MPN match -> 1.0
    Step 2: Fingerprint match -> 0.95
    Step 3: Fuzzy similarity -> score
    Hard Constraints: capacity/type mismatch -> 0.0
    """
    attr1 = extract_attributes(title1)
    attr2 = extract_attributes(title2)

    if attr1['capacity'] and attr2['capacity'] and attr1['capacity'] != attr2['capacity']:
        return 0.0
    if attr1['type'] and attr2['type'] and attr1['type'] != attr2['type']:
        return 0.0

    if attr1['mpn'] and attr2['mpn'] and attr1['mpn'] == attr2['mpn']:
        return 1.0

    fp1 = generate_fingerprint(title1)['fingerprint']
    fp2 = generate_fingerprint(title2)['fingerprint']

    if fp1 == fp2:
        return 0.95

    return round(calculate_similarity(title1, title2), 2)
