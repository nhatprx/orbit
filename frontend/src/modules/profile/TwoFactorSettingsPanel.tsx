import { useState, type FormEvent } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { TwoFactorSetupResponse } from '../../types/auth.types';
import { BackupCodesBox } from './BackupCodesBox';
import { TwoFactorManageBox } from './TwoFactorManageBox';

interface TwoFactorSettingsPanelProps {
  hasPassword: boolean;
  totpEnabled: boolean;
  backupCodesRemaining: number;
  onUpdated: () => void;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function TwoFactorSettingsPanel({
  hasPassword,
  totpEnabled,
  backupCodesRemaining,
  onUpdated,
}: TwoFactorSettingsPanelProps) {
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleStartSetup() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      setSetup(await accountSecurityService.beginTwoFactorSetup());
    } catch (err) {
      setError(errorMessage(err, 'Unable to start 2FA setup.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnable(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await accountSecurityService.enableTwoFactor(code.trim());
      setSetup(null);
      setCode('');
      setBackupCodes(res.backupCodes);
      setNotice('Two-factor authentication is now enabled.');
      onUpdated();
    } catch (err) {
      setError(errorMessage(err, 'Invalid verification code.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Two-factor authentication (2FA)"
      description="Protect your account with a TOTP authenticator app such as Google Authenticator, Authy, or 1Password."
      actions={
        <Badge tone={totpEnabled ? 'green' : 'neutral'} withDot>
          {totpEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      }
    >
      <div className="space-y-4">
        {backupCodes && <BackupCodesBox codes={backupCodes} onDismiss={() => setBackupCodes(null)} />}

        {!totpEnabled && !setup && (
          <Button type="button" variant="primary" disabled={busy} onClick={() => void handleStartSetup()}>
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            {busy ? 'Preparing...' : 'Enable 2FA'}
          </Button>
        )}

        {!totpEnabled && setup && (
          <form onSubmit={handleEnable} className="max-w-lg space-y-4 border border-[#30363D] bg-[#0D1117] p-4">
            <p className="text-xs text-[#E6EDF3]">
              1. Add this setup key to your authenticator app (Time-based, 6 digits, 30s):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all border border-[#30363D] bg-[#161B22] px-3 py-2 font-mono text-xs text-[#22C55E]">
                {setup.secret}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(setup.secret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
              >
                {copiedSecret ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSecret ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="break-all font-mono text-[11px] text-[#7D8590]">URI: {setup.otpauthUri}</p>

            <div>
              <label htmlFor="totp-verify-code" className="mb-1 block text-xs text-[#A3A3A3]">
                2. Enter the 6-digit code from your authenticator app
              </label>
              <input
                id="totp-verify-code"
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? 'Verifying...' : 'Verify & Enable'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setSetup(null); setCode(''); }}>
                Cancel
              </Button>
            </div>
          </form>
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
        {notice && (
          <p role="status" className="border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#22C55E]">
            {notice}
          </p>
        )}
      </div>
    </Panel>
  );
}
