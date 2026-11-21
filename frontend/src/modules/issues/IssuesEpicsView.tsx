import { useMemo } from 'react';
import { Flag, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyView } from '../../components/ui/StateViews';
import type { IssueDto, IssueStatus } from '../../types/issues.types';
import { EpicCard } from './EpicCard';

interface IssuesEpicsViewProps {
  epics: IssueDto[];
  allIssues: IssueDto[];
  canWrite: boolean;
  mutating: boolean;
  onSelectIssue: (issueId: string) => void;
  onMoveStatus: (issueId: string, status: IssueStatus) => void;
  onCreateEpic: () => void;
  onCreateChildIssue: (epicId: string) => void;
}

export function IssuesEpicsView({
  epics,
  allIssues,
  canWrite,
  mutating,
  onSelectIssue,
  onMoveStatus,
  onCreateEpic,
  onCreateChildIssue,
}: IssuesEpicsViewProps) {
  const childrenByEpic = useMemo(() => {
    const map = new Map<string, IssueDto[]>();
    for (const issue of allIssues) {
      if (!issue.parentId) continue;
      const list = map.get(issue.parentId) ?? [];
      list.push(issue);
      map.set(issue.parentId, list);
    }
    return map;
  }, [allIssues]);

  if (epics.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0D1117] p-6">
        <EmptyView
          title="No epics yet"
          description="Group stories, tasks, and bugs under epics to track milestone progress across sprints."
          action={
            canWrite ? (
              <Button type="button" variant="primary" onClick={onCreateEpic}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Create Epic
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-[#0D1117] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#8B949E]">
          <Flag className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          <span className="font-mono uppercase tracking-wider">{epics.length} Epics</span>
        </div>
        {canWrite && (
          <Button type="button" variant="secondary" onClick={onCreateEpic}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            New Epic
          </Button>
        )}
      </div>

      {epics.map((epic) => (
        <EpicCard
          key={epic.id}
          epic={epic}
          childrenIssues={childrenByEpic.get(epic.id) ?? []}
          canWrite={canWrite}
          mutating={mutating}
          onSelectIssue={onSelectIssue}
          onMoveStatus={onMoveStatus}
          onCreateChildIssue={onCreateChildIssue}
        />
      ))}
    </div>
  );
}
