import { aiOpenRouterService } from '../../services/aiOpenRouter.service';

const VERIFIER_STORAGE_KEY = 'orbit_openrouter_pkce_verifier';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startOpenRouterOAuth(): Promise<void> {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const verifier = toBase64Url(raw);
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = toBase64Url(new Uint8Array(digest));

  const callbackUrl = `${window.location.origin}/?openrouter_oauth=1`;
  const authUrl = new URL('https://openrouter.ai/auth');
  authUrl.searchParams.set('callback_url', callbackUrl);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  window.location.assign(authUrl.toString());
}

export function consumeStoredPkceVerifier(): string | null {
  const val = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
  if (val) sessionStorage.removeItem(VERIFIER_STORAGE_KEY);
  return val;
}

export async function handleOpenRouterOAuthCallback(onResult: (msg: string) => void): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  if (params.get('openrouter_oauth') !== '1') return false;
  const code = params.get('code');
  window.history.replaceState({}, document.title, window.location.pathname);
  const verifier = consumeStoredPkceVerifier();
  if (!code || !verifier) {
    onResult('OpenRouter OAuth connection was cancelled or missing verifier.');
    return true;
  }
  try {
    await aiOpenRouterService.exchangeOAuthCode(code, verifier);
    onResult('Connected personal OpenRouter account successfully.');
  } catch (err) {
    onResult(err instanceof Error ? err.message : 'OpenRouter OAuth connection failed.');
  }
  return true;
}
