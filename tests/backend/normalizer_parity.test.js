import { describe, it, expect } from 'vitest';
import { runParityCheck } from '../../scripts/normalizer_parity.mjs';

describe('Cross-Language Normalizer Parity (Node.js vs. Python)', () => {
  it('BE-PARITY-001: Verifies 100% field parity between lib/normalizer.js and scrapers/normalizer.py', () => {
    const result = runParityCheck();
    expect(result.totalTitles).toBeGreaterThanOrEqual(120);
    expect(result.mismatchCount).toBe(0);
    expect(result.mismatches).toEqual([]);
  });
});
