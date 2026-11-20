import { useEffect, useRef, useState } from 'react';
import { Building2, Calendar, Check, ChevronDown, Globe, Mail, MapPin } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AccountStatus, AuthUser } from '../../types/auth.types';
import type { ProfileUpdatePayload } from '../../types/profile.types';
import { ACTIVE_STATUS_OPTIONS, getStatusMeta, resolveAccountStatus } from './activeStatus';
import { ProfileAvatarControl } from './ProfileAvatarControl';
import { ProfileEditForm } from './ProfileEditForm';

interface ProfileSidebarProps {
  user: AuthUser;
  saving: boolean;
  updatingStatus: boolean;
  onSave: (payload: ProfileUpdatePayload) => Promise<void>;
  onChangeStatus: (status: AccountStatus) => Promise<void>;
  onUserUpdated?: (user: AuthUser) => void;
}

function formatJoined(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Joined ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

export function ProfileSidebar({
  user,
  saving,
  updatingStatus,
  onSave,
  onChangeStatus,
  onUserUpdated,
}: ProfileSidebarProps) {
  const [editing, setEditing] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const username = user.username ?? user.email.split('@')[0] ?? 'user';
  const currentStatus = resolveAccountStatus(user);
  const statusMeta = getStatusMeta(currentStatus);
  const joinedLabel = formatJoined(user.createdAt);

  useEffect(() => {
    if (!statusMenuOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [statusMenuOpen]);

  return (
    <aside className="w-full shrink-0 space-y-5 lg:w-72">
      <ProfileAvatarControl
        user={user}
        displayName={user.name}
        status={currentStatus}
        onUserUpdated={onUserUpdated}
      />

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[#E6EDF3]">
            {user.name}
          </h1>
          <Badge tone={user.role === 'admin' ? 'green' : 'neutral'}>{user.role}</Badge>
        </div>
        <p className="mt-0.5 font-mono text-sm text-[#8B949E]">@{username}</p>
      </div>

      <div ref={statusMenuRef} className="relative">
        <button
          type="button"
          disabled={updatingStatus}
          aria-expanded={statusMenuOpen}
          aria-label="Change active status"
          onClick={() => setStatusMenuOpen((prev) => !prev)}
          className="flex w-full items-center justify-between border border-[#30363D] bg-[#161B22] px-3 py-2 text-xs transition-colors hover:border-[#22C55E] disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 ${statusMeta.dotClass}`} />
            <span className="font-medium text-[#E6EDF3]">
              {updatingStatus ? 'Updating...' : statusMeta.label}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[#8B949E]" strokeWidth={1.5} />
        </button>

        {statusMenuOpen && (
          <div
            role="menu"
            className="absolute left-0 right-0 top-full z-20 mt-1 border border-[#30363D] bg-[#161B22] py-1 shadow-lg"
          >
            {ACTIVE_STATUS_OPTIONS.map((option) => {
              const active = option.value === currentStatus;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setStatusMenuOpen(false);
                    if (!active) void onChangeStatus(option.value);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[#21262D]"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 ${option.dotClass}`} />
                    <span className={active ? 'font-semibold text-[#E6EDF3]' : 'text-[#BDBDBD]'}>
                      {option.label}
                    </span>
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={2} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {editing ? (
        <ProfileEditForm
          initial={{
            name: user.name,
            username,
            bio: user.bio ?? '',
            organization: user.organization ?? '',
            location: user.location ?? user.country ?? '',
            website: user.website ?? '',
          }}
          saving={saving}
          onSave={onSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {user.bio && (
            <p className="text-sm leading-relaxed text-[#BDBDBD]">{user.bio}</p>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditing(true)}
            className="w-full"
          >
            Edit profile
          </Button>

          <ul className="space-y-2.5 border-t border-[#30363D] pt-4 text-sm text-[#BDBDBD]">
            {user.organization && (
              <li className="flex items-center gap-2.5">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
                <span className="truncate font-mono">{user.organization}</span>
              </li>
            )}
            {(user.location || user.country) && (
              <li className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
                <span className="truncate">{user.location || user.country}</span>
              </li>
            )}
            <li className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
              <span className="truncate font-mono">{user.email}</span>
            </li>
            {user.website && (
              <li className="flex items-center gap-2.5">
                <Globe className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
                <a
                  href={user.website}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[#22C55E] hover:underline"
                >
                  {user.website}
                </a>
              </li>
            )}
            {joinedLabel && (
              <li className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[#666666]" strokeWidth={1.5} />
                <span>{joinedLabel}</span>
              </li>
            )}
          </ul>
        </>
      )}
    </aside>
  );
}
