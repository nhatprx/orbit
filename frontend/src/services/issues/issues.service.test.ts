import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../workspace/httpClient';
import { createHttpIssuesService } from './httpIssues.service';
import { MockIssuesService } from './mockIssues.service';

const WS = 'ws-alpha';
const PJ = 'proj-orbit-core';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('MockIssuesService', () => {
  let mock: MockIssuesService;

  beforeEach(() => {
    mock = new MockIssuesService();
  });

  it('creates issues with sequential keys, validates boundaries, and filters results', async () => {
    const created = await mock.createIssue(WS, PJ, {
      type: 'TASK',
      title: 'Audit Postgres indexes',
      priority: 'HIGH',
      storyPoints: 5,
      labels: ['db', 'db', ' perf '],
    });
    expect(created.issueNumber).toBe(13);
    expect(created.issueKey).toBe('OCA-13');
    expect(created.labels).toEqual(['db', 'perf']);

    const bySearch = await mock.listIssues(WS, PJ, { q: 'postgres', priority: 'HIGH', sprintId: 'BACKLOG' });
    expect(bySearch.map((i) => i.id)).toEqual([created.id]);

    await expect(mock.createIssue(WS, PJ, { type: 'TASK', title: '   ' })).rejects.toMatchObject({ status: 400 });
    await expect(mock.createIssue(WS, PJ, { type: 'TASK', title: 'Bad points', storyPoints: 101 })).rejects.toMatchObject({ status: 400 });
    await expect(mock.createIssue(WS, PJ, { type: 'TASK', title: 'Bad sprint', sprintId: 'missing' })).rejects.toMatchObject({ status: 404 });
  });

  it('manages subtasks, updates parent counters, and blocks nested subtasks or circular parents', async () => {
    const parent = (await mock.listIssues(WS, PJ, { type: 'STORY' }))[0]!;
    const initialTotal = parent.subtaskCount;
    const initialDone = parent.completedSubtaskCount;

    const sub = await mock.createIssue(WS, PJ, {
      type: 'SUBTASK',
      title: 'Verify error envelope',
      parentId: parent.id,
      status: 'TODO',
    });
    expect(sub.parentKey).toBe(parent.issueKey);

    await mock.updateIssue(WS, PJ, sub.id, { status: 'DONE' });
    const detail = await mock.getIssueDetail(WS, PJ, parent.id);
    expect(detail.issue.subtaskCount).toBe(initialTotal + 1);
    expect(detail.issue.completedSubtaskCount).toBe(initialDone + 1);
    expect(detail.activities.some((a) => a.action === 'SUBTASK_ADDED' && a.newValue === sub.issueKey)).toBe(true);

    await expect(mock.createIssue(WS, PJ, { type: 'SUBTASK', title: 'Nested', parentId: sub.id })).rejects.toMatchObject({ status: 400 });
    await expect(mock.updateIssue(WS, PJ, parent.id, { parentId: parent.id })).rejects.toMatchObject({ status: 400 });
  });

  it('enforces single active sprint, blocks backwards transitions, and handles completion rollover', async () => {
    const sprints = await mock.listSprints(WS, PJ);
    const active = sprints.find((s) => s.status === 'ACTIVE')!;
    const planned = sprints.find((s) => s.status === 'PLANNED')!;

    await expect(mock.updateSprint(WS, PJ, planned.id, { status: 'ACTIVE' })).rejects.toMatchObject({
      status: 409,
      code: 'ACTIVE_SPRINT_EXISTS',
    });
    await expect(mock.updateSprint(WS, PJ, active.id, { status: 'PLANNED' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_SPRINT_TRANSITION',
    });

    const completed = await mock.updateSprint(WS, PJ, active.id, { status: 'COMPLETED', moveIncompleteToBacklog: true });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.totalIssues).toBe(completed.completedIssues);

    await expect(mock.updateSprint(WS, PJ, active.id, { status: 'ACTIVE' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_SPRINT_TRANSITION',
    });
    await expect(mock.updateSprint(WS, PJ, active.id, { status: 'PLANNED' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_SPRINT_TRANSITION',
    });

    const started = await mock.updateSprint(WS, PJ, planned.id, { status: 'ACTIVE' });
    expect(started.status).toBe('ACTIVE');
  });

  it('adds and deletes comments, deletes issues, and aggregates workspace portfolio metrics', async () => {
    const [target] = await mock.listIssues(WS, PJ);
    const beforeComments = target!.commentCount;
    const comment = await mock.addComment(WS, PJ, target!.id, { body: 'Verified against PostgreSQL schema.' });
    expect((await mock.getIssueDetail(WS, PJ, target!.id)).issue.commentCount).toBe(beforeComments + 1);

    await mock.deleteComment(WS, PJ, target!.id, comment.id);
    expect((await mock.getIssueDetail(WS, PJ, target!.id)).issue.commentCount).toBe(beforeComments);

    await mock.deleteIssue(WS, PJ, target!.id);
    await expect(mock.getIssueDetail(WS, PJ, target!.id)).rejects.toMatchObject({ status: 404 });

    const portfolio = await mock.getWorkspacePortfolio('ws-portfolio-fresh');
    expect(portfolio.projects).toHaveLength(2);
    expect(portfolio.totalIssues).toBe(portfolio.openIssues + portfolio.inProgressIssues + portfolio.doneIssues);
  });
});

describe('httpIssuesService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls backend endpoints with filter, pagination, and clear flags', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ id: 'i1', sprintId: null }))
      .mockResolvedValueOnce(jsonResponse({ id: 'sp-1', name: 'Sprint X' }))
      .mockResolvedValueOnce(jsonResponse({ workspaceId: WS, totalIssues: 0, projects: [], recentIssues: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const service = createHttpIssuesService();
    await service.listIssues(WS, PJ, { type: 'BUG', status: 'ALL', sprintId: 'BACKLOG', q: 'lock', limit: 100, offset: 20 });
    const [listUrl, listInit] = fetchMock.mock.calls[0]!;
    expect(String(listUrl)).toContain(`/api/v1/workspaces/${WS}/projects/${PJ}/issues`);
    expect(String(listUrl)).toContain('type=BUG');
    expect(String(listUrl)).toContain('backlogOnly=true');
    expect(String(listUrl)).toContain('limit=100');
    expect(String(listUrl)).toContain('offset=20');
    expect(listInit?.method).toBe('GET');

    await service.updateIssue(WS, PJ, 'i1', { sprintId: null, parentId: null, assigneeId: null });
    const [, patchInit] = fetchMock.mock.calls[1]!;
    expect(JSON.parse(String(patchInit?.body))).toMatchObject({ clearSprint: true, clearParent: true, clearAssignee: true });

    await service.updateSprint(WS, PJ, 'sp-1', { name: 'Sprint X', startDate: null, endDate: null });
    const [, sprintPatch] = fetchMock.mock.calls[2]!;
    expect(JSON.parse(String(sprintPatch?.body))).toMatchObject({ name: 'Sprint X', clearStartDate: true, clearEndDate: true });

    await service.getWorkspacePortfolio(WS, 50, 10);
    expect(String(fetchMock.mock.calls[3]![0])).toContain(`/api/v1/workspaces/${WS}/issues/portfolio?limit=50&offset=10`);
  });

  it('propagates real network errors without falling back to mock data and propagates HTTP 4xx errors', async () => {
    const service = createHttpIssuesService();

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const netError = await service.listIssues(WS, PJ).catch((e: unknown) => e);
    expect(netError).toBeInstanceOf(ApiError);
    expect(netError).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ code: 'ACTIVE_SPRINT_EXISTS', message: 'Already active.' }, 409))
    );
    const error = await service.updateSprint(WS, PJ, 'sp-2', { status: 'ACTIVE' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'ACTIVE_SPRINT_EXISTS' });
  });
});
