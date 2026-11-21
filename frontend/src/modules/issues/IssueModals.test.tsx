import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IssueDto } from '../../types/issues.types';
import type { MemberDto } from '../../types/workspace.types';

vi.mock('../../services/issues/issues.service', async () => {
  const { mockIssuesService } = await import('../../services/issues/mockIssues.service');
  return { issuesService: mockIssuesService };
});

import { mockIssuesService } from '../../services/issues/mockIssues.service';
import { CreateIssueModal } from './CreateIssueModal';
import { CreateSprintModal } from './CreateSprintModal';
import { IssueDetailDrawer } from './IssueDetailDrawer';

const MEMBERS: MemberDto[] = [
  { userId: 'usr-linh', username: 'linh', displayName: 'Linh Tran', email: 'linh@orbit.dev', roleId: 'r1', roleName: 'Owner', isOwner: true, joinedAt: '2026-11-01T00:00:00Z' },
  { userId: 'usr-marcus', username: 'marcus', displayName: 'Marcus Chen', email: 'marcus@orbit.dev', roleId: 'r2', roleName: 'Member', isOwner: false, joinedAt: '2026-11-02T00:00:00Z' },
];

describe('Issues modals and drawer edge cases', () => {
  beforeEach(() => {
    mockIssuesService.reset();
  });

  it('validates story points bounds, deduplicates labels, and submits assigneeId in CreateIssueModal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<CreateIssueModal open sprints={[]} epics={[]} members={MEMBERS} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Harden RBAC checks' } });
    fireEvent.change(screen.getByLabelText('Story Points'), { target: { value: '150' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Issue' }).closest('form')!);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Story Points'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'usr-marcus' } });
    fireEvent.change(screen.getByLabelText('Labels'), { target: { value: 'rbac, Security, rbac, ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Harden RBAC checks',
          storyPoints: 8,
          assigneeId: 'usr-marcus',
          labels: ['rbac', 'Security'],
        })
      )
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows selecting Stories, Tasks, and Bugs as parent when creating a SUBTASK', async () => {
    const issues: IssueDto[] = await mockIssuesService.listIssues('ws-sub', 'proj-orbit-core');
    const epics = issues.filter((i) => i.type === 'EPIC');
    const story = issues.find((i) => i.type === 'STORY')!;
    const bug = issues.find((i) => i.type === 'BUG')!;
    const subtask = issues.find((i) => i.type === 'SUBTASK')!;
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateIssueModal open sprints={[]} epics={epics} issues={issues} onClose={vi.fn()} onSubmit={onSubmit} />
    );

    expect(screen.queryByRole('option', { name: new RegExp(story.issueKey) })).toBeNull();
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'SUBTASK' } });

    const parentSelect = screen.getByLabelText('Parent Issue');
    expect(parentSelect).toBeTruthy();
    expect(screen.getByRole('option', { name: new RegExp(story.issueKey) })).toBeTruthy();
    expect(screen.getByRole('option', { name: new RegExp(bug.issueKey) })).toBeTruthy();
    expect(screen.queryByRole('option', { name: new RegExp(subtask.issueKey) })).toBeNull();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Add regression test' } });
    fireEvent.change(parentSelect, { target: { value: story.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SUBTASK', parentId: story.id })
      )
    );
  });

  it('rejects inverted date ranges in CreateSprintModal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CreateSprintModal open onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Sprint Name'), { target: { value: 'Sprint 20' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-12-20' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-12-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Sprint' }));

    expect(await screen.findByText('End date must be on or after start date.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hides write and delete controls in IssueDetailDrawer when read-only', async () => {
    const issues = await mockIssuesService.listIssues('ws-ro', 'proj-orbit-core');
    const target = issues[0]!;

    render(
      <IssueDetailDrawer
        workspaceId="ws-ro" projectId="proj-orbit-core" issueId={target.id}
        sprints={[]} epics={[]} canWrite={false} canDelete={false} canManage={false} currentUserId="usr-other"
        onClose={vi.fn()} onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText(target.issueKey)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Save Changes/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete/i })).toBeNull();
    expect(screen.queryByLabelText('New subtask title')).toBeNull();
    expect(screen.queryByLabelText('Add comment')).toBeNull();
  });
});
