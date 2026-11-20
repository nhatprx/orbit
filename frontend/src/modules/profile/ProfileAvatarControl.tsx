import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, Pencil, Trash2 } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { avatarService } from '../../services/avatar.service';
import type { AccountStatus, AuthUser } from '../../types/auth.types';
import { getStatusMeta } from './activeStatus';

interface ProfileAvatarControlProps {
  user: AuthUser;
  displayName: string;
  status?: AccountStatus;
  onUserUpdated?: (user: AuthUser) => void;
}

const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

export function ProfileAvatarControl({
  user,
  displayName,
  status = 'ONLINE',
  onUserUpdated,
}: ProfileAvatarControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMenuOpen(false);
    setError(null);
    setStatusMessage(null);

    const validationError = avatarService.validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    setBusy(true);

    try {
      const updatedUser = await avatarService.uploadAvatar(file);
      onUserUpdated?.(updatedUser);
      setStatusMessage('Avatar updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar.');
    } finally {
      setBusy(false);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  }

  async function handleRemove() {
    setMenuOpen(false);
    setError(null);
    setStatusMessage(null);
    setBusy(true);
    try {
      const updatedUser = await avatarService.removeAvatar();
      onUserUpdated?.(updatedUser);
      setStatusMessage('Avatar removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar.');
    } finally {
      setBusy(false);
    }
  }

  function handleEditClick() {
    if (busy) return;
    if (!user.avatarUrl) {
      fileInputRef.current?.click();
      return;
    }
    setMenuOpen((prev) => !prev);
  }

  const effectiveUrl = previewUrl ?? user.avatarUrl ?? null;
  const statusMeta = getStatusMeta(status);

  return (
    <div className="space-y-2.5">
      <div ref={menuRef} className="relative w-full max-w-[260px]">
        <UserAvatar name={displayName} avatarUrl={effectiveUrl} size="lg" />

        <span
          title={statusMeta.label}
          aria-label={`Account ${statusMeta.label.toLowerCase()}`}
          className={`absolute right-2 top-2 h-3 w-3 border-2 border-[#0D1117] ${statusMeta.dotClass}`}
        />

        <button
          type="button"
          disabled={busy}
          aria-label="Edit avatar"
          title="Edit avatar"
          onClick={handleEditClick}
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#0D1117]/95 text-[#E6EDF3] transition-colors hover:border-[#22C55E] hover:text-[#22C55E] disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-9 right-0 z-20 w-44 border border-[#30363D] bg-[#161B22] py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#E6EDF3] hover:bg-[#21262D]"
            >
              <Camera className="h-3.5 w-3.5 text-[#8B949E]" strokeWidth={1.5} />
              Change avatar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleRemove()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#EF4444] hover:bg-[#21262D]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Remove avatar
            </button>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0D1117]/80 text-xs text-[#22C55E]">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
            <span className="font-mono">Syncing...</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES}
        aria-label="Upload profile avatar"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />

      {error && (
        <p role="alert" className="max-w-[260px] border border-[#EF4444] bg-[#161B22] px-2.5 py-1.5 text-xs text-[#EF4444]">
          {error}
        </p>
      )}

      {statusMessage && (
        <p role="status" className="max-w-[260px] border border-[#22C55E] bg-[#052E16] px-2.5 py-1.5 text-xs text-[#22C55E]">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
