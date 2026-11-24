import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitCollaboratorInviteCard } from './GitCollaboratorInviteCard';
import { GitPage } from './GitPage';
import { setCachedGitOAuthSession } from './gitWorkspaceCache';
import {
  createMockGitApi,
  FULL_SCOPE,
  READONLY_SCOPE,
  SAMPLE_REPO,
  SAMPLE_TOKEN_INFO,
} from './gitTestFixtures';

afterEach(() => {
  cleanup();
  setCachedGitOAuthSession(null);
});

describe('Git OAuth-only flow & Repository Settings modal', () => {
  it('auto-fetches token in GitConnectPanel without any manual PAT input', async () => {
    const api = createMockGitApi(null);
    render(<GitPage scope={FULL_SCOPE} scopeLabel="Orbit Core" api={api} />);

    expect(screen.queryByText(/Personal Access Token/i)).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /Connect GitHub/i }));

    await waitFor(() => {
      expect(api.fetchOAuthToken).toHaveBeenCalledTimes(1);
      expect(api.inspectToken).toHaveBeenCalledWith('gho_auto_fetched_12345');
    });

    expect(await screen.findByText('@octocat')).toBeTruthy();
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

    fireEvent.click(await screen.findByRole('button', { name: /Connect GitHub/i }));

    expect(await screen.findByText(/GitHub authorization was canceled/i)).toBeTruthy();
    expect(api.inspectToken).not.toHaveBeenCalled();
  });

  it('opens Settings modal, displays owner, warns on repository switch, and switches after confirm', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    api.inspectToken = vi.fn().mockResolvedValue({
      ...SAMPLE_TOKEN_INFO,
      repositories: [
        ...SAMPLE_TOKEN_INFO.repositories,
        {
          owner: 'octocat',
          name: 'orbit-next',
          fullName: 'octocat/orbit-next',
          defaultBranch: 'main',
          privateRepo: false,
          cloneUrl: 'https://github.com/octocat/orbit-next.git',
          htmlUrl: 'https://github.com/octocat/orbit-next',
          description: 'Next repo',
        },
      ],
    });
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Settings$/i }));
    expect(await screen.findByText(/Repository Settings/i)).toBeTruthy();
    expect(screen.getByText('@orbit-org')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/ghp_/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Login with GitHub/i }));
    const select = await screen.findByLabelText(/Target Repository/i);
    expect(screen.getByText(/^Connected$/i)).toBeTruthy();

    // Close and reopen Settings modal: OAuth connected state must persist
    fireEvent.click(screen.getByLabelText(/Close modal/i));
    fireEvent.click(screen.getByRole('button', { name: /^Settings$/i }));
    const reopenedSelect = await screen.findByLabelText(/Target Repository/i);
    expect(screen.getByText(/Signed in as @octocat/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Login with GitHub$/i })).toBeNull();
    fireEvent.change(reopenedSelect, { target: { value: 'octocat/orbit-next' } });
    expect(select).toBeTruthy();

    expect(await screen.findByText(/Warning: Switching Repository/i)).toBeTruthy();
    expect(api.connectRepository).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Switch Repository/i }));
    await waitFor(() => {
      expect(api.connectRepository).toHaveBeenCalledWith({
        accessToken: 'gho_auto_fetched_12345',
        repoOwner: 'octocat',
        repoName: 'orbit-next',
        defaultBranch: 'main',
      });
    });
  });

  it('keeps Settings modal open and displays error when OAuth login fails', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    api.fetchOAuthToken = vi.fn().mockRejectedValue(new Error('Popup was blocked by your browser.'));
    render(<GitPage scope={FULL_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Settings$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Login with GitHub/i }));

    expect(await screen.findByText(/Popup was blocked by your browser/i)).toBeTruthy();
    expect(api.updateToken).not.toHaveBeenCalled();
  });

  it('hides OAuth repo switching in Settings modal for read-only users', async () => {
    const api = createMockGitApi(SAMPLE_REPO);
    render(<GitPage scope={READONLY_SCOPE} api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Settings$/i }));
    expect(await screen.findByText(/Only managers can switch repositories/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Login with GitHub/i })).toBeNull();
  });

  it('renders linked workspace members as invitable and unlinked members as disabled', () => {
    render(
      <GitCollaboratorInviteCard
        scope={FULL_SCOPE}
        enableRemoteFetch={false}
        initialCandidates={[
          {
            userId: 'u-1',
            displayName: 'Alice Dev',
            email: 'alice@orbit.dev',
            avatarUrl: null,
            githubLinked: true,
            githubUsername: 'alice-gh',
            alreadyCollaborator: false,
          },
          {
            userId: 'u-2',
            displayName: 'Bob NoGH',
            email: 'bob@orbit.dev',
            avatarUrl: null,
            githubLinked: false,
            githubUsername: null,
            alreadyCollaborator: false,
          },
        ]}
      />,
    );

    expect(screen.getByText('@alice-gh')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Invite$/i })).toBeTruthy();
    expect(screen.getByText('Bob NoGH')).toBeTruthy();
    expect(screen.getByText(/GitHub not linked/i)).toBeTruthy();
    expect(screen.getByText(/Unavailable/i)).toBeTruthy();
  });
});
