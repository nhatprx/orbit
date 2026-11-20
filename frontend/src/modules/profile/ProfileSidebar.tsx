import { useState } from 'react';
import { Building2, Calendar, Globe, Mail, MapPin, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AuthUser } from '../../types/auth.types';
import type { ProfileData, ProfileUpdatePayload } from '../../types/profile.types';
import { ProfileAvatarControl } from './ProfileAvatarControl';
import { ProfileEditForm } from './ProfileEditForm';

interface ProfileSidebarProps {
  user: AuthUser;
  profile: ProfileData;
  saving: boolean;
  onSave: (payload: ProfileUpdatePayload) => Promise<void>;
  onUserUpdated?: (user: AuthUser) => void;
}

export function ProfileSidebar({
  user,
  profile,
  saving,
  onSave,
  onUserUpdated,
}: ProfileSidebarProps) {
  const [editing, setEditing] = useState(false);

  return (
    <aside className="w-full shrink-0 space-y-5 lg:w-72">
      <ProfileAvatarControl
        user={user}
        displayName={profile.name}
        onUserUpdated={onUserUpdated}
      />

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#E6EDF3]">
            {profile.name}
          </h1>
          <Badge tone={user.role === 'admin' ? 'green' : 'neutral'}>
            {user.role}
          </Badge>
        </div>
        <p className="mt-0.5 font-mono text-sm text-[#BDBDBD]">@{profile.username}</p>
      </div>

      {editing ? (
        <ProfileEditForm
          initial={{
            name: profile.name,
            username: profile.username,
            bio: profile.bio,
            organization: profile.organization,
            location: profile.location,
            website: profile.website,
          }}
          saving={saving}
          onSave={onSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="text-sm leading-relaxed text-[#BDBDBD]">{profile.bio}</p>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditing(true)}
            className="w-full"
          >
            Edit profile
          </Button>

          <div className="flex items-center gap-3 text-sm text-[#BDBDBD]">
            <Users className="h-4 w-4 text-[#8A8A8A]" strokeWidth={1.5} />
            <span>
              <strong className="text-[#E6EDF3]">{profile.followers}</strong> followers
            </span>
            <span className="text-[#8A8A8A]">/</span>
            <span>
              <strong className="text-[#E6EDF3]">{profile.following}</strong> following
            </span>
          </div>

          <ul className="space-y-2.5 border-t border-[#30363D] pt-4 text-sm text-[#BDBDBD]">
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
