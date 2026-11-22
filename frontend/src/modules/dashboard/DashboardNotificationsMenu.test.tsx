import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { invitationService } from '../../services/workspace/services';
import { notificationService } from '../../services/notifications.service';
import { DashboardNotificationsMenu } from './DashboardNotificationsMenu';

vi.mock('../../services/workspace/services', () => ({
  invitationService: {
    listInbox: vi.fn(), acceptInvitation: vi.fn(), declineInvitation: vi.fn(),
  },
}));
vi.mock('../../services/notifications.service', () => ({
  notificationService: {
    list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(),
  },
}));

const invite = {
  id: 'invite-1', workspaceId: 'ws-1', workspaceName: 'Orbit', projectId: 'p-1', projectName: 'Core',
  token: 'token-1', roleName: 'Member', expiresAt: '2026-12-01T00:00:00Z', createdAt: '2026-11-22T00:00:00Z',
};
const update = {
  id: 'n-1', type: 'ISSUE_MENTION' as const, title: 'You were mentioned', message: 'Nhat mentioned you in ORB-2',
  actorId: 'u-1', actorName: 'Nhat', workspaceId: 'ws-1', projectId: 'p-1', issueId: 'i-1', issueKey: 'ORB-2',
  createdAt: '2026-11-22T00:00:00Z', readAt: null,
};

function prepare() {
  vi.mocked(invitationService.listInbox).mockResolvedValue({ items: [invite], page: 0, size: 20, totalElements: 1, totalPages: 1, hasMore: false });
  vi.mocked(invitationService.acceptInvitation).mockResolvedValue({ workspaceId: 'ws-1', projectId: 'p-1', roleName: 'Member', alreadyMember: false });
  vi.mocked(notificationService.list).mockResolvedValue({
    page: { items: [update], page: 0, size: 20, totalElements: 1, totalPages: 1, hasMore: false }, unreadCount: 1,
  });
  vi.mocked(notificationService.markRead).mockResolvedValue(undefined);
  vi.mocked(notificationService.markAllRead).mockResolvedValue(1);
}

describe('DashboardNotificationsMenu', () => {
  it('accepts an invitation and opens the accepted scope', async () => {
    prepare();
    const onInviteAccepted = vi.fn().mockResolvedValue(undefined);
    render(<DashboardNotificationsMenu onInviteAccepted={onInviteAccepted} onOpenIssue={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(invitationService.acceptInvitation).toHaveBeenCalledWith('token-1'));
    expect(onInviteAccepted).toHaveBeenCalledWith('ws-1', 'p-1');
  });

  it('marks an issue notification read before opening its project', async () => {
    prepare();
    const onOpenIssue = vi.fn().mockResolvedValue(undefined);
    render(<DashboardNotificationsMenu onInviteAccepted={vi.fn()} onOpenIssue={onOpenIssue} />);
    fireEvent.click(await screen.findByRole('button', { name: /notifications/i }));
    fireEvent.click(await screen.findByRole('button', { name: /you were mentioned/i }));
    await waitFor(() => expect(notificationService.markRead).toHaveBeenCalledWith('n-1'));
    expect(onOpenIssue).toHaveBeenCalledWith(update);
  });
});
