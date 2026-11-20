import { useEffect, useRef, useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { PasswordInput } from './PasswordInput';
import { isAbortError } from './useAuthPageLifecycle';

interface ResetPasswordStepProps {
  onSuccess: (message: string) => void;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function ResetPasswordStep({ onSuccess }: ResetPasswordStepProps) {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Reset token is required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    try {
      const result = await authService.resetPassword(
        token,
        newPassword,
        controller.signal
      );
      if (requestIdRef.current !== requestId) return;
      onSuccess(
        result.message || 'Password updated. Sign in with your new password.'
      );
    } catch (err) {
      if (requestIdRef.current !== requestId || isAbortError(err)) return;
      setError(
        err instanceof Error ? err.message : 'Unable to reset password.'
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="reset-token"
          className="mb-1 block text-xs text-[#A3A3A3]"
        >
          Reset Token
        </label>
        <input
          id="reset-token"
          type="text"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your reset token"
          className={`${INPUT_CLASS} font-mono`}
        />
      </div>

      <div>
        <label
          htmlFor="reset-new-password"
          className="mb-1 block text-xs text-[#A3A3A3]"
        >
          New Password
        </label>
        <PasswordInput
          id="reset-new-password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="reset-confirm-password"
          className="mb-1 block text-xs text-[#A3A3A3]"
        >
          Confirm New Password
        </label>
        <PasswordInput
          id="reset-confirm-password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your new password"
        />
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
        <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
        {loading ? 'Updating Password...' : 'Reset Password'}
      </Button>
    </form>
  );
}
