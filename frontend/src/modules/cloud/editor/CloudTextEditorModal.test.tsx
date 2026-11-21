import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../types/cloud.types';
import { CloudTextEditorModal } from './CloudTextEditorModal';

vi.mock('./CodeMirrorHost', () => ({
  CodeMirrorHost: ({
    initialValue,
    readOnly,
    onChange,
  }: {
    initialValue: string;
    readOnly: boolean;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Mock CodeMirror Editor"
      defaultValue={initialValue}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

function makeNode(overrides: Partial<CloudNodeDto> = {}): CloudNodeDto {
  return {
    id: 'n-md',
    scopeType: 'USER',
    scopeId: 'u-1',
    parentId: null,
    nodeType: 'FILE',
    name: 'spec.md',
    mimeType: 'text/markdown',
    sizeBytes: 120,
    starred: false,
    depth: 0,
    createdBy: 'u-1',
    createdByName: 'Alice',
    deletedAt: null,
    purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T01:00:00Z',
    ...overrides,
  };
}

describe('CloudTextEditorModal', () => {
  it('loads content, renders sanitized Markdown preview, edits, and saves via Ctrl+S', async () => {
    const node = makeNode();
    const updatedNode = makeNode({ updatedAt: '2026-11-20T02:00:00Z' });
    const api = {
      getTextContent: vi.fn().mockResolvedValue({
        nodeId: node.id,
        name: node.name,
        mimeType: node.mimeType,
        content: '# Orbit Spec\n<script>alert(1)</script>',
        sizeBytes: 38,
        updatedAt: node.updatedAt,
        etag: 'e-1',
      }),
      saveTextContent: vi.fn().mockResolvedValue(updatedNode),
    } as unknown as CloudFilesApi;
    const onSaved = vi.fn();

    render(
      <CloudTextEditorModal
        node={node}
        api={api}
        canWrite
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    );

    const editor = await screen.findByLabelText('Mock CodeMirror Editor');
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.innerHTML).toContain('<h1>Orbit Spec</h1>');
    expect(preview.innerHTML).not.toContain('<script>');

    fireEvent.click(screen.getByRole('button', { name: 'Hide Preview' }));
    expect(screen.queryByTestId('markdown-preview')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Split Preview' }));
    expect(screen.getByTestId('markdown-preview')).toBeTruthy();

    fireEvent.change(editor, { target: { value: '# Updated Spec' } });
    expect(screen.getByText('Unsaved')).toBeTruthy();

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() =>
      expect(api.saveTextContent).toHaveBeenCalledWith(node.id, {
        content: '# Updated Spec',
        expectedUpdatedAt: node.updatedAt,
      })
    );
    expect(onSaved).toHaveBeenCalledWith(updatedNode);
  });

  it('asks for confirmation before discarding unsaved changes on close', async () => {
    const node = makeNode({ name: 'notes.txt', mimeType: 'text/plain' });
    const api = {
      getTextContent: vi.fn().mockResolvedValue({
        nodeId: node.id,
        name: node.name,
        mimeType: node.mimeType,
        content: 'initial',
        sizeBytes: 7,
        updatedAt: node.updatedAt,
        etag: null,
      }),
      saveTextContent: vi.fn(),
    } as unknown as CloudFilesApi;
    const onClose = vi.fn();

    render(
      <CloudTextEditorModal
        node={node}
        api={api}
        canWrite
        onClose={onClose}
        onSaved={vi.fn()}
      />
    );

    const editor = await screen.findByLabelText('Mock CodeMirror Editor');
    fireEvent.change(editor, { target: { value: 'modified' } });
    fireEvent.click(screen.getByRole('button', { name: /Back to files/i }));

    expect(screen.getByText(/You have unsaved changes/i)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('enforces read-only mode when canWrite is false', async () => {
    const node = makeNode({ name: 'config.json', mimeType: 'application/json' });
    const api = {
      getTextContent: vi.fn().mockResolvedValue({
        nodeId: node.id,
        name: node.name,
        mimeType: node.mimeType,
        content: '{"ok":true}',
        sizeBytes: 11,
        updatedAt: node.updatedAt,
        etag: null,
      }),
      saveTextContent: vi.fn(),
    } as unknown as CloudFilesApi;

    render(
      <CloudTextEditorModal
        node={node}
        api={api}
        canWrite={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    const editor = (await screen.findByLabelText('Mock CodeMirror Editor')) as HTMLTextAreaElement;
    expect(editor.readOnly).toBe(true);
    expect(screen.getByText('Read-Only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
