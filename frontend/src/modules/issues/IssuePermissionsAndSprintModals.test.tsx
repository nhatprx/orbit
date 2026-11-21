import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IssueCommentDto, IssueDto, SprintDto } from '../../types/issues.types';
import type { MemberDto, ProjectDto, WorkspaceDto } from '../../types/workspace.types';
import { CompleteSprintDialog } from './CompleteSprintDialog';
import { EditSprintModal } from './EditSprintModal';
import { IssueCommentsActivity } from './IssueCommentsActivity';
import { IssueMetadataForm } from './IssueMetadataForm';
import { resolveProjectIssuePermissions } from './issueFilters';

const BASE_WS: WorkspaceDto = {
  id: 'ws-1', name: 'WS', slug: 'ws', description: null, avatarUrl: null, ownerId: 'u1',
  memberCount: 2, projectCount: 1, enabledModules: ['issues'], myPermissions: [],
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', deletedAt: null, purgeAfter: null,
};

const BASE_PROJ: ProjectDto = {
  id: 'p-1', workspaceId: 'ws-1', workspaceName: 'WS', name: 'Proj', slug: 'proj', description: null,
  memberCount: 2, enabledModules: ['issues'], myPermissions: [],
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
};

const SPRINT: SprintDto = {
  id: 'sp-1', workspaceId: 'ws-1', projectId: 'p-1', name: 'Sprint 14', goal: 'Ship auth',
  status: 'ACTIVE', startDate: '2026-11-10', endDate: '2026-11-24',
  totalIssues: 5, completedIssues: 3, totalStoryPoints: 13, completedStoryPoints: 8,
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z',
};

const COMMENTS: IssueCommentDto[] = [
  { id: 'c1', issueId: 'i1', authorId: 'u-self', authorName: 'Self User', body: 'My comment', createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z' },
  { id: 'c2', issueId: 'i1', authorId: 'u-other', authorName: 'Other User', body: 'Their comment', createdAt: '2026-11-20T01:00:00Z', updatedAt: '2026-11-20T01:00:00Z' },
];

const MEMBERS: MemberDto[] = [
  { userId: 'u-self', username: 'self', displayName: 'Self User', email: 's@orbit.dev', roleId: 'r1', roleName: 'Member', isOwner: false, joinedAt: '2026-11-01T00:00:00Z' },
];

const ISSUE: IssueDto = {
  id: 'i1', workspaceId: 'ws-1', projectId: 'p-1', projectName: 'Proj', issueNumber: 1, issueKey: 'PR-1',
  type: 'TASK', title: 'Task 1', description: null, status: 'TODO', priority: 'MEDIUM', storyPoints: 3,
  sprintId: null, sprintName: null, parentId: null, parentKey: null, assigneeId: 'u-self', assigneeName: 'Self User',
  reporterId: 'u-self', reporterName: 'Self User', labels: [], dueDate: null,
  subtaskCount: 0, completedSubtaskCount: 0, commentCount: 2,
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
};

describe('Issue permissions, comments RBAC, assignee form, and sprint dialogs', () => {
  it('never grants write/delete/manage when myPermissions are empty', () => {
    expect(resolveProjectIssuePermissions(BASE_WS, BASE_PROJ)).toEqual({
      canWrite: false, canDelete: false, canManage: false,
    });
    expect(
      resolveProjectIssuePermissions(BASE_WS, { ...BASE_PROJ, myPermissions: ['pissues.read', 'pissues.write'] })
    ).toEqual({ canWrite: true, canDelete: false, canManage: false });
    expect(
      resolveProjectIssuePermissions(BASE_WS, { ...BASE_PROJ, myPermissions: ['pissues.manage'] })
    ).toEqual({ canWrite: true, canDelete: true, canManage: true });
  });

  it('shows comment delete button only for own comments with canWrite, or any comment with canManage', () => {
    const { rerender } = render(
      <IssueCommentsActivity
        workspaceId="ws-1" projectId="p-1" issueId="i1" comments={COMMENTS} activities={[]}
        canWrite={true} canManage={false} currentUserId="u-self" onMutated={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Delete comment by Self User' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete comment by Other User' })).toBeNull();

    rerender(
      <IssueCommentsActivity
        workspaceId="ws-1" projectId="p-1" issueId="i1" comments={COMMENTS} activities={[]}
        canWrite={false} canManage={false} currentUserId="u-self" onMutated={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Delete comment by Self User' })).toBeNull();

    rerender(
      <IssueCommentsActivity
        workspaceId="ws-1" projectId="p-1" issueId="i1" comments={COMMENTS} activities={[]}
        canWrite={false} canManage={true} currentUserId="u-admin" onMutated={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Delete comment by Self User' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete comment by Other User' })).toBeTruthy();
  });

  it('supports unassigning and reassigning in IssueMetadataForm', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IssueMetadataForm issue={ISSUE} sprints={[]} epics={[]} members={MEMBERS} canWrite saving={false} onSave={onSave} />
    );

    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: null, clearAssignee: true })));
  });

  it('validates EditSprintModal dates and passes moveIncompleteToBacklog toggle in CompleteSprintDialog', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<EditSprintModal sprint={SPRINT} onClose={vi.fn()} onSubmit={onEdit} />);

    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Sprint' }));
    expect(await screen.findByText('End date must be on or after start date.')).toBeTruthy();
    expect(onEdit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-11-28' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Sprint' }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('sp-1', expect.objectContaining({ endDate: '2026-11-28' })));

    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<CompleteSprintDialog sprint={SPRINT} onClose={vi.fn()} onConfirm={onComplete} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Move incomplete issues to Backlog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Sprint' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('sp-1', false));
  });
});
