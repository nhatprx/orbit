import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OAUTH_POPUP_NAME,
  handleOAuthLinkPopupCallback,
  subscribeOAuthLinkResult,
} from './oauthPopup';

describe('oauthPopup helpers', () => {
  afterEach(() => {
    window.name = '';
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('ignores normal non-popup page loads even with oauth_linked param', () => {
    window.history.replaceState({}, '', '/?oauth_linked=google');
    expect(handleOAuthLinkPopupCallback()).toBe(false);
  });

  it('handles popup callback, posts result, and closes popup window', () => {
    window.name = OAUTH_POPUP_NAME;
    window.history.replaceState({}, '', '/?oauth_linked=github');
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {});

    expect(handleOAuthLinkPopupCallback()).toBe(true);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('subscribes and deduplicates results by timestamp', () => {
    const received: string[] = [];
    const unsub = subscribeOAuthLinkResult((res) => {
      received.push(res.provider ?? res.error ?? '');
    });

    const payload = { provider: 'google', ts: 123456789 };
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'orbit:oauth-link-result', payload },
      })
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'orbit:oauth-link-result', payload },
      })
    );

    unsub();
    expect(received).toEqual(['google']);
  });
});
