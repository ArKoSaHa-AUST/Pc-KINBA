import pytest
import json
import os
import sys

# Add scrapers to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scrapers')))

from normalizer import extract_attributes, normalize_price, generate_fingerprint

FIXTURE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../fixtures/normalization_fixtures.json'))

with open(FIXTURE_PATH, 'r', encoding='utf-8') as f:
    FIXTURES = json.load(f)

def test_py_norm_001_gpu_attributes():
    fixture = next(tc for tc in FIXTURES['test_cases'] if tc['id'] == 'NORM-GPU-GIGABYTE')
    attrs = extract_attributes(fixture['raw_title'])
    
    assert attrs['manufacturer'] == fixture['expected_manufacturer']
    assert attrs['brand'] == fixture['expected_brand']
    assert attrs['capacity'] == fixture['expected_capacity']

def test_py_norm_002_fingerprint_parity():
    fixture = next(tc for tc in FIXTURES['test_cases'] if tc['id'] == 'NORM-GPU-GIGABYTE')
    res = generate_fingerprint(fixture['raw_title'])
    
    for token in fixture['expected_fingerprint_contains']:
        assert token.lower() in res['fingerprint'].lower()

def test_py_norm_003_price_normalizer_edge_cases():
    fixture = next(tc for tc in FIXTURES['test_cases'] if tc['id'] == 'NORM-PRICE-CLEANING')
    for p in fixture['prices']:
        actual = normalize_price(p['raw'])
        assert actual == p['expected'], f"Failed for raw price {p['raw']}: expected {p['expected']}, got {actual}"
