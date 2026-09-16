import { describe, it, expect, afterAll } from 'vitest';
import { extractSocket, extractRamType, extractFormFactor, extractPsuWattage, estimateBuildWattage, validateBuild } from '../../lib/ai/validator.js';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence.js';
import fs from 'fs';
import path from 'path';

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/compatibility_fixtures.json'), 'utf-8'));

describe('Backend > Hardware Compatibility Engine (lib/ai/validator.js)', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('BE-COMPAT-001: 100% Compatible AM5 + DDR5 Build Passes All Rules', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'COMPAT-AM5-B650');
    const candidateLookup = {
      'cpu-1': fixture.parts.cpu,
      'mobo-1': fixture.parts.motherboard,
      'ram-1': fixture.parts.ram,
      'gpu-1': fixture.parts.gpu,
      'psu-1': fixture.parts.psu,
      'case-1': fixture.parts.case,
      'cooler-1': fixture.parts.cooler
    };

    const build = {
      parts: {
        cpu: 'cpu-1',
        motherboard: 'mobo-1',
        ram: 'ram-1',
        gpu: 'gpu-1',
        psu: 'psu-1',
        case: 'case-1',
        cooler: 'cooler-1'
      }
    };

    const result = validateBuild(build, candidateLookup);
    expect(result.ok).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.score).toBe(100);

    await captureEvidence({
      testId: 'BE-COMPAT-001',
      service: 'backend',
      moduleName: 'Hardware Compatibility Validator',
      description: 'Validates complete AM5 + B650 + DDR5 build with 750W PSU and dedicated cooler',
      steps: 'validateBuild(build, candidateLookup)',
      expected: 'ok: true, violations: [], score: 100',
      actual: `ok: ${result.ok}, violations: ${result.violations.length}, estimated draw: ${result.wattage}W`,
      status: 'PASS',
      inputData: fixture.parts,
      outputData: result
    });
  });

  it('BE-COMPAT-002: Detects CPU ↔ Motherboard Socket Mismatch (AM5 in LGA1700)', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'COMPAT-SOCKET-MISMATCH');
    const candidateLookup = {
      'cpu-1': fixture.parts.cpu,
      'mobo-2': fixture.parts.motherboard,
      'ram-1': fixture.parts.ram,
      'psu-1': fixture.parts.psu
    };

    const build = {
      parts: {
        cpu: 'cpu-1',
        motherboard: 'mobo-2',
        ram: 'ram-1',
        psu: 'psu-1'
      }
    };

    const result = validateBuild(build, candidateLookup);
    expect(result.ok).toBe(false);
    expect(result.violations.some(v => v.rule === 'socket_mismatch')).toBe(true);

    await captureEvidence({
      testId: 'BE-COMPAT-002',
      service: 'backend',
      moduleName: 'Socket Compatibility Guard',
      description: 'Flags incompatible socket pairing when AM5 CPU is placed in LGA1700 Motherboard',
      steps: 'validateBuild(build, candidateLookup)',
      expected: 'socket_mismatch violation detected, ok: false',
      actual: result.violations.find(v => v.rule === 'socket_mismatch')?.detail || 'No violation',
      status: 'PASS',
      inputData: { cpu: fixture.parts.cpu, motherboard: fixture.parts.motherboard },
      outputData: result
    });
  });

  it('BE-COMPAT-003: Detects RAM Generation Mismatch (DDR5 in DDR4 Motherboard)', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'COMPAT-RAM-MISMATCH');
    const candidateLookup = {
      'cpu-2': fixture.parts.cpu,
      'mobo-3': fixture.parts.motherboard,
      'ram-1': fixture.parts.ram,
      'psu-1': fixture.parts.psu
    };

    const build = {
      parts: {
        cpu: 'cpu-2',
        motherboard: 'mobo-3',
        ram: 'ram-1',
        psu: 'psu-1'
      }
    };

    const result = validateBuild(build, candidateLookup);
    expect(result.ok).toBe(false);
    expect(result.violations.some(v => v.rule === 'ram_mismatch')).toBe(true);

    await captureEvidence({
      testId: 'BE-COMPAT-003',
      service: 'backend',
      moduleName: 'Memory Generation Guard',
      description: 'Flags incompatible RAM generation (DDR5 RAM in DDR4 motherboard)',
      steps: 'validateBuild(build, candidateLookup)',
      expected: 'ram_mismatch violation detected, ok: false',
      actual: result.violations.find(v => v.rule === 'ram_mismatch')?.detail || 'No violation',
      status: 'PASS',
      inputData: { motherboard: fixture.parts.motherboard, ram: fixture.parts.ram },
      outputData: result
    });
  });

  it('BE-COMPAT-004: Flags Insufficient PSU Wattage & Tight Headroom', async () => {
    const fixture = fixtures.test_cases.find(tc => tc.id === 'COMPAT-PSU-UNDERPOWERED');
    const candidateLookup = {
      'cpu-3': fixture.parts.cpu,
      'mobo-4': fixture.parts.motherboard,
      'gpu-2': fixture.parts.gpu,
      'psu-2': fixture.parts.psu
    };

    const build = {
      parts: {
        cpu: 'cpu-3',
        motherboard: 'mobo-4',
        gpu: 'gpu-2',
        psu: 'psu-2'
      }
    };

    const result = validateBuild(build, candidateLookup);
    expect(result.ok).toBe(false);
    expect(result.violations.some(v => v.rule === 'psu_insufficient')).toBe(true);

    await captureEvidence({
      testId: 'BE-COMPAT-004',
      service: 'backend',
      moduleName: 'PSU Wattage & Headroom Guard',
      description: 'Flags power deficit when 500W PSU is paired with RTX 4090 + i9-14900K (~778W draw)',
      steps: 'validateBuild(build, candidateLookup)',
      expected: 'psu_insufficient violation detected',
      actual: result.violations.find(v => v.rule === 'psu_insufficient')?.detail || 'No violation',
      status: 'PASS',
      inputData: { cpu: fixture.parts.cpu, gpu: fixture.parts.gpu, psu: fixture.parts.psu },
      outputData: result
    });
  });
});
