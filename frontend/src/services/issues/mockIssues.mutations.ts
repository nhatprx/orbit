import { MOCK_ISSUE_USERS, type MockProjectSeed } from '../../mocks/issues.mock';
import type {
  CreateIssueRequest,
  IssueActivityDto,
  IssueDto,
  UpdateIssueRequest,
} from '../../types/issues.types';
import { hydrateIssue } from './mockIssues.projection';
import {
  assertValidStoryPoints,
  assertValidTitle,
  normalizeLabels,
  notFoundError,
  resolveMockUserName,
  validationError,
} from './mockIssues.validation';

export const DEFAULT_MOCK_ACTOR = MOCK_ISSUE_USERS[0]!;

export interface MockClock {
  nextId(prefix: string): string;
  nowIso(): string;
}

export function recordMockActivity(
  seed: MockProjectSeed,
  clock: MockClock,
  issueId: string,
  action: string,
  fieldName: string | null,
  oldValue: string | null,
  newValue: string | null
): void {
  const item: IssueActivityDto = {
    id: clock.nextId(`${seed.projectId}-act`),
    issueId,
    actorId: DEFAULT_MOCK_ACTOR.id,
    actorName: DEFAULT_MOCK_ACTOR.name,
    action,
    fieldName,
    oldValue,
    newValue,
    createdAt: clock.nowIso(),
  };
  seed.activities.unshift(item);
}

export function applyIssueCreate(seed: MockProjectSeed, clock: MockClock, request: CreateIssueRequest): IssueDto {
  const title = assertValidTitle(request.title);
  const storyPoints = assertValidStoryPoints(request.storyPoints);
  const sprintId = request.sprintId ?? null;
  const parentId = request.parentId ?? null;
  if (sprintId && !seed.sprints.some((s) => s.id === sprintId)) {
    throw notFoundError('SPRINT_NOT_FOUND', 'Target sprint does not belong to this project.');
  }
  const parent = parentId ? seed.issues.find((i) => i.id === parentId) : undefined;
  if (parentId && !parent) {
    throw notFoundError('PARENT_ISSUE_NOT_FOUND', 'Parent issue does not belong to this project.');
  }
  if (request.type === 'SUBTASK' && parent?.type === 'SUBTASK') {
    throw validationError('A subtask cannot be nested under another subtask.');
  }

  const issueNumber = seed.nextIssueNumber++;
  const issueKey = `${seed.keyPrefix}-${issueNumber}`;
  const now = clock.nowIso();
  const assigneeId = request.assigneeId ?? null;
  const created: IssueDto = {
    id: clock.nextId(`${seed.projectId}-iss`),
    workspaceId: seed.workspaceId,
    projectId: seed.projectId,
    projectName: seed.projectName,
    issueNumber,
    issueKey,
    type: request.type,
    title,
    description: request.description?.trim() || null,
    status: request.status ?? 'TODO',
    priority: request.priority ?? 'MEDIUM',
    storyPoints,
    sprintId,
    sprintName: null,
    parentId,
    parentKey: null,
    assigneeId,
    assigneeName: resolveMockUserName(assigneeId),
    reporterId: DEFAULT_MOCK_ACTOR.id,
    reporterName: DEFAULT_MOCK_ACTOR.name,
    labels: normalizeLabels(request.labels),
    dueDate: request.dueDate ?? null,
    subtaskCount: 0,
    completedSubtaskCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  seed.issues.push(created);
  recordMockActivity(seed, clock, created.id, 'CREATED', null, null, issueKey);
  if (parent) {
    recordMockActivity(seed, clock, parent.id, 'SUBTASK_ADDED', 'subtask', null, issueKey);
    parent.updatedAt = now;
  }
  return hydrateIssue(created, seed);
}

export function applyIssueUpdate(
  seed: MockProjectSeed,
  clock: MockClock,
  issue: IssueDto,
  request: UpdateIssueRequest
): IssueDto {
  let tracked = false;
  let mutated = false;
  const sprintLabel = (id: string | null) => (id ? (seed.sprints.find((s) => s.id === id)?.name ?? id) : 'Backlog');

  if (request.title !== undefined) { issue.title = assertValidTitle(request.title); mutated = true; }
  if (request.description !== undefined) { issue.description = request.description?.trim() || null; mutated = true; }
  if (request.type !== undefined) { issue.type = request.type; mutated = true; }
  if (request.status !== undefined && request.status !== issue.status) {
    recordMockActivity(seed, clock, issue.id, 'STATUS_CHANGED', 'status', issue.status, request.status);
    issue.status = request.status;
    tracked = true;
  }
  if (request.priority !== undefined && request.priority !== issue.priority) {
    recordMockActivity(seed, clock, issue.id, 'PRIORITY_CHANGED', 'priority', issue.priority, request.priority);
    issue.priority = request.priority;
    tracked = true;
  }
  if (request.clearStoryPoints) { issue.storyPoints = null; mutated = true; }
  else if (request.storyPoints !== undefined) { issue.storyPoints = assertValidStoryPoints(request.storyPoints); mutated = true; }

  if (request.clearSprint || request.sprintId === null) {
    if (issue.sprintId !== null) {
      recordMockActivity(seed, clock, issue.id, 'SPRINT_CHANGED', 'sprint', sprintLabel(issue.sprintId), 'Backlog');
      issue.sprintId = null;
      tracked = true;
    }
  } else if (request.sprintId !== undefined && request.sprintId !== issue.sprintId) {
    const target = seed.sprints.find((s) => s.id === request.sprintId);
    if (!target) throw notFoundError('SPRINT_NOT_FOUND', 'Target sprint not found.');
    recordMockActivity(seed, clock, issue.id, 'SPRINT_CHANGED', 'sprint', sprintLabel(issue.sprintId), target.name);
    issue.sprintId = target.id;
    tracked = true;
  }
  if (request.clearParent || request.parentId === null) {
    issue.parentId = null;
    mutated = true;
  } else if (request.parentId !== undefined) {
    if (request.parentId === issue.id) throw validationError('An issue cannot be its own parent.');
    const parent = seed.issues.find((i) => i.id === request.parentId);
    if (!parent) throw notFoundError('PARENT_ISSUE_NOT_FOUND', 'Parent issue not found.');
    if (issue.type === 'SUBTASK' && parent.type === 'SUBTASK') {
      throw validationError('A subtask cannot be nested under another subtask.');
    }
    issue.parentId = parent.id;
    mutated = true;
  }
  if (request.clearAssignee || request.assigneeId === null) {
    if (issue.assigneeId !== null) {
      recordMockActivity(seed, clock, issue.id, 'ASSIGNEE_CHANGED', 'assignee', issue.assigneeName, 'Unassigned');
      issue.assigneeId = null;
      issue.assigneeName = null;
      tracked = true;
    }
  } else if (request.assigneeId !== undefined && request.assigneeId !== issue.assigneeId) {
    const nextName = resolveMockUserName(request.assigneeId);
    recordMockActivity(seed, clock, issue.id, 'ASSIGNEE_CHANGED', 'assignee', issue.assigneeName ?? 'Unassigned', nextName);
    issue.assigneeId = request.assigneeId;
    issue.assigneeName = nextName;
    tracked = true;
  }
  if (request.labels !== undefined) { issue.labels = normalizeLabels(request.labels); mutated = true; }
  if (request.clearDueDate) { issue.dueDate = null; mutated = true; }
  else if (request.dueDate !== undefined) { issue.dueDate = request.dueDate; mutated = true; }

  if (mutated && !tracked) recordMockActivity(seed, clock, issue.id, 'UPDATED', null, null, null);
  issue.updatedAt = clock.nowIso();
  return hydrateIssue(issue, seed);
}
