import type { MockProjectSeed } from '../../mocks/issues.mock';
import type { CreateSprintRequest, SprintDto, UpdateSprintRequest } from '../../types/issues.types';
import { ApiError } from '../workspace/httpClient';
import { recordMockActivity, type MockClock } from './mockIssues.mutations';
import { hydrateSprint } from './mockIssues.projection';
import { assertValidDateRange, assertValidSprintName } from './mockIssues.validation';

export function applySprintCreate(
  seed: MockProjectSeed,
  clock: MockClock,
  request: CreateSprintRequest
): SprintDto {
  const name = assertValidSprintName(request.name);
  assertValidDateRange(request.startDate, request.endDate);
  const now = clock.nowIso();
  const sprint: SprintDto = {
    id: clock.nextId(`${seed.projectId}-sp`),
    workspaceId: seed.workspaceId,
    projectId: seed.projectId,
    name,
    goal: request.goal?.trim() || null,
    status: 'PLANNED',
    startDate: request.startDate ?? null,
    endDate: request.endDate ?? null,
    totalIssues: 0,
    completedIssues: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    createdAt: now,
    updatedAt: now,
  };
  seed.sprints.push(sprint);
  return hydrateSprint(sprint, seed.issues);
}

export function applySprintUpdate(
  seed: MockProjectSeed,
  clock: MockClock,
  sprint: SprintDto,
  request: UpdateSprintRequest
): SprintDto {
  const nextStart = request.clearStartDate
    ? null
    : request.startDate !== undefined
      ? request.startDate
      : sprint.startDate;
  const nextEnd = request.clearEndDate
    ? null
    : request.endDate !== undefined
      ? request.endDate
      : sprint.endDate;
  assertValidDateRange(nextStart, nextEnd);
  if (request.name !== undefined) sprint.name = assertValidSprintName(request.name);
  if (request.goal !== undefined) sprint.goal = request.goal?.trim() || null;
  sprint.startDate = nextStart;
  sprint.endDate = nextEnd;

  if (request.status !== undefined) {
    if (sprint.status === 'COMPLETED' && request.status !== 'COMPLETED') {
      throw new ApiError(400, 'INVALID_SPRINT_TRANSITION', 'Completed sprints cannot be reopened.');
    }
    if (sprint.status === 'ACTIVE' && request.status === 'PLANNED') {
      throw new ApiError(400, 'INVALID_SPRINT_TRANSITION', 'Active sprints cannot be moved back to PLANNED.');
    }
  }

  if (request.status === 'ACTIVE' && sprint.status !== 'ACTIVE') {
    const otherActive = seed.sprints.find((s) => s.id !== sprint.id && s.status === 'ACTIVE');
    if (otherActive) {
      throw new ApiError(409, 'ACTIVE_SPRINT_EXISTS', 'Another sprint is already active in this project.');
    }
    sprint.status = 'ACTIVE';
  } else if (request.status === 'COMPLETED' && sprint.status !== 'COMPLETED') {
    sprint.status = 'COMPLETED';
    if (request.moveIncompleteToBacklog !== false) {
      for (const issue of seed.issues) {
        if (issue.sprintId === sprint.id && issue.status !== 'DONE') {
          issue.sprintId = null;
          recordMockActivity(seed, clock, issue.id, 'SPRINT_CHANGED', 'sprint', sprint.name, 'Backlog');
        }
      }
    }
  } else if (request.status !== undefined) {
    sprint.status = request.status;
  }
  sprint.updatedAt = clock.nowIso();
  return hydrateSprint(sprint, seed.issues);
}
