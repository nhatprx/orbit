import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { SheetCellElement } from './OrbitSheetGrid';
import { columnLabel, isFormulaExpectingRef } from './sheetFormulas';
import { autoCloseFormulaParens } from './sheetFormulaSuggest';
import { dispatchCellKeyDown, dispatchGridKeyDown, type SheetKeyContext } from './sheetKeyHandlers';
import type { SheetRangeBounds } from './sheetStyleHelpers';
import { useSheetFormulaDrag } from './useSheetFormulaDrag';
import { useSheetFormulaSuggest } from './useSheetFormulaSuggest';

export type SheetEditMode = 'typing' | 'caret' | null;
export type SheetEditSource = 'cell' | 'formulaBar' | null;

interface UseSheetSelectionArgs {
  rawRows: string[][];
  displayRowCount: number;
  displayColCount: number;
  readOnly: boolean;
  onSetCellValue: (r: number, c: number, val: string, recordHistory?: boolean) => void;
  onClearRange: (bounds: SheetRangeBounds) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function useSheetSelection({
  rawRows, displayRowCount, displayColCount, readOnly,
  onSetCellValue, onClearRange, onUndo, onRedo,
}: UseSheetSelectionArgs) {
  const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });
  const [rangeEnd, setRangeEnd] = useState({ r: 0, c: 0 });
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editMode, setEditMode] = useState<SheetEditMode>(null);
  const [editSource, setEditSource] = useState<SheetEditSource>(null);
  const [focusTick, setFocusTick] = useState(0);

  const cellRefs = useRef<Record<string, SheetCellElement | null>>({});
  const formulaBarRef = useRef<HTMLInputElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const editSourceRef = useRef<SheetEditSource>(null);
  const originalValueRef = useRef<{ r: number; c: number; value: string } | null>(null);
  const pendingFocusRef = useRef<{ target: 'cell' | 'formulaBar'; r: number; c: number; caretPos?: number } | null>(null);

  const bounds: SheetRangeBounds = {
    minR: Math.min(activeCell.r, rangeEnd.r), maxR: Math.max(activeCell.r, rangeEnd.r),
    minC: Math.min(activeCell.c, rangeEnd.c), maxC: Math.max(activeCell.c, rangeEnd.c),
  };
  const activeRaw = rawRows[activeCell.r]?.[activeCell.c] ?? '';
  const isEditingActive = editingCell?.r === activeCell.r && editingCell?.c === activeCell.c;

  const applyElementFocus = (target: 'cell' | 'formulaBar', r: number, c: number, caretPos?: number) => {
    const el = target === 'formulaBar' ? formulaBarRef.current : cellRefs.current[`${r}:${c}`];
    if (!el) return;
    el.focus();
    if (target === 'cell') el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (caretPos !== undefined && typeof el.setSelectionRange === 'function') {
      try { el.setSelectionRange(caretPos, caretPos); } catch { /* ignore unsupported inputs */ }
    }
  };

  const focusTarget = (target: 'cell' | 'formulaBar', r: number, c: number, caretPos?: number) => {
    applyElementFocus(target, r, c, caretPos);
    pendingFocusRef.current = { target, r, c, caretPos };
    setFocusTick((t) => t + 1);
  };

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    applyElementFocus(pending.target, pending.r, pending.c, pending.caretPos);
  }, [focusTick]);

  const enterEdit = (r: number, c: number, mode: 'typing' | 'caret', source: 'cell' | 'formulaBar') => {
    if (!editingCell || editingCell.r !== r || editingCell.c !== c) {
      originalValueRef.current = { r, c, value: rawRows[r]?.[c] ?? '' };
    }
    setEditingCell({ r, c }); setEditMode(mode); setEditSource(source); editSourceRef.current = source;
  };

  const clearEdit = () => {
    setEditingCell(null); setEditMode(null); setEditSource(null);
    editSourceRef.current = null; originalValueRef.current = null;
  };

  const selectSingleCell = (r: number, c: number) => {
    const cr = Math.max(0, Math.min(displayRowCount - 1, r));
    const cc = Math.max(0, Math.min(displayColCount - 1, c));
    setActiveCell({ r: cr, c: cc }); setRangeEnd({ r: cr, c: cc });
    clearEdit();
    focusTarget('cell', cr, cc);
  };

  const commitAndMove = (r: number, c: number, nextR: number, nextC: number) => {
    const cur = rawRows[r]?.[c] ?? '';
    const closed = autoCloseFormulaParens(cur);
    if (closed !== cur) onSetCellValue(r, c, closed, false);
    selectSingleCell(nextR, nextC);
  };

  const cancelEdit = (r: number, c: number) => {
    const orig = originalValueRef.current;
    if (orig && orig.r === r && orig.c === c && (rawRows[r]?.[c] ?? '') !== orig.value) onSetCellValue(r, c, orig.value, false);
    clearEdit();
    focusTarget('cell', r, c);
  };

  const extendRange = (dr: number, dc: number) => {
    setRangeEnd((p) => ({ r: Math.max(0, Math.min(displayRowCount - 1, p.r + dr)), c: Math.max(0, Math.min(displayColCount - 1, p.c + dc)) }));
    clearEdit();
  };

  const formulaSuggest = useSheetFormulaSuggest({
    activeRaw, isEditing: editingCell !== null, readOnly,
    onApplyValue: (nextValue, nextCursor) => {
      onSetCellValue(activeCell.r, activeCell.c, nextValue, true);
      focusTarget(editSourceRef.current === 'formulaBar' ? 'formulaBar' : 'cell', activeCell.r, activeCell.c, nextCursor);
    },
  });

  const formulaDrag = useSheetFormulaDrag({
    readOnly, isEditingActive, activeCell, activeRaw, onSetCellValue,
    onBeginFormulaEdit: (r, c) => enterEdit(r, c, editMode ?? 'typing', editSourceRef.current ?? 'cell'),
    onFocusFormulaEditor: (r, c) => {
      const target = editSourceRef.current === 'formulaBar' ? 'formulaBar' : 'cell';
      const el = target === 'formulaBar' ? formulaBarRef.current : cellRefs.current[`${r}:${c}`];
      focusTarget(target, r, c, el?.value.length);
    },
    onEndNormalDrag: () => { isDraggingRef.current = false; },
  });

  const keyCtx: SheetKeyContext = {
    activeCell, editingCell, editMode, bounds, rawRows, readOnly,
    onUndo, onRedo, onClearRange, onSetCellValue, onSuggestKeyDown: formulaSuggest.handleSuggestKeyDown,
    selectSingleCell, extendRange, enterEdit, commitAndMove, cancelEdit, focusTarget,
  };

  return {
    activeCell, editingCell, editSource, bounds, cellRefs, formulaBarRef, formulaSuggest,
    selectSingleCell, clearEdit, finishPointerDrag: formulaDrag.finishPointerDrag,
    handleCellMouseDown: (e: MouseEvent<SheetCellElement>, rIdx: number, cIdx: number, isEditing: boolean) => {
      if (formulaDrag.startFormulaDrag(rIdx, cIdx)) { e.preventDefault(); return; }
      if (e.shiftKey) { e.preventDefault(); setRangeEnd({ r: rIdx, c: cIdx }); clearEdit(); return; }
      isDraggingRef.current = true; dragMovedRef.current = false;
      setActiveCell({ r: rIdx, c: cIdx }); setRangeEnd({ r: rIdx, c: cIdx });
      if (isEditing) enterEdit(rIdx, cIdx, 'caret', 'cell'); else clearEdit();
    },
    handleCellClick: (e: MouseEvent<SheetCellElement>, rIdx: number, cIdx: number, isEditing: boolean) => {
      isDraggingRef.current = false; formulaDrag.cancelFormulaDrag();
      if (formulaDrag.justPickedRef.current) { formulaDrag.justPickedRef.current = false; return; }
      if (!readOnly && isEditingActive && !(rIdx === activeCell.r && cIdx === activeCell.c) && isFormulaExpectingRef(activeRaw)) {
        onSetCellValue(activeCell.r, activeCell.c, `${activeRaw}${columnLabel(cIdx)}${rIdx + 1}`, true);
        enterEdit(activeCell.r, activeCell.c, editMode ?? 'typing', editSourceRef.current ?? 'cell');
        focusTarget(editSourceRef.current === 'formulaBar' ? 'formulaBar' : 'cell', activeCell.r, activeCell.c);
        return;
      }
      if (dragMovedRef.current) { dragMovedRef.current = false; return; }
      if (e.shiftKey) { setRangeEnd({ r: rIdx, c: cIdx }); clearEdit(); return; }
      setActiveCell({ r: rIdx, c: cIdx }); setRangeEnd({ r: rIdx, c: cIdx });
      if (!isEditing) clearEdit();
    },
    handleDragEnter: (rIdx: number, cIdx: number) => {
      if (formulaDrag.updateFormulaDrag(rIdx, cIdx)) return;
      if (isDraggingRef.current) { dragMovedRef.current = true; setRangeEnd({ r: rIdx, c: cIdx }); clearEdit(); }
    },
    handleCellKeyDown: (e: KeyboardEvent<SheetCellElement>, rIdx: number, cIdx: number) => { formulaDrag.justPickedRef.current = false; dispatchCellKeyDown(e, rIdx, cIdx, keyCtx); },
    handleGridKeyDown: (e: KeyboardEvent<HTMLDivElement>) => dispatchGridKeyDown(e, keyCtx),
    handleCellDoubleClick: (r: number, c: number) => { if (!readOnly) { setActiveCell({ r, c }); setRangeEnd({ r, c }); enterEdit(r, c, 'caret', 'cell'); } },
    handleCellBlur: (r: number, c: number) => { if (!formulaDrag.formulaDragRef.current && editSourceRef.current === 'cell' && editingCell?.r === r && editingCell?.c === c) clearEdit(); },
    handleCellChange: (r: number, c: number, val: string, selStart?: number | null) => {
      formulaDrag.justPickedRef.current = false; formulaDrag.cancelFormulaDrag();
      setActiveCell({ r, c }); setRangeEnd({ r, c });
      if (editingCell?.r !== r || editingCell?.c !== c) enterEdit(r, c, 'typing', 'cell'); else { setEditSource('cell'); editSourceRef.current = 'cell'; }
      formulaSuggest.updateCursor(selStart, val.length); onSetCellValue(r, c, val, true);
    },
    handleFormulaBarFocus: () => { if (!readOnly) enterEdit(activeCell.r, activeCell.c, 'caret', 'formulaBar'); },
    handleFormulaBarBlur: () => { if (!formulaDrag.formulaDragRef.current && editSourceRef.current === 'formulaBar') clearEdit(); },
    handleFormulaBarChange: (val: string, selStart?: number | null) => {
      if (readOnly) return;
      formulaDrag.cancelFormulaDrag();
      if (!isEditingActive || editSourceRef.current !== 'formulaBar') enterEdit(activeCell.r, activeCell.c, 'caret', 'formulaBar');
      formulaSuggest.updateCursor(selStart, val.length); onSetCellValue(activeCell.r, activeCell.c, val, true);
    },
    handleFormulaBarKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (formulaSuggest.handleSuggestKeyDown(e)) return;
      if (e.key === 'Enter') { e.preventDefault(); commitAndMove(activeCell.r, activeCell.c, activeCell.r + (e.shiftKey ? -1 : 1), activeCell.c); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(activeCell.r, activeCell.c); }
    },
  };
}
