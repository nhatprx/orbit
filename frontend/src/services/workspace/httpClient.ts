import { API_BASE_URL, clearStoredSession, getStoredSession } from '../auth.storage';
import type { ApiErrorEnvelope, ApiFieldError } from '../../types/workspace.types';

export const SESSION_EXPIRED_EVENT = 'orbit:session-expired';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiFieldError[];

  constructor(status: number, code: string, message: string, details: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Set false for public endpoints (for example invitation preview). */
  auth?: boolean;
}

/** Encodes a dynamic path segment. */
export function seg(value: string): string {
  return encodeURIComponent(value);
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const envelope = (await response.json()) as Partial<ApiErrorEnvelope>;
    return new ApiError(
      response.status,
      envelope.code ?? 'HTTP_ERROR',
      envelope.message ?? `Request failed (${response.status}).`,
      envelope.details ?? []
    );
  } catch {
    return new ApiError(response.status, 'HTTP_ERROR', `Request failed (${response.status}).`);
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = options.auth === false ? null : (getStoredSession()?.accessToken ?? null);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the Orbit server. Check your connection and retry.');
  }

  if (response.status === 401 && token) {
    clearStoredSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  // The API contract (docs/API_WORKSPACE.md) is the single trust boundary for response shapes.
  return (text ? JSON.parse(text) : undefined) as T;
}
