import pytest
import os
import sys
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scrapers.selectors import SELECTORS, get_selectors
from scrapers.fast_scrapers import (
    parse_brand,
    clean_price,
    parse_html_with_selectors,
    ScrapeResult,
)

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), '../fixtures/scraper_html')
ALL_STORES = list(SELECTORS.keys())


def load_fixture(store_id: str) -> str:
    filepath = os.path.join(FIXTURES_DIR, f"{store_id}.html")
    assert os.path.exists(filepath), f"Missing golden HTML fixture for store: {store_id}"
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def test_fast_scraper_brand_extraction():
    assert parse_brand("Gigabyte GeForce RTX 4060 Eagle OC 8GB") == "Gigabyte"
    assert parse_brand("MSI PRO B650M-A WiFi Motherboard") == "MSI"
    assert parse_brand("Corsair Vengeance DDR5 32GB RAM") == "Corsair"
    assert parse_brand("Unknown Brand Random Part") == "Unknown"


def test_fast_scraper_clean_price():
    price_val, price_label = clean_price("45,500৳")
    assert price_val == 45500
    assert "45,500" in price_label

    price_zero, label_zero = clean_price("Call for Price")
    assert price_zero == 0
    assert label_zero == "Call for Price"

    price_up, label_up = clean_price("Up Coming")
    assert price_up == 0
    assert label_up == "Up Coming"


@pytest.mark.parametrize("store_id", ALL_STORES)
def test_scrape_store_001_golden_html_success(store_id):
    """
    SCRAPE-<store>-001: Parsing the golden HTML yields >= expects_min_items items,
    each with a non-empty title, a plausible price (>0), and an absolute-or-resolvable URL.
    """
    selectors = get_selectors(store_id)
    assert selectors is not None, f"Selectors missing for store: {store_id}"

    html = load_fixture(store_id)
    result = parse_html_with_selectors(html, selectors, query="rtx 4060", http_status=200, duration_ms=120)

    assert result.ok is True, f"ScrapeResult failed for {store_id}: {result.error}"
    assert result.container_matched is True
    assert result.item_count >= selectors.expects_min_items, (
        f"{store_id} item_count ({result.item_count}) below expected minimum ({selectors.expects_min_items})"
    )
    assert result.priced_count > 0, f"{store_id} returned 0 priced items"
    assert len(result.sample_titles) > 0

    for item in result.items:
        assert item["title"] and len(item["title"]) > 3, f"Empty or invalid title in {store_id}"
        assert item["price"] > 0, f"Unpriced item found in {store_id} golden run: {item}"
        assert item["product_url"].startswith("http"), f"Non-absolute product URL in {store_id}: {item['product_url']}"


@pytest.mark.parametrize("store_id", ALL_STORES)
def test_scrape_store_002_container_missing(store_id):
    """
    SCRAPE-<store>-002: Parsing HTML with the item container corrupted/renamed
    yields failure_reason == 'container_missing', not an empty success.
    """
    selectors = get_selectors(store_id)
    html = load_fixture(store_id)

    # Break container classes / tags by removing container class names or replacing tags
    mangled_html = re.sub(r'class="[^"]*"', 'class="unmatched_container_class"', html)
    mangled_html = re.sub(r'<div', '<section', mangled_html)
    mangled_html = re.sub(r'<li', '<section', mangled_html)
    mangled_html = re.sub(r'<article', '<section', mangled_html)

    result = parse_html_with_selectors(mangled_html, selectors, query="rtx 4060", http_status=200)

    assert result.ok is False
    assert result.container_matched is False
    assert result.failure_reason == "container_missing"
    assert result.item_count == 0


@pytest.mark.parametrize("store_id", ALL_STORES)
def test_scrape_store_003_all_unpriced(store_id):
    """
    SCRAPE-<store>-003: Parsing HTML with price element and numbers removed
    yields failure_reason == 'all_unpriced'.
    """
    selectors = get_selectors(store_id)
    html = load_fixture(store_id)

    # Replace specific price classes only (start with . or #)
    mangled_html = html
    for p_sel in selectors.price:
        if p_sel.startswith(".") or p_sel.startswith("#"):
            clean_cls = p_sel.lstrip(".#").split()[0]
            mangled_html = mangled_html.replace(clean_cls, "no_price_match")
    
    # Strip currency digits to prevent fallback regex matching
    mangled_html = re.sub(r'[\d,]+\s*৳', 'Call for Price', mangled_html)
    mangled_html = re.sub(r'৳\s*[\d,]+', 'Call for Price', mangled_html)
    mangled_html = re.sub(r'Tk\.?\s*[\d,]+', 'Call for Price', mangled_html, flags=re.IGNORECASE)
    # Also strip any 4-6 digit numbers next to text
    mangled_html = re.sub(r'\b\d{4,6}\b', 'TBA', mangled_html)

    result = parse_html_with_selectors(mangled_html, selectors, query="rtx 4060", http_status=200)

    assert result.ok is False
    assert result.container_matched is True
    assert result.item_count > 0
    assert result.priced_count == 0
    assert result.failure_reason == "all_unpriced"


def test_scrape_blocked_bot_wall():
    """Verify bot-wall detection triggers failure_reason == 'blocked'."""
    selectors = get_selectors("ryans")
    with open(os.path.join(FIXTURES_DIR, "cloudflare_block.html"), "r", encoding="utf-8") as f:
        blocked_html = f.read()

    result = parse_html_with_selectors(blocked_html, selectors, query="rtx 4060", http_status=403)
    assert result.ok is False
    assert result.failure_reason == "blocked"


def test_scrape_http_error():
    """Verify non-200 HTTP status triggers failure_reason == 'http_error'."""
    selectors = get_selectors("startech")
    result = parse_html_with_selectors("<html>Server Error</html>", selectors, query="rtx 4060", http_status=500)
    assert result.ok is False
    assert result.failure_reason == "http_error"
    assert result.http_status == 500
