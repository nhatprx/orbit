export type GitScope =
  | { type: 'WORKSPACE'; workspaceId: string; permissions: string[] }
  | { type: 'PROJECT'; workspaceId: string; projectId: string; permissions: string[] };

export interface GitPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
}

export function getGitPermissions(scope: GitScope): GitPermissions {
  const prefix = scope.type === 'WORKSPACE' ? 'git' : 'pgit';
  const has = (action: string) => scope.permissions.includes(`${prefix}.${action}`);
  return {
    canRead: has('read'),
    canWrite: has('write'),
    canDelete: has('delete'),
    canManage: has('manage'),
  };
}

export function gitScopeKey(scope: GitScope): string {
  if (scope.type === 'WORKSPACE') return `WORKSPACE:${scope.workspaceId}`;
  return `PROJECT:${scope.workspaceId}:${scope.projectId}`;
}

export interface GitHubRemoteRepoDto {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  privateRepo: boolean;
  cloneUrl: string;
  htmlUrl: string;
  description: string | null;
}

export interface InspectGitTokenResponse {
  username: string;
  displayName: string | null;
  scopes: string[];
  repositories: GitHubRemoteRepoDto[];
}

export interface ConnectGitRepoRequest {
  accessToken: string;
  repoOwner: string;
  repoName: string;
  defaultBranch?: string;
}

export type {
  GitOAuthCapabilitiesDto,
  GitOAuthScopeMode,
  GitWorkspaceMemberCandidateDto,
  InviteGitCollaboratorResultDto,
} from './git-insights.types';

export interface CreateGitRepoRequest {
  accessToken: string;
  repoName: string;
  description?: string;
  privateRepo: boolean;
  autoInit?: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
}

export interface GitRepositoryDto {
  id: string;
  scopeType: 'WORKSPACE' | 'PROJECT';
  scopeId: string;
  provider: string;
  repoOwner: string;
  repoName: string;
  slug: string;
  defaultBranch: string;
  visibility: 'PRIVATE' | 'PUBLIC' | 'private' | 'public';
  cloneUrl: string;
  htmlUrl: string;
  tokenHint: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface GitBranchDto {
  name: string;
  sha: string;
  isDefault: boolean;
  isProtected: boolean;
}

export interface CreateGitBranchRequest {
  branchName: string;
  sourceBranch: string;
}

export interface GitTreeEntryDto {
  path: string;
  name: string;
  type: 'dir' | 'file';
  size: number;
  sha: string;
  htmlUrl: string | null;
}

export interface GitFileContentDto {
  path: string;
  name: string;
  sha: string;
  size: number;
  branch: string;
  language: string | null;
  content: string;
  htmlUrl: string | null;
}

export interface UpsertGitFileRequest {
  branch: string;
  path: string;
  content: string;
  commitMessage: string;
  sha?: string | null;
}

export interface DeleteGitFileRequest {
  branch: string;
  path: string;
  sha: string;
  commitMessage: string;
}

export interface GitCommitDto {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string | null;
  committedAt: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  htmlUrl: string | null;
  parentShas?: string[];
}

export interface GitCommitFileDiffDto {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

export interface GitCommitDetailDto {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string | null;
  committedAt: string;
  additions: number;
  deletions: number;
  files: GitCommitFileDiffDto[];
  htmlUrl: string | null;
}

export interface GitMutationResultDto {
  file: GitFileContentDto | null;
  commit: GitCommitDto;
}

export interface GitPullRequestDto {
  id?: number;
  number: number;
  title: string;
  description: string | null;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed';
  updatedAt: string;
  htmlUrl: string | null;
}

export interface CreateGitPullRequest {
  title: string;
  description?: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface MergeGitPullRequest {
  commitTitle?: string;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
}
