import { CheckSquare, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import type { IssueDto, IssueStatus } from '../../types/issues.types';
import {
  ISSUE_PRIORITY_META,
  ISSUE_STATUS_META,
  ISSUE_STATUS_ORDER,
  ISSUE_TYPE_META,
} from './issueVisuals';

interface IssueKanbanCardProps {
  issue: IssueDto;
  canWrite: boolean;
  mutating: boolean;
  onSelect: (issueId: string) => void;
  onMoveStatus: (issueId: string, nextStatus: IssueStatus) => void;
}

export function IssueKanbanCard({
  issue,
  canWrite,
  mutating,
  onSelect,
  onMoveStatus,
}: IssueKanbanCardProps) {
  const statusIndex = ISSUE_STATUS_ORDER.indexOf(issue.status);
  const prevStatus = statusIndex > 0 ? ISSUE_STATUS_ORDER[statusIndex - 1] : null;
  const nextStatus =
    statusIndex >= 0 && statusIndex < ISSUE_STATUS_ORDER.length - 1
      ? ISSUE_STATUS_ORDER[statusIndex + 1]
      : null;

  const typeMeta = ISSUE_TYPE_META[issue.type];
  const priorityMeta = ISSUE_PRIORITY_META[issue.priority];

  return (
    <article
      onClick={() => onSelect(issue.id)}
      className="group cursor-pointer border border-[#30363D] bg-[#161B22] p-3 transition-colors hover:border-[#22C55E]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 ${priorityMeta.indicatorClass}`}
            title={`Priority: ${priorityMeta.label}`}
            aria-label={`Priority ${priorityMeta.label}`}
          />
          <span className="font-mono text-xs font-medium text-[#22C55E]">
            {issue.issueKey}
          </span>
          <span
            className={`border px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider ${typeMeta.badgeClass}`}
          >
            {typeMeta.label}
          </span>
        </div>

        {canWrite && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={!prevStatus || mutating}
              aria-label={
                prevStatus
                  ? `Move ${issue.issueKey} to ${ISSUE_STATUS_META[prevStatus].label}`
                  : `Cannot move ${issue.issueKey} left`
              }
              title={prevStatus ? `Move to ${ISSUE_STATUS_META[prevStatus].label}` : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (prevStatus) onMoveStatus(issue.id, prevStatus);
              }}
              className="border border-[#30363D] bg-[#0D1117] p-0.5 text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              disabled={!nextStatus || mutating}
              aria-label={
                nextStatus
                  ? `Move ${issue.issueKey} to ${ISSUE_STATUS_META[nextStatus].label}`
                  : `Cannot move ${issue.issueKey} right`
              }
              title={nextStatus ? `Move to ${ISSUE_STATUS_META[nextStatus].label}` : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (nextStatus) onMoveStatus(issue.id, nextStatus);
              }}
              className="border border-[#30363D] bg-[#0D1117] p-0.5 text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(issue.id);
        }}
        className="mb-2 block w-full text-left text-[13px] font-medium leading-snug text-[#E6EDF3] group-hover:text-[#4ADE80]"
      >
        <span className="line-clamp-2">{issue.title}</span>
      </button>

      {issue.parentKey && (
        <div className="mb-2">
          <span className="inline-block border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] text-[#8B949E]">
            {issue.parentKey}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-[#21262D] pt-2 text-[11px] text-[#8B949E]">
        <div className="flex items-center gap-2 font-mono">
          {issue.subtaskCount > 0 && (
            <span className="inline-flex items-center gap-1" title="Subtasks completed">
              <CheckSquare className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
              {issue.completedSubtaskCount}/{issue.subtaskCount}
            </span>
          )}
          {issue.commentCount > 0 && (
            <span className="inline-flex items-center gap-1" title="Comments">
              <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
              {issue.commentCount}
            </span>
          )}
          {issue.storyPoints !== null && (
            <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 text-[10px] text-[#E6EDF3]">
              {issue.storyPoints} SP
            </span>
          )}
        </div>

        <span className="max-w-[110px] truncate text-[11px] text-[#8B949E]">
          {issue.assigneeName ?? 'Unassigned'}
        </span>
      </div>
    </article>
  );
}
