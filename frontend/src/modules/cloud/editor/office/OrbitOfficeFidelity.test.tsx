import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import { OrbitOfficeWorkspace } from './OrbitOfficeWorkspace';
import { OrbitSheetEditor } from './OrbitSheetEditor';
import type { UniverSheetCanvasHandle } from './UniverSheetCanvas';
import { docDtoToHtml, htmlToDocDto } from './docHtmlCodec';
import type { OfficeSheetContentDto } from './officeTypes';

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

  it('mounts Univer Sheets engine, loads and mutates formulas and styles, and syncs live snapshot to onChange', async () => {
    const initialDto: OfficeSheetContentDto = {
      sheets: [{
        name: 'Budget',
        rows: [['125', '0.5', '=A1*B1']],
        cellStyles: { '0:1': { bold: true, numFmt: 'percent', decimals: 1 } },
      }],
    };
    const onChange = vi.fn();
    let handle: UniverSheetCanvasHandle | null = null;

    render(
      <OrbitSheetEditor
        value={initialDto}
        onChange={onChange}
        onReady={(h) => { handle = h; }}
      />
    );

    await waitFor(() => expect(handle?.getWorkbookApi()).toBeTruthy());
    const wb = handle!.getWorkbookApi()!;
    const sheet = wb.getActiveSheet();
    expect(sheet.getSheetName()).toBe('Budget');

    act(() => {
      const cellA1 = sheet.getRange(0, 0);
      cellA1.setFontWeight('bold');
      cellA1.setFontStyle('italic');
      cellA1.setFontLine('underline');
      cellA1.setFontSize(14);
      cellA1.setFontColor('#22C55E');
      cellA1.setBackgroundColor('#052E16');
      cellA1.setHorizontalAlignment('center');
      cellA1.setVerticalAlignment('top');
      cellA1.setWrap(true);
      cellA1.setNumberFormat('$#,##0.000');
      sheet.getRange(0, 2).setValue('=SUM(A1:B1)');
    });

    const flushed = handle!.flushNow();
    expect(flushed).toBeTruthy();
    expect(onChange).toHaveBeenCalled();
    expect(flushed!.sheets[0]?.rows[0]).toEqual(['125', '0.5', '=SUM(A1:B1)']);
    expect(flushed!.sheets[0]?.cellStyles?.['0:0']).toEqual({
      bold: true,
      italic: true,
      underline: true,
      highlight: true,
      fontSize: 14,
      textColor: '#22C55E',
      bgColor: '#052E16',
      align: 'center',
      valign: 'top',
      wrap: true,
      numFmt: 'currency',
      decimals: 3,
    });
    expect(flushed!.sheets[0]?.cellStyles?.['0:1']).toEqual({
      bold: true,
      numFmt: 'percent',
      decimals: 1,
    });
  }, 15000);
});
