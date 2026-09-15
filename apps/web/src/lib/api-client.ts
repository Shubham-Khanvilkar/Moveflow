'use client';

const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');
export const API_BASE_URL = configuredApiUrl.replace(/\/api$/, '') + '/api';

const FETCH_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function withTimeout(signal: AbortSignal | undefined, ms: number): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  const merged = signal
    ? new AbortController()
    : controller;
  if (signal) {
    signal.addEventListener('abort', () => merged.abort(), { once: true });
    controller.addEventListener('abort', () => merged.abort(), { once: true });
  }
  return { controller: merged, timeoutId };
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { controller, timeoutId } = withTimeout(options.signal, FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);
      const body = await response.json().catch(() => null);
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (!response.ok) {
        const message = body?.message || body?.error || `Request failed (${response.status})`;
        throw new ApiError(response.status, Array.isArray(message) ? message.join(', ') : message, body);
      }
      return (body?.data !== undefined ? body.data : body) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err instanceof ApiError) throw err;
      if (err.name === 'AbortError') {
        if (attempt < MAX_RETRIES) continue;
        throw new ApiError(0, 'Request timed out. Please check your connection and try again.');
      }
      if (attempt < MAX_RETRIES) continue;
      throw err;
    }
  }
  throw lastError || new ApiError(0, 'Request failed');
}

export const apiGet = <T = unknown>(path: string) => apiRequest<T>(path);
export const apiPost = <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, {
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});

export function extractList(d: any): any[] {
  if (Array.isArray(d)) return d;
  const raw = d?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

export function extractFirst(d: any): any {
  if (Array.isArray(d)) return d[0];
  const raw = d?.data;
  if (Array.isArray(raw)) return raw[0];
  if (Array.isArray(raw?.data)) return raw.data[0];
  return raw || d;
}

export function extractData(d: any): any {
  const raw = d?.data;
  if (raw?.data !== undefined) return raw.data;
  return raw !== undefined ? raw : d;
}
