import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../types/cloud.types';
import { NewDocumentModal } from './NewDocumentModal';

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'doc-1',
    scopeType: 'USER',
    scopeId: 'u-1',
    parentId: 'folder-1',
    nodeType: 'FILE',
    name: 'roadmap.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 1024,
    starred: false,
    depth: 1,
    createdBy: 'u-1',
    createdByName: 'Alice',
    deletedAt: null,
    purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
    ...overrides,
  };
}

describe('NewDocumentModal', () => {
  it('creates a selected document type and invokes onCreated and onClose', async () => {
    const created = makeNode();
    const api = {
      createDocument: vi.fn().mockResolvedValue(created),
    } as unknown as CloudFilesApi;
    const onClose = vi.fn();
    const onCreated = vi.fn();

    render(
      <NewDocumentModal
        open
        parentId="folder-1"
        api={api}
        onClose={onClose}
        onCreated={onCreated}
      />
    );

    expect(screen.getByText('Orbit Docs rich document')).toBeTruthy();
    expect(screen.getByText('Orbit Sheets workbook')).toBeTruthy();
    expect(screen.getByText('Orbit Slides presentation')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /Word Document/i }));
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'roadmap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create & Open' }));

    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith({
        parentId: 'folder-1',
        name: 'roadmap',
        templateType: 'DOCX',
      })
    );
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays an error alert if document creation fails', async () => {
    const api = {
      createDocument: vi.fn().mockRejectedValue(new Error('Storage quota exceeded')),
    } as unknown as CloudFilesApi;

    render(
      <NewDocumentModal
        open
        parentId={null}
        api={api}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'notes.md' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create & Open' }));

    expect(await screen.findByText('Storage quota exceeded')).toBeTruthy();
  });
});
