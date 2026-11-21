import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/issues/issues.service', async () => {
  const { MockIssuesService } = await import('../../services/issues/mockIssues.service');
  const instance = new MockIssuesService();
  return {
    issuesService: instance,
    mockIssuesService: instance,
    MockIssuesService,
  };
});

import { mockIssuesService } from '../../services/issues/issues.service';
import { CreateIssueModal } from './CreateIssueModal';
import { CreateSprintModal } from './CreateSprintModal';
import { IssueDetailDrawer } from './IssueDetailDrawer';

describe('Issues modals and drawer edge cases', () => {
  beforeEach(() => {
    mockIssuesService.reset();
  });

  it('validates story points bounds in CreateIssueModal and deduplicates labels', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<CreateIssueModal open sprints={[]} epics={[]} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Harden RBAC checks' } });
    fireEvent.change(screen.getByLabelText('Story Points'), { target: { value: '150' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Issue' }).closest('form')!);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Story Points'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Labels'), { target: { value: 'rbac, Security, rbac, ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Issue' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Harden RBAC checks',
          storyPoints: 8,
          labels: ['rbac', 'Security'],
        })
      )
    );
    expect(onClose).toHaveBeenCalledTimes(1);
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
        workspaceId="ws-ro"
        projectId="proj-orbit-core"
        issueId={target.id}
        sprints={[]}
        epics={[]}
        canWrite={false}
        canDelete={false}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText(target.issueKey)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Save Changes/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete/i })).toBeNull();
    expect(screen.queryByLabelText('New subtask title')).toBeNull();
    expect(screen.queryByLabelText('Add comment')).toBeNull();
  });
});
