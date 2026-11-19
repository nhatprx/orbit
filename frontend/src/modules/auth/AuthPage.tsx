import { useState, type FormEvent } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import type {
  AuthSession,
  OAuthProvider,
  RegisterPayload,
} from '../../types/auth.types';
import { AuthOAuthButtons } from './AuthOAuthButtons';
import { RegisterForm } from './RegisterForm';

interface AuthPageProps {
  initialError?: string | null;
  onSuccess: (session: AuthSession) => void;
  onBackHome: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthPage({
  initialError = null,
  onSuccess,
  onBackHome,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await authService.login({ identifier, password });
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(payload: RegisterPayload) {
    setError(null);
    setLoading(true);
    try {
      const session = await authService.register(payload);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleOAuth(provider: OAuthProvider) {
    setError(null);
    setLoading(true);
    authService.startOAuthLogin(provider);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1117] px-4 py-12 text-[#E6EDF3]">
      <div className="w-full max-w-md border border-[#30363D] bg-[#161B22] p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#22C55E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to Home
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
            {mode === 'login' ? 'Sign In to Orbit' : 'Create Orbit Account'}
          </h1>
          <p className="mt-1 text-xs text-[#A3A3A3]">
            Access your Orbit developer workspace.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 border border-[#30363D]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-medium ${mode === 'login'
                ? 'bg-[#052E16] text-[#22C55E]'
                : 'bg-[#161B22] text-[#A3A3A3] hover:text-[#E6EDF3]'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`border-l border-[#30363D] py-2 text-xs font-medium ${mode === 'register'
                ? 'bg-[#052E16] text-[#22C55E]'
                : 'bg-[#161B22] text-[#A3A3A3] hover:text-[#E6EDF3]'
              }`}
          >
            Register
          </button>
        </div>

        <AuthOAuthButtons loading={loading} onSelectProvider={handleOAuth} />

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[#A3A3A3]">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@domain.com"
                className="w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-[#A3A3A3]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
              />
            </div>

            {error && (
              <div className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        ) : (
          <RegisterForm
            loading={loading}
            error={error}
            onSubmit={handleRegisterSubmit}
          />
        )}
      </div>
    </div>
  );
}
