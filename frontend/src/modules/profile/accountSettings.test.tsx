import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { SETTINGS_PROFILE_ITEMS } from '../dashboard/profileMenuItems';
import { AccountSettingsSection } from './AccountSettingsSection';

vi.mock('../../services/accountSecurity.service', () => ({
  accountSecurityService: {
    getSecurityStatus: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    beginTwoFactorSetup: vi.fn(),
    enableTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
    regenerateBackupCodes: vi.fn(),
  },
}));

const mockedService = vi.mocked(accountSecurityService);

describe('AccountSettingsSection and Profile Settings Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('routes Profile Settings menu item to account settings tab instead of workspace settings', () => {
    const settingsItem = SETTINGS_PROFILE_ITEMS.find((item) => item.label === 'Settings');
    expect(settingsItem?.section).toBe('settings');
    expect(settingsItem?.area).toBeUndefined();
  });

  it('guides OAuth-only user to set a password before enabling 2FA', async () => {
    mockedService.getSecurityStatus.mockResolvedValue({
      email: 'nhat@orbit.dev',
      username: 'nhatprx',
      hasPassword: false,
      totpEnabled: false,
      backupCodesRemaining: 0,
      linkedProviders: ['google'],
    });

    render(<AccountSettingsSection />);
    await waitFor(() =>
      expect(screen.getByText(/Set an account password above before enabling two-factor authentication/i)).toBeTruthy()
    );
  });

  it('updates username, requires password for 2FA setup, renders QR code, and enables 2FA', async () => {
    const onUserUpdated = vi.fn();
    mockedService.getSecurityStatus.mockResolvedValue({
      email: 'nhat@orbit.dev',
      username: 'nhatprx',
      hasPassword: true,
      totpEnabled: false,
      backupCodesRemaining: 0,
      linkedProviders: ['google'],
    });
    mockedService.updateProfile.mockResolvedValue({
      id: 'u-1',
      name: 'Nhat',
      username: 'nhat_dev',
      email: 'nhat@orbit.dev',
      role: 'user',
      workspaceId: 'ws_orbit_core',
    });
    mockedService.beginTwoFactorSetup.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/Orbit:nhatprx?secret=JBSWY3DPEHPK3PXP&issuer=Orbit',
    });
    mockedService.enableTwoFactor.mockResolvedValue({
      enabled: true,
      backupCodes: ['AAAA-BBBB', 'CCCC-DDDD'],
    });

    render(<AccountSettingsSection onUserUpdated={onUserUpdated} />);

    await waitFor(() => expect(screen.getByText('Change password')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Nhat_Dev' } });
    fireEvent.click(screen.getByRole('button', { name: /Update username/i }));
    await waitFor(() => expect(mockedService.updateProfile).toHaveBeenCalledWith({ username: 'nhat_dev' }));
    expect(onUserUpdated).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
    fireEvent.change(screen.getByLabelText('Account password'), { target: { value: 'Orbit@2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => expect(mockedService.beginTwoFactorSetup).toHaveBeenCalledWith('Orbit@2026'));
    await waitFor(() => expect(screen.getByAltText('2FA QR Code')).toBeTruthy());
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Enter the 6-digit code/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Enable/i }));

    await waitFor(() => expect(mockedService.enableTwoFactor).toHaveBeenCalledWith('Orbit@2026', '123456'));
    await waitFor(() => expect(screen.getByText('AAAA-BBBB')).toBeTruthy());
    expect(screen.getByText('CCCC-DDDD')).toBeTruthy();
  });
});
