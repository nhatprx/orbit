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
import { createHttpIssuesService, httpIssuesService } from './httpIssues.service';
import { MockIssuesService, mockIssuesService } from './mockIssues.service';

export interface IssuesService {
  listIssues(workspaceId: string, projectId: string, filters?: IssueFilterParams): Promise<IssueDto[]>;
  getIssueDetail(workspaceId: string, projectId: string, issueId: string): Promise<IssueDetailDto>;
  createIssue(workspaceId: string, projectId: string, request: CreateIssueRequest): Promise<IssueDto>;
  updateIssue(workspaceId: string, projectId: string, issueId: string, request: UpdateIssueRequest): Promise<IssueDto>;
  deleteIssue(workspaceId: string, projectId: string, issueId: string): Promise<void>;
  addComment(workspaceId: string, projectId: string, issueId: string, request: CreateIssueCommentRequest): Promise<IssueCommentDto>;
  deleteComment(workspaceId: string, projectId: string, issueId: string, commentId: string): Promise<void>;
  listSprints(workspaceId: string, projectId: string): Promise<SprintDto[]>;
  createSprint(workspaceId: string, projectId: string, request: CreateSprintRequest): Promise<SprintDto>;
  updateSprint(workspaceId: string, projectId: string, sprintId: string, request: UpdateSprintRequest): Promise<SprintDto>;
  deleteSprint(workspaceId: string, projectId: string, sprintId: string): Promise<void>;
  getWorkspacePortfolio(workspaceId: string): Promise<WorkspaceIssuePortfolioDto>;
}

export const issuesService: IssuesService = httpIssuesService;
export { createHttpIssuesService, httpIssuesService, MockIssuesService, mockIssuesService };
