import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { SheetCellElement } from './OrbitSheetGrid';
import { columnLabel, isFormulaExpectingRef } from './sheetFormulas';
import type { SheetRangeBounds } from './sheetStyleHelpers';

interface UseSheetSelectionArgs {
  rawRows: string[][];
  displayRowCount: number;
  displayColCount: number;
  readOnly: boolean;
  onSetCellValue: (r: number, c: number, val: string) => void;
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
  const cellRefs = useRef<Record<string, SheetCellElement | null>>({});
  const justPickedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);

  const bounds: SheetRangeBounds = {
    minR: Math.min(activeCell.r, rangeEnd.r),
    maxR: Math.max(activeCell.r, rangeEnd.r),
    minC: Math.min(activeCell.c, rangeEnd.c),
    maxC: Math.max(activeCell.c, rangeEnd.c),
  };
  const activeRaw = rawRows[activeCell.r]?.[activeCell.c] ?? '';

  const selectSingleCell = (r: number, c: number) => {
    const cr = Math.max(0, Math.min(displayRowCount - 1, r));
    const cc = Math.max(0, Math.min(displayColCount - 1, c));
    setActiveCell({ r: cr, c: cc });
    setRangeEnd({ r: cr, c: cc });
    setEditingCell(null);
    cellRefs.current[`${cr}:${cc}`]?.focus();
  };

  const extendRange = (dr: number, dc: number) => {
    setRangeEnd((p) => ({
      r: Math.max(0, Math.min(displayRowCount - 1, p.r + dr)),
      c: Math.max(0, Math.min(displayColCount - 1, p.c + dc)),
    }));
    setEditingCell(null);
  };

  const tryPickFormulaRef = (rIdx: number, cIdx: number): boolean => {
    if (readOnly || (rIdx === activeCell.r && cIdx === activeCell.c) || !isFormulaExpectingRef(activeRaw)) return false;
    onSetCellValue(activeCell.r, activeCell.c, `${activeRaw}${columnLabel(cIdx)}${rIdx + 1}`);
    setEditingCell(activeCell);
    cellRefs.current[`${activeCell.r}:${activeCell.c}`]?.focus();
    return true;
  };

  const handleCellMouseDown = (e: MouseEvent<SheetCellElement>, rIdx: number, cIdx: number, isEditing: boolean) => {
    if (tryPickFormulaRef(rIdx, cIdx)) { e.preventDefault(); justPickedRef.current = true; return; }
    if (e.shiftKey) { e.preventDefault(); setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell(null); return; }
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    setActiveCell({ r: rIdx, c: cIdx });
    setRangeEnd({ r: rIdx, c: cIdx });
    if (!isEditing) setEditingCell(null);
  };

  const handleCellClick = (e: MouseEvent<SheetCellElement>, rIdx: number, cIdx: number, isEditing: boolean) => {
    isDraggingRef.current = false;
    if (justPickedRef.current) { justPickedRef.current = false; return; }
    if (tryPickFormulaRef(rIdx, cIdx)) return;
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    if (e.shiftKey) { setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell(null); return; }
    setActiveCell({ r: rIdx, c: cIdx });
    setRangeEnd({ r: rIdx, c: cIdx });
    if (!isEditing) setEditingCell(null);
  };

  const handleDragEnter = (rIdx: number, cIdx: number) => {
    if (isDraggingRef.current) {
      dragMovedRef.current = true;
      setRangeEnd({ r: rIdx, c: cIdx });
      setEditingCell(null);
    }
  };

  const handleCellKeyDown = (e: KeyboardEvent<SheetCellElement>, rIdx: number, cIdx: number) => {
    justPickedRef.current = false;
    const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isEditing) selectSingleCell(rIdx + (e.shiftKey ? -1 : 1), cIdx);
      else if (!readOnly) setEditingCell({ r: rIdx, c: cIdx });
    } else if (e.key === 'F2' && !readOnly) {
      e.preventDefault();
      setEditingCell({ r: rIdx, c: cIdx });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      selectSingleCell(rIdx, cIdx + (e.shiftKey ? -1 : 1));
    } else if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      setEditingCell(null);
    } else if (!isEditing) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.shiftKey) extendRange(1, 0); else selectSingleCell(activeCell.r + 1, activeCell.c);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey) extendRange(-1, 0); else selectSingleCell(activeCell.r - 1, activeCell.c);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) extendRange(0, 1); else selectSingleCell(activeCell.r, activeCell.c + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) extendRange(0, -1); else selectSingleCell(activeCell.r, activeCell.c - 1);
      } else if (!readOnly && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onClearRange(bounds);
      } else if (!readOnly && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setEditingCell({ r: rIdx, c: cIdx });
      }
    }
  };

  return {
    activeCell, setActiveCell, setRangeEnd, editingCell, setEditingCell, bounds, cellRefs,
    justPickedRef, isDraggingRef, selectSingleCell,
    handleCellMouseDown, handleCellClick, handleDragEnter, handleCellKeyDown,
  };
}
