import type { MockProjectSeed } from '../../mocks/issues.mock';
import type {
  IssueDto,
  IssueFilterParams,
  ProjectIssueSummaryDto,
  SprintDto,
  WorkspaceIssuePortfolioDto,
} from '../../types/issues.types';

const PORTFOLIO_RECENT_LIMIT = 25;

export function hydrateIssue(raw: IssueDto, seed: MockProjectSeed): IssueDto {
  const sprint = raw.sprintId ? seed.sprints.find((s) => s.id === raw.sprintId) : undefined;
  const parent = raw.parentId ? seed.issues.find((i) => i.id === raw.parentId) : undefined;
  let subtaskCount = 0;
  let completedSubtaskCount = 0;
  for (const item of seed.issues) {
    if (item.parentId === raw.id && item.type === 'SUBTASK') {
      subtaskCount += 1;
      if (item.status === 'DONE') completedSubtaskCount += 1;
    }
  }
  const commentCount = seed.comments.filter((c) => c.issueId === raw.id).length;
  return {
    ...raw,
    labels: [...raw.labels],
    sprintName: sprint?.name ?? null,
    parentKey: parent?.issueKey ?? null,
    subtaskCount,
    completedSubtaskCount,
    commentCount,
  };
}

export function hydrateSprint(raw: SprintDto, issues: readonly IssueDto[]): SprintDto {
  let totalIssues = 0;
  let completedIssues = 0;
  let totalStoryPoints = 0;
  let completedStoryPoints = 0;
  for (const issue of issues) {
    if (issue.sprintId !== raw.id) continue;
    totalIssues += 1;
    const pts = issue.storyPoints ?? 0;
    totalStoryPoints += pts;
    if (issue.status === 'DONE') {
      completedIssues += 1;
      completedStoryPoints += pts;
    }
  }
  return { ...raw, totalIssues, completedIssues, totalStoryPoints, completedStoryPoints };
}

export function matchesIssueFilters(issue: IssueDto, filters?: IssueFilterParams): boolean {
  if (!filters) return true;
  if (filters.type && filters.type !== 'ALL' && issue.type !== filters.type) return false;
  if (filters.status && filters.status !== 'ALL' && issue.status !== filters.status) return false;
  if (filters.priority && filters.priority !== 'ALL' && issue.priority !== filters.priority) return false;
  if (filters.sprintId === 'BACKLOG') {
    if (issue.sprintId !== null) return false;
  } else if (filters.sprintId && filters.sprintId !== 'ALL') {
    if (issue.sprintId !== filters.sprintId) return false;
  }
  if (filters.parentId && issue.parentId !== filters.parentId) return false;
  if (filters.assigneeId && issue.assigneeId !== filters.assigneeId) return false;
  const query = filters.q?.trim().toLowerCase();
  if (query) {
    const haystack = [issue.issueKey, issue.title, issue.description ?? '', ...issue.labels]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

export function buildWorkspacePortfolio(
  workspaceId: string,
  seeds: readonly MockProjectSeed[]
): WorkspaceIssuePortfolioDto {
  let totalIssues = 0;
  let openIssues = 0;
  let inProgressIssues = 0;
  let doneIssues = 0;
  let criticalIssues = 0;
  let activeSprintsCount = 0;
  const allIssues: IssueDto[] = [];

  const projects: ProjectIssueSummaryDto[] = seeds.map((seed) => {
    const hydrated = seed.issues.map((item) => hydrateIssue(item, seed));
    allIssues.push(...hydrated);
    const backlogCount = hydrated.filter((i) => i.status === 'BACKLOG').length;
    const todoCount = hydrated.filter((i) => i.status === 'TODO').length;
    const inProgressCount = hydrated.filter((i) => i.status === 'IN_PROGRESS').length;
    const inReviewCount = hydrated.filter((i) => i.status === 'IN_REVIEW').length;
    const doneCount = hydrated.filter((i) => i.status === 'DONE').length;
    const criticalCount = hydrated.filter((i) => i.priority === 'CRITICAL').length;
    const activeSprint = seed.sprints.find((s) => s.status === 'ACTIVE');
    if (activeSprint) activeSprintsCount += 1;

    totalIssues += hydrated.length;
    openIssues += backlogCount + todoCount;
    inProgressIssues += inProgressCount + inReviewCount;
    doneIssues += doneCount;
    criticalIssues += criticalCount;

    return {
      projectId: seed.projectId,
      projectName: seed.projectName,
      projectSlug: seed.projectSlug,
      totalIssues: hydrated.length,
      backlogCount,
      todoCount,
      inProgressCount,
      inReviewCount,
      doneCount,
      criticalCount,
      activeSprintName: activeSprint?.name ?? null,
      completionPercent: hydrated.length === 0 ? 0 : Math.round((doneCount / hydrated.length) * 100),
    };
  });

  const recentIssues = allIssues
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, PORTFOLIO_RECENT_LIMIT);

  return {
    workspaceId,
    totalIssues,
    openIssues,
    inProgressIssues,
    doneIssues,
    criticalIssues,
    activeSprintsCount,
    projects,
    recentIssues,
  };
}
