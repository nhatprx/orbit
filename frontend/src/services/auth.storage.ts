import type { AuthSession } from '../types/auth.types';

const SESSION_KEY = 'orbit_auth_session';
const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.trim();

export const API_BASE_URL = (
  RAW_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '')
).replace(/\/+$/, '');

interface ApiErrorPayload {
  message?: string;
}

function readStorage(storage: Storage): AuthSession | null {
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getStoredSession(): AuthSession | null {
  return readStorage(localStorage) ?? readStorage(sessionStorage);
}

export function saveStoredSession(
  session: AuthSession,
  rememberMe: boolean
): AuthSession {
  const serialized = JSON.stringify(session);
  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, serialized);
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, serialized);
    localStorage.removeItem(SESSION_KEY);
  }
  return session;
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export async function postAuthJson<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const err = (await response.json()) as ApiErrorPayload;
      if (err.message) message = err.message;
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
