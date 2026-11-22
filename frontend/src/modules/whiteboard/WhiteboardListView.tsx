import { AlertCircle, ChevronLeft, ChevronRight, PenTool, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyView, LoadingView } from '../../components/ui/StateViews';
import type { WhiteboardPermissions, WhiteboardSummary } from '../../types/whiteboard.types';
import { pluralize } from '../../utils/format';
import { WhiteboardCard } from './WhiteboardCard';

interface WhiteboardListViewProps {
  scopeLabel: string;
  boards: readonly WhiteboardSummary[];
  page: number;
  totalPages: number;
  totalElements: number;
  searchInput: string;
  loading: boolean;
  mutating: boolean;
  error: string | null;
  permissions: WhiteboardPermissions;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onClearError: () => void;
  onOpenBoard: (boardId: string) => void;
  onOpenCreate: () => void;
  onOpenRename: (board: WhiteboardSummary) => void;
  onOpenDelete: (board: WhiteboardSummary) => void;
}

export function WhiteboardListView({
  scopeLabel,
  boards,
  page,
  totalPages,
  totalElements,
  searchInput,
  loading,
  mutating,
  error,
  permissions,
  onSearchChange,
  onPageChange,
  onRefresh,
  onClearError,
  onOpenBoard,
  onOpenCreate,
  onOpenRename,
  onOpenDelete,
}: WhiteboardListViewProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0D1117]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <PenTool className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <div>
            <h1 className="text-sm font-semibold text-[#E6EDF3]">Whiteboard</h1>
            <p className="font-mono text-[11px] text-[#8A8A8A]">
              {scopeLabel} - {pluralize(totalElements, 'board')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]"
              strokeWidth={1.5}
            />
            <input
              type="search"
              aria-label="Search whiteboards"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search boards..."
              className="w-48 border border-[#3B434B] bg-[#0D1117] py-1.5 pl-8 pr-3 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none sm:w-64"
            />
          </div>
          <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            Refresh
          </Button>
          {permissions.canWrite && (
            <Button type="button" variant="primary" onClick={onOpenCreate} disabled={mutating}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              New Board
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-5 py-2 text-xs text-[#EF4444]"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            {error}
          </span>
          <button type="button" aria-label="Dismiss error" onClick={onClearError}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {loading && boards.length === 0 ? (
          <LoadingView label="Loading whiteboards..." />
        ) : boards.length === 0 ? (
          <EmptyView
            title={searchInput.trim() ? 'No matching whiteboards' : 'No whiteboards yet'}
            description={
              searchInput.trim()
                ? 'Try a different search term or clear the filter.'
                : 'Create your first whiteboard to sketch architectures, flows, and visual notes.'
            }
            action={
              permissions.canWrite && !searchInput.trim() ? (
                <Button type="button" variant="primary" onClick={onOpenCreate}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Create Whiteboard
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <WhiteboardCard
                key={board.id}
                board={board}
                permissions={permissions}
                onOpen={onOpenBoard}
                onRename={onOpenRename}
                onDelete={onOpenDelete}
              />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <footer className="flex items-center justify-between border-t border-[#30363D] bg-[#161B22] px-5 py-2.5 text-xs text-[#BDBDBD]">
          <span className="font-mono">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 0 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
