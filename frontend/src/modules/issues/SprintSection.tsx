import { useState } from 'react';
import { CheckCircle2, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { IssueDto, IssueStatus, SprintDto } from '../../types/issues.types';
import { formatSprintDates, SPRINT_STATUS_META } from './issueVisuals';
import { SprintIssueRow } from './SprintIssueRow';

interface SprintSectionProps {
  sprint: SprintDto;
  issues: IssueDto[];
  allSprints: SprintDto[];
  hasActiveSprint: boolean;
  canWrite: boolean;
  canDelete: boolean;
  mutating: boolean;
  onSelectIssue: (issueId: string) => void;
  onMoveStatus: (issueId: string, status: IssueStatus) => void;
  onAssignSprint: (issueId: string, sprintId: string | null) => void;
  onCreateInSprint: (sprintId: string) => void;
  onEditSprint: (sprint: SprintDto) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprint: SprintDto) => void;
  onDeleteSprint: (sprint: SprintDto) => void;
}

const SLICE_STEP = 50;

export function SprintSection({
  sprint,
  issues,
  allSprints,
  hasActiveSprint,
  canWrite,
  canDelete,
  mutating,
  onSelectIssue,
  onMoveStatus,
  onAssignSprint,
  onCreateInSprint,
  onEditSprint,
  onStartSprint,
  onCompleteSprint,
  onDeleteSprint,
}: SprintSectionProps) {
  const [limit, setLimit] = useState(SLICE_STEP);
  const meta = SPRINT_STATUS_META[sprint.status];
  const visible = issues.slice(0, limit);
  const remaining = issues.length - visible.length;
  const pct =
    sprint.totalStoryPoints > 0
      ? Math.min(100, Math.round((sprint.completedStoryPoints / sprint.totalStoryPoints) * 100))
      : sprint.totalIssues > 0
        ? Math.min(100, Math.round((sprint.completedIssues / sprint.totalIssues) * 100))
        : 0;

  return (
    <section aria-label={sprint.name} className="border border-[#30363D] bg-[#161B22]">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[#E6EDF3]">{sprint.name}</h2>
            <span
              className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${meta.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 ${meta.indicatorClass}`} />
              {meta.label}
            </span>
            <span className="font-mono text-[11px] text-[#8B949E]">
              {formatSprintDates(sprint.startDate, sprint.endDate)}
            </span>
          </div>
          {sprint.goal && <p className="text-xs text-[#8B949E]">{sprint.goal}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-[#8B949E]">
            <span>{sprint.completedStoryPoints} / {sprint.totalStoryPoints} SP</span>
            <span>{sprint.completedIssues}/{sprint.totalIssues} done</span>
            <div className="h-1.5 w-32 bg-[#21262D]">
              <div className="h-full bg-[#22C55E]" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[#22C55E]">{pct}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canWrite && sprint.status === 'PLANNED' && !hasActiveSprint && (
            <Button type="button" variant="primary" disabled={mutating} onClick={() => onStartSprint(sprint.id)}>
              <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
              Start Sprint
            </Button>
          )}
          {canWrite && sprint.status === 'ACTIVE' && (
            <Button type="button" variant="secondary" disabled={mutating} onClick={() => onCompleteSprint(sprint)}>
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
              Complete Sprint
            </Button>
          )}
          {canWrite && sprint.status !== 'COMPLETED' && (
            <Button type="button" variant="secondary" disabled={mutating} onClick={() => onCreateInSprint(sprint.id)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Add Issue to Sprint
            </Button>
          )}
          {canWrite && (
            <Button
              type="button"
              variant="ghost"
              disabled={mutating}
              aria-label={`Edit ${sprint.name}`}
              onClick={() => onEditSprint(sprint)}
            >
              <Pencil className="h-3.5 w-3.5 text-[#8B949E]" strokeWidth={1.5} />
            </Button>
          )}
          {canDelete && sprint.status !== 'ACTIVE' && (
            <Button
              type="button"
              variant="ghost"
              disabled={mutating}
              aria-label={`Delete ${sprint.name}`}
              onClick={() => onDeleteSprint(sprint)}
            >
              <Trash2 className="h-3.5 w-3.5 text-[#EF4444]" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="border-t border-[#21262D] bg-[#0D1117] px-4 py-5 text-center text-xs text-[#7D8590]">
          No issues in this sprint match the active filters.
        </div>
      ) : (
        visible.map((issue) => (
          <SprintIssueRow
            key={issue.id}
            issue={issue}
            sprints={allSprints}
            isBacklog={false}
            canWrite={canWrite}
            mutating={mutating}
            onSelectIssue={onSelectIssue}
            onMoveStatus={onMoveStatus}
            onAssignSprint={onAssignSprint}
          />
        ))
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit((prev) => prev + SLICE_STEP)}
          className="w-full border-t border-[#21262D] bg-[#161B22] py-2 font-mono text-[11px] text-[#22C55E] hover:bg-[#21262D]"
        >
          Show {Math.min(remaining, SLICE_STEP)} more issues ({remaining} left)
        </button>
      )}
    </section>
  );
}
