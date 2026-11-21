import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import type {
  IssueDto, IssuePriority, IssueStatus, IssueType, SprintDto, UpdateIssueRequest,
} from '../../types/issues.types';
import type { MemberDto } from '../../types/workspace.types';
import {
  ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS,
  parseLabelsInput, parseStoryPoints,
} from './issueDetailMeta';

export interface IssueMetadataFormProps {
  issue: IssueDto;
  sprints: SprintDto[];
  epics: IssueDto[];
  allIssues?: IssueDto[];
  members?: MemberDto[];
  canWrite: boolean;
  saving: boolean;
  onSave: (request: UpdateIssueRequest) => Promise<void>;
}

interface MetadataFormState {
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  storyPoints: string;
  sprintId: string;
  parentId: string;
  assigneeId: string;
  labels: string;
  dueDate: string;
}

function toFormState(issue: IssueDto): MetadataFormState {
  return {
    title: issue.title,
    description: issue.description ?? '',
    status: issue.status,
    priority: issue.priority,
    type: issue.type,
    storyPoints: issue.storyPoints !== null ? String(issue.storyPoints) : '',
    sprintId: issue.sprintId ?? '',
    parentId: issue.parentId ?? '',
    assigneeId: issue.assigneeId ?? '',
    labels: issue.labels.join(', '),
    dueDate: issue.dueDate ?? '',
  };
}

export function IssueMetadataForm({
  issue, sprints, epics, allIssues, members = [], canWrite, saving, onSave,
}: IssueMetadataFormProps) {
  const [form, setForm] = useState<MetadataFormState>(() => toFormState(issue));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toFormState(issue));
    setValidationError(null);
  }, [issue]);

  function patch<K extends keyof MetadataFormState>(key: K, value: MetadataFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const parentOptions = useMemo(() => {
    const base = form.type === 'SUBTASK'
      ? (allIssues ?? epics).filter((item) => item.type !== 'SUBTASK')
      : epics;
    return base.filter((item) => item.id !== issue.id);
  }, [form.type, allIssues, epics, issue.id]);

  const keepCurrentParent = Boolean(
    issue.parentId && !parentOptions.some((item) => item.id === issue.parentId)
  );
  const keepCurrentAssignee = Boolean(
    issue.assigneeId && !members.some((m) => m.userId === issue.assigneeId)
  );
  const parsedLabels = parseLabelsInput(form.labels);
  const parentLabel = form.type === 'SUBTASK' ? 'Parent Issue' : 'Parent Epic';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || saving) return;
    const title = form.title.trim();
    if (!title) { setValidationError('Title is required.'); return; }
    const points = parseStoryPoints(form.storyPoints);
    if (points.error) { setValidationError(points.error); return; }
    setValidationError(null);
    await onSave({
      title,
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      type: form.type,
      storyPoints: points.value,
      clearStoryPoints: points.value === null,
      sprintId: form.sprintId || null,
      clearSprint: !form.sprintId,
      parentId: form.parentId || null,
      clearParent: !form.parentId,
      assigneeId: form.assigneeId || null,
      clearAssignee: !form.assigneeId,
      labels: parsedLabels,
      dueDate: form.dueDate || null,
      clearDueDate: !form.dueDate,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <TextField label="Title" value={form.title} onChange={(e) => patch('title', e.target.value)} disabled={!canWrite} maxLength={255} required />
      <TextAreaField label="Description" rows={3} value={form.description} onChange={(e) => patch('description', e.target.value)} disabled={!canWrite} placeholder="Acceptance criteria, technical scope, reproduction steps..." />

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Status" value={form.status} onChange={(e) => patch('status', e.target.value as IssueStatus)} disabled={!canWrite}>
          {ISSUE_STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
        </SelectField>
        <SelectField label="Priority" value={form.priority} onChange={(e) => patch('priority', e.target.value as IssuePriority)} disabled={!canWrite}>
          {ISSUE_PRIORITIES.map((pr) => <option key={pr} value={pr}>{PRIORITY_LABELS[pr]}</option>)}
        </SelectField>
        <SelectField label="Type" value={form.type} onChange={(e) => patch('type', e.target.value as IssueType)} disabled={!canWrite}>
          {ISSUE_TYPES.map((tp) => <option key={tp} value={tp}>{TYPE_LABELS[tp]}</option>)}
        </SelectField>
        <TextField label="Story Points" type="number" min={0} max={100} value={form.storyPoints} onChange={(e) => patch('storyPoints', e.target.value)} disabled={!canWrite} placeholder="0 - 100" />
        <SelectField label="Sprint" value={form.sprintId} onChange={(e) => patch('sprintId', e.target.value)} disabled={!canWrite}>
          <option value="">Backlog (No Sprint)</option>
          {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name} ({sp.status})</option>)}
        </SelectField>
        <SelectField label={parentLabel} value={form.parentId} onChange={(e) => patch('parentId', e.target.value)} disabled={!canWrite}>
          <option value="">None</option>
          {keepCurrentParent && issue.parentId && (
            <option value={issue.parentId}>{issue.parentKey ?? 'Current Parent'}</option>
          )}
          {parentOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.issueKey} — {item.title}</option>
          ))}
        </SelectField>
        <SelectField label="Assignee" value={form.assigneeId} onChange={(e) => patch('assigneeId', e.target.value)} disabled={!canWrite}>
          <option value="">Unassigned</option>
          {keepCurrentAssignee && issue.assigneeId && (
            <option value={issue.assigneeId}>{issue.assigneeName ?? issue.assigneeId}</option>
          )}
          {members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName || m.username}</option>)}
        </SelectField>
        <TextField label="Due Date" type="date" value={form.dueDate} onChange={(e) => patch('dueDate', e.target.value)} disabled={!canWrite} />
      </div>

      <TextField label="Labels" value={form.labels} onChange={(e) => patch('labels', e.target.value)} disabled={!canWrite} placeholder="auth, api, regression" />

      {parsedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {parsedLabels.map((lbl) => <Badge key={lbl} tone="neutral">{lbl}</Badge>)}
        </div>
      )}

      {validationError && <p role="alert" className="text-xs text-[#EF4444]">{validationError}</p>}

      {canWrite && (
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" disabled={saving}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
}
