import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGitHubOAuthToken,
  GIT_OAUTH_POPUP_NAME,
  handleGitOAuthPopupCallback,
} from './gitOAuthPopup';

describe('gitOAuthPopup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
    window.name = '';
    localStorage.clear();
  });

  it('returns false when query params are absent or window is not a popup', () => {
    expect(handleGitOAuthPopupCallback()).toBe(false);

    window.history.replaceState({}, '', '/?git_oauth_code=abc123');
    expect(handleGitOAuthPopupCallback()).toBe(false);
  });

  it('broadcasts code and closes window when invoked in OAuth popup', () => {
    window.name = GIT_OAUTH_POPUP_NAME;
    window.history.replaceState({}, '', '/?git_oauth_code=code-xyz');
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {});

    expect(handleGitOAuthPopupCallback()).toBe(true);
    expect(closeSpy).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(localStorage.getItem('orbit:git-oauth-result') ?? '{}');
    expect(saved.code).toBe('code-xyz');
    expect(saved.error).toBeUndefined();
  });

  it('throws a clear error when browser blocks the popup', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    await expect(fetchGitHubOAuthToken()).rejects.toThrow(/Popup was blocked/i);
  });

  it('starts OAuth popup, receives code via postMessage, and exchanges for token', async () => {
    const fakePopup = {
      closed: false,
      location: { href: '' },
      document: { title: '', body: { style: {}, textContent: '' } },
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;

    vi.spyOn(window, 'open').mockReturnValue(fakePopup);
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authorizeUrl: '/api/v1/git/oauth/authorize?token=t1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'gho_exchanged_token_999' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const promise = fetchGitHubOAuthToken();

    await vi.waitFor(() => {
      expect(fakePopup.location.href).toContain('/api/v1/git/oauth/authorize?token=t1');
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'orbit:git-oauth-result', payload: { code: 'ex-code-1', ts: Date.now() } },
      })
    );

    const token = await promise;
    expect(token).toBe('gho_exchanged_token_999');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces OAuth errors returned by popup callback', async () => {
    const fakePopup = {
      closed: false,
      location: { href: '' },
      document: { title: '', body: { style: {}, textContent: '' } },
      focus: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;

    vi.spyOn(window, 'open').mockReturnValue(fakePopup);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ authorizeUrl: '/api/v1/git/oauth/authorize?token=t2' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const promise = fetchGitHubOAuthToken();

    await vi.waitFor(() => {
      expect(fakePopup.location.href).toContain('/api/v1/git/oauth/authorize?token=t2');
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: {
          type: 'orbit:git-oauth-result',
          payload: { error: 'User denied GitHub access.', ts: Date.now() },
        },
      })
    );

    await expect(promise).rejects.toThrow(/User denied GitHub access/i);
  });
});
