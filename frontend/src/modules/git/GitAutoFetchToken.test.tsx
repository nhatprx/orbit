import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitPage } from './GitPage';
import { createMockGitApi, FULL_SCOPE, READONLY_SCOPE, SAMPLE_REPO } from './gitTestFixtures';

afterEach(() => {
  cleanup();
});

describe('Git auto-fetch GitHub token flow', () => {
  it('auto-fetches token in GitConnectPanel, verifies it, and connects repository', async () => {
    const api = createMockGitApi(null);
    render(<GitPage scope={FULL_SCOPE} scopeLabel="Orbit Core" api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /Auto-Fetch from GitHub/i }));

    await waitFor(() => {
      expect(api.fetchOAuthToken).toHaveBeenCalledTimes(1);
      expect(api.inspectToken).toHaveBeenCalledWith('gho_auto_fetched_12345');
    });

    expect(await screen.findByText('@octocat')).toBeTruthy();
    const tokenInput = screen.getByLabelText(/GitHub Personal Access Token/i) as HTMLInputElement;
    expect(tokenInput.value).toBe('gho_auto_fetched_12345');

    fireEvent.click(screen.getByRole('button', { name: /Connect Repository/i }));
    await waitFor(() => {
      expect(api.connectRepository).toHaveBeenCalledWith({
        accessToken: 'gho_auto_fetched_12345',
        repoOwner: 'orbit-org',
        repoName: 'orbit-core',
        defaultBranch: 'main',
      });
    });
  });

  it('shows error banner when auto-fetch fails in GitConnectPanel', async () => {
    const api = createMockGitApi(null);
    api.fetchOAuthToken = vi.fn().mockRejectedValue(new Error('GitHub authorization was canceled.'));
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /Auto-Fetch from GitHub/i }));

    expect(await screen.findByText(/GitHub authorization was canceled/i)).toBeTruthy();
    expect(api.inspectToken).not.toHaveBeenCalled();
  });

  it('auto-fetches and sets token directly inside GitAccessModal', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /GitHub Access/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Auto-Fetch & Set from GitHub/i }));

    await waitFor(() => {
      expect(api.fetchOAuthToken).toHaveBeenCalledTimes(1);
      expect(api.updateToken).toHaveBeenCalledWith('gho_auto_fetched_12345');
    });

    await waitFor(() => {
      expect(screen.queryByText(/GitHub Access & Connection/i)).toBeNull();
    });
  });

  it('keeps GitAccessModal open and displays error when auto-fetch fails', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    api.fetchOAuthToken = vi.fn().mockRejectedValue(new Error('Popup was blocked by your browser.'));
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /GitHub Access/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Auto-Fetch & Set from GitHub/i }));

    expect(await screen.findByText(/Popup was blocked by your browser/i)).toBeTruthy();
    expect(api.updateToken).not.toHaveBeenCalled();
  });

  it('hides auto-fetch button in GitAccessModal for read-only users', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={READONLY_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /GitHub Access/i }));
    expect(await screen.findByText(/Only managers can rotate/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Auto-Fetch & Set from GitHub/i })).toBeNull();
  });
});
