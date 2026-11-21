import { useCallback, useEffect, useState } from 'react';
import { OrbitOfficeHeader, type OrbitOfficeHeaderProps } from './OrbitOfficeHeader';
import { OrbitSheetGrid } from './OrbitSheetGrid';
import { OrbitSheetMenuBar } from './OrbitSheetMenuBar';
import { OrbitSheetFormulaBar, OrbitSheetTabs } from './OrbitSheetTabs';
import {
  OrbitSheetToolbar, clearCellStyles, computeSheetSummary, expandAndSetRange, exportSheetCsv, patchCellStyles,
  type QuickFunctionName, type SheetAlign, type SheetBorderStyle, type SheetCellStyleDto,
  type SheetNumberFormat, type SheetVerticalAlign,
} from './OrbitSheetToolbar';
import type { OfficeSheetContentDto, SheetTabDto } from './officeTypes';
import { columnLabel, extractFormulaCellRefs } from './sheetFormulas';
import { EMPTY_SHEET_HISTORY, pushSheetHistory, redoSheetHistory, undoSheetHistory, type SheetHistoryState } from './sheetHistory';
import { sortSheetByColumn, type SheetSortDirection } from './sheetSort';
import { clampDecimals, clampFontSize, defaultDecimalsFor } from './sheetStyleHelpers';
import { useSheetSelection } from './useSheetSelection';

export const MIN_VISIBLE_ROWS = 50;
export const MIN_VISIBLE_COLS = 26;
export const colIndexToLabel = (c: number): string => columnLabel(c);

interface OrbitSheetEditorProps {
  value: OfficeSheetContentDto;
  readOnly?: boolean;
  headerProps?: Omit<OrbitOfficeHeaderProps, 'menuBar'>;
  onChange: (next: OfficeSheetContentDto) => void;
}

export function OrbitSheetEditor({ value, readOnly = false, headerProps, onChange }: OrbitSheetEditorProps) {
  const sheets: SheetTabDto[] = value.sheets.length > 0 ? value.sheets : [{ name: 'Sheet1', rows: [['']], cellStyles: {} }];
  const [sheetIdx, setSheetIdx] = useState(0);
  const [extraRows, setExtraRows] = useState(0);
  const [extraCols, setExtraCols] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showGridlines, setShowGridlines] = useState(true);
  const [freezeHeader, setFreezeHeader] = useState(false);
  const [history, setHistory] = useState<SheetHistoryState>(EMPTY_SHEET_HISTORY);

  const safeSheetIdx = Math.min(sheetIdx, sheets.length - 1);
  const currentSheet = sheets[safeSheetIdx] ?? { name: 'Sheet1', rows: [['']], cellStyles: {} };
  const rawRows = currentSheet.rows;
  const cellStyles = currentSheet.cellStyles ?? {};
  const rawColCount = rawRows.reduce((max, r) => Math.max(max, r.length), 0);
  const displayRowCount = Math.max(MIN_VISIBLE_ROWS + extraRows, rawRows.length + extraRows);
  const displayColCount = Math.max(MIN_VISIBLE_COLS + extraCols, rawColCount + extraCols);

  const commitChange = useCallback((next: OfficeSheetContentDto) => {
    setHistory((prev) => pushSheetHistory(prev, { sheets }));
    onChange(next);
  }, [sheets, onChange]);

  const handleUndo = useCallback(() => {
    if (readOnly) return;
    const res = undoSheetHistory(history, { sheets });
    if (res) { setHistory(res.history); onChange(res.next); }
  }, [readOnly, history, sheets, onChange]);

  const handleRedo = useCallback(() => {
    if (readOnly) return;
    const res = redoSheetHistory(history, { sheets });
    if (res) { setHistory(res.history); onChange(res.next); }
  }, [readOnly, history, sheets, onChange]);

  const updateSheet = (updater: (sheet: SheetTabDto) => SheetTabDto) =>
    commitChange({ sheets: sheets.map((s, idx) => (idx === safeSheetIdx ? updater(s) : s)) });
  const updateCurrentRows = (nextRows: string[][]) => updateSheet((s) => ({ ...s, rows: nextRows }));
  const setCellValue = (r: number, c: number, cellVal: string) =>
    updateCurrentRows(expandAndSetRange(rawRows, { minR: r, maxR: r, minC: c, maxC: c }, cellVal));

  const selection = useSheetSelection({
    rawRows, displayRowCount, displayColCount, readOnly,
    onSetCellValue: setCellValue, onClearRange: (b) => updateCurrentRows(expandAndSetRange(rawRows, b, '')),
    onUndo: handleUndo, onRedo: handleRedo,
  });

  const { activeCell, editingCell, bounds } = selection;
  const activeRaw = rawRows[activeCell.r]?.[activeCell.c] ?? '';
  const isMultiRange = bounds.minR !== bounds.maxR || bounds.minC !== bounds.maxC;
  const activeFormat = cellStyles[`${activeCell.r}:${activeCell.c}`] ?? {};
  const activeCoord = `${colIndexToLabel(activeCell.c)}${activeCell.r + 1}`;
  const rangeCoord = isMultiRange ? `${colIndexToLabel(bounds.minC)}${bounds.minR + 1}:${colIndexToLabel(bounds.maxC)}${bounds.maxR + 1}` : activeCoord;
  const formulaRefs = extractFormulaCellRefs(activeRaw);
  const summary = computeSheetSummary(rawRows, bounds);

  useEffect(() => {
    if (readOnly) return;
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (editingCell) return;
      const aria = e.target instanceof Element ? (e.target.getAttribute('aria-label') ?? '') : '';
      if (aria === 'Formula bar' || aria === 'Sheet tab name' || aria === 'Font size') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [readOnly, editingCell, handleUndo, handleRedo]);

  const patchRangeFormat = (patch: Partial<SheetCellStyleDto>) => { if (!readOnly) updateSheet((s) => ({ ...s, cellStyles: patchCellStyles(s.cellStyles, bounds, patch) })); };
  const clearRangeFormatting = () => { if (!readOnly) updateSheet((s) => ({ ...s, cellStyles: clearCellStyles(s.cellStyles, bounds) })); };
  const clearRangeValues = () => { if (!readOnly) updateCurrentRows(expandAndSetRange(rawRows, bounds, '')); };
  const adjustDecimals = (delta: -1 | 1) => {
    if (readOnly) return;
    const nextDecimals = clampDecimals((activeFormat.decimals ?? defaultDecimalsFor(activeFormat.numFmt)) + delta);
    patchRangeFormat(activeFormat.numFmt === 'text' ? { numFmt: 'number', decimals: nextDecimals } : { decimals: nextDecimals });
  };
  const insertQuickFunction = (fn: QuickFunctionName) => {
    if (readOnly) return;
    if (isMultiRange) {
      const targetR = bounds.maxR > bounds.minR ? bounds.maxR + 1 : bounds.minR;
      const targetC = bounds.maxR > bounds.minR ? bounds.minC : bounds.maxC + 1;
      setCellValue(targetR, targetC, `=${fn}(${rangeCoord})`);
      selection.selectSingleCell(targetR, targetC);
      return;
    }
    const { r, c } = activeCell;
    const range = r > 0 ? `${colIndexToLabel(c)}1:${colIndexToLabel(c)}${r}` : c > 0 ? `A${r + 1}:${colIndexToLabel(c - 1)}${r + 1}` : 'A2:A5';
    setCellValue(r, c, `=${fn}(${range})`);
  };
  const handleInsertRow = () => { setExtraRows((n) => n + 1); updateCurrentRows([...rawRows, Array.from({ length: Math.max(1, rawColCount) }, () => '')]); };
  const handleDeleteRow = () => { setExtraRows((n) => Math.max(0, n - 1)); if (rawRows.length > 1) updateCurrentRows(rawRows.slice(0, -1)); };
  const handleInsertCol = () => { setExtraCols((n) => n + 1); updateCurrentRows(rawRows.map((r) => [...Array.from({ length: Math.max(1, rawColCount) }, (_, i) => r[i] ?? ''), ''])); };
  const handleDeleteCol = () => { setExtraCols((n) => Math.max(0, n - 1)); if (rawColCount > 1) updateCurrentRows(rawRows.map((r) => r.slice(0, rawColCount - 1))); };
  const handleAddSheet = () => { const next = [...sheets, { name: `Sheet${sheets.length + 1}`, rows: [['']], cellStyles: {} }]; commitChange({ sheets: next }); setSheetIdx(next.length - 1); };
  const handleSortColumn = (dir: SheetSortDirection) => { if (!readOnly) updateSheet((s) => sortSheetByColumn(s, activeCell.c, dir, freezeHeader)); };

  return (
    <div className="flex h-full w-full flex-col bg-[#0D1117]" onMouseUp={() => { selection.isDraggingRef.current = false; }}>
      {headerProps && (
        <OrbitOfficeHeader
          {...headerProps}
          menuBar={(
            <OrbitSheetMenuBar
              readOnly={readOnly} canSave={headerProps.dirty && !headerProps.saving && !headerProps.loading}
              canUndo={history.past.length > 0} canRedo={history.future.length > 0}
              zoom={zoom} showGridlines={showGridlines} freezeHeader={freezeHeader} activeFormat={activeFormat}
              onSave={() => headerProps.onSave(false)} onDownload={headerProps.onDownload}
              onExportCsv={() => exportSheetCsv(currentSheet.name, rawRows)}
              onUndo={handleUndo} onRedo={handleRedo} onClearValues={clearRangeValues} onClearFormatting={clearRangeFormatting}
              onZoomChange={setZoom} onToggleGridlines={() => setShowGridlines((v) => !v)} onToggleFreezeHeader={() => setFreezeHeader((v) => !v)}
              onInsertRow={handleInsertRow} onDeleteRow={handleDeleteRow} onInsertCol={handleInsertCol} onDeleteCol={handleDeleteCol}
              onNewSheet={handleAddSheet} onFormatNumber={(mode: SheetNumberFormat) => patchRangeFormat({ numFmt: mode })}
              onToggleStyle={(k) => patchRangeFormat({ [k]: !activeFormat[k] })}
              onSetAlign={(align: SheetAlign) => patchRangeFormat({ align })} onSortColumn={handleSortColumn}
            />
          )}
        />
      )}
      <OrbitSheetToolbar
        readOnly={readOnly} canUndo={history.past.length > 0} canRedo={history.future.length > 0} zoom={zoom} activeFormat={activeFormat}
        onUndo={handleUndo} onRedo={handleRedo} onZoomChange={setZoom}
        onFormatNumber={(mode: SheetNumberFormat) => patchRangeFormat({ numFmt: mode })}
        onAdjustDecimals={adjustDecimals} onSetFontSize={(size) => patchRangeFormat({ fontSize: clampFontSize(size) })}
        onToggleStyle={(k) => patchRangeFormat({ [k]: !activeFormat[k] })}
        onSetTextColor={(textColor) => patchRangeFormat({ textColor })} onSetBgColor={(bgColor) => patchRangeFormat({ bgColor, highlight: undefined })}
        onSetBorder={(border: SheetBorderStyle) => patchRangeFormat({ border })} onSetAlign={(align: SheetAlign) => patchRangeFormat({ align })}
        onSetVAlign={(valign: SheetVerticalAlign) => patchRangeFormat({ valign })}
        onSortColumn={handleSortColumn} onClearFormatting={clearRangeFormatting} onInsertFunction={insertQuickFunction}
      />
      <OrbitSheetFormulaBar
        rangeCoord={rangeCoord} activeRaw={activeRaw} readOnly={readOnly}
        onFocus={() => { if (!readOnly) selection.setEditingCell(activeCell); }} onBlur={() => selection.setEditingCell(null)}
        onChange={(val) => { selection.setEditingCell(activeCell); setCellValue(activeCell.r, activeCell.c, val); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); selection.selectSingleCell(activeCell.r + (e.shiftKey ? -1 : 1), activeCell.c); } else if (e.key === 'Escape') { e.preventDefault(); selection.setEditingCell(null); } }}
      />
      <OrbitSheetGrid
        rawRows={rawRows} cellStyles={cellStyles} displayRowCount={displayRowCount} displayColCount={displayColCount}
        activeCell={activeCell} editingCell={editingCell} bounds={bounds} formulaRefs={formulaRefs}
        zoom={zoom} showGridlines={showGridlines} freezeHeader={freezeHeader} readOnly={readOnly} cellRefs={selection.cellRefs}
        onMouseDown={selection.handleCellMouseDown} onDragEnter={selection.handleDragEnter} onClick={selection.handleCellClick}
        onDoubleClick={(r, c) => { if (!readOnly) selection.setEditingCell({ r, c }); }}
        onBlur={(r, c) => selection.setEditingCell((p) => (p?.r === r && p?.c === c ? null : p))}
        onKeyDown={selection.handleCellKeyDown}
        onChange={(r, c, val) => { selection.justPickedRef.current = false; selection.setActiveCell({ r, c }); selection.setRangeEnd({ r, c }); selection.setEditingCell({ r, c }); setCellValue(r, c, val); }}
      />
      <OrbitSheetTabs
        sheets={sheets} activeIdx={safeSheetIdx} readOnly={readOnly} onSelect={setSheetIdx}
        selectionLabel={isMultiRange ? `Range ${rangeCoord}` : `Cell ${activeCoord}`} summary={summary}
        onAddSheet={handleAddSheet}
        onRenameSheet={(idx, name) => commitChange({ sheets: sheets.map((s, i) => (i === idx ? { ...s, name } : s)) })}
        onDeleteSheet={(idx) => { if (sheets.length > 1) { commitChange({ sheets: sheets.filter((_, i) => i !== idx) }); setSheetIdx(Math.max(0, idx - 1)); } }}
      />
    </div>
  );
}
