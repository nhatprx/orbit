import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudQuotaDto } from '../../types/cloud.types';
import { CloudFilesPage } from './CloudFilesPage';

const QUOTA: CloudQuotaDto = {
  scopeType: 'USER',
  scopeId: 'u-1',
  usedBytes: 512 * 1024 * 1024,
  quotaBytes: 5 * 1024 * 1024 * 1024,
  reservedBytes: 0,
  maxFileSizeBytes: 500 * 1024 * 1024,
  multipartThresholdBytes: 50 * 1024 * 1024,
};

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'n-1',
    scopeType: 'USER',
    scopeId: 'u-1',
    parentId: null,
    nodeType: 'FILE',
    name: 'architecture.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    starred: false,
    depth: 0,
    createdBy: 'u-1',
    createdByName: 'Alice',
    deletedAt: null,
    purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

function makeMockApi(overrides: Partial<CloudFilesApi> = {}): CloudFilesApi {
  return {
    listNodes: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false, limit: 25 }),
    getBreadcrumbs: vi.fn().mockResolvedValue({ items: [] }),
    getQuota: vi.fn().mockResolvedValue(QUOTA),
    createFolder: vi.fn().mockResolvedValue(makeNode({ id: 'f-new', nodeType: 'FOLDER', name: 'Specs' })),
    updateNode: vi.fn().mockResolvedValue(makeNode()),
    softDeleteNode: vi.fn().mockResolvedValue(makeNode()),
    restoreNode: vi.fn().mockResolvedValue(makeNode()),
    permanentDeleteNode: vi.fn().mockResolvedValue(undefined),
    emptyTrash: vi.fn().mockResolvedValue({ deletedCount: 1, freedBytes: 2048 }),
    initUpload: vi.fn(),
    signUploadParts: vi.fn(),
    completeUpload: vi.fn(),
    abortUpload: vi.fn(),
    getDownloadUrl: vi.fn(),
    createDocument: vi.fn().mockResolvedValue(makeNode({ id: 'doc-1', name: 'notes.md', mimeType: 'text/markdown' })),
    getTextContent: vi.fn().mockResolvedValue({
      nodeId: 'doc-1',
      name: 'notes.md',
      mimeType: 'text/markdown',
      content: '# Hello',
      sizeBytes: 7,
      updatedAt: '2026-11-20T00:00:00Z',
      etag: 'etag-1',
    }),
    saveTextContent: vi.fn().mockResolvedValue(makeNode({ id: 'doc-1', name: 'notes.md', mimeType: 'text/markdown' })),
    getOnlyOfficeSession: vi.fn().mockResolvedValue({
      enabled: false,
      documentServerUrl: null,
      config: null,
      token: null,
      mode: null,
    }),
    ...overrides,
  };
}

describe('CloudFilesPage', () => {
  it('renders Personal Cloud badge, quota usage, and supports folder navigation', async () => {
    const folder = makeNode({ id: 'f-1', nodeType: 'FOLDER', name: 'Designs', sizeBytes: 0 });
    const childFile = makeNode({ id: 'c-1', parentId: 'f-1', name: 'wireframe.png' });

    const api = makeMockApi({
      listNodes: vi.fn().mockImplementation(async (params) => ({
        items: params?.parentId === 'f-1' ? [childFile] : [folder],
        nextCursor: null,
        hasMore: false,
        limit: 25,
      })),
      getBreadcrumbs: vi.fn().mockResolvedValue({ items: [{ id: 'f-1', name: 'Designs' }] }),
    });

    render(<CloudFilesPage scope={{ type: 'USER' }} apiOverride={api} />);

    expect(await screen.findByText('Personal Cloud')).toBeTruthy();
    expect(await screen.findByText('Designs')).toBeTruthy();
    expect(screen.getByText('512 MB / 5.00 GB')).toBeTruthy();

    fireEvent.doubleClick(screen.getByText('Designs'));
    expect(await screen.findByText('wireframe.png')).toBeTruthy();
    expect(api.getBreadcrumbs).toHaveBeenCalledWith('f-1', expect.any(AbortSignal));

    fireEvent.click(screen.getByRole('button', { name: 'Root' }));
    expect(await screen.findByText('Designs')).toBeTruthy();
  });

  it('supports Trash view restore, permanent delete, and empty trash', async () => {
    const trashed = makeNode({
      id: 't-1',
      name: 'old-backup.zip',
      deletedAt: '2026-11-19T00:00:00Z',
      purgeAfter: '2026-12-19T00:00:00Z',
    });
    const api = makeMockApi({
      listNodes: vi.fn().mockImplementation(async (params) => ({
        items: params?.view === 'TRASH' ? [trashed] : [],
        nextCursor: null,
        hasMore: false,
        limit: 25,
      })),
    });

    render(<CloudFilesPage scope={{ type: 'USER' }} apiOverride={api} />);

    fireEvent.click(screen.getByRole('button', { name: 'Trash' }));
    expect(await screen.findByText('old-backup.zip')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Restore old-backup.zip' }));
    await waitFor(() => expect(api.restoreNode).toHaveBeenCalledWith('t-1'));

    fireEvent.click(screen.getByRole('button', { name: 'Empty Trash' }));
    await waitFor(() => expect(api.emptyTrash).toHaveBeenCalledTimes(1));
  });

  it('enforces Workspace & Project RBAC gating', async () => {
    const file = makeNode({ id: 'w-1', scopeType: 'WORKSPACE', name: 'handbook.md' });
    const api = makeMockApi({
      listNodes: vi.fn().mockResolvedValue({ items: [file], nextCursor: null, hasMore: false, limit: 25 }),
    });

    const { rerender } = render(
      <CloudFilesPage
        scope={{ type: 'WORKSPACE', workspaceId: 'ws-1', permissions: ['files.read'] }}
        scopeLabel="Acme"
        apiOverride={api}
      />
    );

    expect(await screen.findByText('Workspace Cloud')).toBeTruthy();
    expect(await screen.findByText('handbook.md')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Upload Files/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /New Folder/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete handbook\.md/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Download handbook.md' })).toBeTruthy();

    rerender(
      <CloudFilesPage
        scope={{ type: 'PROJECT', workspaceId: 'ws-1', projectId: 'p-1', permissions: [] }}
        scopeLabel="Core"
        apiOverride={api}
      />
    );
    expect(screen.getByText('No access to Cloud Files')).toBeTruthy();
  });

  it('creates a folder via the New Folder modal', async () => {
    const api = makeMockApi();
    render(
      <CloudFilesPage
        scope={{
          type: 'PROJECT',
          workspaceId: 'ws-1',
          projectId: 'p-1',
          permissions: ['pfiles.read', 'pfiles.write'],
        }}
        scopeLabel="Orbit API"
        apiOverride={api}
      />
    );

    expect(await screen.findByText('Project Cloud')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /New Folder/i }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Specs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(api.createFolder).toHaveBeenCalledWith({ parentId: null, name: 'Specs' })
    );
  });
});
