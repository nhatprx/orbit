import { Lock, LockOpen, Pencil, Trash2 } from 'lucide-react';
import type { WhiteboardPermissions, WhiteboardSummary } from '../../types/whiteboard.types';
import { formatRelative, pluralize } from '../../utils/format';

interface WhiteboardCardProps {
  board: WhiteboardSummary;
  permissions: WhiteboardPermissions;
  onOpen: (boardId: string) => void;
  onRename: (board: WhiteboardSummary) => void;
  onDelete: (board: WhiteboardSummary) => void;
  onToggleLock?: (board: WhiteboardSummary, locked: boolean) => void;
}

export function WhiteboardCard({
  board,
  permissions,
  onOpen,
  onRename,
  onDelete,
  onToggleLock,
}: WhiteboardCardProps) {
  const isLocked = Boolean(board.locked);
  const canToggleLock = Boolean(board.canToggleLock ?? permissions.canManage);

  return (
    <article className="flex flex-col justify-between border border-[#30363D] bg-[#161B22] transition-colors hover:border-[#22C55E]">
      <button
        type="button"
        onClick={() => onOpen(board.id)}
        className="flex flex-1 flex-col items-start p-4 text-left"
      >
        <div className="mb-2 flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#22C55E]">
              <span className="h-1.5 w-1.5 bg-[#22C55E]" />
              v{board.version}
            </span>
            {isLocked && (
              <span
                data-testid={`whiteboard-card-locked-${board.id}`}
                className="inline-flex items-center gap-1 border border-[#EAB308]/60 bg-[#EAB308]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#EAB308]"
              >
                <Lock className="h-2.5 w-2.5" strokeWidth={1.5} />
                LOCKED
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-[#8A8A8A]">
            {pluralize(board.elementCount, 'element')}
          </span>
        </div>
        <h2 className="line-clamp-1 text-sm font-semibold text-[#E6EDF3]">{board.title}</h2>
        <p className="mt-1 line-clamp-2 text-xs text-[#8A8A8A]">
          {board.description || 'No description'}
        </p>
      </button>
      <div className="flex items-center justify-between border-t border-[#30363D] bg-[#0D1117]/60 px-4 py-2">
        <span className="font-mono text-[11px] text-[#8A8A8A]">
          Updated {formatRelative(board.updatedAt)}
        </span>
        <div className="flex items-center gap-1">
          {canToggleLock && onToggleLock && (
            <button
              type="button"
              aria-label={isLocked ? `Unlock ${board.title}` : `Lock ${board.title}`}
              title={isLocked ? 'Unlock board' : 'Lock board'}
              onClick={() => onToggleLock(board, !isLocked)}
              className={`p-1 hover:bg-[#21262D] ${
                isLocked ? 'text-[#EAB308] hover:text-[#22C55E]' : 'text-[#8A8A8A] hover:text-[#22C55E]'
              }`}
            >
              {isLocked ? (
                <LockOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
            </button>
          )}
          {permissions.canWrite && (
            <button
              type="button"
              disabled={isLocked}
              aria-label={`Rename ${board.title}`}
              title={isLocked ? 'Unlock board to rename' : `Rename ${board.title}`}
              onClick={() => onRename(board)}
              className="p-1 text-[#8A8A8A] hover:bg-[#21262D] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              disabled={isLocked}
              aria-label={`Delete ${board.title}`}
              title={isLocked ? 'Unlock board to delete' : `Delete ${board.title}`}
              onClick={() => onDelete(board)}
              className="p-1 text-[#8A8A8A] hover:bg-[#21262D] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
