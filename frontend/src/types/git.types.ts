export interface GitFileEntry {
  path: string;
  name: string;
  type: 'dir' | 'file';
  lastCommit: string;
  updatedAt: string;
  language?: string;
  content?: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: number;
}

export interface GitPullRequest {
  id: number;
  title: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged';
  updatedAt: string;
}

export interface GitRepoData {
  slug: string;
  visibility: 'private' | 'team';
  branches: string[];
  defaultBranch: string;
  cloneUrl: string;
  files: GitFileEntry[];
  commits: GitCommit[];
  pullRequests: GitPullRequest[];
}
