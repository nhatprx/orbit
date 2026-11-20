import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './httpClient';
import { acceptPendingInvite } from './inviteFlow';
import { PENDING_INVITE_KEY, clearPendingInvite, parseInviteToken, readPendingInvite, savePendingInvite } from './pendingInvite';

describe('parseInviteToken', () => {
  it('extracts the token from /invite/:token', () => {
    expect(parseInviteToken('/invite/abc_DEF-123')).toBe('abc_DEF-123');
    expect(parseInviteToken('/invite/abc/')).toBe('abc');
    expect(parseInviteToken('/invite/a%20b')).toBe('a b');
  });

  it('rejects every other path shape', () => {
    for (const path of ['/', '/invite', '/invite/', '/invite/a/b', '/dashboard/invite/x', '/invite/%E0%A4%A']) {
      expect(parseInviteToken(path), path).toBeNull();
    }
  });
});

describe('pending invite storage', () => {
  it('saves, reads and clears the token in sessionStorage', () => {
    expect(readPendingInvite()).toBeNull();
    savePendingInvite('tok');
    expect(sessionStorage.getItem(PENDING_INVITE_KEY)).toBe('tok');
    expect(readPendingInvite()).toBe('tok');
    clearPendingInvite();
    expect(readPendingInvite()).toBeNull();
  });
});

describe('acceptPendingInvite', () => {
  const accepted = { workspaceId: 'ws-1', projectId: null, roleName: 'Member', alreadyMember: false };

  it('does nothing when no invitation is pending', async () => {
    const service = { acceptInvitation: vi.fn() };
    expect(await acceptPendingInvite(service)).toEqual({ status: 'none' });
    expect(service.acceptInvitation).not.toHaveBeenCalled();
  });

  it('joins, reports the workspace and clears the token', async () => {
    savePendingInvite('tok');
    const service = { acceptInvitation: vi.fn().mockResolvedValue(accepted) };

    const outcome = await acceptPendingInvite(service);

    expect(service.acceptInvitation).toHaveBeenCalledWith('tok');
    expect(outcome).toEqual({ status: 'joined', workspaceId: 'ws-1', projectId: null });
    expect(readPendingInvite()).toBeNull();
  });

  it('clears the token and explains definitive failures', async () => {
    savePendingInvite('tok');
    const service = {
      acceptInvitation: vi.fn().mockRejectedValue(new ApiError(410, 'INVITATION_EXPIRED', 'This invitation has expired.')),
    };

    const outcome = await acceptPendingInvite(service);

    expect(outcome).toEqual({ status: 'failed', message: 'This invitation has expired.' });
    expect(readPendingInvite()).toBeNull();
  });

  it('keeps the token across a network failure so the next sign-in can retry', async () => {
    savePendingInvite('tok');
    const service = {
      acceptInvitation: vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the Orbit server.')),
    };

    const outcome = await acceptPendingInvite(service);

    expect(outcome.status).toBe('failed');
    expect(readPendingInvite()).toBe('tok');
  });
});
