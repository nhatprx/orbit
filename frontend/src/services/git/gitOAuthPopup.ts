import { API_BASE_URL } from '../auth.storage';
import { apiRequest } from '../workspace/httpClient';

export const GIT_OAUTH_POPUP_NAME = 'orbit-git-oauth';
const CHANNEL_NAME = 'orbit:git-oauth';
const STORAGE_KEY = 'orbit:git-oauth-result';
const MESSAGE_TYPE = 'orbit:git-oauth-result';

export interface GitOAuthPopupResult {
  code?: string;
  error?: string;
  ts: number;
}

interface GitOAuthStartResponse {
  authorizeUrl: string;
}

interface GitOAuthTokenResponse {
  accessToken: string;
}

export function openGitOAuthPopup(): Window | null {
  const width = 540;
  const height = 680;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
  const popup = window.open('about:blank', GIT_OAUTH_POPUP_NAME, features);
  if (popup) {
    try {
      popup.document.title = 'Orbit - Authorizing GitHub';
      popup.document.body.style.backgroundColor = '#0D1117';
      popup.document.body.style.color = '#E6EDF3';
      popup.document.body.style.fontFamily = 'Outfit, sans-serif';
      popup.document.body.style.padding = '24px';
      popup.document.body.textContent = 'Connecting to GitHub...';
    } catch {
      // ignore if cross-origin already
    }
  }
  return popup;
}

export function handleGitOAuthPopupCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('git_oauth_code') ?? undefined;
  const error = params.get('git_oauth_error') ?? undefined;
  if (!code && !error) return false;

  const isPopup = window.name === GIT_OAUTH_POPUP_NAME || Boolean(window.opener);
  if (!isPopup) return false;

  const result: GitOAuthPopupResult = { code, error, ts: Date.now() };
  try {
    window.opener?.postMessage({ type: MESSAGE_TYPE, payload: result }, window.location.origin);
  } catch {
    // opener may be severed by COOP
  }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(result);
      channel.close();
    }
  } catch {
    // ignore BroadcastChannel failures
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // ignore storage failures
  }

  window.close();
  return true;
}

export function waitForGitOAuthPopup(popup: Window): Promise<GitOAuthPopupResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const seen = new Set<number>();

    const finish = (result: GitOAuthPopupResult | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollId);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      channel?.close();
      resolve(result);
    };

    const emit = (result: GitOAuthPopupResult | null | undefined) => {
      if (!result || typeof result.ts !== 'number' || seen.has(result.ts)) return;
      seen.add(result.ts);
      try {
        if (!popup.closed) popup.close();
      } catch {
        // ignore
      }
      finish(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; payload?: GitOAuthPopupResult } | null;
      if (data?.type === MESSAGE_TYPE) emit(data.payload);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        emit(JSON.parse(event.newValue) as GitOAuthPopupResult);
      } catch {
        // ignore malformed payload
      }
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event: MessageEvent<GitOAuthPopupResult>) => emit(event.data);
      } catch {
        channel = null;
      }
    }

    const pollId = window.setInterval(() => {
      if (popup.closed) finish(null);
    }, 400);
  });
}

export async function fetchGitHubOAuthToken(): Promise<string> {
  const popup = openGitOAuthPopup();
  if (!popup) {
    throw new Error('Popup was blocked by your browser. Allow popups for Orbit and try again.');
  }

  let startRes: GitOAuthStartResponse;
  try {
    startRes = await apiRequest<GitOAuthStartResponse>('POST', '/api/v1/git/oauth/start');
  } catch (err) {
    popup.close();
    throw err;
  }

  popup.location.href = `${API_BASE_URL}${startRes.authorizeUrl}`;
  popup.focus();

  const result = await waitForGitOAuthPopup(popup);
  if (!result) {
    throw new Error('GitHub authorization was canceled.');
  }
  if (result.error) {
    throw new Error(result.error);
  }
  if (!result.code) {
    throw new Error('GitHub authorization did not return a code.');
  }

  const exchanged = await apiRequest<GitOAuthTokenResponse>('POST', '/api/v1/git/oauth/exchange', {
    body: { code: result.code },
  });
  return exchanged.accessToken;
}
