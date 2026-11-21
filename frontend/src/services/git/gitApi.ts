import type {
  ConnectGitRepoRequest,
  CreateGitBranchRequest,
  CreateGitPullRequest,
  CreateGitRepoRequest,
  DeleteGitFileRequest,
  GitBranchDto,
  GitCommitDetailDto,
  GitCommitDto,
  GitFileContentDto,
  GitMutationResultDto,
  GitPullRequestDto,
  GitRepositoryDto,
  GitScope,
  GitTreeEntryDto,
  InspectGitTokenResponse,
  MergeGitPullRequest,
  UpsertGitFileRequest,
} from '../../types/git.types';
import { ApiError, apiRequest, seg } from '../workspace/httpClient';

export interface GitApi {
  inspectToken(accessToken: string): Promise<InspectGitTokenResponse>;
  getRepository(signal?: AbortSignal): Promise<GitRepositoryDto | null>;
  connectRepository(body: ConnectGitRepoRequest): Promise<GitRepositoryDto>;
  createRepository(body: CreateGitRepoRequest): Promise<GitRepositoryDto>;
  updateToken(accessToken: string): Promise<GitRepositoryDto>;
  disconnectRepository(): Promise<void>;
  listBranches(signal?: AbortSignal): Promise<GitBranchDto[]>;
  createBranch(body: CreateGitBranchRequest): Promise<GitBranchDto>;
  deleteBranch(branchName: string): Promise<void>;
  listTree(branch: string, path?: string, signal?: AbortSignal): Promise<GitTreeEntryDto[]>;
  getFile(branch: string, path: string, signal?: AbortSignal): Promise<GitFileContentDto>;
  upsertFile(body: UpsertGitFileRequest): Promise<GitMutationResultDto>;
  deleteFile(body: DeleteGitFileRequest): Promise<GitMutationResultDto>;
  listCommits(branch: string, limit?: number, signal?: AbortSignal): Promise<GitCommitDto[]>;
  syncCommits(branch: string, limit?: number): Promise<GitCommitDto[]>;
  getCommitDetail(sha: string, signal?: AbortSignal): Promise<GitCommitDetailDto>;
  listPullRequests(state?: 'open' | 'closed' | 'all', signal?: AbortSignal): Promise<GitPullRequestDto[]>;
  createPullRequest(body: CreateGitPullRequest): Promise<GitPullRequestDto>;
  mergePullRequest(pullNumber: number, body?: MergeGitPullRequest): Promise<GitPullRequestDto>;
}

export function gitBasePath(scope: GitScope): string {
  if (scope.type === 'WORKSPACE') {
    return `/api/v1/workspaces/${seg(scope.workspaceId)}/git`;
  }
  return `/api/v1/workspaces/${seg(scope.workspaceId)}/projects/${seg(scope.projectId)}/git`;
}

function isRepoNotConnected(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 404 || error.code === 'GIT_REPO_NOT_CONNECTED';
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: unknown; code?: unknown };
    return candidate.status === 404 || candidate.code === 'GIT_REPO_NOT_CONNECTED';
  }
  return false;
}

export function createHttpGitApi(scope: GitScope): GitApi {
  const base = gitBasePath(scope);

  return {
    inspectToken(accessToken) {
      return apiRequest<InspectGitTokenResponse>('POST', `${base}/inspect-token`, {
        body: { accessToken },
      });
    },

    async getRepository(signal) {
      try {
        return await apiRequest<GitRepositoryDto>('GET', `${base}/repository`, { signal });
      } catch (error) {
        if (isRepoNotConnected(error)) return null;
        throw error;
      }
    },

    connectRepository(body) {
      return apiRequest<GitRepositoryDto>('POST', `${base}/repository/connect`, { body });
    },

    createRepository(body) {
      return apiRequest<GitRepositoryDto>('POST', `${base}/repository/create`, { body });
    },

    updateToken(accessToken) {
      return apiRequest<GitRepositoryDto>('PATCH', `${base}/repository/token`, {
        body: { accessToken },
      });
    },

    disconnectRepository() {
      return apiRequest<void>('DELETE', `${base}/repository`);
    },

    listBranches(signal) {
      return apiRequest<GitBranchDto[]>('GET', `${base}/branches`, { signal });
    },

    createBranch(body) {
      return apiRequest<GitBranchDto>('POST', `${base}/branches`, { body });
    },

    deleteBranch(branchName) {
      return apiRequest<void>('DELETE', `${base}/branches?name=${encodeURIComponent(branchName)}`);
    },

    listTree(branch, path, signal) {
      return apiRequest<GitTreeEntryDto[]>('GET', `${base}/tree`, {
        query: { branch, path: path || undefined },
        signal,
      });
    },

    getFile(branch, path, signal) {
      return apiRequest<GitFileContentDto>('GET', `${base}/file`, {
        query: { branch, path },
        signal,
      });
    },

    upsertFile(body) {
      return apiRequest<GitMutationResultDto>('PUT', `${base}/file`, { body });
    },

    deleteFile(body) {
      return apiRequest<GitMutationResultDto>('DELETE', `${base}/file`, { body });
    },

    listCommits(branch, limit, signal) {
      return apiRequest<GitCommitDto[]>('GET', `${base}/commits`, {
        query: { branch, limit },
        signal,
      });
    },

    syncCommits(branch, limit) {
      return apiRequest<GitCommitDto[]>('POST', `${base}/commits/sync`, {
        query: { branch, limit },
      });
    },

    getCommitDetail(sha, signal) {
      return apiRequest<GitCommitDetailDto>('GET', `${base}/commits/${seg(sha)}`, { signal });
    },

    listPullRequests(state, signal) {
      return apiRequest<GitPullRequestDto[]>('GET', `${base}/pulls`, {
        query: { state },
        signal,
      });
    },

    createPullRequest(body) {
      return apiRequest<GitPullRequestDto>('POST', `${base}/pulls`, { body });
    },

    mergePullRequest(pullNumber, body) {
      return apiRequest<GitPullRequestDto>('POST', `${base}/pulls/${pullNumber}/merge`, {
        body: body ?? {},
      });
    },
  };
}
