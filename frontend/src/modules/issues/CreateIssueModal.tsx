import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { errorMessage } from '../../services/workspace/httpClient';
import type {
  CreateIssueRequest, IssueDto, IssuePriority, IssueStatus, IssueType, SprintDto,
} from '../../types/issues.types';
import type { MemberDto } from '../../types/workspace.types';
import {
  ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS,
  parseLabelsInput, parseStoryPoints,
} from './issueDetailMeta';

export interface CreateIssueModalProps {
  open: boolean;
  sprints: SprintDto[];
  epics: IssueDto[];
  issues?: IssueDto[];
  members?: MemberDto[];
  defaultStatus?: IssueStatus;
  defaultSprintId?: string | null;
  defaultParentId?: string | null;
  defaultType?: IssueType;
  onClose: () => void;
  onSubmit: (req: CreateIssueRequest) => Promise<void>;
}

interface IssueFormState {
  type: IssueType;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints: string;
  sprintId: string;
  parentId: string;
  assigneeId: string;
  labels: string;
  dueDate: string;
}

function initialForm(
  type: IssueType, status: IssueStatus, sprintId: string | null, parentId: string | null
): IssueFormState {
  return {
    type, title: '', description: '', status, priority: 'MEDIUM', storyPoints: '',
    sprintId: sprintId ?? '', parentId: parentId ?? '', assigneeId: '', labels: '', dueDate: '',
  };
}

export function CreateIssueModal({
  open, sprints, epics, issues, members = [],
  defaultStatus = 'TODO', defaultSprintId = null, defaultParentId = null, defaultType = 'TASK',
  onClose, onSubmit,
}: CreateIssueModalProps) {
  const [form, setForm] = useState<IssueFormState>(() =>
    initialForm(defaultType, defaultStatus, defaultSprintId, defaultParentId)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm(defaultType, defaultStatus, defaultSprintId, defaultParentId));
    setError(null);
  }, [open, defaultType, defaultStatus, defaultSprintId, defaultParentId]);

  const parentOptions = useMemo(() => {
    if (form.type === 'SUBTASK') {
      const pool = issues ?? epics;
      return pool.filter((item) => item.type !== 'SUBTASK');
    }
    return epics;
  }, [form.type, issues, epics]);

  function patch<K extends keyof IssueFormState>(key: K, value: IssueFormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'type' && prev.parentId) {
        const nextPool = value === 'SUBTASK' ? (issues ?? epics).filter((i) => i.type !== 'SUBTASK') : epics;
        if (!nextPool.some((item) => item.id === prev.parentId)) next.parentId = '';
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) { setError('Title is required.'); return; }
    const points = parseStoryPoints(form.storyPoints);
    if (points.error) { setError(points.error); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        type: form.type, title, description: form.description.trim() || null,
        status: form.status, priority: form.priority, storyPoints: points.value,
        sprintId: form.sprintId || null, parentId: form.parentId || null,
        assigneeId: form.assigneeId || null, labels: parseLabelsInput(form.labels),
        dueDate: form.dueDate || null,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const parentLabel = form.type === 'SUBTASK' ? 'Parent Issue' : 'Parent Epic';

  return (
    <Modal open={open} title="Create Issue" subtitle="Track an epic, story, task, bug, or subtask" size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField label="Type" value={form.type} onChange={(e) => patch('type', e.target.value as IssueType)}>
            {ISSUE_TYPES.map((tp) => <option key={tp} value={tp}>{TYPE_LABELS[tp]}</option>)}
          </SelectField>
          <SelectField label="Status" value={form.status} onChange={(e) => patch('status', e.target.value as IssueStatus)}>
            {ISSUE_STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
          </SelectField>
          <SelectField label="Priority" value={form.priority} onChange={(e) => patch('priority', e.target.value as IssuePriority)}>
            {ISSUE_PRIORITIES.map((pr) => <option key={pr} value={pr}>{PRIORITY_LABELS[pr]}</option>)}
          </SelectField>
        </div>

        <TextField label="Title" value={form.title} onChange={(e) => patch('title', e.target.value)} placeholder="Concise issue summary" maxLength={255} required />
        <TextAreaField label="Description" rows={3} value={form.description} onChange={(e) => patch('description', e.target.value)} placeholder="Context, acceptance criteria, or reproduction notes" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Story Points" type="number" min={0} max={100} value={form.storyPoints} onChange={(e) => patch('storyPoints', e.target.value)} placeholder="0 - 100" />
          <TextField label="Due Date" type="date" value={form.dueDate} onChange={(e) => patch('dueDate', e.target.value)} />
          <SelectField label="Sprint" value={form.sprintId} onChange={(e) => patch('sprintId', e.target.value)}>
            <option value="">Backlog (No Sprint)</option>
            {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name} ({sp.status})</option>)}
          </SelectField>
          <SelectField label={parentLabel} value={form.parentId} onChange={(e) => patch('parentId', e.target.value)}>
            <option value="">None</option>
            {defaultParentId && !parentOptions.some((p) => p.id === defaultParentId) && (
              <option value={defaultParentId}>Selected Parent</option>
            )}
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {form.type === 'SUBTASK' ? `[${TYPE_LABELS[item.type]}] ` : ''}{item.issueKey} — {item.title}
              </option>
            ))}
          </SelectField>
          <SelectField label="Assignee" value={form.assigneeId} onChange={(e) => patch('assigneeId', e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName || m.username}</option>)}
          </SelectField>
          <TextField label="Labels" value={form.labels} onChange={(e) => patch('labels', e.target.value)} placeholder="Comma-separated labels (e.g. auth, backend)" />
        </div>

        {error && <p role="alert" className="text-xs text-[#EF4444]">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-[#30363D] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Issue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
