import { useState, type FormEvent } from 'react';
import {
  Building2,
  Calendar,
  Globe,
  Mail,
  MapPin,
  Users,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AuthUser } from '../../types/auth.types';
import type { ProfileData, ProfileUpdatePayload } from '../../types/profile.types';

interface ProfileSidebarProps {
  user: AuthUser;
  profile: ProfileData;
  saving: boolean;
  onSave: (payload: ProfileUpdatePayload) => Promise<void>;
}

const INPUT_CLASS =
  'w-full border border-[#1F1F1F] bg-[#050505] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:border-[#22C55E] focus:outline-none';

export function ProfileSidebar({
  user,
  profile,
  saving,
  onSave,
}: ProfileSidebarProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileUpdatePayload>({
    name: profile.name,
    bio: profile.bio,
    organization: profile.organization,
    location: profile.location,
    website: profile.website,
  });

  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
    setEditing(false);
  }

  return (
    <aside className="w-full shrink-0 space-y-5 lg:w-72">
      <div className="flex aspect-square w-full max-w-[260px] items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-5xl font-semibold text-[#22C55E]">
        {initials}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">
            {profile.name}
          </h1>
          <Badge tone={user.role === 'admin' ? 'green' : 'neutral'}>
            {user.role}
          </Badge>
        </div>
        <p className="font-mono text-xs text-[#A3A3A3]">@{profile.username}</p>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-3 border border-[#1F1F1F] bg-[#0A0A0A] p-4">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
            className={INPUT_CLASS}
          />
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
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-[#A3A3A3]">{profile.bio}</p>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setForm({
                name: profile.name,
                bio: profile.bio,
                organization: profile.organization,
                location: profile.location,
                website: profile.website,
              });
              setEditing(true);
            }}
            className="w-full"
          >
            Edit profile
          </Button>

          <div className="flex items-center gap-3 text-xs text-[#A3A3A3]">
            <Users className="h-3.5 w-3.5 text-[#666666]" strokeWidth={1.5} />
            <span>
              <strong className="text-[#F5F5F5]">{profile.followers}</strong> followers
            </span>
            <span className="text-[#666666]">/</span>
            <span>
              <strong className="text-[#F5F5F5]">{profile.following}</strong> following
            </span>
          </div>

          <ul className="space-y-2 border-t border-[#1F1F1F] pt-4 text-xs text-[#A3A3A3]">
            <li className="flex items-center gap-2.5">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
              <span className="truncate font-mono">{profile.organization}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
              <span className="truncate">{profile.location}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
              <span className="truncate font-mono">{user.email}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Globe className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
              <span className="truncate text-[#22C55E]">{profile.website}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
              <span>{profile.joinedDate}</span>
            </li>
          </ul>
        </>
      )}
    </aside>
  );
}
