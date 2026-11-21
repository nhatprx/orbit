import type {
  IssueCommentDto,
  IssueDetailDto,
  IssueDto,
  IssueFilterParams,
  SprintDto,
  UpdateIssueRequest,
  WorkspaceIssuePortfolioDto,
} from '../../types/issues.types';
import { ApiError, apiRequest, seg } from '../workspace/httpClient';
import type { IssuesService } from './issues.service';
import { mockIssuesService } from './mockIssues.service';

function projectBase(workspaceId: string, projectId: string): string {
  return `/api/v1/workspaces/${seg(workspaceId)}/projects/${seg(projectId)}`;
}

function buildIssueQuery(filters?: IssueFilterParams): Record<string, string | boolean | undefined> {
  if (!filters) return {};
  const isBacklog = filters.sprintId === 'BACKLOG';
  const sprintId = !isBacklog && filters.sprintId && filters.sprintId !== 'ALL' ? filters.sprintId : undefined;
  return {
    type: filters.type && filters.type !== 'ALL' ? filters.type : undefined,
    status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
    priority: filters.priority && filters.priority !== 'ALL' ? filters.priority : undefined,
    sprintId,
    backlogOnly: isBacklog ? true : undefined,
    parentId: filters.parentId || undefined,
    assigneeId: filters.assigneeId || undefined,
    q: filters.q?.trim() || undefined,
  };
}

function normalizeUpdatePayload(request: UpdateIssueRequest): UpdateIssueRequest {
  const payload: UpdateIssueRequest = { ...request };
  if (request.sprintId === null) payload.clearSprint = true;
  if (request.parentId === null) payload.clearParent = true;
  if (request.assigneeId === null) payload.clearAssignee = true;
  if (request.dueDate === null) payload.clearDueDate = true;
  if (request.storyPoints === null) payload.clearStoryPoints = true;
  return payload;
}

async function withNetworkFallback<T>(httpCall: () => Promise<T>, fallbackCall: () => Promise<T>): Promise<T> {
  try {
    return await httpCall();
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      return fallbackCall();
    }
    throw error;
  }
}

export function createHttpIssuesService(fallback: IssuesService = mockIssuesService): IssuesService {
  return {
    listIssues(workspaceId, projectId, filters) {
      return withNetworkFallback(
        () => apiRequest<IssueDto[]>('GET', `${projectBase(workspaceId, projectId)}/issues`, { query: buildIssueQuery(filters) }),
        () => fallback.listIssues(workspaceId, projectId, filters)
      );
    },

    getIssueDetail(workspaceId, projectId, issueId) {
      return withNetworkFallback(
        () => apiRequest<IssueDetailDto>('GET', `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}`),
        () => fallback.getIssueDetail(workspaceId, projectId, issueId)
      );
    },

    createIssue(workspaceId, projectId, request) {
      return withNetworkFallback(
        () => apiRequest<IssueDto>('POST', `${projectBase(workspaceId, projectId)}/issues`, { body: request }),
        () => fallback.createIssue(workspaceId, projectId, request)
      );
    },

    updateIssue(workspaceId, projectId, issueId, request) {
      const body = normalizeUpdatePayload(request);
      return withNetworkFallback(
        () => apiRequest<IssueDto>('PATCH', `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}`, { body }),
        () => fallback.updateIssue(workspaceId, projectId, issueId, request)
      );
    },

    deleteIssue(workspaceId, projectId, issueId) {
      return withNetworkFallback(
        () => apiRequest<void>('DELETE', `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}`),
        () => fallback.deleteIssue(workspaceId, projectId, issueId)
      );
    },

    addComment(workspaceId, projectId, issueId, request) {
      return withNetworkFallback(
        () => apiRequest<IssueCommentDto>('POST', `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}/comments`, { body: request }),
        () => fallback.addComment(workspaceId, projectId, issueId, request)
      );
    },

    deleteComment(workspaceId, projectId, issueId, commentId) {
      return withNetworkFallback(
        () => apiRequest<void>('DELETE', `${projectBase(workspaceId, projectId)}/issues/${seg(issueId)}/comments/${seg(commentId)}`),
        () => fallback.deleteComment(workspaceId, projectId, issueId, commentId)
      );
    },

    listSprints(workspaceId, projectId) {
      return withNetworkFallback(
        () => apiRequest<SprintDto[]>('GET', `${projectBase(workspaceId, projectId)}/sprints`),
        () => fallback.listSprints(workspaceId, projectId)
      );
    },

    createSprint(workspaceId, projectId, request) {
      return withNetworkFallback(
        () => apiRequest<SprintDto>('POST', `${projectBase(workspaceId, projectId)}/sprints`, { body: request }),
        () => fallback.createSprint(workspaceId, projectId, request)
      );
    },

    updateSprint(workspaceId, projectId, sprintId, request) {
      return withNetworkFallback(
        () => apiRequest<SprintDto>('PATCH', `${projectBase(workspaceId, projectId)}/sprints/${seg(sprintId)}`, { body: request }),
        () => fallback.updateSprint(workspaceId, projectId, sprintId, request)
      );
    },

    deleteSprint(workspaceId, projectId, sprintId) {
      return withNetworkFallback(
        () => apiRequest<void>('DELETE', `${projectBase(workspaceId, projectId)}/sprints/${seg(sprintId)}`),
        () => fallback.deleteSprint(workspaceId, projectId, sprintId)
      );
    },

    getWorkspacePortfolio(workspaceId) {
      return withNetworkFallback(
        () => apiRequest<WorkspaceIssuePortfolioDto>('GET', `/api/v1/workspaces/${seg(workspaceId)}/issues/portfolio`),
        () => fallback.getWorkspacePortfolio(workspaceId)
      );
    },
  };
}

export const httpIssuesService: IssuesService = createHttpIssuesService(mockIssuesService);
