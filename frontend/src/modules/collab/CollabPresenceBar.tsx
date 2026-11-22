import { Lock, LockOpen, Users } from 'lucide-react';
import { pickCollaboratorColor } from '../../services/collab/collabClient';
import type { CollabParticipant } from '../../types/collab.types';

export interface CollabPresenceBarProps {
  participants: readonly CollabParticipant[];
  locked?: boolean;
  canToggleLock?: boolean;
  lockPending?: boolean;
  onToggleLock?: () => void;
  activeHint?: string | null;
}

const MAX_VISIBLE = 5;

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? 'U').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function formatCursorHint(cursor?: Record<string, unknown> | null): string {
  if (!cursor) return '';
  if (typeof cursor.cellLabel === 'string' && cursor.cellLabel) {
    return ` [${cursor.cellLabel}]`;
  }
  if (typeof cursor.slideIndex === 'number') {
    return ` [Slide ${cursor.slideIndex + 1}]`;
  }
  if (typeof cursor.line === 'number') {
    return ` [L${cursor.line}]`;
  }
  return '';
}

export function CollabPresenceBar({
  participants,
  locked = false,
  canToggleLock = false,
  lockPending = false,
  onToggleLock,
  activeHint,
}: CollabPresenceBarProps) {
  const visible = participants.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, participants.length - visible.length);

  return (
    <div
      data-testid="collab-presence-bar"
      className="flex flex-wrap items-center gap-1.5"
    >
      {locked && (
        <span
          data-testid="collab-locked-badge"
          title="Resource is locked by owner (read-only until unlocked)"
          className="inline-flex h-6 items-center gap-1 rounded-none border border-[#EAB308]/60 bg-[#EAB308]/10 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#EAB308]"
        >
          <Lock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          LOCKED
        </span>
      )}

      {canToggleLock && onToggleLock && (
        <button
          type="button"
          data-testid="collab-lock-toggle"
          disabled={lockPending}
          onClick={onToggleLock}
          aria-label={locked ? 'Unlock resource' : 'Lock resource'}
          title={locked ? 'Unlock resource to allow editing' : 'Lock resource to prevent edits'}
          className={`inline-flex h-6 items-center gap-1 rounded-none border px-2 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 ${
            locked
              ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E] hover:bg-[#052E16]/80'
              : 'border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]'
          }`}
        >
          {locked ? (
            <>
              <LockOpen className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              Unlock
            </>
          ) : (
            <>
              <Lock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              Lock
            </>
          )}
        </button>
      )}

      {activeHint && (
        <span
          data-testid="collab-active-hint"
          className="rounded-none border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]"
        >
          {activeHint}
        </span>
      )}

      {participants.length > 0 && (
        <div
          aria-label={`Active collaborators (${participants.length})`}
          className="flex items-center gap-1"
        >
          <span
            title={`${participants.length} online in room`}
            className="inline-flex h-6 items-center gap-1 rounded-none border border-[#30363D] bg-[#0D1117] px-1.5 font-mono text-[10px] text-[#8B949E]"
          >
            <Users className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
            {participants.length}
          </span>

          {visible.map((p) => {
            const color = pickCollaboratorColor(p.userId || p.sessionId, p.color);
            const label = `${p.displayName || 'Collaborator'}${formatCursorHint(p.cursor)}`;
            return (
              <span
                key={p.sessionId || p.userId}
                data-testid="collab-participant-badge"
                title={label}
                aria-label={label}
                style={{ borderColor: color }}
                className="relative inline-flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-none border bg-[#0D1117] font-mono text-[10px] font-semibold text-[#E6EDF3]"
              >
                {toInitials(p.displayName || 'User')}
                <span
                  style={{ backgroundColor: color }}
                  className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-none"
                  aria-hidden="true"
                />
              </span>
            );
          })}

          {overflow > 0 && (
            <span
              data-testid="collab-participant-overflow"
              title={`${overflow} more collaborators`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-[#30363D] bg-[#21262D] font-mono text-[10px] text-[#8B949E]"
            >
              +{overflow}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
