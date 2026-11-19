import { useState, type FormEvent } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/auth.service';
import type { AuthSession, UserRole } from '../../types/auth.types';
import { AuthDemoBar } from './AuthDemoBar';

interface AuthPageProps {
  onSuccess: (session: AuthSession) => void;
  onBackHome: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthPage({ onSuccess, onBackHome }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('user@orbit.dev');
  const [password, setPassword] = useState('orbit-user-dev');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session =
        mode === 'login'
          ? await authService.login({ email, password })
          : await authService.register({ name, email, password, role });
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoRole(targetRole: UserRole) {
    setError(null);
    setLoading(true);
    try {
      const session = await authService.loginAsDemoRole(targetRole);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-12 text-[#F5F5F5]">
      <div className="w-full max-w-md border border-[#1F1F1F] bg-[#0A0A0A] p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#22C55E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to Home
          </button>
          <Badge tone="green" withDot>
            MOCK AUTH
          </Badge>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">
            {mode === 'login' ? 'Sign In to Orbit' : 'Create Orbit Account'}
          </h1>
          <p className="mt-1 text-xs text-[#A3A3A3]">
            Access your developer workspace with Admin or User role permissions.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 border border-[#1F1F1F]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 text-xs font-medium ${
              mode === 'login'
                ? 'bg-[#052E16] text-[#22C55E]'
                : 'bg-[#0A0A0A] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`border-l border-[#1F1F1F] py-2 text-xs font-medium ${
              mode === 'register'
                ? 'bg-[#052E16] text-[#22C55E]'
                : 'bg-[#0A0A0A] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs text-[#A3A3A3]">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jordan Vance"
                className="w-full border border-[#1F1F1F] bg-[#050505] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#22C55E] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-[#A3A3A3]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#1F1F1F] bg-[#050505] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#A3A3A3]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#1F1F1F] bg-[#050505] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs text-[#A3A3A3]">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(['user', 'admin'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    className={`border px-3 py-2 text-xs uppercase ${
                      role === item
                        ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                        : 'border-[#1F1F1F] bg-[#050505] text-[#A3A3A3]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="border border-[#EF4444] bg-[#111111] px-3 py-2 text-xs text-[#EF4444]">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <AuthDemoBar loading={loading} onSelectRole={handleDemoRole} />
      </div>
    </div>
  );
}
