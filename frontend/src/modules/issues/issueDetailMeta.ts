import type {
  IssueActivityDto,
  IssuePriority,
  IssueStatus,
  IssueType,
} from '../../types/issues.types';

export type BadgeTone = 'neutral' | 'green' | 'warning' | 'danger';

export const ISSUE_TYPES: readonly IssueType[] = ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'];

export const ISSUE_STATUSES: readonly IssueStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

export const ISSUE_PRIORITIES: readonly IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const TYPE_LABELS: Record<IssueType, string> = {
  EPIC: 'Epic',
  STORY: 'Story',
  TASK: 'Task',
  BUG: 'Bug',
  SUBTASK: 'Subtask',
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const STATUS_TONE: Record<IssueStatus, BadgeTone> = {
  BACKLOG: 'neutral',
  TODO: 'neutral',
  IN_PROGRESS: 'green',
  IN_REVIEW: 'warning',
  DONE: 'green',
};

export const PRIORITY_TONE: Record<IssuePriority, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'neutral',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export const PRIORITY_DOT_CLASS: Record<IssuePriority, string> = {
  LOW: 'bg-[#8B949E]',
  MEDIUM: 'bg-[#E6EDF3]',
  HIGH: 'bg-[#EAB308]',
  CRITICAL: 'bg-[#EF4444]',
};

export function parseLabelsInput(raw: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(trimmed);
    if (labels.length >= 15) break;
  }
  return labels;
}

export function parseStoryPoints(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    return { value: null, error: 'Story points must be a whole number from 0 to 100.' };
  }
  return { value: parsed, error: null };
}

export function formatActivitySummary(item: IssueActivityDto): string {
  switch (item.action) {
    case 'CREATED':
      return item.newValue ? `Created issue ${item.newValue}` : 'Created issue';
    case 'STATUS_CHANGED':
      return `Changed status from ${item.oldValue ?? 'Unknown'} to ${item.newValue ?? 'Unknown'}`;
    case 'PRIORITY_CHANGED':
      return `Changed priority from ${item.oldValue ?? 'Unknown'} to ${item.newValue ?? 'Unknown'}`;
    case 'SPRINT_CHANGED':
      return `Moved sprint from ${item.oldValue ?? 'Backlog'} to ${item.newValue ?? 'Backlog'}`;
    case 'ASSIGNEE_CHANGED':
      return `Changed assignee from ${item.oldValue ?? 'Unassigned'} to ${item.newValue ?? 'Unassigned'}`;
    case 'SUBTASK_ADDED':
      return item.newValue ? `Added subtask ${item.newValue}` : 'Added a subtask';
    case 'COMMENT_ADDED':
      return item.newValue ? `Commented: "${item.newValue}"` : 'Added a comment';
    default:
      if (item.fieldName && (item.oldValue || item.newValue)) {
        return `Updated ${item.fieldName}: ${item.oldValue ?? 'none'} -> ${item.newValue ?? 'none'}`;
      }
      return 'Updated issue fields';
  }
}
