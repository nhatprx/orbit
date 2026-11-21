import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GitPage } from './GitPage';
import {
  createMockGitApi,
  FULL_SCOPE,
  READONLY_SCOPE,
  SAMPLE_REPO,
} from './gitTestFixtures';

afterEach(() => {
  cleanup();
});

describe('GitPage', () => {
  it('verifies a GitHub token and connects an existing repository', async () => {
    const api = createMockGitApi(null);
    render(<GitPage scope={FULL_SCOPE} scopeLabel="Orbit Core" api={api} />);

    const tokenInput = await screen.findByLabelText(/GitHub Personal Access Token/i);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken12345' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify GitHub Access/i }));

    expect(await screen.findByText('@octocat')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Connect Repository/i }));

    await waitFor(() => {
      expect(api.connectRepository).toHaveBeenCalledWith({
        accessToken: 'ghp_testtoken12345',
        repoOwner: 'orbit-org',
        repoName: 'orbit-core',
        defaultBranch: 'main',
      });
    });
    expect(await screen.findByText('orbit-org/orbit-core')).toBeTruthy();
  });

  it('creates a new GitHub repository from the connect panel', async () => {
    const api = createMockGitApi(null);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.change(await screen.findByLabelText(/GitHub Personal Access Token/i), {
      target: { value: 'ghp_create12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create New GitHub Repository/i }));
    fireEvent.change(screen.getByLabelText(/New Repository Name/i), {
      target: { value: 'orbit-new-repo' },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Created via Orbit' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create & Connect Repository/i }));

    await waitFor(() => {
      expect(api.createRepository).toHaveBeenCalledWith({
        accessToken: 'ghp_create12345',
        repoName: 'orbit-new-repo',
        description: 'Created via Orbit',
        privateRepo: true,
      });
    });
    expect(await screen.findByText('orbit-org/orbit-new-repo')).toBeTruthy();
  });

  it('browses directories, opens, creates, edits, and deletes files', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /src/i }));
    fireEvent.click(await screen.findByRole('button', { name: /app\.ts/i }));
    expect(await screen.findByText(/export const version = 1;/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /New File/i }));
    fireEvent.change(screen.getByLabelText(/File Path/i), { target: { value: 'src/new.ts' } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'export const x = 2;' } });
    fireEvent.change(screen.getByLabelText(/Commit Message/i), { target: { value: 'Add new.ts' } });
    fireEvent.click(screen.getByRole('button', { name: /Commit to GitHub/i }));

    await waitFor(() => {
      expect(api.upsertFile).toHaveBeenCalledWith({
        branch: 'main',
        path: 'src/new.ts',
        content: 'export const x = 2;',
        commitMessage: 'Add new.ts',
        sha: null,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /Edit File/i }));
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'export const version = 2;' } });
    fireEvent.click(screen.getByRole('button', { name: /Commit to GitHub/i }));

    await waitFor(() => {
      expect(api.upsertFile).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete File/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(api.deleteFile).toHaveBeenCalledWith({
        branch: 'main',
        path: 'src/app.ts',
        sha: 'file222999',
        commitMessage: 'Delete src/app.ts',
      });
    });
  });

  it('pulls commit history from GitHub and displays commit diff modal', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /Commits \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pull Commit History/i }));

    await waitFor(() => {
      expect(api.syncCommits).toHaveBeenCalledWith('main', 30);
    });

    fireEvent.click(screen.getByRole('button', { name: /View Diff/i }));
    expect(await screen.findByText(/Commit Diff/i)).toBeTruthy();
    expect(await screen.findByText(/\+export const version = 1;/)).toBeTruthy();
  });

  it('creates and merges a pull request', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /Pull Requests \(1\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /New Pull Request/i }));
    fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'Ship Git UI' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Pull Request/i }));

    await waitFor(() => {
      expect(api.createPullRequest).toHaveBeenCalledWith({
        title: 'Ship Git UI',
        description: undefined,
        sourceBranch: 'feat/git-ui',
        targetBranch: 'main',
      });
    });

    fireEvent.change(screen.getByLabelText(/Merge method for PR #12/i), {
      target: { value: 'squash' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Merge PR/i }));
    await waitFor(() => {
      expect(api.mergePullRequest).toHaveBeenCalledWith(12, { mergeMethod: 'squash' });
    });
  });

  it('enforces RBAC read-only UI when canManage and canWrite are false', async () => {
    const disconnectedApi = createMockGitApi(null);
    const { unmount } = render(<GitPage scope={READONLY_SCOPE} api={disconnectedApi} />);
    expect(await screen.findByText(/read-only access/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Verify GitHub Access/i })).toBeNull();
    unmount();

    const connectedApi = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={READONLY_SCOPE} api={connectedApi} />);
    expect(await screen.findByText('orbit-org/orbit-core')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /New File/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Pull Requests/i }));
    expect(screen.queryByRole('button', { name: /New Pull Request/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Merge PR/i })).toBeNull();
  });
});
