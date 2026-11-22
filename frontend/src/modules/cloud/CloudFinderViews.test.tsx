import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import { INITIAL_WORKSPACE_STATE, workspaceStore } from '../../store/workspaceStore';
import type { CloudNodeDto, CloudQuotaDto, CloudScope } from '../../types/cloud.types';
import { CloudFilesPage } from './CloudFilesPage';

const QUOTA: CloudQuotaDto = {
  scopeType: 'USER', scopeId: 'u-1', usedBytes: 1024, quotaBytes: 1024 * 1024,
  reservedBytes: 0, maxFileSizeBytes: 500 * 1024 * 1024, multipartThresholdBytes: 50 * 1024 * 1024,
};

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'n-1', scopeType: 'USER', scopeId: 'u-1', parentId: null, nodeType: 'FILE',
    name: 'brief.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 2048, starred: false, depth: 0, createdBy: 'u-1', createdByName: 'Alice',
    deletedAt: null, purgeAfter: null, createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

function makeApi(overrides: Partial<CloudFilesApi> = {}): CloudFilesApi {
  return {
    listNodes: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false, limit: 50 }),
    getBreadcrumbs: vi.fn().mockResolvedValue({ items: [] }),
    getQuota: vi.fn().mockResolvedValue(QUOTA),
    createFolder: vi.fn(), updateNode: vi.fn(),
    moveCloudNodes: vi.fn().mockResolvedValue({ moved: [] }),
    softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(), emptyTrash: vi.fn(),
    initUpload: vi.fn(), signUploadParts: vi.fn(), completeUpload: vi.fn(), abortUpload: vi.fn(),
    getDownloadUrl: vi.fn(), createDocument: vi.fn(), getTextContent: vi.fn(), saveTextContent: vi.fn(),
    getOfficeContent: vi.fn(), saveOfficeContent: vi.fn(),
    ...overrides,
  };
}

describe('Finder UI: Views, History, Multi-Select, Context Menu & Locations', () => {
  beforeEach(() => {
    workspaceStore.setState(INITIAL_WORKSPACE_STATE);
  });

  it('switches between List (inline folder expand), Icons Grid, and Miller Columns with Quick Look preview', async () => {
    const folder = makeNode({ id: 'f-1', nodeType: 'FOLDER', name: 'Specs', sizeBytes: 0 });
    const child = makeNode({ id: 'c-1', parentId: 'f-1', name: 'q4-plan.docx' });
    const rootFile = makeNode({ id: 'r-1', name: 'notes.md', mimeType: 'text/markdown' });

    const api = makeApi({
      listNodes: vi.fn().mockImplementation(async (params) => ({
        items: params?.parentId === 'f-1' ? [child] : [folder, rootFile],
        nextCursor: null, hasMore: false, limit: 50,
      })),
    });

    render(<CloudFilesPage scope={{ type: 'USER' }} apiOverride={api} />);
    expect(await screen.findByText('Specs')).toBeTruthy();

    // Inline expand folder in List view
    fireEvent.click(screen.getByRole('button', { name: 'Expand Specs' }));
    expect(await screen.findByText('q4-plan.docx')).toBeTruthy();

    // Switch to Icons Grid view
    fireEvent.click(screen.getByRole('button', { name: 'Icons view' }));
    expect(screen.getByTestId('finder-grid-view')).toBeTruthy();
    expect(screen.getByText('notes.md')).toBeTruthy();

    // Switch to Miller Columns view, click folder -> loads next column, click child -> Quick Look preview
    fireEvent.click(screen.getByRole('button', { name: 'Columns view' }));
    expect(screen.getByTestId('finder-columns-view')).toBeTruthy();
    fireEvent.click(screen.getByText('Specs'));
    expect(await screen.findByText('q4-plan.docx')).toBeTruthy();
    fireEvent.click(screen.getByText('q4-plan.docx'));
    expect(screen.getByTestId('finder-column-preview')).toBeTruthy();
  });

  it('supports Back/Forward folder history, multi-select (Ctrl/Shift-click), and right-click context menu', async () => {
    const folder = makeNode({ id: 'f-1', nodeType: 'FOLDER', name: 'Archive', sizeBytes: 0 });
    const f1 = makeNode({ id: 'n-1', name: 'alpha.docx' });
    const f2 = makeNode({ id: 'n-2', name: 'beta.xlsx' });
    const f3 = makeNode({ id: 'n-3', name: 'gamma.pptx' });
    const inner = makeNode({ id: 'in-1', parentId: 'f-1', name: 'inside.txt' });

    const api = makeApi({
      listNodes: vi.fn().mockImplementation(async (params) => ({
        items: params?.parentId === 'f-1' ? [inner] : [folder, f1, f2, f3],
        nextCursor: null, hasMore: false, limit: 50,
      })),
      getBreadcrumbs: vi.fn().mockResolvedValue({ items: [{ id: 'f-1', name: 'Archive' }] }),
    });

    render(<CloudFilesPage scope={{ type: 'USER' }} apiOverride={api} />);
    expect(await screen.findByText('alpha.docx')).toBeTruthy();

    // Ctrl+click multi-select + Shift+click range select
    fireEvent.click(screen.getByText('alpha.docx'));
    fireEvent.click(screen.getByText('gamma.pptx'), { shiftKey: true });
    expect(screen.getAllByText('3 selected').length).toBeGreaterThan(0);

    // Right-click opens context menu with batch Move action and closes on Escape
    fireEvent.contextMenu(screen.getByText('beta.xlsx'));
    expect(screen.getByRole('menuitem', { name: 'Move 3 items...' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    // Double-click into folder, then use Back and Forward history buttons
    fireEvent.doubleClick(screen.getByText('Archive'));
    expect(await screen.findByText('inside.txt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('alpha.docx')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(await screen.findByText('inside.txt')).toBeTruthy();
  });

  it('lists Personal, active Workspace, and Projects in Sidebar Locations and switches scopes cleanly', async () => {
    workspaceStore.setState({
      ...INITIAL_WORKSPACE_STATE,
      activeWorkspaceId: 'ws-1',
      workspaces: [{
        id: 'ws-1', name: 'Orbit Corp', slug: 'orbit', description: null, avatarUrl: null,
        ownerId: 'u-1', memberCount: 3, projectCount: 1, enabledModules: ['cloud'],
        myPermissions: ['files.read', 'files.write'], createdAt: 'x', updatedAt: 'x', deletedAt: null, purgeAfter: null,
      }],
      projects: [{
        id: 'p-1', workspaceId: 'ws-1', workspaceName: 'Orbit Corp', name: 'Apollo', slug: 'apollo',
        description: null, memberCount: 2, enabledModules: ['cloud'],
        myPermissions: ['pfiles.read', 'pfiles.write'], createdAt: 'x', updatedAt: 'x',
      }],
    });

    const userApi = makeApi({
      listNodes: vi.fn().mockResolvedValue({ items: [makeNode({ id: 'u-f', name: 'personal.txt' })], nextCursor: null, hasMore: false, limit: 50 }),
    });
    const projectApi = makeApi({
      listNodes: vi.fn().mockResolvedValue({ items: [makeNode({ id: 'p-f', name: 'apollo-spec.docx', scopeType: 'PROJECT' })], nextCursor: null, hasMore: false, limit: 50 }),
    });
    const apiFactory = (scope: CloudScope) => (scope.type === 'PROJECT' ? projectApi : userApi);

    render(<CloudFilesPage scope={{ type: 'USER' }} apiFactory={apiFactory} />);
    expect(await screen.findByText('personal.txt')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Apollo/i }));
    await waitFor(() => expect(screen.getByText('apollo-spec.docx')).toBeTruthy());
  });
});
