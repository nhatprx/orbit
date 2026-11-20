import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { linkedAccountService } from '../../services/workspace/services';
import { PRIMARY_PROFILE_ITEMS, SETTINGS_PROFILE_ITEMS } from '../dashboard/profileMenuItems';
import { AccountSettingsSection } from './AccountSettingsSection';

vi.mock('../../services/accountSecurity.service', () => ({
  accountSecurityService: {
    getSecurityStatus: vi.fn(),
    getActivitySummary: vi.fn(),
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
    vi.spyOn(linkedAccountService, 'listLinkedAccounts').mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('routes Profile Settings menu item to settings tab and omits separate Connected accounts item', () => {
    const settingsItem = SETTINGS_PROFILE_ITEMS.find((item) => item.label === 'Settings');
    expect(settingsItem?.section).toBe('settings');
    expect(settingsItem?.area).toBeUndefined();
    expect(PRIMARY_PROFILE_ITEMS.find((item) => item.label === 'Connected accounts')).toBeUndefined();
  });

  it('renders security cards collapsed by default and omits UsernameSettingsPanel', async () => {
    mockedService.getSecurityStatus.mockResolvedValue({
      email: 'nhat@orbit.dev',
      username: 'nhatprx',
      hasPassword: false,
      totpEnabled: false,
      backupCodesRemaining: 0,
      linkedProviders: ['google'],
    });

    render(<AccountSettingsSection />);
    await waitFor(() => expect(screen.getByText('Set account password')).toBeTruthy());

    expect(screen.queryByRole('button', { name: /Update username/i })).toBeNull();
    expect(screen.queryByText(/Set an account password above before enabling two-factor authentication/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Two-factor authentication/i }));
    await waitFor(() =>
      expect(screen.getByText(/Set an account password above before enabling two-factor authentication/i)).toBeTruthy()
    );
  });

  it('expands 2FA card, requires password for setup, renders QR code, and enables 2FA', async () => {
    mockedService.getSecurityStatus.mockResolvedValue({
      email: 'nhat@orbit.dev',
      username: 'nhatprx',
      hasPassword: true,
      totpEnabled: false,
      backupCodesRemaining: 0,
      linkedProviders: ['google'],
    });
    mockedService.beginTwoFactorSetup.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUri: 'otpauth://totp/Orbit:nhatprx?secret=JBSWY3DPEHPK3PXP&issuer=Orbit',
    });
    mockedService.enableTwoFactor.mockResolvedValue({
      enabled: true,
      backupCodes: ['AAAA-BBBB', 'CCCC-DDDD'],
    });

    render(<AccountSettingsSection />);

    await waitFor(() => expect(screen.getByText('Change password')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Two-factor authentication/i }));
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

  it('integrates Connected accounts inside Settings as a collapsible card', async () => {
    mockedService.getSecurityStatus.mockResolvedValue({
      email: 'nhat@orbit.dev',
      username: 'nhatprx',
      hasPassword: true,
      totpEnabled: false,
      backupCodesRemaining: 0,
      linkedProviders: [],
    });

    render(<AccountSettingsSection />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Connected accounts/i })).toBeTruthy());

    expect(screen.queryByText(/Connected Google and GitHub accounts/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Connected accounts/i }));
    await waitFor(() => expect(screen.getByText(/Connected Google and GitHub accounts/i)).toBeTruthy());
  });
});
