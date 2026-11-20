import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import { ResetPasswordStep } from './ResetPasswordStep';
import { isAbortError } from './useAuthPageLifecycle';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onResetSuccess: (message: string) => void;
}

type ResetStep = 'request' | 'reset';

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function ForgotPasswordForm({
  onBackToLogin,
  onResetSuccess,
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
    };
  }, []);

  function goToResetStep() {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setError(null);
    setStep('reset');
  }

  async function handleRequestSubmit(event: FormEvent) {
    event.preventDefault();
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setError(null);
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email, controller.signal);
      if (requestIdRef.current !== requestId) return;
      setRequestNotice(
        result.message ||
          'If an account exists for that email, a password reset token has been issued.'
      );
    } catch (err) {
      if (requestIdRef.current !== requestId || isAbortError(err)) return;
      setError(
        err instanceof Error ? err.message : 'Unable to request password reset.'
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-none border border-[#30363D] font-mono text-[11px] uppercase tracking-wider">
        <div
          className={`px-3 py-1.5 text-center ${
            step === 'request'
              ? 'bg-[#052E16] text-[#22C55E]'
              : 'bg-[#0D1117] text-[#666666]'
          }`}
        >
          1. Request Reset
        </div>
        <div
          className={`border-l border-[#30363D] px-3 py-1.5 text-center ${
            step === 'reset'
              ? 'bg-[#052E16] text-[#22C55E]'
              : 'bg-[#0D1117] text-[#666666]'
          }`}
        >
          2. Reset Password
        </div>
      </div>

      {step === 'request' ? (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1 block text-xs text-[#A3A3A3]"
            >
              Account Email
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className={INPUT_CLASS}
            />
          </div>

          {requestNotice && (
            <div className="space-y-3 rounded-none border border-[#22C55E] bg-[#052E16] p-3 text-xs text-[#22C55E]">
              <p>{requestNotice}</p>
              <Button
                type="button"
                variant="primary"
                onClick={goToResetStep}
                className="w-full rounded-none"
              >
                Enter reset token
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-none border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          {!requestNotice && (
            <>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full rounded-none"
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                {loading ? 'Sending Request...' : 'Request Password Reset'}
              </Button>
              <button
                type="button"
                onClick={goToResetStep}
                className="w-full rounded-none border border-[#30363D] bg-[#0D1117] py-2 text-xs text-[#A3A3A3] transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
              >
                Already have a reset token?
              </button>
            </>
          )}
        </form>
      ) : (
        <ResetPasswordStep onSuccess={onResetSuccess} />
      )}

      <div className="border-t border-[#30363D] pt-3">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 rounded-none text-xs text-[#A3A3A3] transition-colors hover:text-[#22C55E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
