import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveWebSocketUrl } from './httpChat.service';
import { ApiError, SESSION_EXPIRED_EVENT, apiRequest, errorMessage, seg } from './httpClient';

const SESSION_KEY = 'orbit_auth_session';

function signIn() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ user: { id: 'u1', name: 'A', email: 'a@x.dev', role: 'user', workspaceId: 'w' }, accessToken: 'tok-1', expiresAt: 'later' })
  );
}

type FetchResult = Response | { throws: unknown };

/** Each call gets its own Response clone because a body can only be read once. */
function stubFetch(result: FetchResult) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => {
    if ('throws' in result) throw result.throws;
    return result.clone();
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends the bearer token and a JSON body when signed in', async () => {
    signIn();
    const fetchMock = stubFetch(json({ ok: true }));

    const result = await apiRequest<{ ok: boolean }>('POST', '/api/v1/things', { body: { a: 1 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/api/v1/things');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer tok-1', 'Content-Type': 'application/json' });
  });

  it('omits Authorization when signed out or when auth is disabled', async () => {
    const fetchMock = stubFetch(json({}));
    await apiRequest('GET', '/api/v1/public');
    signIn();
    await apiRequest('GET', '/api/v1/public', { auth: false });

    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.headers).not.toHaveProperty('Authorization');
    }
  });

  it('skips undefined and null query values but keeps false and zero', async () => {
    const fetchMock = stubFetch(json({}));
    await apiRequest('GET', '/api/v1/list', { query: { a: undefined, b: null, c: false, d: 0, e: 'x y' } });
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain('c=false');
    expect(url).toContain('d=0');
    expect(url).toContain('e=x+y');
    expect(url).not.toContain('a=');
    expect(url).not.toContain('b=');
  });

  it('returns undefined for 204 and for empty bodies', async () => {
    stubFetch(new Response(null, { status: 204 }));
    expect(await apiRequest('DELETE', '/api/v1/x')).toBeUndefined();
    stubFetch(new Response('', { status: 200 }));
    expect(await apiRequest('GET', '/api/v1/x')).toBeUndefined();
  });

  it('maps the standard error envelope onto ApiError', async () => {
    stubFetch(
      json({ code: 'ROLE_IN_USE', message: 'Reassign members first.', traceId: 't', timestamp: 'n', details: [{ field: 'role', reason: 'in use' }] }, 409)
    );
    const error = await apiRequest('DELETE', '/api/v1/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'ROLE_IN_USE', message: 'Reassign members first.' });
    expect((error as ApiError).details).toEqual([{ field: 'role', reason: 'in use' }]);
  });

  it('falls back to a generic message for non-JSON error bodies', async () => {
    stubFetch(new Response('<html>bad gateway</html>', { status: 502 }));
    const error = await apiRequest('GET', '/api/v1/x').catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR', message: 'Request failed (502).' });
  });

  it('reports an unreachable server as NETWORK_ERROR and rethrows aborts untouched', async () => {
    stubFetch({ throws: new TypeError('Failed to fetch') });
    await expect(apiRequest('GET', '/api/v1/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    stubFetch({ throws: new DOMException('aborted', 'AbortError') });
    await expect(apiRequest('GET', '/api/v1/x')).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('clears the session and signals expiry on 401, but only when a token was sent', async () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    stubFetch(json({ code: 'UNAUTHORIZED', message: 'Authentication required.' }, 401));
    await apiRequest('GET', '/api/v1/x').catch(() => undefined);
    expect(listener).not.toHaveBeenCalled();

    signIn();
    await apiRequest('GET', '/api/v1/x').catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});

describe('helpers', () => {
  it('encodes path segments', () => {
    expect(seg('a/b c')).toBe('a%2Fb%20c');
    expect(seg('..')).toBe('..');
  });

  it('extracts readable messages', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('weird', 'fallback')).toBe('fallback');
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback');
  });

  it('derives the WebSocket endpoint from the API base or page origin', () => {
    expect(resolveWebSocketUrl('http://localhost:8080', 'http://x')).toBe('ws://localhost:8080/ws');
    expect(resolveWebSocketUrl('https://api.orbit.dev/', 'http://x')).toBe('wss://api.orbit.dev/ws');
    expect(resolveWebSocketUrl('', 'https://app.orbit.dev')).toBe('wss://app.orbit.dev/ws');
  });
});
