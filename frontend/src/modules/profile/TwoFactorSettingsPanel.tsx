import { useState, type FormEvent } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { useNoticeToast } from '../../components/ui/useNoticeToast';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { TwoFactorSetupResponse } from '../../types/auth.types';
import { PasswordInput } from '../auth/PasswordInput';
import { BackupCodesBox } from './BackupCodesBox';
import { TwoFactorManageBox } from './TwoFactorManageBox';
import { TwoFactorSetupBox } from './TwoFactorSetupBox';

interface TwoFactorSettingsPanelProps {
  hasPassword: boolean;
  totpEnabled: boolean;
  backupCodesRemaining: number;
  onUpdated: () => void;
}

export function TwoFactorSettingsPanel({
  hasPassword,
  totpEnabled,
  backupCodesRemaining,
  onUpdated,
}: TwoFactorSettingsPanelProps) {
  const [step, setStep] = useState<'idle' | 'confirm-password' | 'scan-qr'>('idle');
  const [setupPassword, setSetupPassword] = useState('');
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useNoticeToast(notice, 'success');

  async function handleConfirmPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await accountSecurityService.beginTwoFactorSetup(setupPassword);
      setSetup(res);
      setStep('scan-qr');
    } catch (err) {
      setError(errorMessage(err, 'Password verification failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnable(code: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await accountSecurityService.enableTwoFactor(setupPassword, code);
      setSetup(null);
      setSetupPassword('');
      setStep('idle');
      setBackupCodes(res.backupCodes);
      setNotice('Two-factor authentication is now enabled.');
      onUpdated();
    } catch (err) {
      setError(errorMessage(err, 'Invalid verification code.'));
    } finally {
      setBusy(false);
    }
  }

  function handleCancelSetup() {
    setStep('idle');
    setSetup(null);
    setSetupPassword('');
    setError(null);
  }

  return (
    <CollapsibleCard
      title="Two-factor authentication (2FA)"
      description="Protect your account with a TOTP authenticator app such as Google Authenticator or 1Password."
      icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
      badge={
        <Badge tone={totpEnabled ? 'green' : 'neutral'} withDot>
          {totpEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      }
      defaultOpen={false}
    >
      <div className="space-y-4">
        {backupCodes && <BackupCodesBox codes={backupCodes} onDismiss={() => setBackupCodes(null)} />}

        {!totpEnabled && !hasPassword && (
          <p className="border border-[#30363D] bg-[#0D1117] px-3 py-2 text-xs text-[#A3A3A3]">
            Set an account password above before enabling two-factor authentication.
          </p>
        )}

        {!totpEnabled && hasPassword && step === 'idle' && (
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() => { setError(null); setNotice(null); setStep('confirm-password'); }}
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            Enable 2FA
          </Button>
        )}

        {!totpEnabled && step === 'confirm-password' && (
          <form onSubmit={handleConfirmPassword} className="max-w-md space-y-3 border border-[#30363D] bg-[#0D1117] p-4">
            <p className="text-xs text-[#E6EDF3]">
              Confirm your account password to generate a 2FA QR code.
            </p>
            <div>
              <label htmlFor="setup-2fa-password" className="mb-1 block text-xs text-[#A3A3A3]">
                Account password
              </label>
              <PasswordInput
                id="setup-2fa-password"
                required
                autoComplete="current-password"
                value={setupPassword}
                onChange={setSetupPassword}
                placeholder="Enter your password"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {busy ? 'Verifying...' : 'Continue'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelSetup}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!totpEnabled && step === 'scan-qr' && setup && (
          <TwoFactorSetupBox
            setup={setup}
            busy={busy}
            onVerify={handleEnable}
            onCancel={handleCancelSetup}
          />
        )}

        {totpEnabled && (
          <TwoFactorManageBox
            hasPassword={hasPassword}
            backupCodesRemaining={backupCodesRemaining}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setNotice={setNotice}
            onBackupCodes={setBackupCodes}
            onUpdated={onUpdated}
          />
        )}

        {error && (
          <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
            {error}
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
}
