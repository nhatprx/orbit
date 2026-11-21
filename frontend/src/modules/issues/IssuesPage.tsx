import { useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingView } from '../../components/ui/StateViews';
import { authService } from '../../services/auth.service';
import type { IssueStatus, IssueType, SprintDto } from '../../types/issues.types';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { CompleteSprintDialog } from './CompleteSprintDialog';
import { CreateIssueModal } from './CreateIssueModal';
import { CreateSprintModal } from './CreateSprintModal';
import { EditSprintModal } from './EditSprintModal';
import { IssueDetailDrawer } from './IssueDetailDrawer';
import { resolveProjectIssuePermissions } from './issueFilters';
import { IssuesBacklogView } from './IssuesBacklogView';
import { IssuesEpicsView } from './IssuesEpicsView';
import { IssuesKanbanBoard } from './IssuesKanbanBoard';
import { IssuesToolbar, type IssuesViewMode } from './IssuesToolbar';
import { useProjectIssues } from './useProjectIssues';
import { useProjectMembers } from './useProjectMembers';
import { WorkspaceIssuesPortfolio } from './WorkspaceIssuesPortfolio';

export interface IssuesPageProps {
  workspace: WorkspaceDto;
  project: ProjectDto | null;
  onOpenProject: (projectId: string) => void;
}

interface IssueModalState {
  open: boolean;
  defaultStatus?: IssueStatus;
  defaultSprintId?: string | null;
  defaultParentId?: string | null;
  defaultType?: IssueType;
}

function ProjectIssuesWorkspace({ workspace, project }: { workspace: WorkspaceDto; project: ProjectDto }) {
  const state = useProjectIssues(workspace.id, project.id);
  const { canWrite, canDelete, canManage } = useMemo(
    () => resolveProjectIssuePermissions(workspace, project),
    [workspace, project]
  );
  const members = useProjectMembers(
    workspace.id,
    project.id,
    workspace.myPermissions.includes('member.view')
  );
  const currentUserId = useMemo(() => authService.getSession()?.user?.id ?? null, []);
  const [view, setView] = useState<IssuesViewMode>('board');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueModal, setIssueModal] = useState<IssueModalState>({ open: false });
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintDto | null>(null);
  const [completingSprint, setCompletingSprint] = useState<SprintDto | null>(null);
  const [deletingSprint, setDeletingSprint] = useState<SprintDto | null>(null);

  const openIssueModal = (defaults: Omit<IssueModalState, 'open'> = {}) => setIssueModal({ open: true, ...defaults });
  const closeIssueModal = () => setIssueModal({ open: false });

  const filteredEpics = useMemo(() => {
    const term = state.filters.q.trim().toLowerCase();
    return state.epics.filter((epic) => {
      if (state.filters.priority !== 'ALL' && epic.priority !== state.filters.priority) return false;
      if (!term) return true;
      return (
        epic.issueKey.toLowerCase().includes(term) ||
        epic.title.toLowerCase().includes(term) ||
        (epic.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [state.epics, state.filters.priority, state.filters.q]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0D1117]">
      <IssuesToolbar
        projectName={project.name} totalCount={state.issues.length} filteredCount={state.filteredIssues.length}
        activeSprint={state.activeSprint} sprints={state.sprints} view={view} filters={state.filters}
        loading={state.loading} canWrite={canWrite} onViewChange={setView}
        onFilterChange={state.setFilter} onResetFilters={state.resetFilters}
        onRefresh={() => void state.refresh()} onNewSprint={() => setSprintModalOpen(true)}
        onNewIssue={() => openIssueModal({ defaultStatus: 'TODO' })}
      />

      {state.error && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-5 py-2 text-xs text-[#EF4444]">
          <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />{state.error}</span>
          <button type="button" aria-label="Dismiss error" onClick={state.clearError}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
        </div>
      )}

      {state.loading && state.issues.length === 0 && state.sprints.length === 0 ? (
        <div className="flex-1 bg-[#0D1117] p-4"><LoadingView label="Loading project issues and sprints..." /></div>
      ) : view === 'board' ? (
        <IssuesKanbanBoard
          issues={state.filteredIssues} canWrite={canWrite} mutating={state.mutating}
          onSelectIssue={setSelectedIssueId} onQuickCreate={(status) => openIssueModal({ defaultStatus: status })}
          onMoveStatus={(id, status) => void state.moveIssueStatus(id, status)}
        />
      ) : view === 'backlog' ? (
        <IssuesBacklogView
          issues={state.filteredIssues} sprints={state.sprints} canWrite={canWrite} canDelete={canDelete}
          mutating={state.mutating} onSelectIssue={setSelectedIssueId}
          onMoveStatus={(id, status) => void state.moveIssueStatus(id, status)}
          onAssignSprint={(id, sprintId) => void state.assignIssueSprint(id, sprintId)}
          onCreateInSprint={(sprintId) => openIssueModal({ defaultSprintId: sprintId, defaultStatus: sprintId ? 'TODO' : 'BACKLOG' })}
          onEditSprint={setEditingSprint}
          onStartSprint={(sprintId) => void state.startSprint(sprintId)}
          onCompleteSprint={setCompletingSprint}
          onDeleteSprint={setDeletingSprint}
        />
      ) : (
        <IssuesEpicsView
          epics={filteredEpics} allIssues={state.issues} canWrite={canWrite} mutating={state.mutating}
          onSelectIssue={setSelectedIssueId} onMoveStatus={(id, status) => void state.moveIssueStatus(id, status)}
          onCreateEpic={() => openIssueModal({ defaultType: 'EPIC', defaultStatus: 'TODO' })}
          onCreateChildIssue={(epicId) => openIssueModal({ defaultParentId: epicId, defaultType: 'STORY', defaultStatus: 'TODO' })}
        />
      )}

      <IssueDetailDrawer
        workspaceId={workspace.id} projectId={project.id} issueId={selectedIssueId}
        sprints={state.sprints} epics={state.epics} allIssues={state.issues} members={members}
        canWrite={canWrite} canDelete={canDelete} canManage={canManage} currentUserId={currentUserId}
        onClose={() => setSelectedIssueId(null)} onChanged={() => void state.refresh()}
      />

      <CreateIssueModal
        open={issueModal.open} sprints={state.sprints} epics={state.epics}
        issues={state.issues} members={members}
        defaultStatus={issueModal.defaultStatus} defaultSprintId={issueModal.defaultSprintId}
        defaultParentId={issueModal.defaultParentId} defaultType={issueModal.defaultType}
        onClose={closeIssueModal}
        onSubmit={async (req) => { await state.createIssue(req); closeIssueModal(); }}
      />

      <CreateSprintModal
        open={sprintModalOpen} onClose={() => setSprintModalOpen(false)}
        onSubmit={async (req) => { await state.createSprint(req); setSprintModalOpen(false); }}
      />

      <EditSprintModal
        sprint={editingSprint} onClose={() => setEditingSprint(null)}
        onSubmit={async (sprintId, req) => { await state.updateSprint(sprintId, req); setEditingSprint(null); }}
      />

      <CompleteSprintDialog
        sprint={completingSprint} onClose={() => setCompletingSprint(null)}
        onConfirm={async (sprintId, moveIncomplete) => {
          await state.completeSprint(sprintId, moveIncomplete);
          setCompletingSprint(null);
        }}
      />

      <ConfirmDialog
        open={deletingSprint !== null} title="Delete Sprint"
        message={`Delete ${deletingSprint?.name ?? 'this sprint'}? Any issues assigned to it will return to the Backlog.`}
        confirmLabel="Delete Sprint" danger
        onConfirm={async () => {
          if (!deletingSprint) return;
          await state.deleteSprint(deletingSprint.id);
          setDeletingSprint(null);
        }}
        onClose={() => setDeletingSprint(null)}
      />
    </div>
  );
}

export function IssuesPage({ workspace, project, onOpenProject }: IssuesPageProps) {
  if (!project) {
    return (
      <div className="h-full overflow-y-auto bg-[#0D1117] p-5">
        <div className="mx-auto max-w-7xl">
          <WorkspaceIssuesPortfolio workspaceId={workspace.id} workspaceName={workspace.name} onOpenProject={onOpenProject} />
        </div>
      </div>
    );
  }
  return <ProjectIssuesWorkspace key={project.id} workspace={workspace} project={project} />;
}
