import type { GitCommitDto, GitCommitFileDiffDto, GitPullRequestDto } from './git.types';

export type GitOAuthScopeMode = 'all' | 'public' | 'selected';

export interface GitOAuthCapabilitiesDto {
  oauthConfigured: boolean;
  githubAppConfigured: boolean;
  githubAppSlug: string;
}

export interface GitWorkspaceMemberCandidateDto {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  githubLinked: boolean;
  githubUsername: string | null;
  alreadyCollaborator: boolean;
}

export interface InviteGitCollaboratorResultDto {
  githubUsername: string;
  permission: string;
  status: 'INVITED' | 'ALREADY_COLLABORATOR';
}

export interface GitWorkflowRunDto {
  id: number;
  name: string;
  headBranch: string;
  headSha: string;
  status: string;
  conclusion: string | null;
  event: string;
  actorLogin: string;
  htmlUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GitCollaboratorDto {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string;
  roleName: string;
}

export interface GitPrCommentDto {
  id: number;
  author: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string | null;
}

export interface GitPrDetailDto {
  pullRequest: GitPullRequestDto;
  files: GitCommitFileDiffDto[];
  comments: GitPrCommentDto[];
  additions: number;
  deletions: number;
}

export interface GitPrReviewRequest {
  event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
  body: string;
}

export interface GitWorkflowStepDto {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
}

export interface GitWorkflowJobDto {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: GitWorkflowStepDto[];
}

export interface GitBranchCompareDto {
  baseBranch: string;
  headBranch: string;
  status: string;
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  commits: GitCommitDto[];
  files: GitCommitFileDiffDto[];
}

export interface GitAiAnalysisDto {
  summary: string;
  modelUsed: string;
}

export interface GitContributorDto {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string;
  contributions: number;
}

export interface GitRepoStatsDto {
  views14d: number;
  uniqueVisitors14d: number;
  clones14d: number;
  uniqueCloners14d: number;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  topContributors: GitContributorDto[];
}
