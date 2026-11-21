import type { IssueDto, IssueStatus, SprintDto } from '../../types/issues.types';
import {
  ISSUE_PRIORITY_META,
  ISSUE_STATUS_META,
  ISSUE_STATUS_ORDER,
  ISSUE_TYPE_META,
} from './issueVisuals';

interface SprintIssueRowProps {
  issue: IssueDto;
  sprints: SprintDto[];
  isBacklog: boolean;
  canWrite: boolean;
  mutating: boolean;
  onSelectIssue: (issueId: string) => void;
  onMoveStatus: (issueId: string, status: IssueStatus) => void;
  onAssignSprint: (issueId: string, sprintId: string | null) => void;
}

const ROW_SELECT =
  'h-7 border border-[#30363D] bg-[#0D1117] px-1.5 text-[11px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none disabled:opacity-50';

export function SprintIssueRow({
  issue,
  sprints,
  isBacklog,
  canWrite,
  mutating,
  onSelectIssue,
  onMoveStatus,
  onAssignSprint,
}: SprintIssueRowProps) {
  const typeMeta = ISSUE_TYPE_META[issue.type];
  const priorityMeta = ISSUE_PRIORITY_META[issue.priority];
  const statusMeta = ISSUE_STATUS_META[issue.status];
  const targetSprints = isBacklog
    ? sprints.filter((s) => s.status === 'ACTIVE' || s.status === 'PLANNED')
    : sprints;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#21262D] bg-[#0D1117] px-4 py-2 hover:bg-[#161B22]">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 ${priorityMeta.indicatorClass}`}
          title={`Priority: ${priorityMeta.label}`}
        />
        <button
          type="button"
          onClick={() => onSelectIssue(issue.id)}
          className="shrink-0 font-mono text-xs font-medium text-[#22C55E] hover:underline"
        >
          {issue.issueKey}
        </button>
        <span
          className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${typeMeta.badgeClass}`}
        >
          {typeMeta.label}
        </span>
        <button
          type="button"
          onClick={() => onSelectIssue(issue.id)}
          className="min-w-0 flex-1 truncate text-left text-[13px] text-[#E6EDF3] hover:text-[#4ADE80]"
        >
          {issue.title}
        </button>
        {issue.parentKey && (
          <span className="hidden shrink-0 border border-[#30363D] bg-[#161B22] px-1.5 py-0.5 font-mono text-[10px] text-[#8B949E] md:inline-block">
            {issue.parentKey}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="w-12 text-right font-mono text-[11px] text-[#8B949E]">
          {issue.storyPoints !== null ? `${issue.storyPoints} SP` : '-'}
        </span>
        <span className="hidden w-24 truncate text-xs text-[#8B949E] sm:inline-block">
          {issue.assigneeName ?? 'Unassigned'}
        </span>

        {canWrite ? (
          <select
            aria-label={`Status for ${issue.issueKey}`}
            value={issue.status}
            disabled={mutating}
            onChange={(e) => onMoveStatus(issue.id, e.target.value as IssueStatus)}
            className={ROW_SELECT}
          >
            {ISSUE_STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {ISSUE_STATUS_META[status].label}
              </option>
            ))}
          </select>
        ) : (
          <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </span>
        )}

        {canWrite && (
          <select
            aria-label={
              isBacklog
                ? `Move ${issue.issueKey} to sprint`
                : `Sprint assignment for ${issue.issueKey}`
            }
            value={issue.sprintId ?? ''}
            disabled={mutating}
            onChange={(e) => onAssignSprint(issue.id, e.target.value || null)}
            className={`${ROW_SELECT} max-w-[160px]`}
          >
            <option value="">{isBacklog ? 'Move to sprint...' : 'Backlog'}</option>
            {targetSprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
