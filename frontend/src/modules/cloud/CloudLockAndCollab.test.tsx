import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { collabClient } from '../../services/collab/collabClient';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../types/cloud.types';
import type { CollabRoomEvent } from '../../types/collab.types';
import { CloudRowActions } from './CloudRowActions';
import { CloudToolbar } from './CloudToolbar';
import { CloudTextEditorModal } from './editor/CloudTextEditorModal';

vi.mock('./editor/CodeMirrorHost', () => ({
  CodeMirrorHost: ({
    initialValue,
    value,
    readOnly,
    onChange,
  }: {
    initialValue: string;
    value?: string;
    readOnly: boolean;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Mock CodeMirror Editor"
      value={value ?? initialValue}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'n-lock-1',
    scopeType: 'WORKSPACE',
    scopeId: 'ws-1',
    parentId: null,
    nodeType: 'FILE',
    name: 'contract.md',
    mimeType: 'text/markdown',
    sizeBytes: 256,
    starred: false,
    depth: 0,
    createdBy: 'u-1',
    createdByName: 'Owner',
    deletedAt: null,
    purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T01:00:00Z',
    ...overrides,
  };
}

describe('Cloud Owner Lock & Live Lock Enforcement', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disables create and upload buttons in CloudToolbar when active folder is locked', () => {
    render(
      <CloudToolbar
        view="ALL"
        viewMode="list"
        inspectorOpen={false}
        locationLabel="Workspace"
        breadcrumbs={[{ id: 'f-1', name: 'Protected', effectiveLocked: true }]}
        canGoBack={false}
        canGoForward={false}
        search=""
        sortBy="name"
        sortDir="asc"
        permissions={{ canRead: true, canWrite: true, canDelete: true, canManage: true }}
        folderLocked={true}
        hasNodes={true}
        onGoBack={vi.fn()}
        onGoForward={vi.fn()}
        onViewModeChange={vi.fn()}
        onToggleInspector={vi.fn()}
        onSearchChange={vi.fn()}
        onSortByChange={vi.fn()}
        onToggleSortDir={vi.fn()}
        onUploadFiles={vi.fn()}
        onOpenNewDocument={vi.fn()}
        onOpenNewFolder={vi.fn()}
        onEmptyTrash={vi.fn()}
      />
    );

    expect(screen.getByTestId('cloud-folder-locked-badge')).toBeTruthy();
    expect((screen.getByRole('button', { name: /New Document/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /New Folder/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Upload Files/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables rename, move, and delete on locked CloudRowActions while allowing owner unlock', () => {
    const lockedNode = makeNode({ locked: true, effectiveLocked: true, canToggleLock: true });
    const onToggleLock = vi.fn();
    render(
      <CloudRowActions
        node={lockedNode}
        view="ALL"
        permissions={{ canRead: true, canWrite: true, canDelete: true, canManage: true }}
        onOpenEditor={vi.fn()}
        onToggleStar={vi.fn()}
        onToggleLock={onToggleLock}
        onDownload={vi.fn()}
        onRename={vi.fn()}
        onMove={vi.fn()}
        onSoftDelete={vi.fn()}
        onRestore={vi.fn()}
        onPermanentDelete={vi.fn()}
      />
    );

    expect((screen.getByRole('button', { name: 'Rename contract.md' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move contract.md' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Delete contract.md' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Unlock contract.md' }));
    expect(onToggleLock).toHaveBeenCalledWith(lockedNode);
  });

  it('switches CloudTextEditorModal to read-only immediately when LOCK_CHANGED arrives over STOMP', async () => {
    let emitEvent: ((ev: CollabRoomEvent) => void) | null = null;
    vi.spyOn(collabClient, 'subscribeRoom').mockImplementation((_kind, _id, onEvent) => {
      emitEvent = onEvent;
      return vi.fn();
    });

    const node = makeNode({ locked: false, effectiveLocked: false, canToggleLock: true });
    const api = {
      getTextContent: vi.fn().mockResolvedValue({
        nodeId: node.id,
        name: node.name,
        mimeType: node.mimeType,
        content: 'hello',
        sizeBytes: 5,
        updatedAt: node.updatedAt,
        etag: null,
      }),
      saveTextContent: vi.fn(),
      setNodeLocked: vi.fn().mockResolvedValue({ ...node, locked: true, effectiveLocked: true }),
    } as unknown as CloudFilesApi;

    render(<CloudTextEditorModal node={node} api={api} canWrite={true} onClose={vi.fn()} onSaved={vi.fn()} />);

    const editor = (await screen.findByLabelText('Mock CodeMirror Editor')) as HTMLTextAreaElement;
    expect(editor.readOnly).toBe(false);

    act(() => {
      emitEvent?.({
        type: 'LOCK_CHANGED',
        resourceKind: 'CLOUD_NODE',
        resourceId: node.id,
        senderUserId: 'u-1',
        senderSessionId: 's-1',
        senderDisplayName: 'Owner',
        seq: 1,
        timestamp: '2026-11-22T00:00:00Z',
        payload: { locked: true },
      });
    });

    await waitFor(() => expect(editor.readOnly).toBe(true));
    expect(screen.getByTestId('text-editor-locked-banner')).toBeTruthy();
    expect(screen.getByTestId('collab-locked-badge')).toBeTruthy();
  });
});
