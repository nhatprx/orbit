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
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export type LoginRequest = LoginPayload;

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  country: string;
  emailPreference: boolean;
}
