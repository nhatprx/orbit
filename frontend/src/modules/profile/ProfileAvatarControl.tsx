import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { avatarService } from '../../services/avatar.service';
import type { AuthUser } from '../../types/auth.types';

interface ProfileAvatarControlProps {
  user: AuthUser;
  displayName: string;
  onUserUpdated?: (user: AuthUser) => void;
}

const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

export function ProfileAvatarControl({
  user,
  displayName,
  onUserUpdated,
}: ProfileAvatarControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

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
      setStatusMessage('Avatar uploaded to AWS S3.');
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

  const effectiveUrl = previewUrl ?? user.avatarUrl ?? null;

  return (
    <div className="space-y-2.5">
      <div className="relative w-full max-w-[260px]">
        <UserAvatar name={displayName} avatarUrl={effectiveUrl} size="lg" />
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0D1117]/80 text-xs text-[#22C55E]">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
            <span className="font-mono">Syncing S3...</span>
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

      <div className="flex max-w-[260px] gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5"
        >
          <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />
          {user.avatarUrl ? 'Change avatar' : 'Upload avatar'}
        </Button>

        {user.avatarUrl && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            title="Remove avatar"
            aria-label="Remove avatar"
            onClick={() => void handleRemove()}
            className="px-2.5 text-[#EF4444] hover:border-[#EF4444]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <p className="max-w-[260px] text-[11px] text-[#7D8590]">
        JPEG, PNG, WebP, or GIF up to 5 MB. Stored on AWS S3.
      </p>

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
