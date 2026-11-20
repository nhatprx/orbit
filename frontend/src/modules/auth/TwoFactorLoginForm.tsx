import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface TwoFactorLoginFormProps {
  loading: boolean;
  error: string | null;
  onSubmit: (code: string) => Promise<void>;
  onBackToLogin: () => void;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function TwoFactorLoginForm({
  loading,
  error,
  onSubmit,
  onBackToLogin,
}: TwoFactorLoginFormProps) {
  const [code, setCode] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(code);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="mfa-code" className="mb-1 block text-xs text-[#A3A3A3]">
          Authenticator or backup code
        </label>
        <input
          id="mfa-code"
          type="text"
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456 or XXXX-XXXX"
          className={INPUT_CLASS}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-none border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" disabled={loading} className="w-full rounded-none">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
        {loading ? 'Verifying...' : 'Verify & Sign In'}
      </Button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full text-center text-xs text-[#A3A3A3] hover:text-[#22C55E]"
      >
        Back to Sign In
      </button>
    </form>
  );
}
