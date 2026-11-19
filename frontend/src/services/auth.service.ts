import { MOCK_USERS } from '../mocks/auth.mock';
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  UserRole,
} from '../types/auth.types';

const SESSION_KEY = 'orbit_phase1_session';

export interface IAuthService {
  getSession(): AuthSession | null;
  login(payload: LoginPayload): Promise<AuthSession>;
  register(payload: RegisterPayload): Promise<AuthSession>;
  loginAsDemoRole(role: UserRole): Promise<AuthSession>;
  logout(): Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveSession(session: AuthSession): AuthSession {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

class MockAuthService implements IAuthService {
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
    await delay(200);
    const email = payload.email.trim().toLowerCase();
    const record = MOCK_USERS.find((item) => item.user.email === email);

    if (!record || record.password !== payload.password) {
      throw new Error('Invalid email or password.');
    }

    return saveSession({
      user: record.user,
      accessToken: `mock_jwt_${record.user.role}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    await delay(220);
    const email = payload.email.trim().toLowerCase();
    if (!email || !payload.name.trim() || payload.password.length < 6) {
      throw new Error('Name, valid email, and password (min 6 chars) are required.');
    }

    return saveSession({
      user: {
        id: `usr_${Date.now()}`,
        name: payload.name.trim(),
        email,
        role: payload.role,
        workspaceId: 'ws_orbit_core',
      },
      accessToken: `mock_jwt_${payload.role}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
  }

  async loginAsDemoRole(role: UserRole): Promise<AuthSession> {
    await delay(150);
    const record = MOCK_USERS.find((item) => item.user.role === role);
    if (!record) {
      throw new Error(`Demo user for role "${role}" not found.`);
    }
    return saveSession({
      user: record.user,
      accessToken: `mock_jwt_${role}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
  }

  async logout(): Promise<void> {
    await delay(100);
    localStorage.removeItem(SESSION_KEY);
  }
}

export const authService: IAuthService = new MockAuthService();
