import { useCallback, useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { issuesService } from '../../services/issues/issues.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { IssueDetailDto, IssueDto, SprintDto, UpdateIssueRequest } from '../../types/issues.types';
import { formatDateTime } from '../../utils/format';
import { IssueCommentsActivity } from './IssueCommentsActivity';
import { IssueMetadataForm } from './IssueMetadataForm';
import { IssueSubtasksPanel } from './IssueSubtasksPanel';
import { PRIORITY_TONE, STATUS_LABELS, STATUS_TONE, TYPE_LABELS } from './issueDetailMeta';

export interface IssueDetailDrawerProps {
  workspaceId: string;
  projectId: string;
  issueId: string | null;
  sprints: SprintDto[];
  epics: IssueDto[];
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function IssueDetailDrawer({
  workspaceId,
  projectId,
  issueId,
  sprints,
  epics,
  canWrite,
  canDelete,
  onClose,
  onChanged,
}: IssueDetailDrawerProps) {
  const [detail, setDetail] = useState<IssueDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await issuesService.getIssueDetail(workspaceId, projectId, issueId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, issueId]);

  useEffect(() => {
    if (!issueId) {
      setDetail(null);
      setError(null);
      setConfirmDeleteOpen(false);
      return;
    }
    void loadDetail();
  }, [issueId, loadDetail]);

  useEffect(() => {
    if (!issueId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirmDeleteOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [issueId, confirmDeleteOpen, onClose]);

  if (!issueId) return null;

  async function handleSave(request: UpdateIssueRequest) {
    if (!issueId) return;
    setSaving(true);
    setError(null);
    try {
      await issuesService.updateIssue(workspaceId, projectId, issueId, request);
      await loadDetail();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubMutation() {
    await loadDetail();
    onChanged();
  }

  async function handleDeleteIssue() {
    if (!issueId) return;
    await issuesService.deleteIssue(workspaceId, projectId, issueId);
    onChanged();
    onClose();
  }

  const issue = detail?.issue ?? null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/60"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={issue ? `Issue ${issue.issueKey}` : 'Issue details'}
        className="flex h-full w-full max-w-2xl flex-col border-l border-[#30363D] bg-[#161B22]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#30363D] px-5 py-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#22C55E]">{issue?.issueKey ?? 'Issue'}</span>
            {issue && (
              <>
                <Badge tone="neutral">{TYPE_LABELS[issue.type]}</Badge>
                <Badge tone={STATUS_TONE[issue.status]} withDot>{STATUS_LABELS[issue.status]}</Badge>
                <Badge tone={PRIORITY_TONE[issue.priority]}>{issue.priority}</Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canDelete && issue && (
              <Button type="button" variant="ghost" aria-label="Delete issue" onClick={() => setConfirmDeleteOpen(true)} className="text-[#EF4444] hover:border-[#EF4444] hover:text-[#EF4444]">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                Delete
              </Button>
            )}
            <button type="button" aria-label="Close issue drawer" onClick={onClose} className="p-1 text-[#8B949E] hover:text-[#E6EDF3]">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {loading && !detail && <LoadingView label="Loading issue details..." />}
          {error && <ErrorView message={error} onRetry={() => void loadDetail()} />}
          {detail && (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border border-[#21262D] bg-[#0D1117] px-3 py-2 font-mono text-[11px] text-[#8B949E]">
                <span>Reporter: <strong className="font-normal text-[#E6EDF3]">{detail.issue.reporterName}</strong></span>
                <span>Assignee: <strong className="font-normal text-[#E6EDF3]">{detail.issue.assigneeName ?? 'Unassigned'}</strong></span>
                <span>Updated: <strong className="font-normal text-[#E6EDF3]">{formatDateTime(detail.issue.updatedAt)}</strong></span>
              </div>
              <IssueMetadataForm issue={detail.issue} sprints={sprints} epics={epics} canWrite={canWrite} saving={saving} onSave={handleSave} />
              <IssueSubtasksPanel workspaceId={workspaceId} projectId={projectId} parentIssue={detail.issue} subtasks={detail.subtasks} canWrite={canWrite} onMutated={handleSubMutation} />
              <IssueCommentsActivity workspaceId={workspaceId} projectId={projectId} issueId={detail.issue.id} comments={detail.comments} activities={detail.activities} canWrite={canWrite} canDelete={canDelete} onMutated={handleSubMutation} />
            </>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Issue"
        message={`Delete ${issue?.issueKey ?? 'this issue'} permanently? Linked comments and activity history will be removed.`}
        confirmLabel="Delete Issue"
        danger
        onConfirm={handleDeleteIssue}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
