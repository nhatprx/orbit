import {
  BooleanNumber,
  CellValueType,
  LocaleType,
  type ICellData,
  type IObjectMatrixPrimitiveType,
  type IStyleData,
  type IWorkbookData,
  type IWorksheetData,
  type Nullable,
} from '@univerjs/presets';
import type { OfficeSheetContentDto, SheetCellStyleDto, SheetTabDto } from './officeTypes';
import { fromUniverStyle, toUniverStyle } from './univerStyleAdapter';

export const MIN_UNIVER_ROWS = 100;
export const MIN_UNIVER_COLS = 26;
const CANONICAL_NUM_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export function isCanonicalNumeric(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || !CANONICAL_NUM_RE.test(trimmed)) return false;
  const num = Number(trimmed);
  return Number.isFinite(num) && Math.abs(num) < 9_007_199_254_740_991;
}

function parseCoordKey(key: string): { r: number; c: number } | null {
  const parts = key.split(':');
  if (parts.length !== 2) return null;
  const r = Number.parseInt(parts[0]!, 10);
  const c = Number.parseInt(parts[1]!, 10);
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 ? { r, c } : null;
}

function buildCellData(raw: string, style?: SheetCellStyleDto, styleId?: string): ICellData | null {
  if (raw === '' && !styleId) return null;
  const cell: ICellData = {};
  if (styleId) cell.s = styleId;
  if (raw === '') return cell;
  if (style?.numFmt === 'text') {
    cell.v = raw;
    cell.t = CellValueType.FORCE_STRING;
  } else if (raw.startsWith('=') && raw.trim().length > 1) {
    cell.f = raw.trim();
  } else if (isCanonicalNumeric(raw)) {
    cell.v = Number(raw.trim());
    cell.t = CellValueType.NUMBER;
  } else {
    cell.v = raw;
    cell.t = CellValueType.STRING;
  }
  return cell;
}

export function toUniverWorkbookData(dto: OfficeSheetContentDto): IWorkbookData {
  const tabs: SheetTabDto[] = dto.sheets?.length ? dto.sheets : [{ name: 'Sheet1', rows: [['']], cellStyles: {} }];
  const styles: Record<string, Nullable<IStyleData>> = {};
  const styleKeyToId = new Map<string, string>();
  const sheetOrder: string[] = [];
  const sheets: Record<string, Partial<IWorksheetData>> = {};

  const registerStyle = (cellStyle?: SheetCellStyleDto): string | undefined => {
    const uStyle = toUniverStyle(cellStyle);
    if (!uStyle) return undefined;
    const key = JSON.stringify(uStyle);
    const existing = styleKeyToId.get(key);
    if (existing) return existing;
    const id = `s_${styleKeyToId.size + 1}`;
    styleKeyToId.set(key, id);
    styles[id] = uStyle;
    return id;
  };

  tabs.forEach((tab, idx) => {
    const sheetId = `sheet-${idx + 1}`;
    sheetOrder.push(sheetId);
    const rows = tab.rows ?? [];
    const tabStyles = tab.cellStyles ?? {};
    const cellData: IObjectMatrixPrimitiveType<ICellData> = {};
    let maxRow = rows.length;
    let maxCol = rows.reduce((max, r) => Math.max(max, r?.length ?? 0), 0);
    const visited = new Set<string>();

    for (let r = 0; r < rows.length; r += 1) {
      const row = rows[r] ?? [];
      for (let c = 0; c < row.length; c += 1) {
        const coord = `${r}:${c}`;
        visited.add(coord);
        const cellStyle = tabStyles[coord];
        const cell = buildCellData(row[c] ?? '', cellStyle, registerStyle(cellStyle));
        if (cell) {
          cellData[r] ??= {};
          cellData[r]![c] = cell;
        }
      }
    }

    for (const [coord, cellStyle] of Object.entries(tabStyles)) {
      if (visited.has(coord)) continue;
      const parsed = parseCoordKey(coord);
      const styleId = parsed ? registerStyle(cellStyle) : undefined;
      if (!parsed || !styleId) continue;
      cellData[parsed.r] ??= {};
      cellData[parsed.r]![parsed.c] = { s: styleId };
      maxRow = Math.max(maxRow, parsed.r + 1);
      maxCol = Math.max(maxCol, parsed.c + 1);
    }

    sheets[sheetId] = {
      id: sheetId,
      name: tab.name?.trim() ? tab.name.trim() : `Sheet${idx + 1}`,
      rowCount: Math.max(MIN_UNIVER_ROWS, maxRow + 20),
      columnCount: Math.max(MIN_UNIVER_COLS, maxCol + 6),
      showGridlines: BooleanNumber.TRUE,
      cellData,
    };
  });

  return { id: 'orbit-workbook', name: 'Orbit Workbook', appVersion: '1.6.0', locale: LocaleType.EN_US, styles, sheetOrder, sheets };
}

function extractCellRawValue(cell?: Nullable<ICellData>): string {
  if (!cell) return '';
  if (typeof cell.f === 'string' && cell.f.trim() !== '') {
    const f = cell.f.trim();
    return f.startsWith('=') ? f : `=${f}`;
  }
  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
  const stream = cell.p?.body?.dataStream;
  return typeof stream === 'string' && stream.length > 0 ? stream.replace(/\r\n$/, '') : '';
}

export function fromUniverWorkbookData(snapshot: Partial<IWorkbookData>): OfficeSheetContentDto {
  const sheetMap = snapshot.sheets ?? {};
  const styleMap = snapshot.styles ?? {};
  const order = snapshot.sheetOrder?.length ? snapshot.sheetOrder : Object.keys(sheetMap);
  const outSheets: SheetTabDto[] = [];

  order.forEach((sheetId, idx) => {
    const ws = sheetMap[sheetId];
    if (!ws) return;
    const cellData = (ws.cellData ?? {}) as Record<string, Record<string, Nullable<ICellData>>>;
    const cellStyles: Record<string, SheetCellStyleDto> = {};
    const valueGrid = new Map<string, string>();
    let maxR = -1;
    let maxC = -1;

    for (const [rKey, rowObj] of Object.entries(cellData)) {
      const r = Number.parseInt(rKey, 10);
      if (!Number.isInteger(r) || r < 0 || !rowObj) continue;
      for (const [cKey, cell] of Object.entries(rowObj)) {
        const c = Number.parseInt(cKey, 10);
        if (!Number.isInteger(c) || c < 0 || !cell) continue;
        const coord = `${r}:${c}`;
        const raw = extractCellRawValue(cell);
        if (raw !== '') {
          valueGrid.set(coord, raw);
          maxR = Math.max(maxR, r);
          maxC = Math.max(maxC, c);
        }
        const resolvedStyle = typeof cell.s === 'string' ? styleMap[cell.s] : cell.s;
        const dtoStyle = fromUniverStyle(resolvedStyle);
        if (dtoStyle) cellStyles[coord] = dtoStyle;
      }
    }

    const rows = Array.from({ length: Math.max(1, maxR + 1) }, (_, r) =>
      Array.from({ length: Math.max(1, maxC + 1) }, (_, c) => valueGrid.get(`${r}:${c}`) ?? '')
    );
    outSheets.push({ name: ws.name?.trim() ? ws.name.trim() : `Sheet${idx + 1}`, rows, cellStyles });
  });

  return { sheets: outSheets.length > 0 ? outSheets : [{ name: 'Sheet1', rows: [['']], cellStyles: {} }] };
}
