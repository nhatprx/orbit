import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../types/cloud.types';
import { CloudOnlyOfficeModal } from './CloudOnlyOfficeModal';
import { resetOnlyOfficeLoaderCache } from './onlyOfficeLoader';

function makeOfficeNode(): CloudNodeDto {
  return {
    id: 'doc-99',
    scopeType: 'WORKSPACE',
    scopeId: 'ws-1',
    parentId: null,
    nodeType: 'FILE',
    name: 'q4-plan.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 4096,
    starred: false,
    depth: 0,
    createdBy: 'u-1',
    createdByName: 'Alice',
    deletedAt: null,
    purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  };
}

describe('CloudOnlyOfficeModal', () => {
  afterEach(() => {
    delete window.DocsAPI;
    resetOnlyOfficeLoaderCache();
  });

  it('shows unavailable fallback panel with Download File when ONLYOFFICE is disabled', async () => {
    const node = makeOfficeNode();
    const api = {
      getOnlyOfficeSession: vi.fn().mockResolvedValue({
        enabled: false,
        documentServerUrl: null,
        config: null,
        token: null,
        mode: null,
      }),
    } as unknown as CloudFilesApi;
    const onDownload = vi.fn();

    render(
      <CloudOnlyOfficeModal
        node={node}
        api={api}
        onClose={vi.fn()}
        onDownload={onDownload}
        onRefresh={vi.fn()}
      />
    );

    expect(await screen.findByText('ONLYOFFICE Document Server Unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download File' }));
    expect(onDownload).toHaveBeenCalledWith(node);
  });

  it('mounts DocsAPI.DocEditor with token, destroys on unmount, and refreshes on close', async () => {
    const node = makeOfficeNode();
    const destroyEditor = vi.fn();
    const docEditorCtor = vi.fn().mockImplementation(function () {
      return { destroyEditor };
    });
    window.DocsAPI = { DocEditor: docEditorCtor };

    const api = {
      getOnlyOfficeSession: vi.fn().mockResolvedValue({
        enabled: true,
        documentServerUrl: 'http://localhost:8082',
        config: { documentType: 'word', document: { title: 'q4-plan.docx' } },
        token: 'signed-jwt-token',
        mode: 'edit',
      }),
    } as unknown as CloudFilesApi;
    const onClose = vi.fn();
    const onRefresh = vi.fn();

    const { unmount } = render(
      <CloudOnlyOfficeModal
        node={node}
        api={api}
        onClose={onClose}
        onDownload={vi.fn()}
        onRefresh={onRefresh}
      />
    );

    await waitFor(() =>
      expect(docEditorCtor).toHaveBeenCalledWith(
        expect.stringMatching(/^oo_/),
        expect.objectContaining({
          documentType: 'word',
          token: 'signed-jwt-token',
          width: '100%',
          height: '100%',
        })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close office editor' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(destroyEditor).toHaveBeenCalledTimes(1);
  });
});
