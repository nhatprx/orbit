import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import { OrbitOfficeWorkspace } from './OrbitOfficeWorkspace';
import { docDtoToHtml, htmlToDocDto } from './docHtmlCodec';

const BASE_NODE: CloudNodeDto = {
  id: 'node-fidelity-1', scopeType: 'USER', scopeId: 'user-1', parentId: null, nodeType: 'FILE',
  name: 'spec.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes: 4096, starred: false, depth: 0, createdBy: 'user-1', createdByName: 'Ada Lovelace',
  deletedAt: null, purgeAfter: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

function stubApi(overrides: Partial<CloudFilesApi> = {}): CloudFilesApi {
  return {
    listNodes: vi.fn(), getBreadcrumbs: vi.fn(), getQuota: vi.fn(), createFolder: vi.fn(),
    updateNode: vi.fn(), softDeleteNode: vi.fn(), restoreNode: vi.fn(), permanentDeleteNode: vi.fn(),
    emptyTrash: vi.fn(), initUpload: vi.fn(), signUploadParts: vi.fn(), completeUpload: vi.fn(), abortUpload: vi.fn(),
    getDownloadUrl: vi.fn(), createDocument: vi.fn(), getTextContent: vi.fn(), saveTextContent: vi.fn(),
    getOfficeContent: vi.fn(),
    saveOfficeContent: vi.fn().mockResolvedValue({ ...BASE_NODE, updatedAt: '2026-03-01T00:05:00Z' }),
    ...overrides,
  } as CloudFilesApi;
}

describe('OrbitOfficeFidelity', () => {
  it('round-trips hr blocks, justify alignment, and sanitized inline tags in docHtmlCodec', () => {
    const dto = {
      blocks: [
        { type: 'p' as const, text: '<b>Bold</b> <del>old</del> <code>fn()</code>', align: 'justify' as const },
        { type: 'hr' as const, text: '', align: 'left' as const },
        { type: 'p' as const, text: 'After divider', align: 'right' as const },
      ],
      tables: [],
    };
    const root = document.createElement('div');
    root.innerHTML = docDtoToHtml(dto);
    expect(root.querySelector('hr')).toBeTruthy();
    const parsed = htmlToDocDto(root);
    expect(parsed).toEqual(dto);
  });

  it('persists justify alignment and horizontal rule and hides unpersisted font controls in OrbitDocEditor', async () => {
    const api = stubApi({
      getOfficeContent: vi.fn().mockResolvedValue({
        nodeId: BASE_NODE.id, name: 'spec.docx', mimeType: BASE_NODE.mimeType ?? '', format: 'DOCX',
        sizeBytes: 2048, updatedAt: BASE_NODE.updatedAt, etag: 'e1',
        doc: { blocks: [{ type: 'p', text: 'Body paragraph', align: 'left' }], tables: [] },
        sheet: null, slide: null,
      }),
    });

    render(<OrbitOfficeWorkspace node={BASE_NODE} api={api} canWrite={true} onBack={vi.fn()} onDownload={vi.fn()} onSaved={vi.fn()} />);

    await screen.findByLabelText('Document canvas');
    expect(screen.queryByLabelText('Font family')).toBeNull();
    expect(screen.queryByLabelText('Font size')).toBeNull();

    fireEvent.click(screen.getByLabelText('Align justify'));
    fireEvent.click(screen.getByLabelText('Horizontal rule'));
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(api.saveOfficeContent).toHaveBeenCalledTimes(1));
    const payload = (api.saveOfficeContent as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(payload.doc.blocks[0]).toEqual({ type: 'p', text: 'Body paragraph', align: 'justify' });
    expect(payload.doc.blocks[1]).toEqual({ type: 'hr', text: '', align: 'left' });
  });

  it('loads and persists XLSX cellStyles (bold, italic, underline, align, currency, percent) on save', async () => {
    const api = stubApi({
      getOfficeContent: vi.fn().mockResolvedValue({
        nodeId: 'sheet-style-1', name: 'budget.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        format: 'XLSX', sizeBytes: 2048, updatedAt: BASE_NODE.updatedAt, etag: null, doc: null, slide: null,
        sheet: {
          sheets: [{
            name: 'Budget',
            rows: [['125', '0.5']],
            cellStyles: { '0:1': { bold: true, numFmt: 'percent' } },
          }],
        },
      }),
    });

    const { container } = render(
      <OrbitOfficeWorkspace
        node={{ ...BASE_NODE, id: 'sheet-style-1', name: 'budget.xlsx' }}
        api={api} canWrite={true} onBack={vi.fn()} onDownload={vi.fn()} onSaved={vi.fn()}
      />
    );

    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    await waitFor(() => expect(byLabel('Cell A1')).toBeTruthy());
    const cellA1 = byLabel<HTMLInputElement>('Cell A1');
    const cellB1 = byLabel<HTMLInputElement>('Cell B1');

    // Preloaded style from backend renders formatted percent & bold class
    expect(cellB1.value).toBe('50.0%');
    expect(cellB1.className).toContain('font-bold');

    // Apply rich Google Sheets formatting on A1
    fireEvent.click(cellA1);
    fireEvent.click(byLabel('Bold'));
    fireEvent.click(byLabel('Italic'));
    fireEvent.click(byLabel('Underline'));
    fireEvent.click(byLabel('Strikethrough'));
    fireEvent.click(byLabel('Increase font size'));
    fireEvent.click(byLabel('Text color'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Text color Orbit green' }));
    fireEvent.click(byLabel('Fill color'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fill color Deep green' }));
    fireEvent.click(byLabel('Borders'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'All borders' }));
    fireEvent.click(byLabel('Horizontal align'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Align center' }));
    fireEvent.click(byLabel('Vertical align'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Align top' }));
    fireEvent.click(byLabel('Currency $'));
    fireEvent.click(byLabel('Increase decimal places'));

    expect(cellA1.value).toBe('$125.000');
    expect(cellA1.className).toContain('font-bold');
    expect(cellA1.className).toContain('italic');
    expect(cellA1.className).toContain('underline');
    expect(cellA1.className).toContain('line-through');

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(api.saveOfficeContent).toHaveBeenCalledTimes(1));
    const payload = (api.saveOfficeContent as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(payload.sheet.sheets[0].cellStyles['0:0']).toEqual({
      bold: true, italic: true, underline: true, strike: true,
      fontSize: 11, textColor: '#22C55E', bgColor: '#052E16',
      border: 'all', align: 'center', valign: 'top', numFmt: 'currency', decimals: 3,
    });
    expect(payload.sheet.sheets[0].cellStyles['0:1']).toEqual({ bold: true, numFmt: 'percent' });
  }, 15000);
});
