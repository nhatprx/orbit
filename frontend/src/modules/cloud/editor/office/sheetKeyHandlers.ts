import type { KeyboardEvent } from 'react';
import type { SheetCellElement } from './OrbitSheetGrid';
import type { SheetRangeBounds } from './sheetStyleHelpers';

export const ARROW_DELTAS: Record<string, readonly [number, number]> = {
  ArrowDown: [1, 0],
  ArrowUp: [-1, 0],
  ArrowRight: [0, 1],
  ArrowLeft: [0, -1],
};

export interface SheetKeyContext {
  activeCell: { r: number; c: number };
  editingCell: { r: number; c: number } | null;
  editMode: 'typing' | 'caret' | null;
  bounds: SheetRangeBounds;
  rawRows: string[][];
  readOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearRange: (bounds: SheetRangeBounds) => void;
  onSetCellValue: (r: number, c: number, val: string, recordHistory?: boolean) => void;
  onSuggestKeyDown: (e: KeyboardEvent) => boolean;
  selectSingleCell: (r: number, c: number) => void;
  extendRange: (dr: number, dc: number) => void;
  enterEdit: (r: number, c: number, mode: 'typing' | 'caret', source: 'cell' | 'formulaBar') => void;
  commitAndMove: (r: number, c: number, nextR: number, nextC: number) => void;
  cancelEdit: (r: number, c: number) => void;
  focusTarget: (target: 'cell' | 'formulaBar', r: number, c: number, caretPos?: number) => void;
}

export function handleNonEditShortcut(e: KeyboardEvent, rIdx: number, cIdx: number, ctx: SheetKeyContext): boolean {
  if (ctx.readOnly) return false;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) ctx.onRedo();
    else ctx.onUndo();
    return true;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    ctx.onRedo();
    return true;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    ctx.onClearRange(ctx.bounds);
    return true;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent?.isComposing) {
    e.preventDefault();
    ctx.enterEdit(rIdx, cIdx, 'typing', 'cell');
    ctx.onSetCellValue(rIdx, cIdx, e.key, true);
    ctx.focusTarget('cell', rIdx, cIdx, 1);
    return true;
  }
  return false;
}

export function dispatchCellKeyDown(
  e: KeyboardEvent<SheetCellElement>,
  rIdx: number,
  cIdx: number,
  ctx: SheetKeyContext
): void {
  const isEditing = ctx.editingCell?.r === rIdx && ctx.editingCell?.c === cIdx;
  if (isEditing && ctx.onSuggestKeyDown(e)) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    if (isEditing) ctx.commitAndMove(rIdx, cIdx, rIdx + (e.shiftKey ? -1 : 1), cIdx);
    else if (!ctx.readOnly) ctx.enterEdit(rIdx, cIdx, 'caret', 'cell');
    return;
  }
  if (e.key === 'F2' && !ctx.readOnly) {
    e.preventDefault();
    ctx.enterEdit(rIdx, cIdx, 'caret', 'cell');
    ctx.focusTarget('cell', rIdx, cIdx, (ctx.rawRows[rIdx]?.[cIdx] ?? '').length);
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    if (isEditing) ctx.commitAndMove(rIdx, cIdx, rIdx, cIdx + (e.shiftKey ? -1 : 1));
    else ctx.selectSingleCell(rIdx, cIdx + (e.shiftKey ? -1 : 1));
    return;
  }
  if (e.key === 'Escape' && isEditing) {
    e.preventDefault();
    ctx.cancelEdit(rIdx, cIdx);
    return;
  }

  const delta = ARROW_DELTAS[e.key];
  if (delta) {
    const [dr, dc] = delta;
    if (!isEditing) {
      e.preventDefault();
      if (e.shiftKey) ctx.extendRange(dr, dc);
      else ctx.selectSingleCell(ctx.activeCell.r + dr, ctx.activeCell.c + dc);
      return;
    }
    if (ctx.editMode === 'typing') {
      e.preventDefault();
      ctx.commitAndMove(rIdx, cIdx, rIdx + dr, cIdx + dc);
      return;
    }
    if (ctx.editMode === 'caret' && dr !== 0 && e.currentTarget.tagName !== 'TEXTAREA') {
      e.preventDefault();
      ctx.commitAndMove(rIdx, cIdx, rIdx + dr, cIdx);
    }
    return;
  }

  if (!isEditing) handleNonEditShortcut(e, rIdx, cIdx, ctx);
}

export function dispatchGridKeyDown(e: KeyboardEvent<HTMLDivElement>, ctx: SheetKeyContext): void {
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const { r, c } = ctx.activeCell;
  const delta = ARROW_DELTAS[e.key];
  if (delta) {
    e.preventDefault();
    if (e.shiftKey) ctx.extendRange(delta[0], delta[1]);
    else ctx.selectSingleCell(r + delta[0], c + delta[1]);
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    ctx.selectSingleCell(r, c + (e.shiftKey ? -1 : 1));
    return;
  }
  if ((e.key === 'Enter' || e.key === 'F2') && !ctx.readOnly) {
    e.preventDefault();
    ctx.enterEdit(r, c, 'caret', 'cell');
    ctx.focusTarget('cell', r, c, (ctx.rawRows[r]?.[c] ?? '').length);
    return;
  }
  handleNonEditShortcut(e, r, c, ctx);
}
