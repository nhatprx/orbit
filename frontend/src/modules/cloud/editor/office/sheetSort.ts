import type { SheetCellStyleDto, SheetTabDto } from './officeTypes';
import { evaluateSheetCell } from './sheetFormulas';

export type SheetSortDirection = 'asc' | 'desc';

interface SortEntry {
  origIdx: number;
  row: string[];
  sortKey: string;
  numVal: number | null;
}

function parseSortableNumber(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/^\$/, '').replace(/%$/, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function compareEntries(a: SortEntry, b: SortEntry, direction: SheetSortDirection): number {
  const aEmpty = a.sortKey === '';
  const bEmpty = b.sortKey === '';
  if (aEmpty && bEmpty) return a.origIdx - b.origIdx;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const mult = direction === 'asc' ? 1 : -1;
  if (a.numVal !== null && b.numVal !== null) {
    if (a.numVal !== b.numVal) return (a.numVal - b.numVal) * mult;
    return a.origIdx - b.origIdx;
  }
  if (a.numVal !== null && b.numVal === null) return -1 * mult;
  if (a.numVal === null && b.numVal !== null) return 1 * mult;

  const cmp = a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true, sensitivity: 'base' });
  return cmp !== 0 ? cmp * mult : a.origIdx - b.origIdx;
}

export function sortSheetByColumn(
  sheet: SheetTabDto,
  colIndex: number,
  direction: SheetSortDirection,
  keepHeaderRow: boolean
): SheetTabDto {
  const startRow = keepHeaderRow ? 1 : 0;
  if (sheet.rows.length <= startRow + 1) return sheet;

  const pinnedRows = keepHeaderRow ? [sheet.rows[0] ? [...sheet.rows[0]] : []] : [];
  const entries: SortEntry[] = [];
  for (let r = startRow; r < sheet.rows.length; r += 1) {
    const row = sheet.rows[r] ?? [];
    const raw = row[colIndex] ?? '';
    const evaluated = raw.trim().startsWith('=') ? evaluateSheetCell(raw, sheet.rows, r, colIndex) : raw;
    const sortKey = evaluated.trim();
    entries.push({
      origIdx: r,
      row: [...row],
      sortKey,
      numVal: parseSortableNumber(sortKey),
    });
  }

  entries.sort((a, b) => compareEntries(a, b, direction));

  const rowMap = new Map<number, number>();
  if (keepHeaderRow) rowMap.set(0, 0);
  entries.forEach((entry, idx) => {
    rowMap.set(entry.origIdx, startRow + idx);
  });

  const nextStyles: Record<string, SheetCellStyleDto> = {};
  for (const [key, style] of Object.entries(sheet.cellStyles ?? {})) {
    const [rStr, cStr] = key.split(':');
    const oldR = Number.parseInt(rStr ?? '', 10);
    if (!Number.isFinite(oldR) || cStr === undefined) continue;
    const newR = rowMap.get(oldR) ?? oldR;
    nextStyles[`${newR}:${cStr}`] = { ...style };
  }

  return {
    ...sheet,
    rows: [...pinnedRows, ...entries.map((e) => e.row)],
    cellStyles: nextStyles,
  };
}
