import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudQuotaDto } from '../../types/cloud.types';
import { CloudFilesPage } from './CloudFilesPage';

const QUOTA: CloudQuotaDto = {
  scopeType: 'USER', scopeId: 'u-1', usedBytes: 1024, quotaBytes: 1024 * 1024,
  reservedBytes: 0, maxFileSizeBytes: 500 * 1024 * 1024, multipartThresholdBytes: 50 * 1024 * 1024,
};

function node(id: string, name: string, nodeType: 'FILE' | 'FOLDER' = 'FILE'): CloudNodeDto {
  return {
    id, scopeType: 'USER', scopeId: 'u-1', parentId: null, nodeType, name,
    mimeType: nodeType === 'FOLDER' ? null : 'application/octet-stream',
    sizeBytes: nodeType === 'FOLDER' ? 0 : 128, starred: false, depth: 0,
    createdBy: 'u-1', createdByName: 'Ada', deletedAt: null, purgeAfter: null,
    createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z',
  };
}

const MIXED_NODES: CloudNodeDto[] = [
  node('f-1', 'Reports', 'FOLDER'),
  node('n-1', 'spec.docx'),
  node('n-2', 'readme.md'),
  node('n-3', 'notes.txt'),
  node('n-4', 'manual.pdf'),
  node('n-5', 'budget.xlsx'),
  node('n-6', 'metrics.csv'),
  node('n-7', 'deck.pptx'),
  node('n-8', 'photo.png'),
];

function createApi(): CloudFilesApi {
  return {
    listNodes: vi.fn().mockResolvedValue({ items: MIXED_NODES, nextCursor: null, hasMore: false, limit: 25 }),
    getBreadcrumbs: vi.fn().mockResolvedValue({ items: [] }),
    getQuota: vi.fn().mockResolvedValue(QUOTA),
    createFolder: vi.fn(), updateNode: vi.fn(), softDeleteNode: vi.fn(), restoreNode: vi.fn(),
    permanentDeleteNode: vi.fn(), emptyTrash: vi.fn(), initUpload: vi.fn(), signUploadParts: vi.fn(),
    completeUpload: vi.fn(), abortUpload: vi.fn(), getDownloadUrl: vi.fn(),
    createDocument: vi.fn(), getTextContent: vi.fn(), saveTextContent: vi.fn(),
    getOfficeContent: vi.fn(), saveOfficeContent: vi.fn(),
  };
}

describe('CloudFilesPage module presets', () => {
  it('pre-filters to document extensions and defaults NewDocumentModal to .docx in docs preset', async () => {
    render(<CloudFilesPage scope={{ type: 'USER' }} modulePreset="docs" apiOverride={createApi()} />);

    expect(await screen.findByText('Reports')).toBeTruthy();
    expect(screen.getByText('spec.docx')).toBeTruthy();
    expect(screen.getByText('readme.md')).toBeTruthy();
    expect(screen.getByText('notes.txt')).toBeTruthy();
    expect(screen.getByText('manual.pdf')).toBeTruthy();
    expect(screen.queryByText('budget.xlsx')).toBeNull();
    expect(screen.queryByText('metrics.csv')).toBeNull();
    expect(screen.queryByText('photo.png')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /New Document/i }));
    expect(screen.getByRole('radio', { name: /Word Document/i }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Show all files' }));
    expect(screen.getByText('budget.xlsx')).toBeTruthy();
    expect(screen.getByText('photo.png')).toBeTruthy();
  });

  it('pre-filters to spreadsheet extensions and defaults NewDocumentModal to .xlsx in sheets preset', async () => {
    render(<CloudFilesPage scope={{ type: 'USER' }} modulePreset="sheets" apiOverride={createApi()} />);

    expect(await screen.findByText('Reports')).toBeTruthy();
    expect(screen.getByText('budget.xlsx')).toBeTruthy();
    expect(screen.getByText('metrics.csv')).toBeTruthy();
    expect(screen.queryByText('spec.docx')).toBeNull();
    expect(screen.queryByText('manual.pdf')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /New Document/i }));
    expect(screen.getByRole('radio', { name: /Spreadsheet/i }).getAttribute('aria-checked')).toBe('true');
  });

  it('keeps cloud preset unfiltered', async () => {
    render(<CloudFilesPage scope={{ type: 'USER' }} modulePreset="cloud" apiOverride={createApi()} />);

    expect(await screen.findByText('spec.docx')).toBeTruthy();
    expect(screen.getByText('budget.xlsx')).toBeTruthy();
    expect(screen.getByText('deck.pptx')).toBeTruthy();
    expect(screen.getByText('photo.png')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show all files' })).toBeNull();
  });
});
