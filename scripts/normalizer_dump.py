#!/usr/bin/env python3
"""
scripts/normalizer_dump.py - Python normalizer dump runner for cross-language parity.

Reads tests/fixtures/normalization_corpus.json, executes scrapers.normalizer functions,
and dumps deterministic, sorted JSON to stdout.
"""

import sys
import os
import json
import argparse

# Add repo root to sys.path so scrapers module can be imported
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scrapers.normalizer import (
    extract_attributes,
    generate_fingerprint,
    normalize_price,
    calculate_similarity,
    calculate_match_confidence,
)


def run_dump(corpus_path: str) -> dict:
    with open(corpus_path, 'r', encoding='utf-8') as f:
        corpus = json.load(f)

    title_dumps = {}
    for item in corpus.get('titles', []):
        item_id = item['id']
        raw_title = item['raw_title']
        attrs = extract_attributes(raw_title)
        fp_res = generate_fingerprint(raw_title)
        title_dumps[item_id] = {
            'attributes': {
                'manufacturer': attrs['manufacturer'],
                'brand': attrs['brand'],
                'capacity': attrs['capacity'],
                'type': attrs['type'],
                'speed': attrs['speed'],
                'model': attrs['model'],
                'baseModel': attrs['baseModel'],
                'mpn': attrs['mpn'],
                'raw': attrs['raw'],
            },
            'fingerprint': fp_res['fingerprint'],
            'canonical_name': fp_res['canonical_name'],
        }

    price_dumps = []
    for item in corpus.get('prices', []):
        raw_price = item['raw']
        norm = normalize_price(raw_price)
        price_dumps.append({
            'raw': raw_price,
            'normalized': norm,
        })

    pair_dumps = {}
    for item in corpus.get('pairs', []):
        pair_id = item['id']
        t1 = item['title1']
        t2 = item['title2']
        sim = calculate_similarity(t1, t2)
        conf = calculate_match_confidence(t1, t2)
        pair_dumps[pair_id] = {
            'similarity': round(float(sim), 4),
            'confidence': round(float(conf), 2),
        }

    return {
        'titles': title_dumps,
        'prices': price_dumps,
        'pairs': pair_dumps,
    }


def main():
    parser = argparse.ArgumentParser(description='Normalizer dump runner (Python)')
    parser.add_argument(
        '--corpus',
        default=os.path.join(REPO_ROOT, 'tests', 'fixtures', 'normalization_corpus.json'),
        help='Path to normalization corpus JSON',
    )
    args = parser.parse_args()

    dump_data = run_dump(args.corpus)
    # Output deterministic, key-sorted JSON
    sys.stdout.write(json.dumps(dump_data, indent=2, sort_keys=True) + '\n')


if __name__ == '__main__':
    main()
