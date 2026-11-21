import { vi } from 'vitest';
import type { GitApi } from '../../services/git/gitApi';
import type {
  GitBranchDto,
  GitCommitDetailDto,
  GitCommitDto,
  GitFileContentDto,
  GitPullRequestDto,
  GitRepositoryDto,
  GitScope,
  GitTreeEntryDto,
  InspectGitTokenResponse,
} from '../../types/git.types';

export const FULL_SCOPE: GitScope = {
  type: 'WORKSPACE',
  workspaceId: 'ws-1',
  permissions: ['git.read', 'git.write', 'git.delete', 'git.manage'],
};

export const READONLY_SCOPE: GitScope = {
  type: 'WORKSPACE',
  workspaceId: 'ws-1',
  permissions: ['git.read'],
};

export const SAMPLE_REPO: GitRepositoryDto = {
  id: 'repo-1',
  scopeType: 'WORKSPACE',
  scopeId: 'ws-1',
  provider: 'GITHUB',
  repoOwner: 'orbit-org',
  repoName: 'orbit-core',
  slug: 'orbit-org/orbit-core',
  defaultBranch: 'main',
  visibility: 'PRIVATE',
  cloneUrl: 'https://github.com/orbit-org/orbit-core.git',
  htmlUrl: 'https://github.com/orbit-org/orbit-core',
  tokenHint: 'ghp_...9a2f',
  lastSyncedAt: '2026-11-20T10:00:00Z',
  createdAt: '2026-11-01T10:00:00Z',
};

export const SAMPLE_TOKEN_INFO: InspectGitTokenResponse = {
  username: 'octocat',
  displayName: 'The Octocat',
  scopes: ['repo', 'read:user'],
  repositories: [
    {
      owner: 'orbit-org',
      name: 'orbit-core',
      fullName: 'orbit-org/orbit-core',
      defaultBranch: 'main',
      privateRepo: true,
      cloneUrl: SAMPLE_REPO.cloneUrl,
      htmlUrl: SAMPLE_REPO.htmlUrl,
      description: 'Core repo',
    },
  ],
};

export const SAMPLE_BRANCHES: GitBranchDto[] = [
  { name: 'main', sha: 'abc1234567890', isDefault: true, isProtected: true },
  { name: 'feat/git-ui', sha: 'def4567890123', isDefault: false, isProtected: false },
];

export const SAMPLE_ROOT_TREE: GitTreeEntryDto[] = [
  { path: 'src', name: 'src', type: 'dir', size: 0, sha: 'dir111', htmlUrl: null },
  { path: 'README.md', name: 'README.md', type: 'file', size: 24, sha: 'file111', htmlUrl: null },
];

export const SAMPLE_SRC_TREE: GitTreeEntryDto[] = [
  { path: 'src/app.ts', name: 'app.ts', type: 'file', size: 42, sha: 'file222', htmlUrl: null },
];

export const SAMPLE_FILE: GitFileContentDto = {
  path: 'src/app.ts',
  name: 'app.ts',
  sha: 'file222999',
  size: 42,
  branch: 'main',
  language: 'typescript',
  content: 'export const version = 1;\n',
  htmlUrl: null,
};

export const SAMPLE_COMMITS: GitCommitDto[] = [
  {
    sha: '1111222233334444',
    message: 'Initial Orbit commit',
    authorName: 'octocat',
    authorEmail: 'octo@orbit.dev',
    committedAt: '2026-11-20T09:00:00Z',
    filesChanged: 2,
    additions: 15,
    deletions: 3,
    htmlUrl: null,
  },
];

export const SAMPLE_COMMIT_DETAIL: GitCommitDetailDto = {
  sha: '1111222233334444',
  message: 'Initial Orbit commit',
  authorName: 'octocat',
  authorEmail: 'octo@orbit.dev',
  committedAt: '2026-11-20T09:00:00Z',
  additions: 15,
  deletions: 3,
  htmlUrl: null,
  files: [
    {
      filename: 'src/app.ts',
      status: 'modified',
      additions: 1,
      deletions: 1,
      changes: 2,
      patch: '@@ -1 +1 @@\n-export const version = 0;\n+export const version = 1;',
    },
  ],
};

export const SAMPLE_PRS: GitPullRequestDto[] = [
  {
    number: 12,
    title: 'Add GitHub module',
    description: 'Initial PR',
    author: 'octocat',
    sourceBranch: 'feat/git-ui',
    targetBranch: 'main',
    status: 'open',
    updatedAt: '2026-11-20T09:30:00Z',
    htmlUrl: 'https://github.com/orbit-org/orbit-core/pull/12',
  },
];

export function createMockGitApi(initialRepo: GitRepositoryDto | null = SAMPLE_REPO): GitApi {
  let repo = initialRepo;
  return {
    inspectToken: vi.fn().mockResolvedValue(SAMPLE_TOKEN_INFO),
    getRepository: vi.fn().mockImplementation(async () => repo),
    connectRepository: vi.fn().mockImplementation(async () => {
      repo = SAMPLE_REPO;
      return SAMPLE_REPO;
    }),
    createRepository: vi.fn().mockImplementation(async (req) => {
      repo = { ...SAMPLE_REPO, repoName: req.repoName, slug: `orbit-org/${req.repoName}` };
      return repo;
    }),
    updateToken: vi.fn().mockResolvedValue(SAMPLE_REPO),
    disconnectRepository: vi.fn().mockImplementation(async () => {
      repo = null;
    }),
    listBranches: vi.fn().mockResolvedValue(SAMPLE_BRANCHES),
    createBranch: vi.fn().mockResolvedValue({
      name: 'feat/new',
      sha: '9998887',
      isDefault: false,
      isProtected: false,
    }),
    deleteBranch: vi.fn().mockResolvedValue(undefined),
    listTree: vi.fn().mockImplementation(async (_branch, path) =>
      path === 'src' ? SAMPLE_SRC_TREE : SAMPLE_ROOT_TREE
    ),
    getFile: vi.fn().mockResolvedValue(SAMPLE_FILE),
    upsertFile: vi.fn().mockResolvedValue({ file: SAMPLE_FILE, commit: SAMPLE_COMMITS[0] }),
    deleteFile: vi.fn().mockResolvedValue({ file: null, commit: SAMPLE_COMMITS[0] }),
    listCommits: vi.fn().mockResolvedValue(SAMPLE_COMMITS),
    syncCommits: vi.fn().mockResolvedValue(SAMPLE_COMMITS),
    getCommitDetail: vi.fn().mockResolvedValue(SAMPLE_COMMIT_DETAIL),
    listPullRequests: vi.fn().mockResolvedValue(SAMPLE_PRS),
    createPullRequest: vi.fn().mockResolvedValue({ ...SAMPLE_PRS[0], number: 13, title: 'New PR' }),
    mergePullRequest: vi.fn().mockResolvedValue({ ...SAMPLE_PRS[0], status: 'merged' }),
  };
}
