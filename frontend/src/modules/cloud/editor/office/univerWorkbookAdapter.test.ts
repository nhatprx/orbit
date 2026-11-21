import { CellValueType } from '@univerjs/presets';
import { describe, expect, it } from 'vitest';
import type { OfficeSheetContentDto, SheetCellStyleDto } from './officeTypes';
import {
  clampDecimals,
  clampFontSize,
  fromUniverStyle,
  HIGHLIGHT_BG_HEX,
  normalizeHexColor,
  parseUniverNumFmtPattern,
  toUniverNumFmtPattern,
  toUniverStyle,
} from './univerStyleAdapter';
import {
  fromUniverWorkbookData,
  isCanonicalNumeric,
  MIN_UNIVER_COLS,
  MIN_UNIVER_ROWS,
  toUniverWorkbookData,
} from './univerWorkbookAdapter';

describe('univerWorkbookAdapter & univerStyleAdapter', () => {
  it('round-trips all 14 SheetCellStyleDto properties losslessly between Orbit DTO and Univer IWorkbookData', () => {
    const fullStyle: SheetCellStyleDto = {
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      highlight: true,
      fontSize: 16,
      textColor: '#22C55E',
      bgColor: HIGHLIGHT_BG_HEX,
      border: 'all',
      align: 'center',
      valign: 'middle',
      wrap: true,
      numFmt: 'currency',
      decimals: 3,
    };
    const bottomStyle: SheetCellStyleDto = {
      border: 'bottom',
      align: 'right',
      valign: 'bottom',
      numFmt: 'percent',
      decimals: 2,
    };
    const textStyle: SheetCellStyleDto = {
      align: 'left',
      valign: 'top',
      numFmt: 'text',
    };

    const dto: OfficeSheetContentDto = {
      sheets: [
        {
          name: 'Financials',
          rows: [
            ['1250.5', '0.425', '007'],
            ['=SUM(A1:B1)', 'Plain label', ''],
          ],
          cellStyles: {
            '0:0': fullStyle,
            '0:1': bottomStyle,
            '0:2': textStyle,
            '4:3': { bold: true, bgColor: '#161B22', numFmt: 'number', decimals: 0 },
          },
        },
        {
          name: 'Summary',
          rows: [['=Financials!A1*2']],
          cellStyles: {},
        },
      ],
    };

    const workbook = toUniverWorkbookData(dto);
    expect(workbook.sheetOrder).toEqual(['sheet-1', 'sheet-2']);
    const sheet1 = workbook.sheets['sheet-1']!;
    expect(sheet1.rowCount).toBeGreaterThanOrEqual(MIN_UNIVER_ROWS);
    expect(sheet1.columnCount).toBeGreaterThanOrEqual(MIN_UNIVER_COLS);

    // Numeric, formula, and force-string cell types
    expect(sheet1.cellData?.[0]?.[0]).toMatchObject({ v: 1250.5, t: CellValueType.NUMBER });
    expect(sheet1.cellData?.[0]?.[1]).toMatchObject({ v: 0.425, t: CellValueType.NUMBER });
    expect(sheet1.cellData?.[0]?.[2]).toMatchObject({ v: '007', t: CellValueType.FORCE_STRING });
    expect(sheet1.cellData?.[1]?.[0]).toMatchObject({ f: '=SUM(A1:B1)' });
    expect(sheet1.cellData?.[1]?.[1]).toMatchObject({ v: 'Plain label', t: CellValueType.STRING });

    const roundTripped = fromUniverWorkbookData(workbook);
    expect(roundTripped.sheets).toHaveLength(2);
    expect(roundTripped.sheets[0]?.name).toBe('Financials');
    expect(roundTripped.sheets[0]?.rows).toEqual([
      ['1250.5', '0.425', '007'],
      ['=SUM(A1:B1)', 'Plain label', ''],
    ]);
    expect(roundTripped.sheets[0]?.cellStyles?.['0:0']).toEqual(fullStyle);
    expect(roundTripped.sheets[0]?.cellStyles?.['0:1']).toEqual(bottomStyle);
    expect(roundTripped.sheets[0]?.cellStyles?.['0:2']).toEqual(textStyle);
    expect(roundTripped.sheets[0]?.cellStyles?.['4:3']).toEqual({
      bold: true,
      bgColor: '#161B22',
      numFmt: 'number',
      decimals: 0,
    });
    expect(roundTripped.sheets[1]?.name).toBe('Summary');
    expect(roundTripped.sheets[1]?.rows).toEqual([['=Financials!A1*2']]);
  });

  it('trims trailing empty rows/columns, normalizes formula prefixes, and extracts rich-text p.body.dataStream', () => {
    const rawSnapshot = {
      id: 'wb-test',
      name: 'Test',
      sheetOrder: ['s1', 's2'],
      styles: {},
      sheets: {
        s1: {
          id: 's1',
          name: 'Trimmed',
          cellData: {
            0: { 0: { v: 'Header' }, 1: { v: '' }, 5: { v: '' } },
            1: { 0: { f: 'SUM(A1:A1)' }, 1: { p: { id: 'd', body: { dataStream: 'Rich text\r\n' }, documentStyle: {} } } },
            8: { 0: { v: '' } },
          },
        },
        s2: {
          id: 's2',
          name: 'EmptySheet',
          cellData: {},
        },
      },
    };

    const dto = fromUniverWorkbookData(rawSnapshot);
    expect(dto.sheets[0]?.rows).toEqual([
      ['Header', ''],
      ['=SUM(A1:A1)', 'Rich text'],
    ]);
    expect(dto.sheets[1]?.rows).toEqual([['']]);
  });

  it('handles boundary font sizes, decimals, rgb() colors, number format patterns, and malformed inputs', () => {
    expect(clampFontSize(2)).toBe(8);
    expect(clampFontSize(99)).toBe(36);
    expect(clampDecimals(-4)).toBe(0);
    expect(clampDecimals(15)).toBe(6);

    expect(normalizeHexColor('#22c55e')).toBe('#22C55E');
    expect(normalizeHexColor('#0f0')).toBe('#00FF00');
    expect(normalizeHexColor('rgb(34, 197, 94)')).toBe('#22C55E');
    expect(normalizeHexColor('rgba(5, 46, 22, 0.8)')).toBe('#052E16');
    expect(normalizeHexColor('not-a-color')).toBeUndefined();

    expect(toUniverNumFmtPattern('currency', 2)).toBe('$#,##0.00');
    expect(toUniverNumFmtPattern('percent', 1)).toBe('0.0%');
    expect(toUniverNumFmtPattern('number', 0)).toBe('#,##0');
    expect(toUniverNumFmtPattern('text')).toBe('@');
    expect(toUniverNumFmtPattern('auto')).toBeNull();

    expect(parseUniverNumFmtPattern('$#,##0.000;($#,##0.000)')).toEqual({ numFmt: 'currency', decimals: 3 });
    expect(parseUniverNumFmtPattern('0.00%')).toEqual({ numFmt: 'percent', decimals: 2 });
    expect(parseUniverNumFmtPattern('#,##0.0000')).toEqual({ numFmt: 'number', decimals: 4 });
    expect(parseUniverNumFmtPattern('@')).toEqual({ numFmt: 'text' });
    expect(parseUniverNumFmtPattern('yyyy-mm-dd')).toEqual({});
    expect(parseUniverNumFmtPattern('General')).toEqual({});

    expect(isCanonicalNumeric('0')).toBe(true);
    expect(isCanonicalNumeric('-42.75')).toBe(true);
    expect(isCanonicalNumeric('007')).toBe(false);
    expect(isCanonicalNumeric('12abc')).toBe(false);

    const highlightOnly = toUniverStyle({ highlight: true });
    expect(highlightOnly?.bg?.rgb).toBe(HIGHLIGHT_BG_HEX);
    expect(fromUniverStyle(highlightOnly)).toEqual({ bgColor: HIGHLIGHT_BG_HEX, highlight: true });
  });
});
