import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { IssueDto, IssueStatus } from '../../types/issues.types';
import {
  ISSUE_PRIORITY_META,
  ISSUE_STATUS_META,
  ISSUE_STATUS_ORDER,
  ISSUE_TYPE_META,
  sumStoryPoints,
} from './issueVisuals';

interface EpicCardProps {
  epic: IssueDto;
  childrenIssues: IssueDto[];
  canWrite: boolean;
  mutating: boolean;
  onSelectIssue: (issueId: string) => void;
  onMoveStatus: (issueId: string, status: IssueStatus) => void;
  onCreateChildIssue: (epicId: string) => void;
}

export function EpicCard({
  epic,
  childrenIssues,
  canWrite,
  mutating,
  onSelectIssue,
  onMoveStatus,
  onCreateChildIssue,
}: EpicCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const doneChildren = childrenIssues.filter((c) => c.status === 'DONE');
  const percent =
    childrenIssues.length === 0 ? 0 : Math.round((doneChildren.length / childrenIssues.length) * 100);
  const totalSp = sumStoryPoints(childrenIssues);
  const doneSp = sumStoryPoints(doneChildren);
  const priorityMeta = ISSUE_PRIORITY_META[epic.priority];
  const statusMeta = ISSUE_STATUS_META[epic.status];

  return (
    <section className="border border-[#30363D] bg-[#161B22]">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <button
              type="button"
              aria-label={collapsed ? `Expand ${epic.issueKey}` : `Collapse ${epic.issueKey}`}
              onClick={() => setCollapsed((v) => !v)}
              className="mt-0.5 border border-[#30363D] bg-[#0D1117] p-0.5 text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E]"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`h-1.5 w-1.5 ${priorityMeta.indicatorClass}`} />
                <button type="button" onClick={() => onSelectIssue(epic.id)} className="font-mono text-xs font-medium text-[#22C55E] hover:underline">
                  {epic.issueKey}
                </button>
                <button type="button" onClick={() => onSelectIssue(epic.id)} className="text-left text-sm font-semibold text-[#E6EDF3] hover:text-[#4ADE80]">
                  {epic.title}
                </button>
                <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
                {epic.dueDate && <span className="font-mono text-[11px] text-[#8B949E]">Due {epic.dueDate}</span>}
              </div>
              {epic.description && <p className="line-clamp-2 text-xs text-[#8B949E]">{epic.description}</p>}
            </div>
          </div>

          {canWrite && (
            <Button type="button" variant="secondary" disabled={mutating} onClick={() => onCreateChildIssue(epic.id)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Add Child Issue
            </Button>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#8B949E]">
            <span>{doneChildren.length}/{childrenIssues.length} child issues completed ({percent}%)</span>
            <span>{doneSp} / {totalSp} SP</span>
          </div>
          <div className="h-1.5 w-full bg-[#21262D]">
            <div className="h-full bg-[#22C55E]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-[#21262D] bg-[#0D1117]">
          {childrenIssues.length === 0 ? (
            <p className="px-4 py-4 text-xs text-[#7D8590]">No child issues linked to this epic yet.</p>
          ) : (
            childrenIssues.map((child) => {
              const childType = ISSUE_TYPE_META[child.type];
              const childPriority = ISSUE_PRIORITY_META[child.priority];
              const childStatus = ISSUE_STATUS_META[child.status];
              return (
                <div
                  key={child.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-[#21262D] px-4 py-2 first:border-t-0 hover:bg-[#161B22]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 ${childPriority.indicatorClass}`} />
                    <button
                      type="button"
                      onClick={() => onSelectIssue(child.id)}
                      className="shrink-0 font-mono text-xs text-[#22C55E] hover:underline"
                    >
                      {child.issueKey}
                    </button>
                    <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase ${childType.badgeClass}`}>
                      {childType.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectIssue(child.id)}
                      className="min-w-0 flex-1 truncate text-left text-[13px] text-[#E6EDF3] hover:text-[#4ADE80]"
                    >
                      {child.title}
                    </button>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {child.sprintName && (
                      <span className="hidden border border-[#30363D] bg-[#161B22] px-1.5 py-0.5 font-mono text-[10px] text-[#8B949E] sm:inline-block">
                        {child.sprintName}
                      </span>
                    )}
                    <span className="w-12 text-right font-mono text-[11px] text-[#8B949E]">
                      {child.storyPoints !== null ? `${child.storyPoints} SP` : '-'}
                    </span>
                    {canWrite ? (
                      <select
                        aria-label={`Status for ${child.issueKey}`}
                        value={child.status}
                        disabled={mutating}
                        onChange={(e) => onMoveStatus(child.id, e.target.value as IssueStatus)}
                        className="h-7 border border-[#30363D] bg-[#0D1117] px-1.5 text-[11px] text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
                      >
                        {ISSUE_STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>{ISSUE_STATUS_META[s].label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase ${childStatus.badgeClass}`}>
                        {childStatus.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
