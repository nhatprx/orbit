import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectDto, WorkspaceDto } from '../../types/workspace.types';

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
  myPermissions: ['issues.read', 'issues.write', 'issues.delete', 'issues.manage'],
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
    expect(screen.getByText('Total Issues')).toBeTruthy();
    expect(screen.getByText('Active Sprints')).toBeTruthy();
    expect(screen.getByText('Project Lifecycle Breakdown (2)')).toBeTruthy();
    expect(screen.getByText('Orbit Core API', { selector: 'h3' })).toBeTruthy();
    expect(screen.getByText('Orbit Web Shell', { selector: 'h3' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filter feed by priority'), { target: { value: 'CRITICAL' } });
    expect(screen.getAllByText(/Fix race condition on concurrent refresh token calls/).length).toBeGreaterThan(0);

    const openButtons = screen.getAllByRole('button', { name: /Open Project Board/i });
    fireEvent.click(openButtons[0]!);
    expect(onOpenProject).toHaveBeenCalledWith('proj-orbit-core');
  });

  it('renders Kanban board, filters by type/search, and creates a new issue via modal', async () => {
    render(<IssuesPage workspace={WORKSPACE} project={PROJECT} onOpenProject={vi.fn()} />);

    expect(await screen.findByText('Fix race condition on concurrent refresh token calls')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Filter by type'), { target: { value: 'BUG' } });
    fireEvent.change(screen.getByLabelText('Search issues'), { target: { value: 'refresh' } });
    expect(screen.getByText('Fix race condition on concurrent refresh token calls')).toBeTruthy();
    expect(screen.queryByText('Build Kanban board with single-click status transitions')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(screen.getByText('Build Kanban board with single-click status transitions')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /New Issue/i }));
    const dialog = screen.getByRole('dialog', { name: 'Create Issue' });
    fireEvent.change(within(dialog).getByLabelText('Type'), { target: { value: 'STORY' } });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Ship portfolio CSV export' } });
    fireEvent.change(within(dialog).getByLabelText('Story Points'), { target: { value: '5' } });
    fireEvent.change(within(dialog).getByLabelText('Labels'), { target: { value: 'export, analytics' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create Issue' }));

    expect(await screen.findByText('Ship portfolio CSV export')).toBeTruthy();
  });

  it('opens IssueDetailDrawer, updates metadata, adds subtask & comment, and logs activity', async () => {
    render(<IssuesPage workspace={WORKSPACE} project={PROJECT} onOpenProject={vi.fn()} />);

    const cardTitle = await screen.findByText('Fix race condition on concurrent refresh token calls');
    fireEvent.click(cardTitle);

    const drawer = await screen.findByRole('dialog', { name: /Issue OCA-5/i });
    expect(within(drawer).getByText('Subtasks')).toBeTruthy();

    fireEvent.change(within(drawer).getByLabelText('New subtask title'), {
      target: { value: 'Add metric counter for lock contention' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: /Add Subtask/i }));
    expect(await within(drawer).findByText('Add metric counter for lock contention')).toBeTruthy();

    const firstToggle = within(drawer).getAllByRole('checkbox')[0]!;
    fireEvent.click(firstToggle);
    await waitFor(() => expect(within(drawer).getByText(/Subtasks/)).toBeTruthy());

    fireEvent.change(within(drawer).getByLabelText('Add comment'), {
      target: { value: 'Verified lock release under simulated failover.' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: /Post Comment/i }));
    expect(await within(drawer).findByText('Verified lock release under simulated failover.')).toBeTruthy();

    fireEvent.click(within(drawer).getByRole('tab', { name: /Activity History/i }));
    expect(await within(drawer).findByText(/COMMENT_ADDED/)).toBeTruthy();
    expect(within(drawer).getByText(/SUBTASK_ADDED/)).toBeTruthy();
  });

  it('switches to Backlog & Sprints view, completes active sprint, starts planned sprint, and creates sprint', async () => {
    render(<IssuesPage workspace={WORKSPACE} project={PROJECT} onOpenProject={vi.fn()} />);
    expect(await screen.findByText('Orbit Core API')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Backlog & Sprints/i }));
    expect(await screen.findByRole('heading', { name: 'Sprint 14 - Identity & Audit' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Sprint 15 - Lifecycle Automation' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Complete Sprint/i }));
    const startBtn = await screen.findByRole('button', { name: /Start Sprint/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      const sprint15 = screen.getByRole('region', { name: 'Sprint 15 - Lifecycle Automation' });
      expect(within(sprint15).getByRole('button', { name: /Complete Sprint/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Sprint/i }));
    const sprintDialog = screen.getByRole('dialog', { name: 'Create Sprint' });
    fireEvent.change(within(sprintDialog).getByLabelText('Sprint Name'), { target: { value: 'Sprint 16 - QA' } });
    fireEvent.change(within(sprintDialog).getByLabelText('Start Date'), { target: { value: '2026-12-11' } });
    fireEvent.change(within(sprintDialog).getByLabelText('End Date'), { target: { value: '2026-12-25' } });
    fireEvent.click(within(sprintDialog).getByRole('button', { name: 'Create Sprint' }));

    expect(await screen.findByRole('heading', { name: 'Sprint 16 - QA' })).toBeTruthy();
  });
});
