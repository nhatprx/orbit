import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { RegisterPayload } from '../../types/auth.types';
import { PasswordInput } from './PasswordInput';
import { PasswordRulesList } from './PasswordRulesList';
import { evaluatePasswordRules } from './passwordPolicy';

interface RegisterFormProps {
  loading: boolean;
  disabled?: boolean;
  error: string | null;
  onSubmit: (payload: RegisterPayload) => Promise<void>;
}

const COUNTRIES = [
  'Vietnam',
  'United States',
  'Singapore',
  'Japan',
  'United Kingdom',
  'Germany',
  'Australia',
  'Canada',
];

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function RegisterForm({
  loading,
  disabled = false,
  error,
  onSubmit,
}: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('Vietnam');
  const [emailPreference, setEmailPreference] = useState(false);

  const passwordRules = evaluatePasswordRules(password);
  const allRulesPassed = passwordRules.every((rule) => rule.passed);
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    !loading &&
    !disabled &&
    allRulesPassed &&
    confirmPassword.length > 0 &&
    !passwordMismatch;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    await onSubmit({ email, password, username, country, emailPreference });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="register-username" className="mb-1 block text-xs text-[#A3A3A3]">
          Username (Unique)
        </label>
        <input
          id="register-username"
          type="text"
          required
          minLength={3}
          maxLength={50}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="nhatprx"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="register-email" className="mb-1 block text-xs text-[#A3A3A3]">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="register-password" className="mb-1 block text-xs text-[#A3A3A3]">
          Password
        </label>
        <PasswordInput
          id="register-password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          placeholder="Min 8 chars, upper, lower, digit, special"
        />
        <PasswordRulesList rules={passwordRules} />
      </div>

      <div>
        <label htmlFor="register-confirm-password" className="mb-1 block text-xs text-[#A3A3A3]">
          Confirm Password
        </label>
        <PasswordInput
          id="register-confirm-password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
        />
        {passwordMismatch && (
          <p className="mt-1 text-[11px] text-[#EF4444]">Passwords do not match.</p>
        )}
      </div>

      <div>
        <label htmlFor="register-country" className="mb-1 block text-xs text-[#A3A3A3]">
          Country
        </label>
        <select
          id="register-country"
          required
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={INPUT_CLASS}
        >
          {COUNTRIES.map((item) => (
            <option key={item} value={item} className="bg-[#161B22]">
              {item}
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs text-[#A3A3A3]">
        <input
          type="checkbox"
          checked={emailPreference}
          onChange={(e) => setEmailPreference(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded-none border border-[#3B434B] bg-[#0D1117] accent-[#22C55E]"
        />
        <span>Receive product updates and announcements via email</span>
      </label>

      {error && (
        <div className="rounded-none border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full rounded-none">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
