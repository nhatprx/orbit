import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberDto, ProjectDto, WorkspaceDto } from '../../types/workspace.types';

const TEST_MEMBERS = vi.hoisted((): MemberDto[] => [
  { userId: 'usr-linh', username: 'linh', displayName: 'Linh Tran', email: 'linh@orbit.dev', roleId: 'r1', roleName: 'Owner', isOwner: true, joinedAt: '2026-11-01T00:00:00Z' },
  { userId: 'usr-marcus', username: 'marcus', displayName: 'Marcus Chen', email: 'marcus@orbit.dev', roleId: 'r2', roleName: 'Member', isOwner: false, joinedAt: '2026-11-02T00:00:00Z' },
]);

vi.mock('../../services/issues/issues.service', async () => {
  const { mockIssuesService } = await import('../../services/issues/mockIssues.service');
  return { issuesService: mockIssuesService };
});

vi.mock('../../services/workspace/services', () => ({
  memberService: {
    listProjectMembers: vi.fn().mockResolvedValue({ items: TEST_MEMBERS, page: 0, size: 100, totalElements: 2, totalPages: 1, hasMore: false }),
    listWorkspaceMembers: vi.fn().mockResolvedValue({ items: TEST_MEMBERS, page: 0, size: 100, totalElements: 2, totalPages: 1, hasMore: false }),
  },
}));

import { mockIssuesService } from '../../services/issues/mockIssues.service';
import { IssuesPage } from './IssuesPage';

const WORKSPACE: WorkspaceDto = {
  id: 'ws-test',
  name: 'Orbit Engineering',
  slug: 'orbit-engineering',
  description: null,
  avatarUrl: null,
  ownerId: 'usr-linh',
  memberCount: 6,
  projectCount: 2,
  enabledModules: ['git', 'chat', 'cloud', 'issues'],
  myPermissions: ['issues.read', 'issues.write', 'issues.delete', 'issues.manage', 'member.view'],
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-20T00:00:00Z',
  deletedAt: null,
  purgeAfter: null,
};

const PROJECT: ProjectDto = {
  id: 'proj-orbit-core',
  workspaceId: 'ws-test',
  workspaceName: 'Orbit Engineering',
  name: 'Orbit Core API',
  slug: 'orbit-core-api',
  description: 'Core services',
  memberCount: 4,
  enabledModules: ['git', 'issues'],
  myPermissions: ['pissues.read', 'pissues.write', 'pissues.delete', 'pissues.manage'],
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-20T00:00:00Z',
};

describe('IssuesPage', () => {
  beforeEach(() => {
    mockIssuesService.reset();
  });

  it('renders Workspace Portfolio KPIs, project rollups, feed filters, and opens project board', async () => {
    const onOpenProject = vi.fn();
    render(<IssuesPage workspace={WORKSPACE} project={null} onOpenProject={onOpenProject} />);

    expect(await screen.findByText('Orbit Engineering — Issues Portfolio')).toBeTruthy();
    expect(screen.getByText('Project Lifecycle Breakdown (2)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter feed by priority'), { target: { value: 'CRITICAL' } });
    expect(screen.getAllByText(/Fix race condition on concurrent refresh token calls/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /Open Project Board/i })[0]!);
    expect(onOpenProject).toHaveBeenCalledWith('proj-orbit-core');
  });

  it('renders Kanban board, filters issues, and creates a new assigned issue via modal', async () => {
    render(<IssuesPage workspace={WORKSPACE} project={PROJECT} onOpenProject={vi.fn()} />);

    expect(await screen.findByText('Fix race condition on concurrent refresh token calls')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'BUG' } });
    fireEvent.change(screen.getByLabelText('Search issues'), { target: { value: 'refresh' } });
    expect(screen.queryByText('Build Kanban board with single-click status transitions')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));

    fireEvent.click(screen.getByRole('button', { name: /New Issue/i }));
    const dialog = screen.getByRole('dialog', { name: 'Create Issue' });
    fireEvent.change(within(dialog).getByLabelText('Type'), { target: { value: 'STORY' } });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Ship portfolio CSV export' } });
    fireEvent.change(within(dialog).getByLabelText('Assignee'), { target: { value: 'usr-marcus' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Issue' }));

    expect(await screen.findByText('Ship portfolio CSV export')).toBeTruthy();
  });

  it('opens IssueDetailDrawer, adds subtask & comment, and logs activity', async () => {
    render(<IssuesPage workspace={WORKSPACE} project={PROJECT} onOpenProject={vi.fn()} />);

    fireEvent.click(await screen.findByText('Fix race condition on concurrent refresh token calls'));
    const drawer = await screen.findByRole('dialog', { name: /Issue OCA-5/i });

    fireEvent.change(within(drawer).getByLabelText('New subtask title'), { target: { value: 'Add lock metric' } });
    fireEvent.click(within(drawer).getByRole('button', { name: /Add Subtask/i }));
    expect(await within(drawer).findByText('Add lock metric')).toBeTruthy();

    fireEvent.change(within(drawer).getByLabelText('Add comment'), { target: { value: 'Verified failover.' } });
    fireEvent.click(within(drawer).getByRole('button', { name: /Post Comment/i }));
    expect(await within(drawer).findByText('Verified failover.')).toBeTruthy();

    fireEvent.click(within(drawer).getByRole('tab', { name: /Activity History/i }));
    expect(await within(drawer).findByText(/COMMENT_ADDED/)).toBeTruthy();
    expect(within(drawer).getByText(/SUBTASK_ADDED/)).toBeTruthy();
  });

  it('handles Complete Sprint confirmation, Edit Sprint modal, Delete Sprint confirmation, and Create Sprint', async () => {
    render(<IssuesPage workspace={WORKSPACE} project={PROJECT} onOpenProject={vi.fn()} />);
    expect(await screen.findByText('Orbit Core API')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Backlog & Sprints/i }));
    expect(await screen.findByRole('heading', { name: 'Sprint 14 - Identity & Audit' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Complete Sprint/i }));
    const completeDialog = await screen.findByRole('dialog', { name: 'Complete Sprint' });
    fireEvent.click(within(completeDialog).getByRole('button', { name: 'Complete Sprint' }));

    const startBtn = await screen.findByRole('button', { name: /Start Sprint/i });
    fireEvent.click(startBtn);
    await waitFor(() => {
      const sprint15 = screen.getByRole('region', { name: 'Sprint 15 - Lifecycle Automation' });
      expect(within(sprint15).getByRole('button', { name: /Complete Sprint/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Sprint 15 - Lifecycle Automation' }));
    const editDialog = await screen.findByRole('dialog', { name: 'Edit Sprint' });
    fireEvent.change(within(editDialog).getByLabelText('Sprint Name'), { target: { value: 'Sprint 15 - Hardened' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Save Sprint' }));
    expect(await screen.findByRole('heading', { name: 'Sprint 15 - Hardened' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Sprint 14 - Identity & Audit' }));
    const deleteDialog = await screen.findByRole('dialog', { name: 'Delete Sprint' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Delete Sprint' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Sprint 14 - Identity & Audit' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /New Sprint/i }));
    const sprintDialog = screen.getByRole('dialog', { name: 'Create Sprint' });
    fireEvent.change(within(sprintDialog).getByLabelText('Sprint Name'), { target: { value: 'Sprint 16 - QA' } });
    fireEvent.click(within(sprintDialog).getByRole('button', { name: 'Create Sprint' }));
    expect(await screen.findByRole('heading', { name: 'Sprint 16 - QA' })).toBeTruthy();
  });
});
