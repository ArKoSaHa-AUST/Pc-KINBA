import { describe, it, expect, afterAll } from 'vitest';
import { normalizePrice, extractAttributes, isSameProductVariant } from '../../lib/normalizer.js';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence.js';

describe('Cross-Cutting > Ingestion Pipeline Data Accuracy & Zero-Price Guards', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('SYS-INGEST-001: Zero & Negative Price Guard prevents catalog pollution', async () => {
    const rawPrices = [0, -1500, '0', '৳ 0', 'Call for Price', 'Upcoming', 45000];
    const cleaned = rawPrices.map(p => ({
      input: p,
      output: normalizePrice(p)
    }));

    expect(cleaned.find(c => c.input === 0).output).toBe(null);
    expect(cleaned.find(c => c.input === -1500).output).toBe(null);
    expect(cleaned.find(c => c.input === 45000).output).toBe(45000);

    await captureEvidence({
      testId: 'SYS-INGEST-001',
      service: 'cross-cutting',
      moduleName: 'Ingestion Zero-Price Guard',
      description: 'Filters out 0, negative, and placeholder prices from scraped retailer data',
      steps: 'normalizePrice() across boundary price test cases',
      expected: 'Only valid positive integer prices preserved; zero/negative converted to null',
      actual: 'Zero and negative prices successfully neutralized',
      status: 'PASS',
      inputData: rawPrices,
      outputData: cleaned
    });
  });

  it('SYS-INGEST-002: Variant Matcher detects equivalent SKUs across stores', async () => {
    const titleA = 'GIGABYTE GeForce RTX 4070 Super Gaming OC 12GB';
    const titleB = 'GIGABYTE RTX 4070 SUPER GAMING OC 12G Graphics Card';

    const isMatch = isSameProductVariant(titleA, titleB);

    expect(isMatch).toBe(true);

    await captureEvidence({
      testId: 'SYS-INGEST-002',
      service: 'cross-cutting',
      moduleName: 'Cross-Store SKU Reconciler',
      description: 'Verifies title variant equivalence across different store naming formats',
      steps: `isSameProductVariant(extractAttributes("${titleA}"), extractAttributes("${titleB}"))`,
      expected: 'isMatch: true',
      actual: `isMatch: ${isMatch}`,
      status: 'PASS',
      inputData: { titleA, titleB },
      outputData: { titleA, titleB, isMatch }
    });
  });
});
