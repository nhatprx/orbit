import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { IssueDto, IssueStatus } from '../../types/issues.types';
import { IssueKanbanCard } from './IssueKanbanCard';
import {
  ISSUE_STATUS_META,
  ISSUE_STATUS_ORDER,
  sumStoryPoints,
} from './issueVisuals';

interface IssuesKanbanBoardProps {
  issues: IssueDto[];
  canWrite: boolean;
  mutating: boolean;
  onSelectIssue: (issueId: string) => void;
  onQuickCreate: (status: IssueStatus) => void;
  onMoveStatus: (issueId: string, nextStatus: IssueStatus) => void;
}

const COLUMN_SLICE_STEP = 30;

export function IssuesKanbanBoard({
  issues,
  canWrite,
  mutating,
  onSelectIssue,
  onQuickCreate,
  onMoveStatus,
}: IssuesKanbanBoardProps) {
  const [columnLimits, setColumnLimits] = useState<Partial<Record<IssueStatus, number>>>({});

  const grouped = useMemo(() => {
    const map: Record<IssueStatus, IssueDto[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    for (const issue of issues) {
      map[issue.status].push(issue);
    }
    return map;
  }, [issues]);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#0D1117] p-4">
      <div className="grid h-full min-w-[1180px] grid-cols-5 gap-3">
        {ISSUE_STATUS_ORDER.map((status) => {
          const meta = ISSUE_STATUS_META[status];
          const colIssues = grouped[status];
          const totalSp = sumStoryPoints(colIssues);
          const limit = columnLimits[status] ?? COLUMN_SLICE_STEP;
          const visible = colIssues.slice(0, limit);
          const remaining = colIssues.length - visible.length;

          return (
            <section
              key={status}
              aria-label={`${meta.label} column`}
              className="flex min-h-0 flex-col border border-[#30363D] bg-[#0D1117]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 ${meta.indicatorClass}`} />
                  <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
                    {meta.label}
                  </h2>
                  <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] text-[#8B949E]">
                    {colIssues.length}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#8B949E]">{totalSp} SP</span>
                  {canWrite && (
                    <button
                      type="button"
                      aria-label={`Add issue to ${meta.label}`}
                      title={`Quick add in ${meta.label}`}
                      onClick={() => onQuickCreate(status)}
                      className="border border-[#30363D] bg-[#21262D] p-1 text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E]"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {visible.length === 0 ? (
                  <div className="border border-dashed border-[#21262D] px-3 py-6 text-center text-xs text-[#7D8590]">
                    No issues in {meta.label}
                  </div>
                ) : (
                  visible.map((issue) => (
                    <IssueKanbanCard
                      key={issue.id}
                      issue={issue}
                      canWrite={canWrite}
                      mutating={mutating}
                      onSelect={onSelectIssue}
                      onMoveStatus={onMoveStatus}
                    />
                  ))
                )}

                {remaining > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setColumnLimits((prev) => ({ ...prev, [status]: limit + COLUMN_SLICE_STEP }))
                    }
                    className="w-full border border-[#30363D] bg-[#161B22] py-1.5 font-mono text-[11px] text-[#22C55E] hover:border-[#22C55E]"
                  >
                    Show {Math.min(remaining, COLUMN_SLICE_STEP)} more ({remaining} left)
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
