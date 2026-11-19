import { MOCK_GIT_REPO } from '../mocks/git.mock';
import type { GitRepoData } from '../types/git.types';

export interface IGitService {
  getRepository(workspaceId: string): Promise<GitRepoData>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockGitService implements IGitService {
  async getRepository(workspaceId: string): Promise<GitRepoData> {
    await delay(100);
    return {
      ...MOCK_GIT_REPO,
      slug: `nhatprx/${workspaceId.replace(/^ws_/, '').replace(/_/g, '-')}`,
    };
  }
}

export const gitService: IGitService = new MockGitService();
