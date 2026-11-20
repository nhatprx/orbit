import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type {
  AuthSession,
  LoginPayload,
  OAuthProvider,
  RegisterPayload,
} from '../../types/auth.types';
import { AuthOAuthButtons } from './AuthOAuthButtons';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthPageProps {
  initialError?: string | null;
  onSuccess: (session: AuthSession) => void;
  onBackHome: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const MODE_COPY: Record<AuthMode, { title: string; subtitle: string }> = {
  login: {
    title: 'Sign In to Orbit',
    subtitle: 'Access your Orbit developer workspace.',
  },
  register: {
    title: 'Create Orbit Account',
    subtitle: 'Access your Orbit developer workspace.',
  },
  forgot: {
    title: 'Reset Your Password',
    subtitle: 'Request a reset token and choose a new password.',
  },
};

export function AuthPage({
  initialError = null,
  onSuccess,
  onBackHome,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleLoginSubmit(payload: LoginPayload) {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const session = await authService.login(payload);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(payload: RegisterPayload) {
    setError(null);
    setNotice(null);
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
    setNotice(null);
    setLoading(true);
    authService.startOAuthLogin(provider);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D1117] px-4 py-12 text-[#E6EDF3]">
      <div className="w-full max-w-md rounded-none border border-[#30363D] bg-[#161B22] p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 rounded-none text-xs text-[#A3A3A3] hover:text-[#22C55E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to Home
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
            {MODE_COPY[mode].title}
          </h1>
          <p className="mt-1 text-xs text-[#A3A3A3]">
            {MODE_COPY[mode].subtitle}
          </p>
        </div>

        {mode !== 'forgot' && (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-none border border-[#30363D]">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-none py-2 text-xs font-medium ${
                  mode === 'login'
                    ? 'bg-[#052E16] text-[#22C55E]'
                    : 'bg-[#161B22] text-[#A3A3A3] hover:text-[#E6EDF3]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-none border-l border-[#30363D] py-2 text-xs font-medium ${
                  mode === 'register'
                    ? 'bg-[#052E16] text-[#22C55E]'
                    : 'bg-[#161B22] text-[#A3A3A3] hover:text-[#E6EDF3]'
                }`}
              >
                Register
              </button>
            </div>

            <AuthOAuthButtons loading={loading} onSelectProvider={handleOAuth} />
          </>
        )}

        {mode === 'login' && (
          <LoginForm
            loading={loading}
            error={error}
            notice={notice}
            onSubmit={handleLoginSubmit}
            onForgotPassword={() => switchMode('forgot')}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            loading={loading}
            error={error}
            onSubmit={handleRegisterSubmit}
          />
        )}

        {mode === 'forgot' && (
          <ForgotPasswordForm
            onBackToLogin={() => switchMode('login')}
            onResetSuccess={(message) => {
              setMode('login');
              setError(null);
              setNotice(message);
            }}
          />
        )}
      </div>
    </div>
  );
}
