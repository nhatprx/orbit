import type {
  IssueDto,
  IssuePriority,
  IssueStatus,
  IssueType,
} from '../../types/issues.types';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';

export interface ProjectIssueFilters {
  type: IssueType | 'ALL';
  status: IssueStatus | 'ALL';
  priority: IssuePriority | 'ALL';
  sprintId: string | 'ALL' | 'BACKLOG';
  q: string;
}

export const INITIAL_ISSUE_FILTERS: ProjectIssueFilters = {
  type: 'ALL',
  status: 'ALL',
  priority: 'ALL',
  sprintId: 'ALL',
  q: '',
};

export function hasActiveIssueFilters(filters: ProjectIssueFilters): boolean {
  return (
    filters.type !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.priority !== 'ALL' ||
    filters.sprintId !== 'ALL' ||
    filters.q.trim().length > 0
  );
}

export function matchesProjectIssueFilters(
  issue: IssueDto,
  filters: ProjectIssueFilters
): boolean {
  if (filters.type !== 'ALL' && issue.type !== filters.type) return false;
  if (filters.status !== 'ALL' && issue.status !== filters.status) return false;
  if (filters.priority !== 'ALL' && issue.priority !== filters.priority) return false;
  if (filters.sprintId === 'BACKLOG') {
    if (issue.sprintId !== null) return false;
  } else if (filters.sprintId !== 'ALL' && issue.sprintId !== filters.sprintId) {
    return false;
  }
  const term = filters.q.trim().toLowerCase();
  if (!term) return true;
  return (
    issue.issueKey.toLowerCase().includes(term) ||
    issue.title.toLowerCase().includes(term) ||
    (issue.description ?? '').toLowerCase().includes(term) ||
    issue.labels.some((lbl) => lbl.toLowerCase().includes(term))
  );
}

export function resolveProjectIssuePermissions(
  workspace: WorkspaceDto,
  project: ProjectDto
): { canWrite: boolean; canDelete: boolean } {
  const perms = new Set([...project.myPermissions, ...workspace.myPermissions]);
  const hasExplicit =
    perms.has('pissues.read') ||
    perms.has('pissues.write') ||
    perms.has('pissues.delete') ||
    perms.has('pissues.manage') ||
    perms.has('issues.read') ||
    perms.has('issues.write') ||
    perms.has('issues.delete') ||
    perms.has('issues.manage');

  if (!hasExplicit) {
    const emptyFixtures = project.myPermissions.length === 0 && workspace.myPermissions.length === 0;
    return { canWrite: emptyFixtures, canDelete: emptyFixtures };
  }
  return {
    canWrite:
      perms.has('pissues.write') ||
      perms.has('pissues.manage') ||
      perms.has('issues.write') ||
      perms.has('issues.manage'),
    canDelete:
      perms.has('pissues.delete') ||
      perms.has('pissues.manage') ||
      perms.has('issues.delete') ||
      perms.has('issues.manage'),
  };
}
