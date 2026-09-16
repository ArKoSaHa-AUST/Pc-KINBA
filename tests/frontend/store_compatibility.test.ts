import { describe, it, expect, afterAll } from 'vitest';
import { estimatePowerDraw, totalPriceOf, selectionFromPartIds, partIdsOf } from '../../client/src/components/builder/compatibility';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence';

describe('Frontend > PC Builder Compatibility Engine & Helpers (compatibility.ts)', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('FE-COMPAT-001: Estimates system power draw accurately', async () => {
    const mockBuild = {
      cpu: { id: 'cpu-1', name: 'Ryzen 7 7700', category: 'cpu', price: 34000, tdp: 65 } as any,
      gpu: { id: 'gpu-1', name: 'RTX 4070 Super', category: 'gpu', price: 82500, tdp: 220 } as any
    };

    const draw = estimatePowerDraw(mockBuild);
    // Base 75W + 65W CPU + 220W GPU = 360W
    expect(draw).toBe(360);

    await captureEvidence({
      testId: 'FE-COMPAT-001',
      service: 'frontend',
      moduleName: 'Power Draw Estimator',
      description: 'Calculates total estimated power consumption from CPU TDP, GPU TDP, and base system draw',
      steps: 'estimatePowerDraw({ cpu: 65W, gpu: 220W, base: 75W })',
      expected: 'Estimated power draw: 360W',
      actual: `Calculated draw: ${draw}W`,
      status: 'PASS',
      inputData: mockBuild,
      outputData: { estimatedDrawWatts: draw }
    });
  });

  it('FE-COMPAT-002: Calculates total build price accurately', async () => {
    const mockBuild = {
      cpu: { id: 'cpu-1', price: 34000 } as any,
      gpu: { id: 'gpu-1', price: 82500 } as any,
      motherboard: { id: 'mobo-1', price: 23500 } as any
    };

    const total = totalPriceOf(mockBuild);
    expect(total).toBe(140000);

    await captureEvidence({
      testId: 'FE-COMPAT-002',
      service: 'frontend',
      moduleName: 'Build Price Aggregator',
      description: 'Sums all selected component prices in BDT',
      steps: 'totalPriceOf(mockBuild)',
      expected: 'Total: 140,000 BDT',
      actual: `Calculated total: ${total} BDT`,
      status: 'PASS',
      inputData: mockBuild,
      outputData: { totalPriceBDT: total }
    });
  });

  it('FE-COMPAT-003: Reconstructs build selection from comma-separated part ID query param', async () => {
    const byId = new Map([
      ['cpu-1', { id: 'cpu-1', name: 'Ryzen 7 7700', category: 'cpu', price: 34000 } as any],
      ['gpu-1', { id: 'gpu-1', name: 'RTX 4070 Super', category: 'gpu', price: 82500 } as any]
    ]);

    const selection = selectionFromPartIds('cpu-1,gpu-1', byId);
    expect(selection.cpu?.id).toBe('cpu-1');
    expect(selection.gpu?.id).toBe('gpu-1');

    const ids = partIdsOf(selection);
    expect(ids).toEqual(['cpu-1', 'gpu-1']);

    await captureEvidence({
      testId: 'FE-COMPAT-003',
      service: 'frontend',
      moduleName: 'Share Link / Build URL Serializer',
      description: 'Decodes comma-separated product ID URL parameter into structured build selection',
      steps: 'selectionFromPartIds("cpu-1,gpu-1", catalogMap)',
      expected: 'Build selection object with cpu and gpu populated',
      actual: `Reconstructed parts: ${ids.join(', ')}`,
      status: 'PASS',
      inputData: 'cpu-1,gpu-1',
      outputData: selection
    });
  });
});
