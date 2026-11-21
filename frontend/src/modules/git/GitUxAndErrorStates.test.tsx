import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/workspace/httpClient';
import { formatGitTimestamp } from './gitFormat';
import { GitPage } from './GitPage';
import { GitPullRequestsView } from './GitPullRequestsView';
import {
  createMockGitApi,
  FULL_SCOPE,
  SAMPLE_PRS,
  SAMPLE_REPO,
} from './gitTestFixtures';

afterEach(() => {
  cleanup();
});

describe('formatGitTimestamp', () => {
  it('formats valid ISO instants and gracefully handles empty or invalid values', () => {
    const formatted = formatGitTimestamp('2026-11-20T10:00:00Z');
    expect(formatted).not.toBe('2026-11-20T10:00:00Z');
    expect(formatted).toMatch(/2026/);
    expect(formatGitTimestamp(null, 'Never')).toBe('Never');
    expect(formatGitTimestamp('   ', 'N/A')).toBe('N/A');
    expect(formatGitTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('GitPage error handling, formatting, branch confirmation & PR details', () => {
  it('shows error state with Retry button when repository load fails with 403/500 instead of Connect panel', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    api.getRepository = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Missing git.read permission'))
      .mockResolvedValueOnce(SAMPLE_REPO);

    render(<GitPage scope={FULL_SCOPE} scopeLabel="Orbit Core" api={api} />);

    expect(await screen.findByText(/Unable to load Git repository/i)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Missing git.read permission');
    expect(screen.queryByLabelText(/GitHub Personal Access Token/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(await screen.findByText('orbit-org/orbit-core')).toBeTruthy();
    expect(api.getRepository).toHaveBeenCalledTimes(2);
  });

  it('formats ISO timestamps cleanly in header, commits, and pull requests views', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    expect(await screen.findByText('orbit-org/orbit-core')).toBeTruthy();
    expect(screen.queryByText(/2026-11-20T10:00:00Z/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Commits \(1\)/i }));
    expect(screen.queryByText(/2026-11-20T09:00:00Z/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Pull Requests \(1\)/i }));
    expect(screen.queryByText(/2026-11-20T09:30:00Z/)).toBeNull();
  });

  it('requires confirmation before deleting a branch in GitBranchModal', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Branches$/i }));
    fireEvent.click(screen.getByLabelText('Delete branch feat/git-ui'));

    expect(api.deleteBranch).not.toHaveBeenCalled();
    expect(await screen.findByText(/Delete branch "feat\/git-ui" from GitHub/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(api.deleteBranch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Delete branch feat/git-ui'));
    fireEvent.click(screen.getByRole('button', { name: /^Delete Branch$/i }));

    await waitFor(() => {
      expect(api.deleteBranch).toHaveBeenCalledWith('feat/git-ui');
    });
  });

  it('expands PR description, renders external GitHub link, and submits chosen merge method', async () => {
    const onMerge = vi.fn().mockResolvedValue(undefined);
    const firstPr = SAMPLE_PRS[0];
    if (!firstPr) throw new Error('Expected SAMPLE_PRS[0]');
    const prs = [
      firstPr,
      {
        ...firstPr,
        number: 14,
        title: 'No link PR',
        description: null,
        htmlUrl: null,
      },
    ];

    render(
      <GitPullRequestsView
        pullRequests={prs}
        filter="all"
        canWrite
        onFilterChange={vi.fn()}
        onNewPr={vi.fn()}
        onMergePr={onMerge}
      />,
    );

    const ghLink = screen.getByLabelText('Open PR #12 on GitHub');
    expect(ghLink.getAttribute('href')).toBe('https://github.com/orbit-org/orbit-core/pull/12');
    expect(screen.queryByLabelText('Open PR #14 on GitHub')).toBeNull();

    expect(screen.queryByText('Initial PR')).toBeNull();
    fireEvent.click(screen.getByLabelText('Toggle description for PR #12'));
    expect(screen.getByText('Initial PR')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Toggle description for PR #14'));
    expect(screen.getByText('No description provided.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Merge method for PR #12'), {
      target: { value: 'rebase' },
    });
    const [firstMergeButton] = screen.getAllByRole('button', { name: /Merge PR/i });
    if (!firstMergeButton) throw new Error('Expected Merge PR button');
    fireEvent.click(firstMergeButton);

    await waitFor(() => {
      expect(onMerge).toHaveBeenCalledWith(12, { mergeMethod: 'rebase' });
    });
  });
});
