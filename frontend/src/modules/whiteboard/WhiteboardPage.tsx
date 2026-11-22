import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyView } from '../../components/ui/StateViews';
import type { WhiteboardService } from '../../services/whiteboard/whiteboard.service';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import type { WhiteboardSummary } from '../../types/whiteboard.types';
import { useWhiteboardList } from './useWhiteboardList';
import { WhiteboardListView } from './WhiteboardListView';
import { CreateWhiteboardModal, RenameWhiteboardModal } from './WhiteboardModals';
import {
  buildWhiteboardScope,
  resolveWhiteboardPermissions,
  whiteboardScopeKey,
} from './whiteboardPermissions';
import { WhiteboardWorkspace } from './WhiteboardWorkspace';

export interface WhiteboardPageProps {
  workspace: WorkspaceDto;
  project: ProjectDto | null;
  service?: WhiteboardService;
}

export function WhiteboardPage({ workspace, project, service }: WhiteboardPageProps) {
  const scope = useMemo(() => buildWhiteboardScope(workspace, project), [workspace, project]);
  const scopeKey = whiteboardScopeKey(scope);
  const scopeLabel = project ? project.name : workspace.name;
  const permissions = useMemo(() => resolveWhiteboardPermissions(scope), [scope]);

  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renamingBoard, setRenamingBoard] = useState<WhiteboardSummary | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<WhiteboardSummary | null>(null);

  const list = useWhiteboardList(scope, permissions.canRead, service);

  useEffect(() => {
    setActiveBoardId(null);
    setCreateOpen(false);
    setRenamingBoard(null);
    setDeletingBoard(null);
  }, [scopeKey]);

  if (!permissions.canRead) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0D1117] p-6">
        <EmptyView
          title="No access to Whiteboard"
          description="You do not have permission to view whiteboards in this scope."
        />
      </div>
    );
  }

  if (activeBoardId) {
    return (
      <WhiteboardWorkspace
        key={`${scopeKey}:${activeBoardId}`}
        scope={scope}
        boardId={activeBoardId}
        canWrite={permissions.canWrite}
        service={service}
        onBack={() => {
          setActiveBoardId(null);
          void list.refresh();
        }}
      />
    );
  }

  return (
    <>
      <WhiteboardListView
        scopeLabel={scopeLabel}
        boards={list.boards}
        page={list.page}
        totalPages={list.totalPages}
        totalElements={list.totalElements}
        searchInput={list.searchInput}
        loading={list.loading}
        mutating={list.mutating}
        error={list.error}
        permissions={permissions}
        onSearchChange={list.setSearchInput}
        onPageChange={list.setPage}
        onRefresh={() => void list.refresh()}
        onClearError={list.clearError}
        onOpenBoard={setActiveBoardId}
        onOpenCreate={() => setCreateOpen(true)}
        onOpenRename={setRenamingBoard}
        onOpenDelete={setDeletingBoard}
      />

      <CreateWhiteboardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (request) => {
          const created = await list.createBoard(request);
          setCreateOpen(false);
          setActiveBoardId(created.id);
        }}
      />

      <RenameWhiteboardModal
        board={renamingBoard}
        onClose={() => setRenamingBoard(null)}
        onSubmit={async (boardId, request) => {
          await list.renameBoard(boardId, request);
          setRenamingBoard(null);
        }}
      />

      <ConfirmDialog
        open={deletingBoard !== null}
        title="Delete Whiteboard"
        message={`Delete "${deletingBoard?.title ?? 'this whiteboard'}"? All canvas data and embedded images will be permanently removed.`}
        confirmLabel="Delete Board"
        danger
        onConfirm={async () => {
          if (!deletingBoard) return;
          await list.deleteBoard(deletingBoard.id);
          setDeletingBoard(null);
        }}
        onClose={() => setDeletingBoard(null)}
      />
    </>
  );
}
