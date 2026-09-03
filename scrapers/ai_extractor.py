"""
PC Kinba - Hybrid Token-Saving Price & Store Extractor
1. Fast regex extraction (0 tokens, 0ms latency)
2. Local Open Model via Ollama (qwen2.5:1.5b) (0 cloud tokens, private & free)
3. Groq API Key-Rotation Pool (qwen/qwen3.8-27b across 17 keys) as resilient cloud fallback
"""

import re
import json
import urllib.request
import urllib.parse
import os
import sys

# Ensure project root is in path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"

def extract_price_regex(text: str):
    """
    High-precision pattern matcher for Bangladeshi pricing conventions in search snippets.
    Matches:
      'BDT 20,500.00', '21,500৳', 'starts from 21,900', 'In Stock Price: 21,000৳',
      'price ... is 22,500.00', '৳22,500 (Cash Price)'
    """
    if not text:
        return None

    # Priority 1: Direct Price Indicators
    patterns = [
        r'(?:latest\s*price|price\s*is|starts\s*from|in\s*stock\s*price|cash\s*price)\D{0,15}(?:৳|bdt|tk\.?)?\s*([\d,]{4,7})',
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
                # Ensure it is a realistic component price (> 500 BDT)
                if 500 <= val <= 2500000:
                    return val

    return None

def query_local_ollama(snippet: str, product_name: str):
    """Queries local Ollama instance with open model (qwen2.5:1.5b) to save cloud tokens."""
    prompt = f"""You are a pricing data extractor for PC components in Bangladesh.
Product: {product_name}
Search Result Snippet: "{snippet}"

Extract the exact component price in BDT as an integer number. If out of stock, or price is not mentioned, return 0.
Return ONLY a valid JSON object with format: {{"price": 21500, "in_stock": true}}"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.0,
            "num_predict": 60
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
                p = parsed.get('price')
                if isinstance(p, (int, float)) and p > 500:
                    return int(p), parsed.get('in_stock', True)
    except Exception:
        pass

    return None

def query_groq_fallback(snippet: str, product_name: str):
    """Resilient fallback to Groq 17-key pool using qwen/qwen3.8-27b or openai/gpt-oss-20b."""
    # Load keys from environment
    env_keys = []
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))

    groq_keys_str = os.getenv("GROQ_API_KEYS", "")
    if groq_keys_str:
        env_keys = [k.strip().replace('"', '').replace("'", "") for k in groq_keys_str.split(",") if k.strip().startswith("gsk_")]

    if not env_keys and os.getenv("GROQ_API_KEY"):
        env_keys = [os.getenv("GROQ_API_KEY").strip()]

    prompt = f"""Product: {product_name}
Snippet: "{snippet}"
Extract product price in BDT. Output JSON only: {{"price": 21500, "in_stock": true}}"""

    for apiKey in env_keys[:4]:
        try:
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps({
                    "model": "qwen/qwen3.8-27b",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 60
                }).encode('utf-8'),
                headers={
                    "Authorization": f"Bearer {apiKey}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    content = data['choices'][0]['message']['content']
                    json_match = re.search(r'\{[\s\S]*\}', content)
                    if json_match:
                        parsed = json.loads(json_match.group(0))
                        p = parsed.get('price')
                        if isinstance(p, (int, float)) and p > 500:
                            return int(p), parsed.get('in_stock', True)
        except Exception:
            continue

    return None

def extract_price_and_stock(snippet: str, title: str = "", product_name: str = ""):
    """
    Tiered extraction pipeline:
    1. Regex Pattern Matching (Fastest, 0 tokens)
    2. Local Open Model (Qwen via Ollama, 0 cloud tokens)
    3. Groq API Cloud Rotation (Fallback)
    """
    combined_text = f"{title} {snippet}".strip()

    # Tier 1: Fast regex heuristics
    regex_price = extract_price_regex(combined_text)
    in_stock = True
    lower = combined_text.lower()
    if any(k in lower for k in ['out of stock', 'stock out', 'upcoming', 'discontinued']):
        in_stock = False

    if regex_price is not None:
        return regex_price, in_stock

    # Tier 2: Local Open Model (Qwen via Ollama) to minimize cloud tokens
    ollama_res = query_local_ollama(combined_text, product_name)
    if ollama_res:
        return ollama_res

    # Tier 3: Groq Cloud Failover
    groq_res = query_groq_fallback(combined_text, product_name)
    if groq_res:
        return groq_res

    return 0, in_stock
