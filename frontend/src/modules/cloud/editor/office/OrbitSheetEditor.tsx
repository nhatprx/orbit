import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { OrbitSheetGrid } from './OrbitSheetGrid';
import { OrbitSheetFormulaBar, OrbitSheetTabs } from './OrbitSheetTabs';
import {
  OrbitSheetToolbar, computeSheetSummary, expandAndSetRange, exportSheetCsv, patchCellStyles,
  type QuickFunctionName, type SheetAlign, type SheetCellStyleDto, type SheetNumberFormat, type SheetRangeBounds,
} from './OrbitSheetToolbar';
import type { OfficeSheetContentDto, SheetTabDto } from './officeTypes';
import { columnLabel, extractFormulaCellRefs, isFormulaExpectingRef } from './sheetFormulas';

export const MIN_VISIBLE_ROWS = 50;
export const MIN_VISIBLE_COLS = 26;
export const colIndexToLabel = (c: number): string => columnLabel(c);

interface OrbitSheetEditorProps {
  value: OfficeSheetContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeSheetContentDto) => void;
}

export function OrbitSheetEditor({ value, readOnly = false, onChange }: OrbitSheetEditorProps) {
  const sheets: SheetTabDto[] = value.sheets.length > 0 ? value.sheets : [{ name: 'Sheet1', rows: [['']], cellStyles: {} }];
  const [sheetIdx, setSheetIdx] = useState(0);
  const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });
  const [rangeEnd, setRangeEnd] = useState({ r: 0, c: 0 });
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [extraRows, setExtraRows] = useState(0);
  const [extraCols, setExtraCols] = useState(0);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const justPickedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const safeSheetIdx = Math.min(sheetIdx, sheets.length - 1);
  const currentSheet = sheets[safeSheetIdx] ?? { name: 'Sheet1', rows: [['']], cellStyles: {} };
  const rawRows = currentSheet.rows;
  const cellStyles = currentSheet.cellStyles ?? {};
  const rawColCount = rawRows.reduce((max, r) => Math.max(max, r.length), 0);
  const displayRowCount = Math.max(MIN_VISIBLE_ROWS + extraRows, rawRows.length + extraRows);
  const displayColCount = Math.max(MIN_VISIBLE_COLS + extraCols, rawColCount + extraCols);
  const bounds: SheetRangeBounds = {
    minR: Math.min(activeCell.r, rangeEnd.r), maxR: Math.max(activeCell.r, rangeEnd.r),
    minC: Math.min(activeCell.c, rangeEnd.c), maxC: Math.max(activeCell.c, rangeEnd.c),
  };
  const isMultiRange = bounds.minR !== bounds.maxR || bounds.minC !== bounds.maxC;
  const activeFormat = cellStyles[`${activeCell.r}:${activeCell.c}`] ?? {};
  const activeRaw = rawRows[activeCell.r]?.[activeCell.c] ?? '';
  const activeCoord = `${colIndexToLabel(activeCell.c)}${activeCell.r + 1}`;
  const rangeCoord = isMultiRange ? `${colIndexToLabel(bounds.minC)}${bounds.minR + 1}:${colIndexToLabel(bounds.maxC)}${bounds.maxR + 1}` : activeCoord;
  const formulaRefs = extractFormulaCellRefs(activeRaw);
  const summary = computeSheetSummary(rawRows, bounds);

  const updateSheet = (updater: (sheet: SheetTabDto) => SheetTabDto) =>
    onChange({ sheets: sheets.map((s, idx) => (idx === safeSheetIdx ? updater(s) : s)) });
  const updateCurrentRows = (nextRows: string[][]) => updateSheet((s) => ({ ...s, rows: nextRows }));
  const setCellValue = (r: number, c: number, cellVal: string) =>
    updateCurrentRows(expandAndSetRange(rawRows, { minR: r, maxR: r, minC: c, maxC: c }, cellVal));
  const patchRangeFormat = (patch: Partial<SheetCellStyleDto>) => {
    if (readOnly) return;
    updateSheet((s) => ({ ...s, cellStyles: patchCellStyles(s.cellStyles, bounds, patch) }));
  };
  const selectSingleCell = (r: number, c: number) => {
    const cr = Math.max(0, Math.min(displayRowCount - 1, r)), cc = Math.max(0, Math.min(displayColCount - 1, c));
    setActiveCell({ r: cr, c: cc }); setRangeEnd({ r: cr, c: cc }); setEditingCell(null); cellRefs.current[`${cr}:${cc}`]?.focus();
  };
  const extendRange = (dr: number, dc: number) => {
    setRangeEnd((p) => ({ r: Math.max(0, Math.min(displayRowCount - 1, p.r + dr)), c: Math.max(0, Math.min(displayColCount - 1, p.c + dc)) }));
    setEditingCell(null);
  };
  const insertQuickFunction = (fn: QuickFunctionName) => {
    if (readOnly) return;
    if (isMultiRange) {
      const targetR = bounds.maxR > bounds.minR ? bounds.maxR + 1 : bounds.minR;
      const targetC = bounds.maxR > bounds.minR ? bounds.minC : bounds.maxC + 1;
      setCellValue(targetR, targetC, `=${fn}(${rangeCoord})`);
      selectSingleCell(targetR, targetC);
      return;
    }
    const { r, c } = activeCell;
    const range = r > 0 ? `${colIndexToLabel(c)}1:${colIndexToLabel(c)}${r}` : c > 0 ? `A${r + 1}:${colIndexToLabel(c - 1)}${r + 1}` : 'A2:A5';
    setCellValue(r, c, `=${fn}(${range})`);
  };
  const tryPickFormulaRef = (rIdx: number, cIdx: number): boolean => {
    if (readOnly || (rIdx === activeCell.r && cIdx === activeCell.c) || !isFormulaExpectingRef(activeRaw)) return false;
    setCellValue(activeCell.r, activeCell.c, `${activeRaw}${colIndexToLabel(cIdx)}${rIdx + 1}`);
    setEditingCell(activeCell);
    cellRefs.current[`${activeCell.r}:${activeCell.c}`]?.focus();
    return true;
  };
  const handleCellMouseDown = (e: MouseEvent<HTMLInputElement>, rIdx: number, cIdx: number, isEditing: boolean) => {
    if (tryPickFormulaRef(rIdx, cIdx)) { e.preventDefault(); justPickedRef.current = true; return; }
    if (e.shiftKey) { e.preventDefault(); setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell(null); return; }
    isDraggingRef.current = true; dragMovedRef.current = false; setActiveCell({ r: rIdx, c: cIdx }); setRangeEnd({ r: rIdx, c: cIdx }); if (!isEditing) setEditingCell(null);
  };
  const handleCellClick = (e: MouseEvent<HTMLInputElement>, rIdx: number, cIdx: number, isEditing: boolean) => {
    isDraggingRef.current = false;
    if (justPickedRef.current) { justPickedRef.current = false; return; }
    if (tryPickFormulaRef(rIdx, cIdx)) return;
    if (dragMovedRef.current) { dragMovedRef.current = false; return; }
    if (e.shiftKey) { setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell(null); return; }
    setActiveCell({ r: rIdx, c: cIdx }); setRangeEnd({ r: rIdx, c: cIdx }); if (!isEditing) setEditingCell(null);
  };
  const handleDragEnter = (rIdx: number, cIdx: number) => {
    if (isDraggingRef.current) { dragMovedRef.current = true; setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell(null); }
  };
  const handleCellKeyDown = (e: KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
    justPickedRef.current = false;
    const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
    if (e.key === 'Enter') { e.preventDefault(); if (isEditing) selectSingleCell(rIdx + (e.shiftKey ? -1 : 1), cIdx); else if (!readOnly) setEditingCell({ r: rIdx, c: cIdx }); }
    else if (e.key === 'F2' && !readOnly) { e.preventDefault(); setEditingCell({ r: rIdx, c: cIdx }); }
    else if (e.key === 'Tab') { e.preventDefault(); selectSingleCell(rIdx, cIdx + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'Escape') { e.preventDefault(); setEditingCell(null); }
    else if (!isEditing) {
      if (e.key === 'ArrowDown') { e.preventDefault(); e.shiftKey ? extendRange(1, 0) : selectSingleCell(activeCell.r + 1, activeCell.c); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); e.shiftKey ? extendRange(-1, 0) : selectSingleCell(activeCell.r - 1, activeCell.c); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? extendRange(0, 1) : selectSingleCell(activeCell.r, activeCell.c + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? extendRange(0, -1) : selectSingleCell(activeCell.r, activeCell.c - 1); }
      else if (!readOnly && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); updateCurrentRows(expandAndSetRange(rawRows, bounds, '')); }
      else if (!readOnly && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) setEditingCell({ r: rIdx, c: cIdx });
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]" onMouseUp={() => { isDraggingRef.current = false; }}>
      <OrbitSheetToolbar
        readOnly={readOnly} activeFormat={activeFormat} onInsertFunction={insertQuickFunction}
        onToggleStyle={(k) => patchRangeFormat({ [k]: !activeFormat[k] })}
        onSetAlign={(align: SheetAlign) => patchRangeFormat({ align })}
        onFormatNumber={(mode: SheetNumberFormat) => patchRangeFormat({ numFmt: activeFormat.numFmt === mode ? undefined : mode })}
        onAddRow={() => { setExtraRows((n) => n + 1); updateCurrentRows([...rawRows, Array.from({ length: Math.max(1, rawColCount) }, () => '')]); }}
        onRemoveRow={() => { setExtraRows((n) => Math.max(0, n - 1)); if (rawRows.length > 1) updateCurrentRows(rawRows.slice(0, -1)); }}
        onAddColumn={() => { setExtraCols((n) => n + 1); updateCurrentRows(rawRows.map((r) => [...Array.from({ length: Math.max(1, rawColCount) }, (_, i) => r[i] ?? ''), ''])); }}
        onRemoveColumn={() => { setExtraCols((n) => Math.max(0, n - 1)); if (rawColCount > 1) updateCurrentRows(rawRows.map((r) => r.slice(0, rawColCount - 1))); }}
        onExportCsv={() => exportSheetCsv(currentSheet.name, rawRows)}
      />
      <OrbitSheetFormulaBar
        rangeCoord={rangeCoord} activeRaw={activeRaw} readOnly={readOnly}
        onFocus={() => { if (!readOnly) setEditingCell(activeCell); }} onBlur={() => setEditingCell(null)}
        onChange={(val) => { setEditingCell(activeCell); setCellValue(activeCell.r, activeCell.c, val); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); selectSingleCell(activeCell.r + (e.shiftKey ? -1 : 1), activeCell.c); } else if (e.key === 'Escape') { e.preventDefault(); setEditingCell(null); } }}
      />
      <OrbitSheetGrid
        rawRows={rawRows} cellStyles={cellStyles} displayRowCount={displayRowCount} displayColCount={displayColCount}
        activeCell={activeCell} editingCell={editingCell} bounds={bounds} formulaRefs={formulaRefs}
        readOnly={readOnly} cellRefs={cellRefs}
        onMouseDown={handleCellMouseDown} onDragEnter={handleDragEnter} onClick={handleCellClick}
        onDoubleClick={(r, c) => { if (!readOnly) setEditingCell({ r, c }); }}
        onBlur={(r, c) => setEditingCell((p) => (p?.r === r && p?.c === c ? null : p))}
        onKeyDown={handleCellKeyDown}
        onChange={(r, c, val) => { justPickedRef.current = false; setActiveCell({ r, c }); setRangeEnd({ r, c }); setEditingCell({ r, c }); setCellValue(r, c, val); }}
      />
      <OrbitSheetTabs
        sheets={sheets} activeIdx={safeSheetIdx} readOnly={readOnly} onSelect={setSheetIdx}
        selectionLabel={isMultiRange ? `Range ${rangeCoord}` : `Cell ${activeCoord}`} summary={summary}
        onAddSheet={() => { const next = [...sheets, { name: `Sheet${sheets.length + 1}`, rows: [['']], cellStyles: {} }]; onChange({ sheets: next }); setSheetIdx(next.length - 1); }}
        onRenameSheet={(idx, name) => onChange({ sheets: sheets.map((s, i) => (i === idx ? { ...s, name } : s)) })}
        onDeleteSheet={(idx) => { if (sheets.length > 1) { onChange({ sheets: sheets.filter((_, i) => i !== idx) }); setSheetIdx(Math.max(0, idx - 1)); } }}
      />
    </div>
  );
}
