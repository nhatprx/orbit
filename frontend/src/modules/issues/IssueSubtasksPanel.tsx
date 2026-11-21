import { useState, type FormEvent } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SquareCheckbox } from '../../components/ui/SquareCheckbox';
import { issuesService } from '../../services/issues/issues.service';
import { errorMessage } from '../../services/workspace/httpClient';
import type { IssueDto, IssuePriority } from '../../types/issues.types';
import {
  ISSUE_PRIORITIES,
  PRIORITY_DOT_CLASS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
} from './issueDetailMeta';

export interface IssueSubtasksPanelProps {
  workspaceId: string;
  projectId: string;
  parentIssue: IssueDto;
  subtasks: IssueDto[];
  canWrite: boolean;
  onMutated: () => Promise<void> | void;
}

export function IssueSubtasksPanel({
  workspaceId,
  projectId,
  parentIssue,
  subtasks,
  canWrite,
  onMutated,
}: IssueSubtasksPanelProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completed = subtasks.filter((item) => item.status === 'DONE').length;
  const total = subtasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const canAddSubtask = canWrite && parentIssue.type !== 'SUBTASK';

  async function handleToggle(subtask: IssueDto, checked: boolean) {
    setTogglingId(subtask.id);
    setError(null);
    try {
      await issuesService.updateIssue(workspaceId, projectId, subtask.id, {
        status: checked ? 'DONE' : 'TODO',
      });
      await onMutated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      await issuesService.createIssue(workspaceId, projectId, {
        type: 'SUBTASK',
        title: trimmed,
        status: 'TODO',
        priority,
        parentId: parentIssue.id,
        sprintId: parentIssue.sprintId,
      });
      setTitle('');
      setPriority('MEDIUM');
      await onMutated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-[#30363D] pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E6EDF3]">
            Subtasks
          </h3>
        </div>
        <span className="font-mono text-xs text-[#8B949E]">
          {completed}/{total} done ({percent}%)
        </span>
      </div>

      <div className="h-1.5 w-full bg-[#21262D]" aria-label="Subtasks progress">
        <div className="h-full bg-[#22C55E]" style={{ width: `${percent}%` }} />
      </div>

      {error && (
        <p role="alert" className="border border-[#EF4444] bg-[#0D1117] px-2.5 py-1.5 text-xs text-[#EF4444]">
          {error}
        </p>
      )}

      {subtasks.length === 0 ? (
        <p className="text-xs text-[#8B949E]">No subtasks linked to this issue yet.</p>
      ) : (
        <div className="space-y-1.5">
          {subtasks.map((sub) => {
            const done = sub.status === 'DONE';
            return (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-2 border border-[#30363D] bg-[#0D1117] px-2.5 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <SquareCheckbox
                    checked={done}
                    disabled={!canWrite || togglingId === sub.id}
                    label={`Toggle subtask ${sub.issueKey}`}
                    onChange={(next) => void handleToggle(sub, next)}
                  />
                  <span className="shrink-0 font-mono text-xs text-[#22C55E]">{sub.issueKey}</span>
                  <span
                    className={`truncate text-xs ${
                      done ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'
                    }`}
                  >
                    {sub.title}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    title={PRIORITY_LABELS[sub.priority]}
                    className={`h-1.5 w-1.5 ${PRIORITY_DOT_CLASS[sub.priority]}`}
                  />
                  <Badge tone={STATUS_TONE[sub.status]}>{STATUS_LABELS[sub.status]}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canAddSubtask && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            aria-label="New subtask title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a subtask..."
            maxLength={255}
            className="h-8 min-w-[180px] flex-1 rounded-none border border-[#30363D] bg-[#0D1117] px-2.5 text-xs text-[#E6EDF3] placeholder-[#8B949E] focus:border-[#22C55E] focus:outline-none"
          />
          <select
            aria-label="New subtask priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as IssuePriority)}
            className="h-8 rounded-none border border-[#30363D] bg-[#0D1117] px-2 text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
          >
            {ISSUE_PRIORITIES.map((pr) => (
              <option key={pr} value={pr}>{PRIORITY_LABELS[pr]}</option>
            ))}
          </select>
          <Button type="submit" variant="secondary" disabled={creating || !title.trim()}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            {creating ? 'Adding...' : 'Add Subtask'}
          </Button>
        </form>
      )}
    </section>
  );
}
