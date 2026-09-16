import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scrapers')))

from fast_scrapers import parse_brand, clean_price

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
