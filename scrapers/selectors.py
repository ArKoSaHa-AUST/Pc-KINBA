"""
PC-KINBA — Centralized CSS Selector Registry for 12 Retailers

All selector definitions, fallback chains, and theme coupling annotations live here.
Over-broad selectors (such as bare 'a') are strictly banned to prevent catalog poisoning.
"""

from dataclasses import dataclass
from typing import Tuple, Dict, Optional


@dataclass(frozen=True)
class StoreSelectors:
    store_id: str                  # Canonical store identifier (e.g. 'startech', 'ryans')
    display_name: str              # User-facing retailer brand (e.g. 'StarTech BD')
    search_url: str                # Search URL pattern with {query} placeholder
    item: str                      # Container selector for each product card
    title: Tuple[str, ...]         # Ordered fallback selectors for product title
    price: Tuple[str, ...]         # Ordered fallback selectors for product price
    image: Tuple[str, ...]         # Ordered fallback selectors for product image
    link: Tuple[str, ...]          # Ordered fallback selectors for product URL
    expects_min_items: int = 5     # Minimum expected yield on common hardware queries
    notes: str = ""                # Architecture / theme coupling notes
    is_post: bool = False          # True if search requires HTTP POST (e.g. Binary Logic)
    base_url: str = ""             # Base domain for relative URL resolution


# ---------------------------------------------------------------------------
# OpenCart Theme Clones Base Template
# 5 stores share OpenCart markup: Skyland, SellTech, ComputerVillage, UltraTech, GlobalBrand
# A theme redesign on one is likely to affect the others.
# ---------------------------------------------------------------------------
OPENCART_ITEM_CONTAINER = ".product-thumb"
OPENCART_TITLE_SELECTORS = (".name a", "h4 a")
OPENCART_PRICE_SELECTORS = (".price-new", ".price")
OPENCART_IMAGE_SELECTORS = ("img",)
OPENCART_LINK_SELECTORS = (".name a", "h4 a", "a")


SELECTORS: Dict[str, StoreSelectors] = {
    # 1. StarTech BD (Custom Laravel/PHP Storefront)
    "startech": StoreSelectors(
        store_id="startech",
        display_name="StarTech BD",
        search_url="https://www.startech.com.bd/product/search?search={query}",
        item=".p-item",
        title=(".p-item-name a", "h4 a"),
        price=(".p-item-price span", ".p-item-price"),
        image=(".p-item-img img", "img"),
        link=(".p-item-name a", ".p-item-img a"),
        expects_min_items=5,
        notes="Custom backend. High yield, fast responses. Reliable selectors.",
        base_url="https://www.startech.com.bd",
    ),

    # 2. Ryans Computers (Custom Node/React & Cloudflare protected)
    "ryans": StoreSelectors(
        store_id="ryans",
        display_name="Ryans Computers",
        search_url="https://www.ryans.com/search?search={query}",
        item=".category-single-product, .cus-col-2, .product-card",
        title=("p.card-text a", ".product-title", 'a[href*="/product/"]'),
        price=(".pr-text", ".product-price", ".price"),
        image=("img",),
        link=("p.card-text a", 'a[href*="/product/"]'),
        expects_min_items=5,
        notes="Cloudflare Turnstile protected. Fallbacks to Supabase listing cache if challenged.",
        base_url="https://www.ryans.com",
    ),

    # 3. Global Brand (OpenCart variant)
    "globalbrand": StoreSelectors(
        store_id="globalbrand",
        display_name="Global Brand",
        search_url="https://www.globalbrand.com.bd/index.php?route=product/search&search={query}",
        item=".product-layout",
        title=(".caption .name a", ".image a"),
        price=(".price-new", ".price"),
        image=("img",),
        link=(".caption .name a", ".image a"),
        expects_min_items=4,
        notes="OpenCart variant with .product-layout containers.",
        base_url="https://www.globalbrand.com.bd",
    ),

    # 4. Techland BD (Next.js / Tailwind Storefront)
    "techland": StoreSelectors(
        store_id="techland",
        display_name="Techland BD",
        search_url="https://www.techlandbd.com/search/advance/product/result/{slug_query}",
        item='.v2-card-lift, [class*="search-grid"] > div',
        title=("a.font-medium", "a.text-gray-900", "h4 a", ".v2-img-wrap ~ a", 'a[href*="-"]'),
        price=(".mt-auto .text-red-600", '.mt-auto [class*="font-bold"]', ".price-new", ".special-price", ".price"),
        image=("img",),
        link=("a.font-medium", "a.text-gray-900", "h4 a", ".v2-img-wrap ~ a", 'a[href*="-"]'),
        expects_min_items=5,
        notes="Tailwind CSS utility class based. Prone to class changes during site updates.",
        base_url="https://www.techlandbd.com",
    ),

    # 5. Skyland BD (OpenCart standard)
    "skyland": StoreSelectors(
        store_id="skyland",
        display_name="Skyland BD",
        search_url="https://www.skyland.com.bd/index.php?route=product/search&search={query}",
        item=OPENCART_ITEM_CONTAINER,
        title=OPENCART_TITLE_SELECTORS,
        price=OPENCART_PRICE_SELECTORS,
        image=OPENCART_IMAGE_SELECTORS,
        link=OPENCART_LINK_SELECTORS,
        expects_min_items=4,
        notes="OpenCart clone. Shares theme with SellTech, ComputerVillage, UltraTech.",
        base_url="https://www.skyland.com.bd",
    ),

    # 6. PCB Store (Tailwind e-commerce)
    "pcbstore": StoreSelectors(
        store_id="pcbstore",
        display_name="PCB Store",
        search_url="https://pcbstore.com.bd/product/search?search={query}",
        item='div[class*="group relative"]',
        title=("h3 a", "h3"),
        price=(".price", "span", "p"),
        image=("img",),
        link=('a[href*="/product/"]', "h3 a"),
        expects_min_items=3,
        notes="Tailwind CSS card structure. Prices often embedded with ৳ symbol.",
        base_url="https://pcbstore.com.bd",
    ),

    # 7. Computer Mania BD (WooCommerce / WordPress)
    "computermania": StoreSelectors(
        store_id="computermania",
        display_name="Computer Mania BD",
        search_url="https://computermania.com.bd/?s={query}&post_type=product",
        item=".product, .product-grid-item, .col-6.col-md-4",
        title=(".woocommerce-loop-product__title", ".product-title a", "h3 a"),
        price=(".price ins .amount", ".price .amount", ".price"),
        image=("img",),
        link=(".woocommerce-loop-product__title", ".product-title a", "h3 a"),
        expects_min_items=4,
        notes="WooCommerce storefront. May enforce Cloudflare bot challenges.",
        base_url="https://computermania.com.bd",
    ),

    # 8. Binary Logic (Custom CSRF POST endpoint)
    "binarylogic": StoreSelectors(
        store_id="binarylogic",
        display_name="Binary Logic",
        search_url="https://www.binarylogic.com.bd/products-search",
        item=".product_column, .col-lg-3 .product-item",
        title=("h4 a", ".product_name a", ".caption a"),
        price=(".current_price", ".price", '[class*="price"]'),
        image=("img",),
        link=("h4 a", ".product_name a", ".caption a"),
        expects_min_items=3,
        notes="Requires CSRF token extraction from homepage before POSTing query.",
        is_post=True,
        base_url="https://www.binarylogic.com.bd",
    ),

    # 9. Sell Tech BD (OpenCart standard)
    "selltech": StoreSelectors(
        store_id="selltech",
        display_name="Sell Tech BD",
        search_url="https://www.selltech.com.bd/index.php?route=product/search&search={query}",
        item=OPENCART_ITEM_CONTAINER,
        title=OPENCART_TITLE_SELECTORS,
        price=OPENCART_PRICE_SELECTORS,
        image=OPENCART_IMAGE_SELECTORS,
        link=OPENCART_LINK_SELECTORS,
        expects_min_items=4,
        notes="OpenCart clone.",
        base_url="https://www.selltech.com.bd",
    ),

    # 10. Computer Village (OpenCart standard)
    "computervillage": StoreSelectors(
        store_id="computervillage",
        display_name="Computer Village",
        search_url="https://www.computervillage.com.bd/index.php?route=product/search&search={query}",
        item=OPENCART_ITEM_CONTAINER,
        title=OPENCART_TITLE_SELECTORS,
        price=OPENCART_PRICE_SELECTORS,
        image=OPENCART_IMAGE_SELECTORS,
        link=OPENCART_LINK_SELECTORS,
        expects_min_items=4,
        notes="OpenCart clone.",
        base_url="https://www.computervillage.com.bd",
    ),

    # 11. PC House BD (Custom e-commerce)
    "pchouse": StoreSelectors(
        store_id="pchouse",
        display_name="PC House BD",
        search_url="https://www.pchouse.com.bd/product/search?search={query}",
        item=".single-product-item, .product-thumb",
        title=("h4 a", ".product-item-info a", 'a[href*="/product/"]'),
        price=(".price-new", ".price", '[class*="price"]'),
        image=("img",),
        link=("h4 a", ".product-item-info a", 'a[href*="/product/"]'),
        expects_min_items=4,
        notes="Custom template with .single-product-item container.",
        base_url="https://www.pchouse.com.bd",
    ),

    # 12. Ultra Technology (OpenCart standard)
    "ultratech": StoreSelectors(
        store_id="ultratech",
        display_name="Ultra Technology",
        search_url="https://www.ultratech.com.bd/index.php?route=product/search&search={query}",
        item=OPENCART_ITEM_CONTAINER,
        title=OPENCART_TITLE_SELECTORS,
        price=OPENCART_PRICE_SELECTORS,
        image=OPENCART_IMAGE_SELECTORS,
        link=OPENCART_LINK_SELECTORS,
        expects_min_items=4,
        notes="OpenCart clone.",
        base_url="https://www.ultratech.com.bd",
    ),
}


# Coupled store clusters for quick impact assessment:
COUPLED_OPENCART_STORES = [
    "skyland",
    "selltech",
    "computervillage",
    "ultratech",
    "globalbrand",
]


def get_selectors(store_id: str) -> Optional[StoreSelectors]:
    """Retrieve immutable selector config for a store by id."""
    return SELECTORS.get(store_id)
