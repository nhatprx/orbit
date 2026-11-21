import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  SprintStatus,
} from '../../types/issues.types';

export interface VisualMeta {
  label: string;
  badgeClass: string;
  indicatorClass: string;
  textClass: string;
}

export const ISSUE_STATUS_ORDER: readonly IssueStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

export const ISSUE_TYPE_ORDER: readonly IssueType[] = [
  'EPIC',
  'STORY',
  'TASK',
  'BUG',
  'SUBTASK',
];

export const ISSUE_PRIORITY_ORDER: readonly IssuePriority[] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
];

export const ISSUE_STATUS_META: Record<IssueStatus, VisualMeta> = {
  BACKLOG: {
    label: 'Backlog',
    badgeClass: 'border-[#30363D] bg-[#21262D] text-[#8B949E]',
    indicatorClass: 'bg-[#7D8590]',
    textClass: 'text-[#8B949E]',
  },
  TODO: {
    label: 'To Do',
    badgeClass: 'border-[#30363D] bg-[#21262D] text-[#E6EDF3]',
    indicatorClass: 'bg-[#E6EDF3]',
    textClass: 'text-[#E6EDF3]',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'border-[#EAB308] bg-[#21262D] text-[#EAB308]',
    indicatorClass: 'bg-[#EAB308]',
    textClass: 'text-[#EAB308]',
  },
  IN_REVIEW: {
    label: 'In Review',
    badgeClass: 'border-[#22C55E]/70 bg-[#052E16] text-[#86EFAC]',
    indicatorClass: 'bg-[#4ADE80]',
    textClass: 'text-[#86EFAC]',
  },
  DONE: {
    label: 'Done',
    badgeClass: 'border-[#22C55E] bg-[#052E16] text-[#22C55E]',
    indicatorClass: 'bg-[#22C55E]',
    textClass: 'text-[#22C55E]',
  },
};

export const ISSUE_PRIORITY_META: Record<IssuePriority, VisualMeta> = {
  LOW: {
    label: 'Low',
    badgeClass: 'border-[#30363D] bg-[#21262D] text-[#8B949E]',
    indicatorClass: 'bg-[#7D8590]',
    textClass: 'text-[#8B949E]',
  },
  MEDIUM: {
    label: 'Medium',
    badgeClass: 'border-[#30363D] bg-[#21262D] text-[#E6EDF3]',
    indicatorClass: 'bg-[#22C55E]',
    textClass: 'text-[#E6EDF3]',
  },
  HIGH: {
    label: 'High',
    badgeClass: 'border-[#EAB308] bg-[#21262D] text-[#EAB308]',
    indicatorClass: 'bg-[#EAB308]',
    textClass: 'text-[#EAB308]',
  },
  CRITICAL: {
    label: 'Critical',
    badgeClass: 'border-[#EF4444] bg-[#21262D] text-[#EF4444]',
    indicatorClass: 'bg-[#EF4444]',
    textClass: 'text-[#EF4444]',
  },
};

export const ISSUE_TYPE_META: Record<IssueType, VisualMeta> = {
  EPIC: {
    label: 'Epic',
    badgeClass: 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]',
    indicatorClass: 'bg-[#22C55E]',
    textClass: 'text-[#4ADE80]',
  },
  STORY: {
    label: 'Story',
    badgeClass: 'border-[#22C55E]/60 bg-[#052E16]/70 text-[#22C55E]',
    indicatorClass: 'bg-[#22C55E]',
    textClass: 'text-[#22C55E]',
  },
  TASK: {
    label: 'Task',
    badgeClass: 'border-[#30363D] bg-[#21262D] text-[#E6EDF3]',
    indicatorClass: 'bg-[#8B949E]',
    textClass: 'text-[#E6EDF3]',
  },
  BUG: {
    label: 'Bug',
    badgeClass: 'border-[#EF4444] bg-[#21262D] text-[#EF4444]',
    indicatorClass: 'bg-[#EF4444]',
    textClass: 'text-[#EF4444]',
  },
  SUBTASK: {
    label: 'Subtask',
    badgeClass: 'border-[#30363D] bg-[#0D1117] text-[#8B949E]',
    indicatorClass: 'bg-[#7D8590]',
    textClass: 'text-[#8B949E]',
  },
};

export const SPRINT_STATUS_META: Record<SprintStatus, VisualMeta> = {
  PLANNED: {
    label: 'Planned',
    badgeClass: 'border-[#30363D] bg-[#21262D] text-[#8B949E]',
    indicatorClass: 'bg-[#7D8590]',
    textClass: 'text-[#8B949E]',
  },
  ACTIVE: {
    label: 'Active',
    badgeClass: 'border-[#22C55E] bg-[#052E16] text-[#22C55E]',
    indicatorClass: 'bg-[#22C55E]',
    textClass: 'text-[#22C55E]',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'border-[#30363D] bg-[#0D1117] text-[#8B949E]',
    indicatorClass: 'bg-[#4ADE80]',
    textClass: 'text-[#8B949E]',
  },
};

export function sumStoryPoints(items: readonly { storyPoints: number | null }[]): number {
  let total = 0;
  for (const item of items) {
    if (typeof item.storyPoints === 'number') total += item.storyPoints;
  }
  return total;
}

export function formatSprintDates(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) return `${startDate} -> ${endDate}`;
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return 'Unscheduled';
}
