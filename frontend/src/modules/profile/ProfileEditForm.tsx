import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ProfileUpdatePayload } from '../../types/profile.types';
import { validateUsernameFormat } from '../auth/passwordPolicy';

interface ProfileEditFormProps {
  initial: ProfileUpdatePayload;
  saving: boolean;
  onSave: (payload: ProfileUpdatePayload) => Promise<void>;
  onCancel: () => void;
}

const INPUT_CLASS =
  'w-full border border-[#30363D] bg-[#0D1117] px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none';

export function ProfileEditForm({ initial, saving, onSave, onCancel }: ProfileEditFormProps) {
  const [form, setForm] = useState<ProfileUpdatePayload>(initial);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const normalizedUsername = form.username.trim().toLowerCase();
    const usernameError = validateUsernameFormat(normalizedUsername);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    try {
      await onSave({ ...form, name: form.name.trim(), username: normalizedUsername });
      onCancel();
    } catch (err) {
      setError(errorMessage(err, 'Failed to update profile.'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-[#30363D] bg-[#161B22] p-4">
      <div>
        <label htmlFor="profile-edit-name" className="mb-1 block text-[11px] text-[#8B949E]">
          Display name
        </label>
        <input
          id="profile-edit-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="profile-edit-username" className="mb-1 block text-[11px] text-[#8B949E]">
          Username
        </label>
        <div className="flex items-center border border-[#30363D] bg-[#0D1117] focus-within:border-[#22C55E]">
          <span className="pl-2.5 font-mono text-xs text-[#666666]">@</span>
          <input
            id="profile-edit-username"
            type="text"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="username"
            className="w-full bg-transparent px-1.5 py-1.5 font-mono text-xs text-[#E6EDF3] focus:outline-none"
          />
        </div>
      </div>

      <textarea
        rows={3}
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        placeholder="Bio"
        className={INPUT_CLASS}
      />
      <input
        type="text"
        value={form.organization}
        onChange={(e) => setForm({ ...form, organization: e.target.value })}
        placeholder="Organization"
        className={INPUT_CLASS}
      />
      <input
        type="text"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="Location"
        className={INPUT_CLASS}
      />
      <input
        type="text"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        placeholder="Website"
        className={INPUT_CLASS}
      />

      {error && (
        <p role="alert" className="border border-[#EF4444] bg-[#21262D] px-2.5 py-1.5 text-xs text-[#EF4444]">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
