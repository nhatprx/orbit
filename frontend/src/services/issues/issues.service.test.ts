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

  it('records status, priority, sprint, and assignee activity transitions and supports clearing fields', async () => {
    const [issue] = await mock.listIssues(WS, PJ, { type: 'BUG', status: 'IN_PROGRESS' });
    await mock.updateIssue(WS, PJ, issue!.id, { status: 'IN_REVIEW', priority: 'HIGH', clearSprint: true, assigneeId: null });
    const detail = await mock.getIssueDetail(WS, PJ, issue!.id);

    expect(detail.issue.status).toBe('IN_REVIEW');
    expect(detail.issue.sprintId).toBeNull();
    expect(detail.issue.assigneeId).toBeNull();
    const actions = detail.activities.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['STATUS_CHANGED', 'PRIORITY_CHANGED', 'SPRINT_CHANGED', 'ASSIGNEE_CHANGED']));
  });

  it('enforces single active sprint conflict and moves incomplete issues to backlog on completion', async () => {
    const sprints = await mock.listSprints(WS, PJ);
    const active = sprints.find((s) => s.status === 'ACTIVE')!;
    const planned = sprints.find((s) => s.status === 'PLANNED')!;
    expect(active.totalIssues).toBeGreaterThan(0);

    await expect(mock.updateSprint(WS, PJ, planned.id, { status: 'ACTIVE' })).rejects.toMatchObject({
      status: 409,
      code: 'ACTIVE_SPRINT_EXISTS',
    });

    await expect(
      mock.createSprint(WS, PJ, { name: 'Bad Dates', startDate: '2026-12-10', endDate: '2026-12-01' })
    ).rejects.toMatchObject({ status: 400 });

    const completed = await mock.updateSprint(WS, PJ, active.id, { status: 'COMPLETED', moveIncompleteToBacklog: true });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.totalIssues).toBe(completed.completedIssues);

    const started = await mock.updateSprint(WS, PJ, planned.id, { status: 'ACTIVE' });
    expect(started.status).toBe('ACTIVE');

    const createdSprint = await mock.createSprint(WS, PJ, { name: 'Sprint 16', goal: 'Hardening' });
    await mock.deleteSprint(WS, PJ, createdSprint.id);
    expect((await mock.listSprints(WS, PJ)).some((s) => s.id === createdSprint.id)).toBe(false);
  });

  it('adds and deletes comments, deletes issues, and aggregates workspace portfolio metrics', async () => {
    const [target] = await mock.listIssues(WS, PJ);
    const beforeComments = target!.commentCount;
    const comment = await mock.addComment(WS, PJ, target!.id, { body: 'Verified against PostgreSQL schema.' });
    expect((await mock.getIssueDetail(WS, PJ, target!.id)).issue.commentCount).toBe(beforeComments + 1);
    await expect(mock.addComment(WS, PJ, target!.id, { body: '   ' })).rejects.toMatchObject({ status: 400 });

    await mock.deleteComment(WS, PJ, target!.id, comment.id);
    expect((await mock.getIssueDetail(WS, PJ, target!.id)).issue.commentCount).toBe(beforeComments);
    await expect(mock.deleteComment(WS, PJ, target!.id, 'missing')).rejects.toMatchObject({ status: 404 });

    await mock.deleteIssue(WS, PJ, target!.id);
    await expect(mock.getIssueDetail(WS, PJ, target!.id)).rejects.toMatchObject({ status: 404 });

    const portfolio = await mock.getWorkspacePortfolio('ws-portfolio-fresh');
    expect(portfolio.projects).toHaveLength(2);
    expect(portfolio.totalIssues).toBe(portfolio.openIssues + portfolio.inProgressIssues + portfolio.doneIssues);
    expect(portfolio.activeSprintsCount).toBe(2);
    expect(portfolio.criticalIssues).toBe(2);
    expect(portfolio.recentIssues.length).toBeGreaterThan(0);
  });
});

describe('httpIssuesService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls backend endpoints with filter mapping and clear flags', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ id: 'i1', sprintId: null }))
      .mockResolvedValueOnce(jsonResponse({ workspaceId: WS, totalIssues: 0, projects: [], recentIssues: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const service = createHttpIssuesService(new MockIssuesService());
    await service.listIssues(WS, PJ, { type: 'BUG', status: 'ALL', sprintId: 'BACKLOG', q: 'lock' });
    const [listUrl, listInit] = fetchMock.mock.calls[0]!;
    expect(String(listUrl)).toContain(`/api/v1/workspaces/${WS}/projects/${PJ}/issues`);
    expect(String(listUrl)).toContain('type=BUG');
    expect(String(listUrl)).toContain('backlogOnly=true');
    expect(String(listUrl)).toContain('q=lock');
    expect(String(listUrl)).not.toContain('status=');
    expect(listInit?.method).toBe('GET');

    await service.updateIssue(WS, PJ, 'i1', { sprintId: null, parentId: null });
    const [, patchInit] = fetchMock.mock.calls[1]!;
    expect(patchInit?.method).toBe('PATCH');
    expect(JSON.parse(String(patchInit?.body))).toMatchObject({ clearSprint: true, clearParent: true });

    await service.getWorkspacePortfolio(WS);
    expect(String(fetchMock.mock.calls[2]![0])).toContain(`/api/v1/workspaces/${WS}/issues/portfolio`);
  });

  it('falls back to mock service on network errors but propagates real HTTP 4xx errors', async () => {
    const fallback = new MockIssuesService();
    const service = createHttpIssuesService(fallback);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const issues = await service.listIssues(WS, PJ);
    expect(issues.length).toBeGreaterThan(0);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ code: 'ACTIVE_SPRINT_EXISTS', message: 'Already active.' }, 409))
    );
    const error = await service.updateSprint(WS, PJ, 'sp-2', { status: 'ACTIVE' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'ACTIVE_SPRINT_EXISTS' });
  });
});
