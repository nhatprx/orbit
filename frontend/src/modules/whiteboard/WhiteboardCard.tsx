import { Pencil, Trash2 } from 'lucide-react';
import type { WhiteboardPermissions, WhiteboardSummary } from '../../types/whiteboard.types';
import { formatRelative, pluralize } from '../../utils/format';

interface WhiteboardCardProps {
  board: WhiteboardSummary;
  permissions: WhiteboardPermissions;
  onOpen: (boardId: string) => void;
  onRename: (board: WhiteboardSummary) => void;
  onDelete: (board: WhiteboardSummary) => void;
}

export function WhiteboardCard({
  board,
  permissions,
  onOpen,
  onRename,
  onDelete,
}: WhiteboardCardProps) {
  return (
    <article className="flex flex-col justify-between border border-[#30363D] bg-[#161B22] transition-colors hover:border-[#22C55E]">
      <button
        type="button"
        onClick={() => onOpen(board.id)}
        className="flex flex-1 flex-col items-start p-4 text-left"
      >
        <div className="mb-2 flex w-full items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#22C55E]">
            <span className="h-1.5 w-1.5 bg-[#22C55E]" />
            v{board.version}
          </span>
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
          {permissions.canWrite && (
            <button
              type="button"
              aria-label={`Rename ${board.title}`}
              onClick={() => onRename(board)}
              className="p-1 text-[#8A8A8A] hover:bg-[#21262D] hover:text-[#22C55E]"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {permissions.canDelete && (
            <button
              type="button"
              aria-label={`Delete ${board.title}`}
              onClick={() => onDelete(board)}
              className="p-1 text-[#8A8A8A] hover:bg-[#21262D] hover:text-[#EF4444]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
