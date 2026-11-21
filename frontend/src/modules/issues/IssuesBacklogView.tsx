import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { IssueDto, IssueStatus, SprintDto, SprintStatus } from '../../types/issues.types';
import { sumStoryPoints } from './issueVisuals';
import { SprintIssueRow } from './SprintIssueRow';
import { SprintSection } from './SprintSection';

interface IssuesBacklogViewProps {
  issues: IssueDto[];
  sprints: SprintDto[];
  canWrite: boolean;
  canDelete: boolean;
  mutating: boolean;
  onSelectIssue: (issueId: string) => void;
  onMoveStatus: (issueId: string, status: IssueStatus) => void;
  onAssignSprint: (issueId: string, sprintId: string | null) => void;
  onCreateInSprint: (sprintId: string | null) => void;
  onStartSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  onDeleteSprint: (sprintId: string) => void;
}

const SPRINT_ORDER: Record<SprintStatus, number> = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2 };
const BACKLOG_SLICE = 50;

export function IssuesBacklogView(props: IssuesBacklogViewProps) {
  const { issues, sprints, canWrite, mutating } = props;
  const [backlogLimit, setBacklogLimit] = useState(BACKLOG_SLICE);

  const orderedSprints = useMemo(
    () => [...sprints].sort((a, b) => SPRINT_ORDER[a.status] - SPRINT_ORDER[b.status]),
    [sprints]
  );
  const hasActiveSprint = useMemo(() => sprints.some((s) => s.status === 'ACTIVE'), [sprints]);
  const backlogIssues = useMemo(() => issues.filter((i) => i.sprintId === null), [issues]);
  const backlogSp = useMemo(() => sumStoryPoints(backlogIssues), [backlogIssues]);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto bg-[#0D1117] p-5">
      {orderedSprints.map((sprint) => (
        <SprintSection
          key={sprint.id}
          sprint={sprint}
          issues={issues.filter((i) => i.sprintId === sprint.id)}
          allSprints={sprints}
          hasActiveSprint={hasActiveSprint}
          canWrite={canWrite}
          canDelete={props.canDelete}
          mutating={mutating}
          onSelectIssue={props.onSelectIssue}
          onMoveStatus={props.onMoveStatus}
          onAssignSprint={props.onAssignSprint}
          onCreateInSprint={(id) => props.onCreateInSprint(id)}
          onStartSprint={props.onStartSprint}
          onCompleteSprint={props.onCompleteSprint}
          onDeleteSprint={props.onDeleteSprint}
        />
      ))}

      <section aria-label="Backlog" className="border border-[#30363D] bg-[#161B22]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-[#E6EDF3]">Backlog</h2>
            <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[11px] text-[#8B949E]">
              {backlogIssues.length} issues
            </span>
            <span className="font-mono text-[11px] text-[#8B949E]">{backlogSp} SP</span>
          </div>
          {canWrite && (
            <Button
              type="button"
              variant="secondary"
              disabled={mutating}
              onClick={() => props.onCreateInSprint(null)}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Add Backlog Issue
            </Button>
          )}
        </div>

        {backlogIssues.length === 0 ? (
          <div className="border-t border-[#21262D] bg-[#0D1117] px-4 py-6 text-center text-xs text-[#7D8590]">
            No unscheduled backlog issues.
          </div>
        ) : (
          backlogIssues.slice(0, backlogLimit).map((issue) => (
            <SprintIssueRow
              key={issue.id}
              issue={issue}
              sprints={sprints}
              isBacklog
              canWrite={canWrite}
              mutating={mutating}
              onSelectIssue={props.onSelectIssue}
              onMoveStatus={props.onMoveStatus}
              onAssignSprint={props.onAssignSprint}
            />
          ))
        )}

        {backlogIssues.length > backlogLimit && (
          <button
            type="button"
            onClick={() => setBacklogLimit((prev) => prev + BACKLOG_SLICE)}
            className="w-full border-t border-[#21262D] bg-[#161B22] py-2 font-mono text-[11px] text-[#22C55E] hover:bg-[#21262D]"
          >
            Show {Math.min(backlogIssues.length - backlogLimit, BACKLOG_SLICE)} more backlog issues
          </button>
        )}
      </section>
    </div>
  );
}
