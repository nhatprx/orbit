export type UserRole = 'admin' | 'user';
export type OAuthProvider = 'google' | 'github';

export interface AuthUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  country?: string;
  emailPreference?: boolean;
  role: UserRole;
  workspaceId: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  country: string;
  emailPreference: boolean;
}
