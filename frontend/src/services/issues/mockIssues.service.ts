import {
  DEFAULT_PORTFOLIO_PROJECTS,
  createMockProjectSeed,
  type MockProjectSeed,
} from '../../mocks/issues.mock';
import type {
  CreateIssueCommentRequest,
  CreateIssueRequest,
  CreateSprintRequest,
  IssueCommentDto,
  IssueDetailDto,
  IssueDto,
  IssueFilterParams,
  SprintDto,
  UpdateIssueRequest,
  UpdateSprintRequest,
  WorkspaceIssuePortfolioDto,
} from '../../types/issues.types';
import type { IssuesService } from './issues.service';
import {
  DEFAULT_MOCK_ACTOR,
  applyIssueCreate,
  applyIssueUpdate,
  recordMockActivity,
  type MockClock,
} from './mockIssues.mutations';
import {
  buildWorkspacePortfolio,
  hydrateIssue,
  hydrateSprint,
  matchesIssueFilters,
} from './mockIssues.projection';
import { applySprintCreate, applySprintUpdate } from './mockIssues.sprintMutations';
import { assertValidCommentBody, notFoundError } from './mockIssues.validation';

export class MockIssuesService implements IssuesService {
  private readonly stores = new Map<string, MockProjectSeed>();
  private seq = 0;

  private readonly clock: MockClock = {
    nextId: (prefix: string) => `${prefix}-gen-${++this.seq}`,
    nowIso: () => new Date(Date.now() + ++this.seq).toISOString(),
  };

  reset(): void {
    this.stores.clear();
    this.seq = 0;
  }

  async listIssues(workspaceId: string, projectId: string, filters?: IssueFilterParams): Promise<IssueDto[]> {
    const seed = this.getSeed(workspaceId, projectId);
    return seed.issues
      .map((item) => hydrateIssue(item, seed))
      .filter((item) => matchesIssueFilters(item, filters))
      .sort((a, b) => b.issueNumber - a.issueNumber);
  }

  async getIssueDetail(workspaceId: string, projectId: string, issueId: string): Promise<IssueDetailDto> {
    const seed = this.getSeed(workspaceId, projectId);
    const raw = this.requireIssue(seed, issueId);
    const subtasks = seed.issues
      .filter((i) => i.parentId === issueId)
      .sort((a, b) => a.issueNumber - b.issueNumber)
      .map((i) => hydrateIssue(i, seed));
    const comments = seed.comments
      .filter((c) => c.issueId === issueId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => ({ ...c }));
    const activities = seed.activities
      .filter((a) => a.issueId === issueId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a }));
    return { issue: hydrateIssue(raw, seed), subtasks, comments, activities };
  }

  async createIssue(workspaceId: string, projectId: string, request: CreateIssueRequest): Promise<IssueDto> {
    return applyIssueCreate(this.getSeed(workspaceId, projectId), this.clock, request);
  }

  async updateIssue(workspaceId: string, projectId: string, issueId: string, request: UpdateIssueRequest): Promise<IssueDto> {
    const seed = this.getSeed(workspaceId, projectId);
    return applyIssueUpdate(seed, this.clock, this.requireIssue(seed, issueId), request);
  }

  async deleteIssue(workspaceId: string, projectId: string, issueId: string): Promise<void> {
    const seed = this.getSeed(workspaceId, projectId);
    const index = seed.issues.findIndex((i) => i.id === issueId);
    if (index === -1) throw notFoundError('ISSUE_NOT_FOUND', 'Issue not found.');
    seed.issues.splice(index, 1);
    for (const child of seed.issues) {
      if (child.parentId === issueId) child.parentId = null;
    }
    seed.comments = seed.comments.filter((c) => c.issueId !== issueId);
    seed.activities = seed.activities.filter((a) => a.issueId !== issueId);
  }

  async addComment(workspaceId: string, projectId: string, issueId: string, request: CreateIssueCommentRequest): Promise<IssueCommentDto> {
    const seed = this.getSeed(workspaceId, projectId);
    const issue = this.requireIssue(seed, issueId);
    const body = assertValidCommentBody(request.body);
    const now = this.clock.nowIso();
    const comment: IssueCommentDto = {
      id: this.clock.nextId(`${projectId}-cmt`),
      issueId,
      authorId: DEFAULT_MOCK_ACTOR.id,
      authorName: DEFAULT_MOCK_ACTOR.name,
      body,
      createdAt: now,
      updatedAt: now,
    };
    seed.comments.push(comment);
    issue.updatedAt = now;
    recordMockActivity(seed, this.clock, issueId, 'COMMENT_ADDED', 'comment', null, body.slice(0, 80));
    return { ...comment };
  }

  async deleteComment(workspaceId: string, projectId: string, issueId: string, commentId: string): Promise<void> {
    const seed = this.getSeed(workspaceId, projectId);
    this.requireIssue(seed, issueId);
    const index = seed.comments.findIndex((c) => c.id === commentId && c.issueId === issueId);
    if (index === -1) throw notFoundError('COMMENT_NOT_FOUND', 'Comment not found.');
    seed.comments.splice(index, 1);
  }

  async listSprints(workspaceId: string, projectId: string): Promise<SprintDto[]> {
    const seed = this.getSeed(workspaceId, projectId);
    return seed.sprints
      .map((s) => hydrateSprint(s, seed.issues))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createSprint(workspaceId: string, projectId: string, request: CreateSprintRequest): Promise<SprintDto> {
    return applySprintCreate(this.getSeed(workspaceId, projectId), this.clock, request);
  }

  async updateSprint(workspaceId: string, projectId: string, sprintId: string, request: UpdateSprintRequest): Promise<SprintDto> {
    const seed = this.getSeed(workspaceId, projectId);
    const sprint = seed.sprints.find((s) => s.id === sprintId);
    if (!sprint) throw notFoundError('SPRINT_NOT_FOUND', 'Sprint not found.');
    return applySprintUpdate(seed, this.clock, sprint, request);
  }

  async deleteSprint(workspaceId: string, projectId: string, sprintId: string): Promise<void> {
    const seed = this.getSeed(workspaceId, projectId);
    const index = seed.sprints.findIndex((s) => s.id === sprintId);
    if (index === -1) throw notFoundError('SPRINT_NOT_FOUND', 'Sprint not found.');
    seed.sprints.splice(index, 1);
    for (const issue of seed.issues) {
      if (issue.sprintId === sprintId) issue.sprintId = null;
    }
  }

  async getWorkspacePortfolio(workspaceId: string): Promise<WorkspaceIssuePortfolioDto> {
    const existing = Array.from(this.stores.values()).filter((s) => s.workspaceId === workspaceId);
    if (existing.length === 0) {
      for (const proj of DEFAULT_PORTFOLIO_PROJECTS) {
        const seed = createMockProjectSeed(workspaceId, proj.id, proj.name, proj.slug);
        this.stores.set(this.storeKey(workspaceId, proj.id), seed);
        existing.push(seed);
      }
    }
    return buildWorkspacePortfolio(workspaceId, existing);
  }

  private getSeed(workspaceId: string, projectId: string): MockProjectSeed {
    const key = this.storeKey(workspaceId, projectId);
    const found = this.stores.get(key);
    if (found) return found;
    const preset = DEFAULT_PORTFOLIO_PROJECTS.find((p) => p.id === projectId);
    const seed = createMockProjectSeed(workspaceId, projectId, preset?.name, preset?.slug ?? projectId);
    this.stores.set(key, seed);
    return seed;
  }

  private requireIssue(seed: MockProjectSeed, issueId: string): IssueDto {
    const issue = seed.issues.find((i) => i.id === issueId);
    if (!issue) throw notFoundError('ISSUE_NOT_FOUND', 'Issue not found.');
    return issue;
  }

  private storeKey(workspaceId: string, projectId: string): string {
    return `${workspaceId}::${projectId}`;
  }
}

export const mockIssuesService = new MockIssuesService();
