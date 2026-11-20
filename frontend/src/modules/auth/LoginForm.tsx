import { useState, type FormEvent } from 'react';
import { Check, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { LoginPayload } from '../../types/auth.types';

interface LoginFormProps {
  loading: boolean;
  error: string | null;
  notice: string | null;
  onSubmit: (payload: LoginPayload) => Promise<void>;
  onForgotPassword: () => void;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function LoginForm({
  loading,
  error,
  notice,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ identifier, password, rememberMe });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {notice && (
        <div className="rounded-none border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#22C55E]">
          {notice}
        </div>
      )}

      <div>
        <label
          htmlFor="login-identifier"
          className="mb-1 block text-xs text-[#A3A3A3]"
        >
          Username or Email
        </label>
        <input
          id="login-identifier"
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@domain.com"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-xs text-[#A3A3A3]"
        >
          Password
        </label>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-[#A3A3A3] hover:text-[#E6EDF3]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 items-center justify-center rounded-none border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#22C55E] ${rememberMe
              ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
              : 'border-[#3B434B] bg-[#0D1117] text-transparent'
              }`}
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
          <span>Remember me</span>
        </label>

        <button
          type="button"
          onClick={onForgotPassword}
          className="rounded-none text-xs text-[#A3A3A3] transition-colors hover:text-[#22C55E] focus:outline-none focus-visible:underline"
        >
          Forgot password?
        </button>
      </div>

      {error && (
        <div className="rounded-none border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={loading}
        className="w-full rounded-none"
      >
        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
        {loading ? 'Authenticating...' : 'Sign In'}
      </Button>
    </form>
  );
}
