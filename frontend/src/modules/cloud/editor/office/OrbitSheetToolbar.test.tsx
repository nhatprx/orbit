import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CloudFilesApi } from '../../../../services/cloud/cloudApi';
import type { CloudNodeDto } from '../../../../types/cloud.types';
import { OrbitOfficeWorkspace } from './OrbitOfficeWorkspace';
import { EMPTY_SHEET_HISTORY, MAX_SHEET_HISTORY, pushSheetHistory } from './sheetHistory';
import { sortSheetByColumn } from './sheetSort';

const SHEET_NODE: CloudNodeDto = {
  id: 'sheet-ui-1', scopeType: 'USER', scopeId: 'user-1', parentId: null, nodeType: 'FILE',
  name: 'demo.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  sizeBytes: 3072, starred: false, depth: 0, createdBy: 'user-1', createdByName: 'Ada',
  deletedAt: null, purgeAfter: null, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
};

function renderSheetWorkspace(rows: string[][], cellStyles: Record<string, Record<string, unknown>> = {}) {
  const api = {
    getOfficeContent: vi.fn().mockResolvedValue({
      nodeId: SHEET_NODE.id, name: SHEET_NODE.name, mimeType: SHEET_NODE.mimeType ?? '', format: 'XLSX',
      sizeBytes: SHEET_NODE.sizeBytes, updatedAt: SHEET_NODE.updatedAt, etag: null, doc: null, slide: null,
      sheet: { sheets: [{ name: 'Sheet1', rows, cellStyles }] },
    }),
    saveOfficeContent: vi.fn().mockResolvedValue({ ...SHEET_NODE, updatedAt: '2026-03-01T00:10:00Z' }),
  } as unknown as CloudFilesApi;

  return render(
    <OrbitOfficeWorkspace node={SHEET_NODE} api={api} canWrite={true} onBack={vi.fn()} onDownload={vi.fn()} onSaved={vi.fn()} />
  );
}

describe('OrbitSheetToolbar & Menu Bar', () => {
  it('renders Google Sheets toolbar order, hides inline SUM buttons, and supports Functions dropdown', async () => {
    const { container } = renderSheetWorkspace([['10'], ['20'], ['']]);
    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    await waitFor(() => expect(byLabel('Cell A1')).toBeTruthy());
    const toolbar = screen.getByRole('toolbar', { name: 'Spreadsheet toolbar' });
    const controls = Array.from(toolbar.querySelectorAll('button, select, input'))
      .map((el) => el.getAttribute('aria-label'))
      .filter(Boolean);

    expect(controls).toEqual([
      'Undo', 'Redo', 'Zoom',
      'Currency $', 'Percent %', 'Decrease decimal places', 'Increase decimal places', 'More formats',
      'Decrease font size', 'Font size', 'Increase font size',
      'Bold', 'Italic', 'Underline', 'Strikethrough', 'Text color', 'Fill color',
      'Borders', 'Horizontal align', 'Vertical align', 'Text wrap',
      'Data and sort', 'Functions',
    ]);
    expect(screen.queryByRole('button', { name: 'SUM' })).toBeNull();

    // Insert =SUM(A1:A2) into A3 via Sigma Functions dropdown
    const cellA3 = byLabel<HTMLInputElement>('Cell A3');
    fireEvent.click(cellA3);
    fireEvent.click(byLabel('Functions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /SUM/i }));
    expect(cellA3.value).toBe('30');
  }, 15000);

  it('supports Undo/Redo, Zoom, Gridlines, Freeze Header, Wrap, Decimals, and Escape menu dismissal', async () => {
    const { container } = renderSheetWorkspace([['Header', 'Amount'], ['Beta', '12.5'], ['Alpha', '5']]);
    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    await waitFor(() => expect(byLabel('Cell A1')).toBeTruthy());
    const cellB2 = byLabel<HTMLInputElement>('Cell B2');

    // Edit cell -> Undo -> Redo
    fireEvent.click(cellB2);
    fireEvent.change(cellB2, { target: { value: '99' } });
    fireEvent.keyDown(cellB2, { key: 'Enter' });
    expect(cellB2.value).toBe('99');
    fireEvent.click(byLabel('Undo'));
    expect(cellB2.value).toBe('12.5');
    fireEvent.click(byLabel('Redo'));
    expect(cellB2.value).toBe('99');

    // Escape closes an open menu bar dropdown without opening the discard-changes alert
    fireEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    expect(screen.getByRole('menu', { name: 'View menu' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'View menu' })).toBeNull();
    expect(screen.queryByText(/You have unsaved changes/i)).toBeNull();

    // Zoom, Gridlines, Freeze Header via View menu
    fireEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '125%' }));
    expect(container.querySelector('[data-zoom="125"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Show gridlines' }));
    expect(container.querySelector('[data-gridlines="false"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Freeze header row' }));
    expect(container.querySelector('[data-freeze-header="true"]')).toBeTruthy();

    // Sort active column A -> Z with frozen header keeps row 0 pinned
    fireEvent.click(byLabel('Cell A2'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Data' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sort column A -> Z' }));
    expect(byLabel<HTMLInputElement>('Cell A1').value).toBe('Header');
    expect(byLabel<HTMLInputElement>('Cell A2').value).toBe('Alpha');
    expect(byLabel<HTMLInputElement>('Cell A3').value).toBe('Beta');

    // Text wrap switches cell editor to wrapping textarea
    fireEvent.click(byLabel('Cell A1'));
    fireEvent.click(byLabel('Text wrap'));
    expect(byLabel('Cell A1').tagName).toBe('TEXTAREA');
    expect(byLabel('Cell A1').getAttribute('data-wrap')).toBe('true');

    // Plain text format prevents numeric decimal formatting
    fireEvent.click(byLabel('Cell B2'));
    fireEvent.click(byLabel('Currency $'));
    expect(byLabel<HTMLInputElement>('Cell B2').value).toBe('$5.00');
    fireEvent.click(byLabel('More formats'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Plain text' }));
    expect(byLabel<HTMLInputElement>('Cell B2').value).toBe('5');
  }, 15000);

  it('caps history at 50 snapshots and keeps cellStyles synced during column sort', () => {
    let history = EMPTY_SHEET_HISTORY;
    for (let i = 0; i < MAX_SHEET_HISTORY + 10; i += 1) {
      history = pushSheetHistory(history, { sheets: [{ name: 'Sheet1', rows: [[String(i)]], cellStyles: {} }] });
    }
    expect(history.past.length).toBe(MAX_SHEET_HISTORY);
    expect(history.past[0]?.sheets[0]?.rows[0]?.[0]).toBe('10');

    const sorted = sortSheetByColumn(
      {
        name: 'Sheet1',
        rows: [['Title', 'Val'], ['Zebra', '10'], ['', '99'], ['Apple', '2']],
        cellStyles: { '0:0': { bold: true }, '1:0': { textColor: '#EF4444' }, '3:0': { textColor: '#22C55E' } },
      },
      0,
      'asc',
      true
    );
    expect(sorted.rows.map((r) => r[0])).toEqual(['Title', 'Apple', 'Zebra', '']);
    expect(sorted.cellStyles?.['0:0']).toEqual({ bold: true });
    expect(sorted.cellStyles?.['1:0']).toEqual({ textColor: '#22C55E' });
    expect(sorted.cellStyles?.['2:0']).toEqual({ textColor: '#EF4444' });
  });

  it('supports Ctrl+Z/Ctrl+Y keyboard undo-redo and Clear formatting via toolbar Data menu', async () => {
    const { container } = renderSheetWorkspace([['42']]);
    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    await waitFor(() => expect(byLabel('Cell A1')).toBeTruthy());
    const cellA1 = byLabel<HTMLInputElement>('Cell A1');
    fireEvent.click(cellA1);
    fireEvent.click(byLabel('Bold'));
    expect(cellA1.className).toContain('font-bold');

    // Ctrl+Z undoes bold, Ctrl+Y redoes bold
    fireEvent.keyDown(cellA1, { key: 'z', ctrlKey: true });
    expect(cellA1.className).not.toContain('font-bold');
    fireEvent.keyDown(cellA1, { key: 'y', ctrlKey: true });
    expect(cellA1.className).toContain('font-bold');

    // Clear formatting via Data & Sort quick menu
    fireEvent.click(byLabel('Data and sort'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear formatting' }));
    expect(cellA1.className).not.toContain('font-bold');
  }, 15000);
});
