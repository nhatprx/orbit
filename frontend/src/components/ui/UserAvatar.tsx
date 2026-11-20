import { useEffect, useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 'sm',
  className = '',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const sizeClass =
    size === 'lg'
      ? 'aspect-square w-full max-w-[260px] text-5xl'
      : 'h-7 w-7 shrink-0 text-xs';

  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden border border-[#22C55E] bg-[#052E16] font-mono font-semibold text-[#22C55E] ${sizeClass} ${className}`}
    >
      {showImage ? (
        <img
          src={avatarUrl ?? undefined}
          alt={`${name} avatar`}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
