import type {
  IssueCommentDto,
  IssueDetailDto,
  IssueDto,
  IssueFilterParams,
  SprintDto,
  UpdateIssueRequest,
  UpdateSprintRequest,
  WorkspaceIssuePortfolioDto,
} from '../../types/issues.types';
import { apiRequest, seg } from '../workspace/httpClient';
import type { IssuesService } from './issues.service';

function projectBase(workspaceId: string, projectId: string): string {
  return `/api/v1/workspaces/${seg(workspaceId)}/projects/${seg(projectId)}`;
}

function buildIssueQuery(
  filters?: IssueFilterParams
): Record<string, string | number | boolean | undefined> {
  if (!filters) return {};
  const isBacklog = filters.sprintId === 'BACKLOG';
  const sprintId =
    !isBacklog && filters.sprintId && filters.sprintId !== 'ALL' ? filters.sprintId : undefined;
  return {
    type: filters.type && filters.type !== 'ALL' ? filters.type : undefined,
    status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
    priority: filters.priority && filters.priority !== 'ALL' ? filters.priority : undefined,
    sprintId,
    backlogOnly: isBacklog ? true : undefined,
    parentId: filters.parentId || undefined,
    assigneeId: filters.assigneeId || undefined,
    q: filters.q?.trim() || undefined,
    limit: filters.limit,
    offset: filters.offset,
  };
}

function normalizeIssueUpdate(request: UpdateIssueRequest): UpdateIssueRequest {
  const payload: UpdateIssueRequest = { ...request };
  if (request.sprintId === null) payload.clearSprint = true;
  if (request.parentId === null) payload.clearParent = true;
  if (request.assigneeId === null) payload.clearAssignee = true;
  if (request.dueDate === null) payload.clearDueDate = true;
  if (request.storyPoints === null) payload.clearStoryPoints = true;
  return payload;
}

function normalizeSprintUpdate(request: UpdateSprintRequest): UpdateSprintRequest {
  const payload: UpdateSprintRequest = { ...request };
  if (request.startDate === null) payload.clearStartDate = true;
  if (request.endDate === null) payload.clearEndDate = true;
  return payload;
}

export function createHttpIssuesService(): IssuesService {
  return {
    listIssues(workspaceId, projectId, filters) {
      return apiRequest<IssueDto[]>('GET', `${projectBase(workspaceId, projectId)}/issues`, {
        query: buildIssueQuery(filters),
      });
    },

    getIssueDetail(workspaceId, projectId, issueId) {
      return apiRequest<IssueDetailDto>(
        'GET',
        `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}`
      );
    },

    createIssue(workspaceId, projectId, request) {
      return apiRequest<IssueDto>('POST', `${projectBase(workspaceId, projectId)}/issues`, {
        body: request,
      });
    },

    updateIssue(workspaceId, projectId, issueId, request) {
      const body = normalizeIssueUpdate(request);
      return apiRequest<IssueDto>(
        'PATCH',
        `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}`,
        { body }
      );
    },

    deleteIssue(workspaceId, projectId, issueId) {
      return apiRequest<void>(
        'DELETE',
        `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}`
      );
    },

    addComment(workspaceId, projectId, issueId, request) {
      return apiRequest<IssueCommentDto>(
        'POST',
        `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}/comments`,
        { body: request }
      );
    },

    deleteComment(workspaceId, projectId, issueId, commentId) {
      return apiRequest<void>(
        'DELETE',
        `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}/comments/${seg(commentId)}`
      );
    },

    listSprints(workspaceId, projectId) {
      return apiRequest<SprintDto[]>('GET', `${projectBase(workspaceId, projectId)}/sprints`);
    },

    createSprint(workspaceId, projectId, request) {
      return apiRequest<SprintDto>('POST', `${projectBase(workspaceId, projectId)}/sprints`, {
        body: request,
      });
    },

    updateSprint(workspaceId, projectId, sprintId, request) {
      const body = normalizeSprintUpdate(request);
      return apiRequest<SprintDto>(
        'PATCH',
        `${projectBase(workspaceId, projectId)}/sprints/${seg(sprintId)}`,
        { body }
      );
    },

    deleteSprint(workspaceId, projectId, sprintId) {
      return apiRequest<void>(
        'DELETE',
        `${projectBase(workspaceId, projectId)}/sprints/${seg(sprintId)}`
      );
    },

    getWorkspacePortfolio(workspaceId, limit, offset) {
      return apiRequest<WorkspaceIssuePortfolioDto>(
        'GET',
        `/api/v1/workspaces/${seg(workspaceId)}/issues/portfolio`,
        { query: { limit, offset } }
      );
    },
  };
}

export const httpIssuesService: IssuesService = createHttpIssuesService();
