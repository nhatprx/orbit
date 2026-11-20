import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Check, Copy } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { TwoFactorSetupResponse } from '../../types/auth.types';

interface TwoFactorSetupBoxProps {
  setup: TwoFactorSetupResponse;
  busy: boolean;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function TwoFactorSetupBox({ setup, busy, onVerify, onCancel }: TwoFactorSetupBoxProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toString(setup.otpauthUri, {
      type: 'svg',
      margin: 1,
      width: 176,
      color: { dark: '#0D1117', light: '#FFFFFF' },
    })
      .then((svg) => {
        if (active) setQrSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });
    return () => {
      active = false;
    };
  }, [setup.otpauthUri]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onVerify(code.trim());
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(setup.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-[#30363D] bg-[#0D1117] p-4">
      <p className="text-xs font-medium text-[#E6EDF3]">
        1. Scan this QR code with Google Authenticator, Authy, or 1Password:
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-44 w-44 shrink-0 items-center justify-center border border-[#30363D] bg-white p-2">
          {qrSrc ? (
            <img src={qrSrc} alt="2FA QR Code" className="h-full w-full" />
          ) : (
            <span className="text-[11px] text-[#0D1117]">Generating QR...</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-[#8B949E]">Or enter this setup key manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all border border-[#30363D] bg-[#161B22] px-3 py-2 font-mono text-xs text-[#22C55E]">
              {setup.secret}
            </code>
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              {copiedSecret ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedSecret ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-[11px] text-[#7D8590]">Time-based (TOTP), 6 digits, 30-second interval.</p>
        </div>
      </div>

      <div className="max-w-xs">
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
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
