import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGitPermissions, type GitScope } from '../../types/git.types';
import { ApiError } from '../workspace/httpClient';
import { createHttpGitApi, gitBasePath } from './gitApi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('gitBasePath & getGitPermissions', () => {
  it('builds workspace and project base paths with URL encoding', () => {
    const wsScope: GitScope = { type: 'WORKSPACE', workspaceId: 'ws/1', permissions: [] };
    const pjScope: GitScope = { type: 'PROJECT', workspaceId: 'ws-1', projectId: 'pj 2', permissions: [] };
    expect(gitBasePath(wsScope)).toBe('/api/v1/workspaces/ws%2F1/git');
    expect(gitBasePath(pjScope)).toBe('/api/v1/workspaces/ws-1/projects/pj%202/git');
  });

  it('resolves workspace and project RBAC permissions', () => {
    const ws = getGitPermissions({
      type: 'WORKSPACE',
      workspaceId: 'w1',
      permissions: ['git.read', 'git.manage'],
    });
    expect(ws).toEqual({ canRead: true, canWrite: false, canDelete: false, canManage: true });

    const pj = getGitPermissions({
      type: 'PROJECT',
      workspaceId: 'w1',
      projectId: 'p1',
      permissions: ['pgit.read', 'pgit.write', 'pgit.delete'],
    });
    expect(pj).toEqual({ canRead: true, canWrite: true, canDelete: true, canManage: false });
  });
});

describe('createHttpGitApi', () => {
  const scope: GitScope = { type: 'WORKSPACE', workspaceId: 'ws-1', permissions: ['git.read'] };

  it('returns null from getRepository on 404 or GIT_REPO_NOT_CONNECTED and rethrows 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: 'GIT_REPO_NOT_CONNECTED', message: 'Not connected' }, 404))
      .mockResolvedValueOnce(jsonResponse({ code: 'INTERNAL_ERROR', message: 'Server error' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    const api = createHttpGitApi(scope);
    expect(await api.getRepository()).toBeNull();
    await expect(api.getRepository()).rejects.toBeInstanceOf(ApiError);
  });

  it('sends token inspection, repository connect/create/update/disconnect requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ username: 'octo', displayName: 'Octo', scopes: ['repo'], repositories: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: 'r1', slug: 'octo/orbit' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'r2', slug: 'octo/new-repo' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'r1', tokenHint: 'ghp_...9999' }))
      .mockResolvedValueOnce(jsonResponse(undefined, 204));
    vi.stubGlobal('fetch', fetchMock);

    const api = createHttpGitApi(scope);
    const inspected = await api.inspectToken('ghp_secret');
    expect(inspected.username).toBe('octo');
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/v1/workspaces/ws-1/git/inspect-token'), expect.objectContaining({ method: 'POST' }));

    await api.connectRepository({ accessToken: 'ghp_secret', repoOwner: 'octo', repoName: 'orbit' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/repository/connect'), expect.objectContaining({ method: 'POST' }));

    await api.createRepository({ accessToken: 'ghp_secret', repoName: 'new-repo', privateRepo: true });
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/repository/create'), expect.objectContaining({ method: 'POST' }));

    await api.updateToken('ghp_next');
    expect(fetchMock).toHaveBeenNthCalledWith(4, expect.stringContaining('/repository/token'), expect.objectContaining({ method: 'PATCH' }));

    await api.disconnectRepository();
    expect(fetchMock).toHaveBeenNthCalledWith(5, expect.stringContaining('/repository'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('sends file CRUD, branch, commit sync, and pull request requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ name: 'main', sha: 'abc', isDefault: true, isProtected: true }]))
      .mockResolvedValueOnce(jsonResponse({ name: 'feat/git', sha: 'abc', isDefault: false, isProtected: false }))
      .mockResolvedValueOnce(jsonResponse(undefined, 204))
      .mockResolvedValueOnce(jsonResponse([{ path: 'src', name: 'src', type: 'dir', size: 0, sha: '1', htmlUrl: null }]))
      .mockResolvedValueOnce(jsonResponse({ path: 'README.md', name: 'README.md', sha: 's1', size: 5, branch: 'main', language: 'Markdown', content: 'hi', htmlUrl: null }))
      .mockResolvedValueOnce(jsonResponse({ file: null, commit: { sha: 'c1' } }))
      .mockResolvedValueOnce(jsonResponse({ file: null, commit: { sha: 'c2' } }))
      .mockResolvedValueOnce(jsonResponse([{ sha: 'c1', message: 'init' }]))
      .mockResolvedValueOnce(jsonResponse({ sha: 'c1', files: [] }))
      .mockResolvedValueOnce(jsonResponse([{ number: 7, title: 'Add git', status: 'open' }]))
      .mockResolvedValueOnce(jsonResponse({ number: 8, title: 'New PR', status: 'open' }))
      .mockResolvedValueOnce(jsonResponse({ number: 8, title: 'New PR', status: 'merged' }));
    vi.stubGlobal('fetch', fetchMock);

    const api = createHttpGitApi(scope);
    expect(await api.listBranches()).toHaveLength(1);
    await api.createBranch({ branchName: 'feat/git', sourceBranch: 'main' });
    await api.deleteBranch('feat/git');
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/branches/feat%2Fgit'), expect.objectContaining({ method: 'DELETE' }));

    await api.listTree('main', 'src');
    expect(fetchMock).toHaveBeenNthCalledWith(4, expect.stringContaining('/tree?branch=main&path=src'), expect.objectContaining({ method: 'GET' }));

    await api.getFile('main', 'README.md');
    await api.upsertFile({ branch: 'main', path: 'README.md', content: 'hello', commitMessage: 'docs: update' });
    expect(fetchMock).toHaveBeenNthCalledWith(6, expect.stringContaining('/file'), expect.objectContaining({ method: 'PUT' }));

    await api.deleteFile({ branch: 'main', path: 'README.md', sha: 's1', commitMessage: 'chore: remove' });
    expect(fetchMock).toHaveBeenNthCalledWith(7, expect.stringContaining('/file'), expect.objectContaining({ method: 'DELETE' }));

    await api.syncCommits('main', 20);
    expect(fetchMock).toHaveBeenNthCalledWith(8, expect.stringContaining('/commits/sync?branch=main&limit=20'), expect.objectContaining({ method: 'POST' }));

    await api.getCommitDetail('c1');
    await api.listPullRequests('open');
    expect(fetchMock).toHaveBeenNthCalledWith(10, expect.stringContaining('/pulls?state=open'), expect.objectContaining({ method: 'GET' }));

    await api.createPullRequest({ title: 'New PR', sourceBranch: 'feat/git', targetBranch: 'main' });
    await api.mergePullRequest(8, { mergeMethod: 'squash' });
    expect(fetchMock).toHaveBeenNthCalledWith(12, expect.stringContaining('/pulls/8/merge'), expect.objectContaining({ method: 'POST' }));
  });
});
