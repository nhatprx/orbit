import type {
  IssueActivityDto,
  IssueCommentDto,
  IssueDto,
  IssuePriority,
  IssueStatus,
  IssueType,
  SprintDto,
} from '../types/issues.types';

export interface MockIssueUser {
  id: string;
  name: string;
}

export const MOCK_ISSUE_USERS: readonly MockIssueUser[] = [
  { id: 'usr-linh', name: 'Linh Tran' },
  { id: 'usr-marcus', name: 'Marcus Chen' },
  { id: 'usr-priya', name: 'Priya Nair' },
  { id: 'usr-elena', name: 'Elena Novak' },
];

export const DEFAULT_PORTFOLIO_PROJECTS = [
  { id: 'proj-orbit-core', name: 'Orbit Core API', slug: 'orbit-core-api' },
  { id: 'proj-orbit-web', name: 'Orbit Web Shell', slug: 'orbit-web-shell' },
] as const;

export interface MockProjectSeed {
  workspaceId: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  keyPrefix: string;
  nextIssueNumber: number;
  sprints: SprintDto[];
  issues: IssueDto[];
  comments: IssueCommentDto[];
  activities: IssueActivityDto[];
}

export function deriveIssueKeyPrefix(nameOrSlug: string): string {
  const words = nameOrSlug.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const initials = words.map((w) => w[0] ?? '').join('').replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (initials.length >= 2) return initials.slice(0, 6);
  }
  const letters = nameOrSlug.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.length >= 2 ? letters.slice(0, 4) : 'ORB';
}

type IssueRow = [
  num: number,
  type: IssueType,
  status: IssueStatus,
  priority: IssuePriority,
  points: number | null,
  sprint: 'active' | 'planned' | null,
  parentNum: number | null,
  assigneeIdx: number | null,
  reporterIdx: number,
  dueDate: string | null,
  hoursAgo: number,
  labels: string[],
  title: string,
  description: string,
];

const SEED_ROWS: readonly IssueRow[] = [
  [1, 'EPIC', 'IN_PROGRESS', 'HIGH', null, null, null, 0, 0, '2026-12-01', 200, ['security', 'auth'], 'Unified Authentication & Session Security', 'Harden JWT rotation, Redis revocation lists, and API gateway throttling across workspaces.'],
  [2, 'EPIC', 'IN_PROGRESS', 'MEDIUM', null, null, null, 1, 0, '2026-12-15', 180, ['sdlc', 'issues'], 'Agile Issue Lifecycle & Sprint Engine', 'Provide Scrum and Kanban planning with epics, subtasks, and workspace portfolio rollups.'],
  [3, 'STORY', 'DONE', 'HIGH', 5, 'active', 1, 0, 1, '2026-11-18', 96, ['auth', 'redis'], 'Implement JWT rotation and Redis token revocation', 'Rotate refresh tokens on every exchange and revoke compromised token families immediately.'],
  [4, 'TASK', 'IN_REVIEW', 'HIGH', 3, 'active', 1, 2, 0, '2026-11-23', 36, ['gateway', 'ops'], 'Add rate-limit headers to workspace API gateway', 'Expose X-RateLimit-Remaining and Retry-After headers backed by Redis sliding windows.'],
  [5, 'BUG', 'IN_PROGRESS', 'CRITICAL', 3, 'active', 1, 0, 2, '2026-11-22', 14, ['auth', 'bug'], 'Fix race condition on concurrent refresh token calls', 'Parallel browser tabs trigger double refresh requests and invalidate active sessions.'],
  [6, 'SUBTASK', 'DONE', 'HIGH', 1, 'active', 5, 0, 0, '2026-11-21', 10, ['redis'], 'Add distributed lock around refresh token exchange', 'Acquire short-lived Redis lock keyed by session family before issuing replacement JWT.'],
  [7, 'SUBTASK', 'IN_PROGRESS', 'MEDIUM', 2, 'active', 5, 2, 0, '2026-11-22', 6, ['testing'], 'Write concurrency regression test for token rotation', 'Simulate 10 simultaneous refresh calls and verify single rotation without logout.'],
  [8, 'STORY', 'IN_PROGRESS', 'HIGH', 8, 'active', 2, 1, 3, '2026-11-24', 18, ['frontend', 'board'], 'Build Kanban board with single-click status transitions', 'Support 5 lifecycle columns, story point counters, and inline status movement controls.'],
  [9, 'SUBTASK', 'DONE', 'MEDIUM', 2, 'active', 8, 1, 1, '2026-11-20', 16, ['ui'], 'Create square-border issue card with priority indicator', 'Render issue key in monospace, 6x6 priority indicator block, and subtask counters.'],
  [10, 'SUBTASK', 'TODO', 'MEDIUM', 3, 'active', 8, 3, 1, '2026-11-24', 8, ['ui'], 'Add sprint story point totals to column headers', 'Compute total story points per status column and update immediately on transitions.'],
  [11, 'TASK', 'TODO', 'MEDIUM', 5, 'planned', 2, 2, 3, '2026-12-03', 48, ['sprints', 'backend'], 'Implement sprint completion rollover to backlog', 'Automatically return unfinished items to backlog when a sprint transitions to COMPLETED.'],
  [12, 'BUG', 'BACKLOG', 'LOW', 2, null, 2, null, 3, null, 72, ['ux', 'filters'], 'Preserve search filter state when switching board views', 'Switching between Kanban and Backlog resets the active search input value.'],
];

function isoHoursAgo(hours: number): string {
  return new Date(Date.parse('2026-11-21T12:00:00Z') - hours * 3_600_000).toISOString();
}

export function createMockProjectSeed(
  workspaceId: string,
  projectId: string,
  projectName = 'Orbit Platform',
  projectSlug = projectId
): MockProjectSeed {
  const prefix = deriveIssueKeyPrefix(projectName);
  const activeSprintId = `${projectId}-sp-14`;
  const plannedSprintId = `${projectId}-sp-15`;
  const issueId = (n: number) => `${projectId}-iss-${n}`;

  const sprints: SprintDto[] = [
    {
      id: activeSprintId, workspaceId, projectId,
      name: 'Sprint 14 - Identity & Audit',
      goal: 'Ship token rotation hardening, rate-limit headers, and Kanban board v1.',
      status: 'ACTIVE', startDate: '2026-11-11', endDate: '2026-11-25',
      totalIssues: 0, completedIssues: 0, totalStoryPoints: 0, completedStoryPoints: 0,
      createdAt: isoHoursAgo(240), updatedAt: isoHoursAgo(12),
    },
    {
      id: plannedSprintId, workspaceId, projectId,
      name: 'Sprint 15 - Lifecycle Automation',
      goal: 'Deliver sprint rollover automation, SLA alerts, and portfolio exports.',
      status: 'PLANNED', startDate: '2026-11-26', endDate: '2026-12-10',
      totalIssues: 0, completedIssues: 0, totalStoryPoints: 0, completedStoryPoints: 0,
      createdAt: isoHoursAgo(120), updatedAt: isoHoursAgo(24),
    },
  ];

  const issues: IssueDto[] = SEED_ROWS.map((row) => {
    const [num, type, status, priority, storyPoints, sprintTag, parentNum, assigneeIdx, reporterIdx, dueDate, hoursAgo, labels, title, description] = row;
    const assignee = assigneeIdx === null ? null : MOCK_ISSUE_USERS[assigneeIdx]!;
    const reporter = MOCK_ISSUE_USERS[reporterIdx]!;
    const sprintId = sprintTag === 'active' ? activeSprintId : sprintTag === 'planned' ? plannedSprintId : null;
    return {
      id: issueId(num), workspaceId, projectId, projectName,
      issueNumber: num, issueKey: `${prefix}-${num}`,
      type, title, description, status, priority, storyPoints,
      sprintId, sprintName: null,
      parentId: parentNum === null ? null : issueId(parentNum), parentKey: null,
      assigneeId: assignee?.id ?? null, assigneeName: assignee?.name ?? null,
      reporterId: reporter.id, reporterName: reporter.name,
      labels: [...labels], dueDate,
      subtaskCount: 0, completedSubtaskCount: 0, commentCount: 0,
      createdAt: isoHoursAgo(hoursAgo + 24), updatedAt: isoHoursAgo(hoursAgo),
    };
  });

  const comments: IssueCommentDto[] = [
    { id: `${projectId}-cmt-1`, issueId: issueId(5), authorId: MOCK_ISSUE_USERS[2]!.id, authorName: MOCK_ISSUE_USERS[2]!.name, body: 'Reproduced locally with two tabs refreshing within 40ms of each other.', createdAt: isoHoursAgo(12), updatedAt: isoHoursAgo(12) },
    { id: `${projectId}-cmt-2`, issueId: issueId(5), authorId: MOCK_ISSUE_USERS[0]!.id, authorName: MOCK_ISSUE_USERS[0]!.name, body: 'Redis lock subtask is merged; finalizing the concurrent integration test now.', createdAt: isoHoursAgo(5), updatedAt: isoHoursAgo(5) },
    { id: `${projectId}-cmt-3`, issueId: issueId(8), authorId: MOCK_ISSUE_USERS[1]!.id, authorName: MOCK_ISSUE_USERS[1]!.name, body: 'Board columns and square-border cards are wired to the service interface.', createdAt: isoHoursAgo(4), updatedAt: isoHoursAgo(4) },
  ];

  const activities: IssueActivityDto[] = [
    { id: `${projectId}-act-1`, issueId: issueId(5), actorId: MOCK_ISSUE_USERS[2]!.id, actorName: MOCK_ISSUE_USERS[2]!.name, action: 'CREATED', fieldName: null, oldValue: null, newValue: `${prefix}-5`, createdAt: isoHoursAgo(38) },
    { id: `${projectId}-act-2`, issueId: issueId(5), actorId: MOCK_ISSUE_USERS[0]!.id, actorName: MOCK_ISSUE_USERS[0]!.name, action: 'PRIORITY_CHANGED', fieldName: 'priority', oldValue: 'HIGH', newValue: 'CRITICAL', createdAt: isoHoursAgo(20) },
    { id: `${projectId}-act-3`, issueId: issueId(5), actorId: MOCK_ISSUE_USERS[0]!.id, actorName: MOCK_ISSUE_USERS[0]!.name, action: 'STATUS_CHANGED', fieldName: 'status', oldValue: 'TODO', newValue: 'IN_PROGRESS', createdAt: isoHoursAgo(14) },
    { id: `${projectId}-act-4`, issueId: issueId(8), actorId: MOCK_ISSUE_USERS[3]!.id, actorName: MOCK_ISSUE_USERS[3]!.name, action: 'CREATED', fieldName: null, oldValue: null, newValue: `${prefix}-8`, createdAt: isoHoursAgo(42) },
    { id: `${projectId}-act-5`, issueId: issueId(8), actorId: MOCK_ISSUE_USERS[1]!.id, actorName: MOCK_ISSUE_USERS[1]!.name, action: 'SPRINT_CHANGED', fieldName: 'sprint', oldValue: 'Backlog', newValue: 'Sprint 14 - Identity & Audit', createdAt: isoHoursAgo(28) },
    { id: `${projectId}-act-6`, issueId: issueId(3), actorId: MOCK_ISSUE_USERS[0]!.id, actorName: MOCK_ISSUE_USERS[0]!.name, action: 'STATUS_CHANGED', fieldName: 'status', oldValue: 'IN_REVIEW', newValue: 'DONE', createdAt: isoHoursAgo(96) },
  ];

  return {
    workspaceId, projectId, projectName, projectSlug, keyPrefix: prefix,
    nextIssueNumber: SEED_ROWS.length + 1, sprints, issues, comments, activities,
  };
}
