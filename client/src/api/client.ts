/** Base URL for the backend API. Behind nginx (or the Vite dev proxy) `/api` resolves. */
export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

/** Error thrown for any non-2xx API response, carrying the RFC 7807 problem details. */
export class ApiError extends Error {
  /** HTTP status code. */
  readonly status: number;
  /** Stable machine-readable error code (e.g. `auth.invalid_credentials`). */
  readonly code: string;
  /** Per-field validation errors, when present. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Bearer access token for authenticated requests. */
  token?: string | null;
  signal?: AbortSignal;
}

/**
 * Thin typed wrapper around `fetch`. Serialises JSON, attaches the bearer token,
 * and converts problem-details error responses into a typed {@link ApiError}.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    credentials: 'omit',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const problem = (data ?? {}) as ProblemDetails;
    throw new ApiError(
      response.status,
      problem.code ?? problem.title ?? 'error.unknown',
      problem.detail ?? problem.title ?? 'Request failed',
      problem.errors,
    );
  }

  return data as T;
}
