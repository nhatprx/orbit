import type {
  GitAiAnalysisDto,
  GitBranchCompareDto,
  GitCollaboratorDto,
  GitPrDetailDto,
  GitPrReviewRequest,
  GitRepoStatsDto,
  GitWorkflowJobDto,
  GitWorkflowRunDto,
} from '../../types/git-insights.types';
import type { GitScope } from '../../types/git.types';
import { apiRequest } from '../workspace/httpClient';
import { gitBasePath } from './gitApi';

export function fetchGitWorkflowRuns(
  scope: GitScope,
  limit = 15,
  signal?: AbortSignal
): Promise<GitWorkflowRunDto[]> {
  return apiRequest<GitWorkflowRunDto[]>('GET', `${gitBasePath(scope)}/actions`, {
    query: { limit },
    signal,
  });
}

export function fetchGitCollaborators(
  scope: GitScope,
  signal?: AbortSignal
): Promise<GitCollaboratorDto[]> {
  return apiRequest<GitCollaboratorDto[]>('GET', `${gitBasePath(scope)}/collaborators`, { signal });
}

export function fetchGitRepoStats(
  scope: GitScope,
  signal?: AbortSignal
): Promise<GitRepoStatsDto> {
  return apiRequest<GitRepoStatsDto>('GET', `${gitBasePath(scope)}/stats`, { signal });
}

export function fetchPrDetail(scope: GitScope, pullNumber: number, signal?: AbortSignal): Promise<GitPrDetailDto> {
  return apiRequest<GitPrDetailDto>('GET', `${gitBasePath(scope)}/pulls/${pullNumber}`, { signal });
}

export function submitPrReview(scope: GitScope, pullNumber: number, body: GitPrReviewRequest): Promise<void> {
  return apiRequest<void>('POST', `${gitBasePath(scope)}/pulls/${pullNumber}/reviews`, { body });
}

export function requestAiPrReview(scope: GitScope, pullNumber: number): Promise<GitAiAnalysisDto> {
  return apiRequest<GitAiAnalysisDto>('POST', `${gitBasePath(scope)}/pulls/${pullNumber}/ai-review`);
}

export function fetchWorkflowJobs(scope: GitScope, runId: number, signal?: AbortSignal): Promise<GitWorkflowJobDto[]> {
  return apiRequest<GitWorkflowJobDto[]>('GET', `${gitBasePath(scope)}/actions/${runId}/jobs`, { signal });
}

export function rerunWorkflowRun(scope: GitScope, runId: number, failedOnly = true): Promise<void> {
  return apiRequest<void>('POST', `${gitBasePath(scope)}/actions/${runId}/rerun`, {
    query: { failedOnly: String(failedOnly) },
  });
}

export function requestAiWorkflowExplain(scope: GitScope, runId: number): Promise<GitAiAnalysisDto> {
  return apiRequest<GitAiAnalysisDto>('POST', `${gitBasePath(scope)}/actions/${runId}/ai-explain`);
}

export function compareGitBranches(
  scope: GitScope,
  base: string,
  head: string,
  signal?: AbortSignal
): Promise<GitBranchCompareDto> {
  return apiRequest<GitBranchCompareDto>('GET', `${gitBasePath(scope)}/compare`, {
    query: { base, head },
    signal,
  });
}
