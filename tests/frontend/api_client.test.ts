import { describe, it, expect, afterAll, vi } from 'vitest';
import { ApiError, apiFetch } from '../../client/src/api/client';
import { captureEvidence, closeBrowser } from '../helpers/visualEvidence';

describe('Frontend > API Client Layer (client.ts)', () => {
  afterAll(async () => {
    await closeBrowser();
    vi.restoreAllMocks();
  });

  it('FE-API-001: Constructs ApiError instance with status, code, and fieldErrors', async () => {
    const err = new ApiError(400, 'validation_failed', 'Invalid product price', { price: ['Price must be positive'] });

    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_failed');
    expect(err.message).toBe('Invalid product price');
    expect(err.fieldErrors?.price).toContain('Price must be positive');

    await captureEvidence({
      testId: 'FE-API-001',
      service: 'frontend',
      moduleName: 'RFC 7807 API Error Wrapper',
      description: 'Verifies ApiError typed structure and field error mapping',
      steps: 'new ApiError(400, "validation_failed", "Invalid product price", { price: [...] })',
      expected: 'ApiError instance with status 400, code "validation_failed"',
      actual: `Status: ${err.status}, Code: ${err.code}, Message: "${err.message}"`,
      status: 'PASS',
      inputData: { status: 400, code: 'validation_failed', message: 'Invalid product price' },
      outputData: { status: err.status, code: err.code, fieldErrors: err.fieldErrors }
    });
  });

  it('FE-API-002: Injects Authorization Bearer header when token is supplied', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true })
    });
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('/test-endpoint', { token: 'mock-jwt-token-123' });

    expect(mockFetch).toHaveBeenCalled();
    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders.Authorization).toBe('Bearer mock-jwt-token-123');

    await captureEvidence({
      testId: 'FE-API-002',
      service: 'frontend',
      moduleName: 'API Client Token Interceptor',
      description: 'Ensures Bearer token is automatically attached to outgoing HTTP headers',
      steps: 'apiFetch("/test-endpoint", { token: "mock-jwt-token-123" })',
      expected: 'Authorization header: "Bearer mock-jwt-token-123"',
      actual: `Attached Authorization header: "${calledHeaders.Authorization}"`,
      status: 'PASS',
      inputData: { token: 'mock-jwt-token-123', path: '/test-endpoint' },
      outputData: { headers: calledHeaders }
    });
  });
});
