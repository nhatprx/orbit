import type {
  AccountSecurityStatus,
  AuthUser,
  TwoFactorEnableResponse,
  TwoFactorSetupResponse,
} from '../types/auth.types';
import { apiRequest } from './workspace/httpClient';

export interface UpdateAccountProfilePayload {
  username?: string;
  displayName?: string;
}

export interface AccountSecurityService {
  getSecurityStatus(): Promise<AccountSecurityStatus>;
  updateProfile(payload: UpdateAccountProfilePayload): Promise<AuthUser>;
  changePassword(currentPassword: string | null, newPassword: string): Promise<{ message: string }>;
  beginTwoFactorSetup(password: string): Promise<TwoFactorSetupResponse>;
  enableTwoFactor(password: string, code: string): Promise<TwoFactorEnableResponse>;
  disableTwoFactor(password: string | null, code: string): Promise<{ message: string }>;
  regenerateBackupCodes(code: string): Promise<TwoFactorEnableResponse>;
}

export const accountSecurityService: AccountSecurityService = {
  getSecurityStatus() {
    return apiRequest<AccountSecurityStatus>('GET', '/api/v1/auth/account/security');
  },

  updateProfile(payload) {
    return apiRequest<AuthUser>('PATCH', '/api/v1/auth/account/profile', {
      body: payload,
    });
  },

  changePassword(currentPassword, newPassword) {
    return apiRequest<{ message: string }>('POST', '/api/v1/auth/account/password', {
      body: { currentPassword, newPassword },
    });
  },

  beginTwoFactorSetup(password) {
    return apiRequest<TwoFactorSetupResponse>('POST', '/api/v1/auth/account/2fa/setup', {
      body: { password },
    });
  },

  enableTwoFactor(password, code) {
    return apiRequest<TwoFactorEnableResponse>('POST', '/api/v1/auth/account/2fa/enable', {
      body: { password, code },
    });
  },

  disableTwoFactor(password, code) {
    return apiRequest<{ message: string }>('POST', '/api/v1/auth/account/2fa/disable', {
      body: { password, code },
    });
  },

  regenerateBackupCodes(code) {
    return apiRequest<TwoFactorEnableResponse>(
      'POST',
      '/api/v1/auth/account/2fa/backup-codes/regenerate',
      { body: { code } }
    );
  },
};
