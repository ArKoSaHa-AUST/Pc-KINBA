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


def test_py_norm_004_corpus_validation():
    corpus_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../fixtures/normalization_corpus.json'))
    with open(corpus_path, 'r', encoding='utf-8') as f:
        corpus = json.load(f)

    assert len(corpus['titles']) >= 120

    for item in corpus['titles']:
        attrs = extract_attributes(item['raw_title'])
        fp = generate_fingerprint(item['raw_title'])
        expected = item['expected']

        assert attrs['manufacturer'] == expected['manufacturer'], f"[{item['id']}] manufacturer mismatch"
        assert attrs['brand'] == expected['brand'], f"[{item['id']}] brand mismatch"
        assert attrs['capacity'] == expected['capacity'], f"[{item['id']}] capacity mismatch"
        assert attrs['type'] == expected['type'], f"[{item['id']}] type mismatch"
        assert attrs['speed'] == expected['speed'], f"[{item['id']}] speed mismatch"
        assert attrs['model'] == expected['model'], f"[{item['id']}] model mismatch"
        assert attrs['baseModel'] == expected['baseModel'], f"[{item['id']}] baseModel mismatch"
        assert attrs['mpn'] == expected['mpn'], f"[{item['id']}] mpn mismatch"
        assert fp['fingerprint'] == expected['fingerprint'], f"[{item['id']}] fingerprint mismatch"

    for p in corpus.get('prices', []):
        actual = normalize_price(p['raw'])
        assert actual == p['expected'], f"Price mismatch for {p['raw']}: expected {p['expected']}, got {actual}"

