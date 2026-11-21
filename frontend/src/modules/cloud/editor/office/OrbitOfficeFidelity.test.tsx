import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrbitDocEditor } from './OrbitDocEditor';
import { OrbitSheetEditor } from './OrbitSheetEditor';
import { OrbitSlideEditor } from './OrbitSlideEditor';
import type { UniverDocCanvasHandle } from './UniverDocCanvas';
import type { UniverSheetCanvasHandle } from './UniverSheetCanvas';
import type { UniverSlideCanvasHandle } from './UniverSlideCanvas';
import { docDtoToHtml, htmlToDocDto } from './docHtmlCodec';
import type { OfficeDocContentDto, OfficeSheetContentDto, OfficeSlideContentDto } from './officeTypes';

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

  it('mounts Univer Docs engine, loads blocks & tables, executes FDocument mutations, and syncs snapshot to onChange', async () => {
    const initialDoc: OfficeDocContentDto = {
      blocks: [
        { type: 'h1', text: '<b>Orbit</b> Specification', align: 'left' },
        { type: 'p', text: 'Body paragraph', align: 'justify' },
      ],
      tables: [{ rows: [['Key', 'Value'], ['Stack', 'Univer']] }],
    };
    const onChange = vi.fn();
    let handle: UniverDocCanvasHandle | null = null;

    render(
      <OrbitDocEditor
        value={initialDoc}
        onChange={onChange}
        onReady={(h) => { handle = h; }}
      />
    );

    await waitFor(() => expect(handle?.getDocumentApi()).toBeTruthy());
    expect(screen.getByTestId('orbit-univer-doc-host')).toBeTruthy();
    expect(screen.getByText('Tables: 1')).toBeTruthy();

    const fDoc = handle!.getDocumentApi()!;
    act(() => {
      fDoc.appendParagraph('Appended via Univer Docs API');
    });

    const flushed = handle!.flushNow();
    expect(flushed).toBeTruthy();
    expect(onChange).toHaveBeenCalled();
    expect(flushed!.blocks[0]).toEqual({ type: 'h1', text: '<b>Orbit</b> Specification', align: 'left' });
    expect(flushed!.blocks[1]).toEqual({ type: 'p', text: 'Body paragraph', align: 'justify' });
    expect(flushed!.blocks[2]?.text).toBe('Appended via Univer Docs API');
    expect(flushed!.tables).toEqual([{ rows: [['Key', 'Value'], ['Stack', 'Univer']] }]);
  }, 15000);

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

  it('mounts Univer Slides engine, creates SlideDataModel pages and elements, and flushes updates back to DTO', async () => {
    const initialSlide: OfficeSlideContentDto = {
      slides: [
        { title: 'Deck Launch', subtitle: 'Phase 1', bullets: ['Univer Slides Engine'], notes: 'Speaker notes' },
      ],
    };
    const onChange = vi.fn();
    let handle: UniverSlideCanvasHandle | null = null;

    render(
      <OrbitSlideEditor
        value={initialSlide}
        onChange={onChange}
        onReady={(h) => { handle = h; }}
      />
    );

    await waitFor(() => expect(handle?.getSlideModel()).toBeTruthy());
    const model = handle!.getSlideModel()!;
    expect(model.getPageOrder()).toEqual(['slide-1']);

    act(() => {
      handle!.syncSlides({
        slides: [
          { title: 'Updated Deck Launch', subtitle: 'Phase 2', bullets: ['Univer Slides Engine', 'Second bullet'], notes: 'Speaker notes' },
        ],
      });
    });

    const flushed = handle!.flushNow();
    expect(flushed?.slides[0]?.title).toBe('Updated Deck Launch');
    expect(flushed?.slides[0]?.bullets).toEqual(['Univer Slides Engine', 'Second bullet']);
  }, 15000);
});
