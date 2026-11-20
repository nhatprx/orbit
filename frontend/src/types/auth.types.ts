export type UserRole = 'admin' | 'user';
export type OAuthProvider = 'google' | 'github';
export type AccountStatus = 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';

export interface AuthUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  country?: string;
  emailPreference?: boolean;
  role: UserRole;
  workspaceId: string;
  avatarUrl?: string | null;
  bio?: string | null;
  introduction?: string | null;
  organization?: string | null;
  location?: string | null;
  website?: string | null;
  activeStatusEnabled?: boolean;
  activeStatus?: AccountStatus;
  pinnedProjectIds?: string[];
  createdAt?: string | null;
}

export interface UserActivitySummary {
  workspaceCount: number;
  projectCount: number;
  messagesTotal: number;
  messagesLast30Days: number;
  activeDaysLast30Days: number;
  lastActiveAt: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  expiresAt: string;
}

export interface AuthLoginResponse {
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: string | null;
  expiresIn: number;
  mfaRequired?: boolean;
  mfaToken?: string | null;
}

export interface AccountSecurityStatus {
  email: string;
  username: string;
  hasPassword: boolean;
  totpEnabled: boolean;
  backupCodesRemaining: number;
  linkedProviders: string[];
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUri: string;
}

export interface TwoFactorEnableResponse {
  enabled: boolean;
  backupCodes: string[];
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
