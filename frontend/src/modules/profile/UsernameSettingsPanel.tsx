import { useEffect, useState, type FormEvent } from 'react';
import { AtSign } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { AuthUser } from '../../types/auth.types';
import { validateUsernameFormat } from '../auth/passwordPolicy';

interface UsernameSettingsPanelProps {
  currentUsername: string;
  onUpdated: (user: AuthUser) => void;
}

export function UsernameSettingsPanel({ currentUsername, onUpdated }: UsernameSettingsPanelProps) {
  const [username, setUsername] = useState(currentUsername);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  const normalized = username.trim().toLowerCase();
  const unchanged = normalized === currentUsername.trim().toLowerCase();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const validationError = validateUsernameFormat(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const updated = await accountSecurityService.updateProfile({ username: normalized });
      setNotice(`Username updated to @${updated.username ?? normalized}.`);
      onUpdated(updated);
    } catch (err) {
      setError(errorMessage(err, 'Failed to update username.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Username"
      description="Your unique handle used for signing in and mentions across Orbit."
    >
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label htmlFor="acc-username" className="mb-1 block text-xs text-[#A3A3A3]">
            Username
          </label>
          <div className="flex items-center border border-[#30363D] bg-[#0D1117] focus-within:border-[#22C55E]">
            <span className="pl-3 font-mono text-sm text-[#666666]">@</span>
            <input
              id="acc-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              className="w-full bg-transparent px-2 py-2 font-mono text-sm text-[#E6EDF3] focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-[#7D8590]">
            3-50 characters: lowercase letters, digits, '.', '_' or '-'.
          </p>
        </div>

        {error && (
          <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-3 py-2 text-xs text-[#EF4444]">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="border border-[#22C55E] bg-[#052E16] px-3 py-2 text-xs text-[#22C55E]">
            {notice}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={saving || unchanged}>
          <AtSign className="h-3.5 w-3.5" strokeWidth={1.5} />
          {saving ? 'Updating...' : 'Update username'}
        </Button>
      </form>
    </Panel>
  );
}
