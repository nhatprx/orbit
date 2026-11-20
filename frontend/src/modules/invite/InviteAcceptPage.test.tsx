import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/workspace/httpClient';
import type { AuthSession } from '../../types/auth.types';
import type { InvitationPreviewDto } from '../../types/workspace.types';
import { InviteAcceptPage } from './InviteAcceptPage';

const service = vi.hoisted(() => ({
  previewInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}));

vi.mock('../../services/workspace/services', () => ({ invitationService: service }));

const preview = (patch: Partial<InvitationPreviewDto> = {}): InvitationPreviewDto => ({
  token: 'tok', workspaceId: 'ws', workspaceName: 'Acme', projectId: null, projectName: null, roleName: 'Member',
  type: 'LINK', invitedEmail: null, status: 'PENDING', expiresAt: '2026-12-01T00:00:00Z', ...patch,
});

const session: AuthSession = {
  user: { id: 'u1', name: 'Alice', email: 'alice@x.dev', role: 'user', workspaceId: 'w' },
  accessToken: 't',
  expiresAt: 'later',
};

function renderPage(patch: { session?: AuthSession | null } = {}) {
  const handlers = { onJoined: vi.fn(), onNeedAuth: vi.fn(), onClose: vi.fn() };
  render(<InviteAcceptPage token="tok" session={patch.session === undefined ? session : patch.session} {...handlers} />);
  return handlers;
}

beforeEach(() => {
  service.previewInvitation.mockReset();
  service.acceptInvitation.mockReset();
  service.declineInvitation.mockReset();
});

describe('InviteAcceptPage', () => {
  it('shows what you are invited to and joins on accept', async () => {
    service.previewInvitation.mockResolvedValue(preview({ projectName: 'Orbit Core' }));
    service.acceptInvitation.mockResolvedValue({ workspaceId: 'ws', projectId: null, roleName: 'Member', alreadyMember: false });
    const { onJoined } = renderPage();

    expect(await screen.findByText('Acme')).toBeTruthy();
    expect(screen.getByText('Orbit Core')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Accept invitation/ }));

    await waitFor(() => expect(onJoined).toHaveBeenCalledWith('ws'));
    expect(service.acceptInvitation).toHaveBeenCalledWith('tok');
  });

  it('sends signed-out visitors to sign in or register, keeping the token flow in the app shell', async () => {
    service.previewInvitation.mockResolvedValue(preview());
    const { onNeedAuth } = renderPage({ session: null });

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onNeedAuth).toHaveBeenNthCalledWith(1, 'login');
    expect(onNeedAuth).toHaveBeenNthCalledWith(2, 'register');
    expect(screen.queryByRole('button', { name: /Accept invitation/ })).toBeNull();
  });

  it('explains unusable invitations and offers no way to join', async () => {
    service.previewInvitation.mockResolvedValue(preview({ status: 'EXPIRED' }));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('expired');
    expect(screen.queryByRole('button', { name: /Accept invitation/ })).toBeNull();
  });

  it('surfaces the email-mismatch rejection from the server', async () => {
    service.previewInvitation.mockResolvedValue(preview({ type: 'EMAIL', invitedEmail: 'bob@x.dev' }));
    service.acceptInvitation.mockRejectedValue(
      new ApiError(403, 'INVITATION_EMAIL_MISMATCH', 'This invitation was sent to a different email address.')
    );
    const { onJoined } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Accept invitation/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('different email address');
    expect(onJoined).not.toHaveBeenCalled();
  });

  it('offers decline only for email invitations', async () => {
    service.previewInvitation.mockResolvedValue(preview({ type: 'EMAIL', invitedEmail: 'alice@x.dev' }));
    service.declineInvitation.mockResolvedValue(undefined);
    const { onClose } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(service.declineInvitation).toHaveBeenCalledWith('tok');
  });

  it('shows a clear message for an unknown token', async () => {
    service.previewInvitation.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Invitation not found.'));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('not valid');
  });
});
