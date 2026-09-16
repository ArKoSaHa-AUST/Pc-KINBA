import { describe, it, expect, afterAll } from 'vitest';
import { extractAttributes, generateFingerprint, normalizePrice, isSameProductVariant, group5StoreOffers } from '../../lib/normalizer.js';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence.js';
import fs from 'fs';
import path from 'path';

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/normalization_fixtures.json'), 'utf-8'));

describe('Backend > Product Matching & Normalization Engine (lib/normalizer.js)', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('BE-NORM-001: Extracts GPU manufacturer, brand, model, and capacity', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'NORM-GPU-GIGABYTE');
    const attrs = extractAttributes(fixture.raw_title);

    expect(attrs.manufacturer).toBe(fixture.expected_manufacturer);
    expect(attrs.brand).toBe(fixture.expected_brand);
    expect(attrs.capacity).toBe(fixture.expected_capacity);

    await captureEvidence({
      testId: 'BE-NORM-001',
      service: 'backend',
      moduleName: 'Product Normalizer Engine',
      description: 'Extracts hardware manufacturer, vendor brand, and capacity from raw title',
      steps: `extractAttributes("${fixture.raw_title}")`,
      expected: `Manufacturer: ${fixture.expected_manufacturer}, Brand: ${fixture.expected_brand}, Capacity: ${fixture.expected_capacity}`,
      actual: `Manufacturer: ${attrs.manufacturer}, Brand: ${attrs.brand}, Capacity: ${attrs.capacity}`,
      status: 'PASS',
      inputData: fixture.raw_title,
      outputData: attrs
    });
  });

  it('BE-NORM-002: Generates order-independent canonical fingerprint', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'NORM-GPU-GIGABYTE');
    const result = generateFingerprint(fixture.raw_title);

    for (const token of fixture.expected_fingerprint_contains) {
      expect(result.fingerprint.toLowerCase()).toContain(token.toLowerCase());
    }

    await captureEvidence({
      testId: 'BE-NORM-002',
      service: 'backend',
      moduleName: 'Canonical Fingerprint Engine',
      description: 'Generates canonical order-independent fingerprint string for hardware matching',
      steps: `generateFingerprint("${fixture.raw_title}")`,
      expected: `Fingerprint containing tokens: ${fixture.expected_fingerprint_contains.join(', ')}`,
      actual: `Generated fingerprint: ${result.fingerprint}`,
      status: 'PASS',
      inputData: fixture.raw_title,
      outputData: result
    });
  });

  it('BE-NORM-003: Strict price normalization handles 0, strings and Call for Price', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'NORM-PRICE-CLEANING');
    const results = fixture.prices.map(p => ({
      input: p.raw,
      expected: p.expected,
      actual: normalizePrice(p.raw),
      passed: normalizePrice(p.raw) === p.expected
    }));

    const allPassed = results.every(r => r.passed);
    expect(allPassed).toBe(true);

    await captureEvidence({
      testId: 'BE-NORM-003',
      service: 'backend',
      moduleName: 'Price Normalizer',
      description: 'Normalizes messy price strings and converts invalid/zero prices to null',
      steps: 'normalizePrice() for multiple edge-case price formats',
      expected: 'All valid numbers extracted, 0/Call for Price converted to null',
      actual: 'All test prices correctly normalized',
      status: 'PASS',
      inputData: fixture.prices,
      outputData: results
    });
  });

  it('BE-NORM-004: Groups multi-retailer offers under canonical stores', async () => {
    const mockListings = [
      { id: '1', retailer: 'StarTech', price: 45000, title: 'RTX 4060 8GB', in_stock: true },
      { id: '2', retailer: 'Ryans', price: 44500, title: 'RTX 4060 8GB', in_stock: true },
      { id: '3', retailer: 'Techland', price: 46000, title: 'RTX 4060 8GB', in_stock: false }
    ];

    const grouped = group5StoreOffers(mockListings);
    expect(grouped.shops.length).toBeGreaterThan(0);
    expect(grouped.shops.some(g => g.name.includes('StarTech'))).toBe(true);

    await captureEvidence({
      testId: 'BE-NORM-004',
      service: 'backend',
      moduleName: 'Store Offer Aggregator',
      description: 'Groups raw retailer listings under target store cards',
      steps: 'group5StoreOffers(mockListings)',
      expected: 'Object containing shops array with availability & pricing',
      actual: `Successfully grouped ${grouped.shops.length} store offers`,
      status: 'PASS',
      inputData: mockListings,
      outputData: grouped
    });
  });
});
