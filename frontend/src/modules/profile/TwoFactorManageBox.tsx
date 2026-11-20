import { useState, type FormEvent } from 'react';
import { RefreshCw, ShieldOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { errorMessage } from '../../services/workspace/httpClient';
import { PasswordInput } from '../auth/PasswordInput';

interface TwoFactorManageBoxProps {
  hasPassword: boolean;
  backupCodesRemaining: number;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string | null) => void;
  setNotice: (value: string | null) => void;
  onBackupCodes: (codes: string[] | null) => void;
  onUpdated: () => void;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function TwoFactorManageBox({
  hasPassword,
  backupCodesRemaining,
  busy,
  setBusy,
  setError,
  setNotice,
  onBackupCodes,
  onUpdated,
}: TwoFactorManageBoxProps) {
  const [mode, setMode] = useState<'idle' | 'disable' | 'regen'>('idle');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegenerate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await accountSecurityService.regenerateBackupCodes(code.trim());
      setMode('idle');
      setCode('');
      onBackupCodes(res.backupCodes);
      setNotice('Backup codes regenerated. Previous codes are invalidated.');
      onUpdated();
    } catch (err) {
      setError(errorMessage(err, 'Failed to regenerate backup codes.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await accountSecurityService.disableTwoFactor(
        hasPassword ? password : null,
        code.trim()
      );
      setMode('idle');
      setPassword('');
      setCode('');
      onBackupCodes(null);
      setNotice(res.message);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err, 'Failed to disable 2FA.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8B949E]">
        Recovery backup codes remaining:{' '}
        <span className="font-mono font-semibold text-[#E6EDF3]">{backupCodesRemaining}</span>
      </p>

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => { setMode('regen'); setError(null); }}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Regenerate backup codes
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="border-[#EF4444] text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]"
            onClick={() => { setMode('disable'); setError(null); }}
          >
            <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.5} />
            Disable 2FA
          </Button>
        </div>
      )}

      {mode === 'regen' && (
        <form onSubmit={handleRegenerate} className="max-w-md space-y-3 border border-[#30363D] bg-[#0D1117] p-4">
          <label htmlFor="regen-code" className="block text-xs text-[#A3A3A3]">
            Enter current 6-digit authenticator code to generate new backup codes
          </label>
          <input
            id="regen-code"
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className={INPUT_CLASS}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={busy}>Generate new codes</Button>
            <Button type="button" variant="secondary" onClick={() => { setMode('idle'); setCode(''); }}>Cancel</Button>
          </div>
        </form>
      )}

      {mode === 'disable' && (
        <form onSubmit={handleDisable} className="max-w-md space-y-3 border border-[#EF4444] bg-[#0D1117] p-4">
          {hasPassword && (
            <div>
              <label htmlFor="disable-2fa-pw" className="mb-1 block text-xs text-[#A3A3A3]">
                Account password
              </label>
              <PasswordInput
                id="disable-2fa-pw"
                required
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
              />
            </div>
          )}
          <div>
            <label htmlFor="disable-2fa-code" className="mb-1 block text-xs text-[#A3A3A3]">
              Authenticator or backup code
            </label>
            <input
              id="disable-2fa-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456 or XXXX-XXXX"
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="secondary"
              className="border-[#EF4444] text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]"
              disabled={busy}
            >
              Confirm disable
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setMode('idle'); setPassword(''); setCode(''); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
