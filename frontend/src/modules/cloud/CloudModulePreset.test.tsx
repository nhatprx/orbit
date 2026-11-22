import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudQuotaDto } from '../../types/cloud.types';
import { CloudFilesPage } from './CloudFilesPage';
import { OfficeModulePage } from './OfficeModulePage';

const QUOTA: CloudQuotaDto = {
  scopeType: 'WORKSPACE', scopeId: 'ws-1', usedBytes: 1024, quotaBytes: 1024 * 1024,
  reservedBytes: 0, maxFileSizeBytes: 500 * 1024 * 1024, multipartThresholdBytes: 50 * 1024 * 1024,
};

function makeFile(id: string, name: string, folderPath: string | null = '/'): CloudNodeDto {
  return {
    id, scopeType: 'WORKSPACE', scopeId: 'ws-1', parentId: folderPath === '/' ? null : 'f-sub',
    folderPath, nodeType: 'FILE', name, mimeType: 'application/octet-stream',
    sizeBytes: 2048, starred: false, depth: folderPath === '/' ? 0 : 1,
    createdBy: 'u-1', createdByName: 'Ada', deletedAt: null, purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z',
  };
}

function createApi(items: CloudNodeDto[]): CloudFilesApi {
  return {
    listNodes: vi.fn().mockResolvedValue({ items, nextCursor: null, hasMore: false, limit: 50 }),
    getBreadcrumbs: vi.fn().mockResolvedValue({ items: [] }),
    getQuota: vi.fn().mockResolvedValue(QUOTA),
    createFolder: vi.fn(),
    updateNode: vi.fn().mockResolvedValue(items[0]),
    moveCloudNodes: vi.fn().mockResolvedValue({ moved: items }),
    softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(), emptyTrash: vi.fn(),
    initUpload: vi.fn(), signUploadParts: vi.fn(), completeUpload: vi.fn(), abortUpload: vi.fn(),
    getDownloadUrl: vi.fn(), createDocument: vi.fn(), getTextContent: vi.fn(), saveTextContent: vi.fn(),
    getOfficeContent: vi.fn().mockResolvedValue({
      nodeId: 'd-1', name: 'spec.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      format: 'DOCX', sizeBytes: 2048, updatedAt: '2026-11-20T00:00:00Z', etag: 'etag-1',
      doc: { blocks: [{ type: 'p', text: 'Quarterly Spec', align: 'left' }], tables: [] },
      sheet: null, slide: null,
    }),
    saveOfficeContent: vi.fn(),
  };
}

const WS_SCOPE = {
  type: 'WORKSPACE' as const,
  workspaceId: 'ws-1',
  permissions: ['files.read', 'files.write', 'files.delete'],
};

describe('Dedicated Office Module Views (docs, sheets, slides)', () => {
  it('queries recursive DOCS view, shows Folder path column, defaults New Doc to .docx, and opens inline editor', async () => {
    const api = createApi([
      makeFile('d-1', 'spec.docx', '/Specs/Q4'),
      makeFile('d-2', 'readme.md', '/'),
    ]);

    render(<OfficeModulePage scope={WS_SCOPE} scopeLabel="Acme" officeModule="docs" apiOverride={api} />);

    expect(await screen.findByText('spec.docx')).toBeTruthy();
    expect(screen.getByText('/Specs/Q4')).toBeTruthy();
    expect(screen.getByText('readme.md')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Trash' })).toBeNull();
    expect(api.listNodes).toHaveBeenCalledWith(
      expect.objectContaining({ view: 'DOCS', parentId: null }),
      expect.any(AbortSignal)
    );

    fireEvent.click(screen.getByRole('button', { name: /New Doc/i }));
    expect(screen.getByRole('radio', { name: /Word Document/i }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.doubleClick(screen.getByText('spec.docx'));
    expect(await screen.findByText('Quarterly Spec')).toBeTruthy();
  });

  it('queries recursive SHEETS view and defaults New Sheet to .xlsx', async () => {
    const api = createApi([makeFile('s-1', 'budget.xlsx', '/Finance/2026')]);

    render(<OfficeModulePage scope={WS_SCOPE} scopeLabel="Acme" officeModule="sheets" apiOverride={api} />);

    expect(await screen.findByText('budget.xlsx')).toBeTruthy();
    expect(screen.getByText('/Finance/2026')).toBeTruthy();
    await waitFor(() =>
      expect(api.listNodes).toHaveBeenCalledWith(
        expect.objectContaining({ view: 'SHEETS', parentId: null }),
        expect.any(AbortSignal)
      )
    );

    fireEvent.click(screen.getByRole('button', { name: /New Sheet/i }));
    expect(screen.getByRole('radio', { name: /Spreadsheet/i }).getAttribute('aria-checked')).toBe('true');
  });

  it('queries recursive SLIDES view and defaults New Slide to .pptx via CloudFilesPage preset routing', async () => {
    const api = createApi([makeFile('p-1', 'roadmap.pptx', '/Decks')]);

    render(<CloudFilesPage scope={WS_SCOPE} scopeLabel="Acme" modulePreset="slides" apiOverride={api} />);

    expect(await screen.findByText('roadmap.pptx')).toBeTruthy();
    expect(screen.getByText('/Decks')).toBeTruthy();
    await waitFor(() =>
      expect(api.listNodes).toHaveBeenCalledWith(
        expect.objectContaining({ view: 'SLIDES', parentId: null }),
        expect.any(AbortSignal)
      )
    );

    fireEvent.click(screen.getByRole('button', { name: /New Slide/i }));
    expect(screen.getByRole('radio', { name: /Presentation/i }).getAttribute('aria-checked')).toBe('true');
  });
});
