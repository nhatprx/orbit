import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  avatarService,
  MAX_AVATAR_BYTES,
  validateAvatarFile,
} from './avatar.service';
import type { AuthUser } from '../types/auth.types';

const MOCK_USER: AuthUser = {
  id: 'user-1',
  name: 'Dev User',
  username: 'devuser',
  email: 'dev@orbit.dev',
  role: 'user',
  workspaceId: 'ws_orbit_core',
  avatarUrl: 'https://s3.ap-southeast-1.amazonaws.com/orbit/avatars/user-1/pic.png',
};

describe('avatarService', () => {
  beforeEach(() => {
    localStorage.setItem(
      'orbit_auth_session',
      JSON.stringify({
        user: { ...MOCK_USER, avatarUrl: null },
        accessToken: 'jwt-token',
        expiresAt: '2027-01-01T00:00:00Z',
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('validates allowed image MIME types and size boundaries', () => {
    const validPng = new File(['abc'], 'avatar.png', { type: 'image/png' });
    expect(validateAvatarFile(validPng)).toBeNull();

    const invalidSvg = new File(['<svg/>'], 'xss.svg', { type: 'image/svg+xml' });
    expect(validateAvatarFile(invalidSvg)).toContain('JPEG, PNG, WebP, or GIF');

    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    expect(validateAvatarFile(emptyFile)).toContain('5 MB');

    const oversized = new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    expect(validateAvatarFile(oversized)).toContain('5 MB');
  });

  it('presigns, uploads directly to S3 without Authorization header, and confirms', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: 'avatars/user-1/123-pic.png',
            uploadUrl: 'https://s3.ap-southeast-1.amazonaws.com/signed-put',
            method: 'PUT',
            expiresAt: '2027-01-01T00:15:00Z',
            contentType: 'image/png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_USER), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const file = new File(['png-bytes'], 'pic.png', { type: 'image/png' });
    const updated = await avatarService.uploadAvatar(file);

    expect(updated.avatarUrl).toBe(MOCK_USER.avatarUrl);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const s3Call = fetchMock.mock.calls[1];
    expect(s3Call).toBeDefined();
    if (!s3Call) throw new Error('Expected S3 PUT call');
    const [s3Url, s3Init] = s3Call;
    expect(s3Url).toBe('https://s3.ap-southeast-1.amazonaws.com/signed-put');
    expect(s3Init?.method).toBe('PUT');
    const s3Headers = s3Init?.headers as Record<string, string>;
    expect(s3Headers['Content-Type']).toBe('image/png');
    expect(s3Headers.Authorization).toBeUndefined();
  });

  it('stops and throws when AWS S3 upload fails without calling confirm', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: 'avatars/user-1/123-pic.png',
            uploadUrl: 'https://s3.ap-southeast-1.amazonaws.com/signed-put',
            method: 'PUT',
            expiresAt: '2027-01-01T00:15:00Z',
            contentType: 'image/png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    const file = new File(['png-bytes'], 'pic.png', { type: 'image/png' });
    await expect(avatarService.uploadAvatar(file)).rejects.toThrow('AWS S3 upload failed (403).');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
