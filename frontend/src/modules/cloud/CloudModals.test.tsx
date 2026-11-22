import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudScope } from '../../types/cloud.types';
import type { CloudLocationOption } from './cloudLocations';
import { RenameNodeModal } from './CloudNodeModals';
import { MoveNodeModal } from './MoveNodeModal';

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'n-1', scopeType: 'USER', scopeId: 'u-1', parentId: null, nodeType: 'FILE',
    name: 'demo.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 1024, starred: false, depth: 0, createdBy: 'u-1', createdByName: 'Alice',
    deletedAt: null, purgeAfter: null, createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

function makeListApi(foldersByParent: Record<string, CloudNodeDto[]>): CloudFilesApi {
  return {
    listNodes: vi.fn().mockImplementation(async (params) => ({
      items: foldersByParent[params?.parentId ?? 'root'] ?? [],
      nextCursor: null, hasMore: false, limit: 100,
    })),
    getBreadcrumbs: vi.fn(), getQuota: vi.fn(), createFolder: vi.fn(), updateNode: vi.fn(),
    moveCloudNodes: vi.fn(), softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(),
    emptyTrash: vi.fn(), initUpload: vi.fn(), signUploadParts: vi.fn(), completeUpload: vi.fn(),
    abortUpload: vi.fn(), getDownloadUrl: vi.fn(), createDocument: vi.fn(), getTextContent: vi.fn(),
    saveTextContent: vi.fn(), getOfficeContent: vi.fn(), saveOfficeContent: vi.fn(),
  };
}

describe('RenameNodeModal (extension-locked)', () => {
  it('locks file extension (.docx) and appends it automatically on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<RenameNodeModal node={makeNode({ name: 'demo.docx' })} onClose={onClose} onSubmit={onSubmit} />);

    const input = screen.getByLabelText('File Name') as HTMLInputElement;
    expect(input.value).toBe('demo');
    expect(screen.getByTestId('locked-extension-badge').textContent).toBe('.docx');

    fireEvent.change(input, { target: { value: 'q4-roadmap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('q4-roadmap.docx'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows folders to rename freely without an extension badge and keeps modal open on error', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Duplicate folder name')).mockResolvedValueOnce(undefined);
    const onClose = vi.fn();

    render(
      <RenameNodeModal node={makeNode({ id: 'f-1', nodeType: 'FOLDER', name: 'Specs' })} onClose={onClose} onSubmit={onSubmit} />
    );

    expect(screen.queryByTestId('locked-extension-badge')).toBeNull();
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('Specs');

    fireEvent.change(input, { target: { value: 'Design Specs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Duplicate folder name')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith('Design Specs'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('MoveNodeModal (cross-scope & multi-item)', () => {
  const userScope: CloudScope = { type: 'USER' };
  const wsScope: CloudScope = { type: 'WORKSPACE', workspaceId: 'ws-1', permissions: ['files.read', 'files.write'] };
  const projScope: CloudScope = {
    type: 'PROJECT', workspaceId: 'ws-1', projectId: 'p-1', permissions: ['pfiles.read', 'pfiles.write'],
  };

  const locations: CloudLocationOption[] = [
    { key: 'USER', label: 'Personal Cloud', subtitle: 'Private', scope: userScope, canRead: true, canWrite: true },
    { key: 'WORKSPACE:ws-1', label: 'Acme Workspace', subtitle: 'Workspace', scope: wsScope, canRead: true, canWrite: true },
    { key: 'PROJECT:ws-1:p-1', label: 'Apollo Project', subtitle: 'Project', scope: projScope, canRead: true, canWrite: true },
  ];

  it('supports switching location Personal -> Project, drilling into subfolder, and batch moving 2 items', async () => {
    const userApi = makeListApi({ root: [makeNode({ id: 'uf-1', nodeType: 'FOLDER', name: 'PersonalDocs' })] });
    const projApi = makeListApi({
      root: [makeNode({ id: 'pf-1', nodeType: 'FOLDER', name: 'Deliverables', scopeType: 'PROJECT' })],
      'pf-1': [makeNode({ id: 'pf-2', nodeType: 'FOLDER', name: 'Q4', parentId: 'pf-1', scopeType: 'PROJECT' })],
    });
    const apiForScope = (s: CloudScope) => (s.type === 'PROJECT' ? projApi : userApi);
    const onMove = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <MoveNodeModal
        nodes={[makeNode({ id: 'n-1', name: 'a.docx' }), makeNode({ id: 'n-2', name: 'b.xlsx' })]}
        sourceScope={userScope}
        locations={locations}
        apiForScope={apiForScope}
        onClose={onClose}
        onMove={onMove}
      />
    );

    expect(await screen.findByText('PersonalDocs')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apollo Project' }));
    expect(await screen.findByText('Deliverables')).toBeTruthy();

    // Drill into Deliverables and single-click Q4
    fireEvent.click(screen.getByRole('button', { name: 'Open Deliverables' }));
    expect(await screen.findByText('Q4')).toBeTruthy();
    fireEvent.click(screen.getByText('Q4'));
    expect(screen.getByText('Apollo Project / Deliverables / Q4')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Move 2 Items' }));
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(projScope, 'pf-2'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays inline error and stays open when move fails', async () => {
    const onMove = vi.fn().mockRejectedValue(new Error('Target quota exceeded'));
    const onClose = vi.fn();

    render(
      <MoveNodeModal
        nodes={[makeNode({ id: 'n-1', name: 'big.pptx' })]}
        sourceScope={userScope}
        locations={locations}
        apiForScope={() => makeListApi({ root: [] })}
        onClose={onClose}
        onMove={onMove}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Here' }));
    expect(await screen.findByText('Target quota exceeded')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
