import {
  validateStrongPassword,
  validateUsernameFormat,
} from '../modules/auth/passwordPolicy';
import type {
  AuthSession,
  LoginPayload,
  OAuthProvider,
  RegisterPayload,
} from '../types/auth.types';

const SESSION_KEY = 'orbit_auth_session';
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8080';

export interface IAuthService {
  getSession(): AuthSession | null;
  login(payload: LoginPayload): Promise<AuthSession>;
  register(payload: RegisterPayload): Promise<AuthSession>;
  startOAuthLogin(provider: OAuthProvider): void;
  exchangeOAuthCode(code: string): Promise<AuthSession>;
  logout(): Promise<void>;
}

interface ApiErrorPayload {
  message?: string;
}

function saveSession(session: AuthSession): AuthSession {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
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

class HttpAuthService implements IAuthService {
  getSession(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async login(payload: LoginPayload): Promise<AuthSession> {
    const identifier = payload.identifier.trim();
    if (!identifier || !payload.password) {
      throw new Error('Username/email and password are required.');
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: payload.password }),
    });

    const session = await parseJsonOrThrow<AuthSession>(response);
    return saveSession(session);
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const usernameError = validateUsernameFormat(payload.username);
    if (usernameError) throw new Error(usernameError);

    const passwordError = validateStrongPassword(payload.password);
    if (passwordError) throw new Error(passwordError);

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        username: payload.username.trim().toLowerCase(),
        password: payload.password,
        country: payload.country,
        emailPreference: payload.emailPreference,
      }),
    });

    const session = await parseJsonOrThrow<AuthSession>(response);
    return saveSession(session);
  }

  startOAuthLogin(provider: OAuthProvider): void {
    window.location.assign(`${API_BASE_URL}/oauth2/authorization/${provider}`);
  }

  async exchangeOAuthCode(code: string): Promise<AuthSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const session = await parseJsonOrThrow<AuthSession>(response);
    return saveSession(session);
  }

  async logout(): Promise<void> {
    const current = this.getSession();
    localStorage.removeItem(SESSION_KEY);
    if (!current) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${current.accessToken}` },
      });
    } catch {
      // client session already cleared
    }
  }
}

export const authService: IAuthService = new HttpAuthService();
