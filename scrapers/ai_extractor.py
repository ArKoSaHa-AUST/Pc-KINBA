"""
PC Kinba - Multi-Tier AI Price & Store Extractor
Tier 1: Fast regex heuristics (0 tokens, 0ms)
Tier 2: Local Open Model via Ollama (qwen2.5:1.5b) (0 cloud tokens, private & free)
Tier 3: Cloud Model via Groq 17-key pool (qwen/qwen3.8-27b / openai/gpt-oss-120b)
"""

import re
import json
import urllib.request
import urllib.parse
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"

def load_env_file(env_path: str = ""):
    """Lightweight .env loader that does not require external third-party packages."""
    if not env_path:
        env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'").strip('"')
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass


def extract_price_regex(text: str):
    """
    High-precision pattern matcher for Bangladeshi pricing conventions in search snippets.
    Matches:
      'BDT 20,500.00', '21,500৳', 'starts from 21,900', 'In Stock Price: 21,000৳',
      'price ... is 22,500.00', '৳22,500 (Cash Price)'
    """
    if not text:
        return None

    patterns = [
        r'(?:latest\s*price|price\s*is|starts\s*from|in\s*stock\s*price|cash\s*price|special\s*price)\D{0,15}(?:৳|bdt|tk\.?)?\s*([\d,]{4,7})',
        r'(?:৳|bdt|tk\.?)\s*([\d,]{4,7})',
        r'([\d,]{4,7})\s*(?:৳|bdt|tk\.?)',
        r'price\D{0,10}([\d,]{4,7})'
    ]

    for pat in patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        for m in matches:
            clean_digits = re.sub(r'[^\d]', '', m)
            if clean_digits:
                val = int(clean_digits)
                if 500 <= val <= 2500000:
                    return val

    return None

def clean_extracted_shop_name(raw_name: str, domain: str = "") -> str:
    """Cleans up raw shop name extracted by AI or heuristics."""
    if not raw_name:
        return ""
    name = raw_name.strip()
    name = re.sub(r'(?i)\b(ltd|inc|online|shop|store|bangladesh|bd|official|website|page|price)\b', '', name)
    name = re.sub(r'[^\w\s&]', ' ', name).strip()
    name = re.sub(r'\s+', ' ', name)
    if not name and domain:
        parts = domain.replace("www.", "").split(".")[0]
        name = parts.capitalize()
    return name or "Retailer"

def query_local_ollama_full(title: str, snippet: str, url: str, product_name: str):
    """
    Queries local Ollama instance with open model (qwen2.5:1.5b)
    Extracts {shop_name, price, in_stock, is_relevant}
    """
    prompt = f"""You are a pricing data extractor for computer hardware in Bangladesh.
Target Product: "{product_name}"
Web Search Result:
- Title: "{title}"
- Snippet: "{snippet}"
- URL: "{url}"

Analyze if this is an e-commerce shop selling the target product in Bangladesh.
Extract:
- "shop_name": string (name of the retail store/shop, e.g. "StarTech BD", "Gadget & Gear", "Pickaboo")
- "price": integer (price in BDT, 0 if not stated or unknown)
- "in_stock": boolean
- "is_relevant": boolean (true if this is a store listing or selling the target product, false if blog, forum, video, or wrong item)

Return ONLY a valid JSON object:
{{"shop_name": "Store Name", "price": 21500, "in_stock": true, "is_relevant": true}}"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_predict": 90
        }
    }

    try:
        req = urllib.request.Request(
            OLLAMA_API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode('utf-8'))
                raw_response = body.get('response', '')
                parsed = json.loads(raw_response)
                shop = str(parsed.get('shop_name') or '').strip()
                price = parsed.get('price')
                price_val = int(price) if isinstance(price, (int, float)) and price > 500 else 0
                return {
                    "shop_name": shop,
                    "price": price_val,
                    "in_stock": bool(parsed.get('in_stock', True)),
                    "is_relevant": bool(parsed.get('is_relevant', True)),
                    "source": "ollama_open_model"
                }
    except Exception:
        pass

    return None

def query_groq_cloud_full(title: str, snippet: str, url: str, product_name: str):
    """
    Resilient cloud fallback across 17 Groq API keys using qwen/qwen3.8-27b or openai/gpt-oss-120b.
    """
    load_env_file()

    env_keys = []
    groq_keys_str = os.getenv("GROQ_API_KEYS", "")
    if groq_keys_str:
        env_keys = [k.strip().replace('"', '').replace("'", "") for k in groq_keys_str.split(",") if k.strip().startswith("gsk_")]

    if not env_keys and os.getenv("GROQ_API_KEY"):
        env_keys = [os.getenv("GROQ_API_KEY").strip()]

    prompt = f"""Target Product: "{product_name}"
Search Result:
Title: "{title}"
Snippet: "{snippet}"
URL: "{url}"

Analyze if this is an e-commerce shop selling the product in Bangladesh.
Extract:
- shop_name: string (name of the retail shop)
- price: integer (price in BDT, 0 if not found)
- in_stock: boolean
- is_relevant: boolean (true if shop listing for this product, false if blog/review/video)

Return ONLY JSON format:
{{"shop_name": "...", "price": 0, "in_stock": true, "is_relevant": true}}"""

    for apiKey in env_keys[:5]:
        for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
            try:
                req = urllib.request.Request(
                    "https://api.groq.com/openai/v1/chat/completions",
                    data=json.dumps({
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 90
                    }).encode('utf-8'),
                    headers={
                        "Authorization": f"Bearer {apiKey}",
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=4) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode('utf-8'))
                        content = data['choices'][0]['message']['content']
                        json_match = re.search(r'\{[\s\S]*\}', content)
                        if json_match:
                            parsed = json.loads(json_match.group(0))
                            shop = str(parsed.get('shop_name') or '').strip()
                            price = parsed.get('price')
                            price_val = int(price) if isinstance(price, (int, float)) and price > 500 else 0
                            return {
                                "shop_name": shop,
                                "price": price_val,
                                "in_stock": bool(parsed.get('in_stock', True)),
                                "is_relevant": bool(parsed.get('is_relevant', True)),
                                "source": f"groq_{model}"
                            }
            except Exception:
                continue

    return None

def ai_extract_listing(title: str, snippet: str, url: str, product_name: str, has_known_shop: bool = False):
    """
    Multi-Tier extraction pipeline:
    Tier 1: Fast regex heuristics (0 tokens, 0ms)
    Tier 2: Local Open Model via Ollama (only if price not found or shop unknown)
    Tier 3: Cloud Model API via Groq pool (failover)
    """
    combined_text = f"{title} {snippet}".strip()
    
    # 1. Fast regex attempt (0 tokens, 0ms)
    regex_price = extract_price_regex(combined_text)
    in_stock = not any(k in combined_text.lower() for k in ['out of stock', 'stock out', 'upcoming', 'discontinued'])

    # Fast-path: If price was found and the shop is already known from domain, return immediately!
    if regex_price and has_known_shop:
        return {
            "shop_name": "",
            "price": regex_price,
            "in_stock": in_stock,
            "is_relevant": True,
            "source": "regex_fast"
        }

    # 2. Local Open Model (Ollama)
    ollama_res = query_local_ollama_full(title, snippet, url, product_name)
    if ollama_res:
        if regex_price and ollama_res['price'] == 0:
            ollama_res['price'] = regex_price
        return ollama_res

    # 3. Cloud Model API (Groq)
    groq_res = query_groq_cloud_full(title, snippet, url, product_name)
    if groq_res:
        if regex_price and groq_res['price'] == 0:
            groq_res['price'] = regex_price
        return groq_res

    # Fallback to regex values
    return {
        "shop_name": "",
        "price": regex_price or 0,
        "in_stock": in_stock,
        "is_relevant": True,
        "source": "regex"
    }

def extract_price_and_stock(snippet: str, title: str = "", product_name: str = ""):
    """Backward-compatible helper returning (price, in_stock)."""
    res = ai_extract_listing(title, snippet, "", product_name)
    return res['price'], res['in_stock']
