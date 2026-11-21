import type { OfficeSheetContentDto, SheetCellStyleDto, SheetTabDto } from './officeTypes';

export const MAX_SHEET_HISTORY = 50;

export interface SheetHistoryState {
  past: OfficeSheetContentDto[];
  future: OfficeSheetContentDto[];
}

export const EMPTY_SHEET_HISTORY: SheetHistoryState = {
  past: [],
  future: [],
};

function cloneStyles(styles?: Record<string, SheetCellStyleDto>): Record<string, SheetCellStyleDto> {
  if (!styles) return {};
  const copy: Record<string, SheetCellStyleDto> = {};
  for (const [key, val] of Object.entries(styles)) {
    copy[key] = { ...val };
  }
  return copy;
}

function cloneTab(tab: SheetTabDto): SheetTabDto {
  return {
    name: tab.name,
    rows: tab.rows.map((row) => [...row]),
    cellStyles: cloneStyles(tab.cellStyles),
  };
}

export function cloneSheetContent(content: OfficeSheetContentDto): OfficeSheetContentDto {
  return {
    sheets: content.sheets.map(cloneTab),
  };
}

export function pushSheetHistory(
  history: SheetHistoryState,
  previousSnapshot: OfficeSheetContentDto
): SheetHistoryState {
  const nextPast = [...history.past, cloneSheetContent(previousSnapshot)];
  if (nextPast.length > MAX_SHEET_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_SHEET_HISTORY);
  }
  return { past: nextPast, future: [] };
}

export function undoSheetHistory(
  history: SheetHistoryState,
  current: OfficeSheetContentDto
): { next: OfficeSheetContentDto; history: SheetHistoryState } | null {
  if (history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1]!;
  const nextFuture = [cloneSheetContent(current), ...history.future].slice(0, MAX_SHEET_HISTORY);
  return {
    next: cloneSheetContent(previous),
    history: { past: history.past.slice(0, -1), future: nextFuture },
  };
}

export function redoSheetHistory(
  history: SheetHistoryState,
  current: OfficeSheetContentDto
): { next: OfficeSheetContentDto; history: SheetHistoryState } | null {
  if (history.future.length === 0) return null;
  const restored = history.future[0]!;
  const nextPast = [...history.past, cloneSheetContent(current)].slice(-MAX_SHEET_HISTORY);
  return {
    next: cloneSheetContent(restored),
    history: { past: nextPast, future: history.future.slice(1) },
  };
}
