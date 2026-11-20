import { ArrowUpRight, RotateCcw, Settings } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { workspaceService } from '../../services/workspace/services';
import { workspaceActions } from '../../store/workspaceActions';
import type { AuthUser } from '../../types/auth.types';
import type { WorkspaceDto } from '../../types/workspace.types';
import { daysUntil, formatDate, initialsOf, pluralize } from '../../utils/format';
import type { DashboardNavigation } from '../dashboard/useDashboardNavigation';

interface ProfileWorkspacesSectionProps {
  user: AuthUser;
  nav: DashboardNavigation;
}

/** Every Workspace the user belongs to, plus soft-deleted ones still inside the 30-day restore window. */
export function ProfileWorkspacesSection({ user, nav }: ProfileWorkspacesSectionProps) {
  const list = useResource(() => workspaceService.listWorkspaces({ includeDeleted: true, page: 0, size: 100 }), []);
  const restore = useAsyncAction(async (workspace: WorkspaceDto) => {
    await workspaceService.restoreWorkspace(workspace.id);
    await workspaceActions.refreshAll();
    list.reload();
  });

  if (list.loading && !list.data) return <LoadingView label="Loading your workspaces..." />;
  if (list.error) return <ErrorView message={list.error} onRetry={list.reload} />;
  const items = list.data?.items ?? [];
  if (items.length === 0) {
    return <EmptyView title="No workspaces yet" description="Create one from the workspace switcher in the sidebar." />;
  }

  return (
    <div className="space-y-3">
      {restore.error && (
        <p role="alert" className="text-xs text-[#EF4444]">
          {restore.error}
        </p>
      )}
      {items.map((workspace) => {
        const deleted = workspace.deletedAt !== null;
        const owner = workspace.ownerId === user.id;
        return (
          <div
            key={workspace.id}
            className={`border bg-[#161B22] p-4 ${deleted ? 'border-[#EAB308]' : 'border-[#30363D]'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xs font-semibold text-[#22C55E]">
                  {initialsOf(workspace.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#E6EDF3]">{workspace.name}</p>
                  <p className="font-mono text-[11px] text-[#7D8590]">
                    {pluralize(workspace.memberCount, 'member')}, {pluralize(workspace.projectCount, 'project')}
                  </p>
                </div>
                {owner && <Badge tone="green">Owner</Badge>}
                {deleted && <Badge tone="warning" withDot>Deleted</Badge>}
              </div>

              {deleted ? (
                <Button type="button" variant="primary" disabled={restore.pending} onClick={() => void restore.run(workspace)}>
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Restore
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => void nav.switchWorkspace(workspace.id)}>
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Open
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void nav.openWorkspaceSettings(workspace.id)}>
                    <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Settings
                  </Button>
                </div>
              )}
            </div>
            {deleted && workspace.purgeAfter && (
              <p className="mt-3 border-t border-[#30363D] pt-3 text-xs text-[#EAB308]">
                This workspace is hidden for everyone. Restore it within {daysUntil(workspace.purgeAfter)} day(s)
                (until {formatDate(workspace.purgeAfter)}) or it is permanently deleted.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
