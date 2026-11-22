import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../workspace/httpClient';
import { httpAdminUserService as service } from './httpAdminUser.service';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(response: Response) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => response.clone());
  vi.stubGlobal('fetch', fn);
  return fn;
}

function lastCall(fn: ReturnType<typeof stubFetch>) {
  const [url, init] = fn.mock.calls.at(-1)!;
  return { url: new URL(url), method: init?.method, body: init?.body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('httpAdminUserService', () => {
  it('lists with only the filters that are set', async () => {
    const fetchMock = stubFetch(json({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasMore: false }));

    await service.list({ q: 'ali', role: '', status: 'disabled', sort: 'email,asc', page: 2, size: 20 });

    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/api/v1/admin/users');
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'ali', status: 'disabled', sort: 'email,asc', page: '2', size: '20' });
  });

  it('sends no search parameters at all for an unfiltered first page except paging', async () => {
    const fetchMock = stubFetch(json({}));

    await service.list({ q: '', role: '', status: '', sort: '', page: 0, size: 20 });

    expect(Object.fromEntries(lastCall(fetchMock).url.searchParams)).toEqual({ page: '0', size: '20' });
  });

  it('keeps special characters in the search text intact on the wire', async () => {
    const fetchMock = stubFetch(json({}));

    await service.list({ q: "100% & o'brien", role: '', status: '', sort: '', page: 0, size: 20 });

    expect(lastCall(fetchMock).url.searchParams.get('q')).toBe("100% & o'brien");
  });

  it('reads totals and one user, encoding the id', async () => {
    const fetchMock = stubFetch(json({ total: 1 }));

    await service.stats();
    expect(lastCall(fetchMock).url.pathname).toBe('/api/v1/admin/users/stats');

    await service.get('a/b c');
    expect(lastCall(fetchMock).url.pathname).toBe('/api/v1/admin/users/a%2Fb%20c');
  });

  it('changes a role with PATCH and a JSON body', async () => {
    const fetchMock = stubFetch(json({ role: 'admin' }));

    await service.changeRole('u1', 'admin');

    const { url, method, body } = lastCall(fetchMock);
    expect([method, url.pathname, body]).toEqual(['PATCH', '/api/v1/admin/users/u1/role', '{"role":"admin"}']);
  });

  it('disables with a trimmed reason, or an empty object when there is none', async () => {
    const fetchMock = stubFetch(json({ status: 'DISABLED' }));

    await service.disable('u1', '  spam  ');
    expect(lastCall(fetchMock).body).toBe('{"reason":"spam"}');
    expect(lastCall(fetchMock).url.pathname).toBe('/api/v1/admin/users/u1/disable');

    await service.disable('u1', '   ');
    expect(lastCall(fetchMock).body).toBe('{}');
    await service.disable('u1');
    expect(lastCall(fetchMock).body).toBe('{}');
  });

  it('enables and revokes sessions with POST, accepting an empty 204 answer', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));

    await expect(service.revokeSessions('u1')).resolves.toBeUndefined();
    expect([lastCall(fetchMock).method, lastCall(fetchMock).url.pathname]).toEqual(['POST', '/api/v1/admin/users/u1/revoke-sessions']);

    await service.enable('u1');
    expect(lastCall(fetchMock).url.pathname).toBe('/api/v1/admin/users/u1/enable');
  });

  it('surfaces the server error envelope as an ApiError', async () => {
    stubFetch(json({ code: 'LAST_ADMIN', message: 'At least one active administrator must remain.', details: [] }, 409));

    const failure = await service.changeRole('u1', 'user').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 409, code: 'LAST_ADMIN', message: 'At least one active administrator must remain.' });
  });
});
