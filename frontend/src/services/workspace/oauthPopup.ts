export const OAUTH_POPUP_NAME = 'orbit-oauth-link';
const CHANNEL_NAME = 'orbit:oauth-link';
const STORAGE_KEY = 'orbit:oauth-link-result';
const MESSAGE_TYPE = 'orbit:oauth-link-result';

export interface OAuthLinkResult {
  provider?: string;
  error?: string;
  ts: number;
}

export function openOAuthPopup(): Window | null {
  const width = 540;
  const height = 680;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
  const popup = window.open('about:blank', OAUTH_POPUP_NAME, features);
  if (popup) {
    try {
      popup.document.title = 'Orbit - Connecting Account';
      popup.document.body.style.backgroundColor = '#0D1117';
      popup.document.body.style.color = '#E6EDF3';
      popup.document.body.style.fontFamily = 'sans-serif';
      popup.document.body.style.padding = '24px';
      popup.document.body.textContent = 'Connecting your account...';
    } catch {
      // ignore if cross-origin already
    }
  }
  return popup;
}

export function handleOAuthLinkPopupCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  const provider = params.get('oauth_linked') ?? undefined;
  const error = params.get('oauth_link_error') ?? undefined;
  if (!provider && !error) return false;

  const isPopup = window.name === OAUTH_POPUP_NAME || Boolean(window.opener);
  if (!isPopup) return false;

  const result: OAuthLinkResult = { provider, error, ts: Date.now() };
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

export function subscribeOAuthLinkResult(listener: (result: OAuthLinkResult) => void): () => void {
  const seen = new Set<number>();
  const emit = (result: OAuthLinkResult | null | undefined) => {
    if (!result || typeof result.ts !== 'number' || seen.has(result.ts)) return;
    seen.add(result.ts);
    listener(result);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as { type?: string; payload?: OAuthLinkResult } | null;
    if (data?.type === MESSAGE_TYPE) emit(data.payload);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      emit(JSON.parse(event.newValue) as OAuthLinkResult);
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
      channel.onmessage = (event: MessageEvent<OAuthLinkResult>) => emit(event.data);
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

export function waitForOAuthPopup(popup: Window): Promise<OAuthLinkResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: OAuthLinkResult | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollId);
      unsubscribe();
      resolve(result);
    };

    const unsubscribe = subscribeOAuthLinkResult((result) => {
      try {
        if (!popup.closed) popup.close();
      } catch {
        // ignore
      }
      finish(result);
    });

    const pollId = window.setInterval(() => {
      if (popup.closed) finish(null);
    }, 400);
  });
}
