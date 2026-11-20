import {
  validateStrongPassword,
  validateUsernameFormat,
} from '../modules/auth/passwordPolicy';
import type {
  AuthLoginResponse,
  AuthSession,
  ForgotPasswordResponse,
  LoginPayload,
  OAuthProvider,
  RegisterPayload,
  ResetPasswordResponse,
} from '../types/auth.types';
import {
  API_BASE_URL,
  clearStoredSession,
  getStoredSession,
  postAuthJson,
  saveStoredSession,
} from './auth.storage';

export interface IAuthService {
  getSession(): AuthSession | null;
  getStoredToken(): string | null;
  clearToken(): void;
  login(payload: LoginPayload, signal?: AbortSignal): Promise<AuthLoginResponse>;
  completeMfaLogin(mfaToken: string, code: string, signal?: AbortSignal): Promise<AuthSession>;
  register(payload: RegisterPayload, signal?: AbortSignal): Promise<AuthSession>;
  forgotPassword(email: string, signal?: AbortSignal): Promise<ForgotPasswordResponse>;
  resetPassword(
    token: string,
    newPassword: string,
    signal?: AbortSignal
  ): Promise<ResetPasswordResponse>;
  startOAuthLogin(provider: OAuthProvider): void;
  exchangeOAuthCode(code: string): Promise<AuthLoginResponse>;
  logout(): Promise<void>;
}

class HttpAuthService implements IAuthService {
  getSession(): AuthSession | null {
    return getStoredSession();
  }

  getStoredToken(): string | null {
    return getStoredSession()?.accessToken ?? null;
  }

  clearToken(): void {
    clearStoredSession();
  }

  async login(payload: LoginPayload, signal?: AbortSignal): Promise<AuthLoginResponse> {
    const identifier = payload.identifier.trim();
    if (!identifier || !payload.password) {
      throw new Error('Username/email and password are required.');
    }

    const rememberMe = Boolean(payload.rememberMe);
    const res = await postAuthJson<AuthLoginResponse>(
      '/api/v1/auth/login',
      { identifier, password: payload.password, rememberMe },
      signal
    );
    if (!res.mfaRequired && res.user && res.accessToken && res.expiresAt) {
      saveStoredSession(
        { user: res.user, accessToken: res.accessToken, expiresAt: res.expiresAt },
        rememberMe
      );
    }
    return res;
  }

  async completeMfaLogin(
    mfaToken: string,
    code: string,
    signal?: AbortSignal
  ): Promise<AuthSession> {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new Error('Verification code is required.');
    }
    const session = await postAuthJson<AuthSession>(
      '/api/v1/auth/login/2fa',
      { mfaToken, code: trimmedCode },
      signal
    );
    return saveStoredSession(session, true);
  }

  async register(
    payload: RegisterPayload,
    signal?: AbortSignal
  ): Promise<AuthSession> {
    const usernameError = validateUsernameFormat(payload.username);
    if (usernameError) throw new Error(usernameError);

    const passwordError = validateStrongPassword(payload.password);
    if (passwordError) throw new Error(passwordError);

    const session = await postAuthJson<AuthSession>(
      '/api/v1/auth/register',
      {
        email: payload.email.trim().toLowerCase(),
        username: payload.username.trim().toLowerCase(),
        password: payload.password,
        country: payload.country,
        emailPreference: payload.emailPreference,
      },
      signal
    );
    return saveStoredSession(session, true);
  }

  async forgotPassword(
    email: string,
    signal?: AbortSignal
  ): Promise<ForgotPasswordResponse> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new Error('Email address is required.');
    }
    return postAuthJson<ForgotPasswordResponse>(
      '/api/v1/auth/forgot-password',
      { email: normalized },
      signal
    );
  }

  async resetPassword(
    token: string,
    newPassword: string,
    signal?: AbortSignal
  ): Promise<ResetPasswordResponse> {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      throw new Error('Reset token is required.');
    }
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters.');
    }
    return postAuthJson<ResetPasswordResponse>(
      '/api/v1/auth/reset-password',
      { token: trimmedToken, newPassword },
      signal
    );
  }

  startOAuthLogin(provider: OAuthProvider): void {
    window.location.assign(`${API_BASE_URL}/oauth2/authorization/${provider}`);
  }

  async exchangeOAuthCode(code: string): Promise<AuthLoginResponse> {
    const res = await postAuthJson<AuthLoginResponse>('/api/v1/auth/oauth/exchange', {
      code,
    });
    if (!res.mfaRequired && res.user && res.accessToken && res.expiresAt) {
      saveStoredSession(
        { user: res.user, accessToken: res.accessToken, expiresAt: res.expiresAt },
        true
      );
    }
    return res;
  }

  async logout(): Promise<void> {
    const current = this.getSession();
    clearStoredSession();
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
