import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { RegisterPayload } from '../../types/auth.types';

interface RegisterFormProps {
  loading: boolean;
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
  'w-full border border-[#30363D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function RegisterForm({ loading, error, onSubmit }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('Vietnam');
  const [emailPreference, setEmailPreference] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ email, password, username, country, emailPreference });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-[#A3A3A3]">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#A3A3A3]">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 6 characters"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#A3A3A3]">Username</label>
        <input
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="nhatprx"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#A3A3A3]">Country</label>
        <select
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
          className="mt-0.5 h-3.5 w-3.5 border border-[#3B434B] bg-[#0D1117] accent-[#22C55E]"
        />
        <span>Receive product updates and announcements via email</span>
      </label>

      {error && (
        <div className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}
