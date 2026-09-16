import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scrapers')))

from ai_extractor import extract_price_regex, clean_extracted_shop_name

def test_ai_extract_price_regex_formats():
    test_strings = [
        ("StarTech: Special Price ৳ 45,500 Regular Price ৳ 48,000", 45500),
        ("Ryans: In Stock Price: 44,500৳ Cash Discount", 44500),
        ("Techland: Latest Price in BD is BDT 46,000", 46000),
        ("Skyland: Buy now for 43,999 Tk only", 43999)
    ]
    
    for text, expected in test_strings:
        extracted = extract_price_regex(text)
        assert extracted == expected, f"Failed on '{text}': got {extracted}, expected {expected}"

def test_ai_clean_shop_name():
    assert clean_extracted_shop_name("StarTech BD Online Shop", "www.startech.com.bd") == "StarTech"
    assert clean_extracted_shop_name("Ryans Computers Ltd", "www.ryans.com") == "Ryans Computers"

