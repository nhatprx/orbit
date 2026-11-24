import type { GitCollaboratorDto, GitRepoStatsDto, GitWorkflowRunDto } from '../../types/git-insights.types';
import type {
  GitBranchDto,
  GitCommitDto,
  GitPullRequestDto,
  GitRepositoryDto,
  GitTreeEntryDto,
  InspectGitTokenResponse,
} from '../../types/git.types';

export interface CachedGitOAuthSession {
  token: string;
  info: InspectGitTokenResponse;
}

export interface CachedGitWorkspace {
  repo: GitRepositoryDto | null;
  branches: GitBranchDto[];
  activeBranch: string;
  tree: GitTreeEntryDto[];
  commits: GitCommitDto[];
  pullRequests: GitPullRequestDto[];
}

export interface CachedGitInsights {
  runs: GitWorkflowRunDto[];
  collaborators: GitCollaboratorDto[];
  stats: GitRepoStatsDto | null;
}

const workspaceCache = new Map<string, CachedGitWorkspace>();
const insightsCache = new Map<string, CachedGitInsights>();
let oauthSessionCache: CachedGitOAuthSession | null = null;

export function getCachedGitOAuthSession(): CachedGitOAuthSession | null {
  return oauthSessionCache;
}

export function setCachedGitOAuthSession(session: CachedGitOAuthSession | null): void {
  oauthSessionCache = session;
}

export function getCachedGitWorkspace(key: string): CachedGitWorkspace | null {
  return workspaceCache.get(key) ?? null;
}

export function setCachedGitWorkspace(key: string, value: CachedGitWorkspace): void {
  workspaceCache.set(key, value);
}

export function clearCachedGitWorkspace(key: string): void {
  workspaceCache.delete(key);
  insightsCache.delete(key);
}

export function getCachedGitInsights(key: string): CachedGitInsights | null {
  return insightsCache.get(key) ?? null;
}

export function setCachedGitInsights(key: string, value: CachedGitInsights): void {
  insightsCache.set(key, value);
}
