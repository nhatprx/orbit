import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { OrbitSheetFormulaBar, OrbitSheetTabs } from './OrbitSheetTabs';
import {
  OrbitSheetToolbar, computeSheetSummary, expandAndSetRange, exportSheetCsv, formatCellDisplay, getSheetCellClasses,
  type NumberFormatMode, type QuickFunctionName, type SheetAlign, type SheetCellFormat, type SheetRangeBounds,
} from './OrbitSheetToolbar';
import type { OfficeSheetContentDto, SheetTabDto } from './officeTypes';
import { columnLabel, evaluateSheetCell, extractFormulaCellRefs, isFormulaExpectingRef, isNumericValue } from './sheetFormulas';

export const MIN_VISIBLE_ROWS = 50;
export const MIN_VISIBLE_COLS = 26;
export const colIndexToLabel = (c: number): string => columnLabel(c);

interface OrbitSheetEditorProps {
  value: OfficeSheetContentDto;
  readOnly?: boolean;
  onChange: (next: OfficeSheetContentDto) => void;
}

export function OrbitSheetEditor({ value, readOnly = false, onChange }: OrbitSheetEditorProps) {
  const sheets: SheetTabDto[] = value.sheets.length > 0 ? value.sheets : [{ name: 'Sheet1', rows: [['']] }];
  const [sheetIdx, setSheetIdx] = useState(0);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [rangeEnd, setRangeEnd] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [cellFormats, setCellFormats] = useState<Record<string, SheetCellFormat>>({});
  const [extraRows, setExtraRows] = useState(0);
  const [extraCols, setExtraCols] = useState(0);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const justPickedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const safeSheetIdx = Math.min(sheetIdx, sheets.length - 1);
  const currentSheet = sheets[safeSheetIdx] ?? { name: 'Sheet1', rows: [['']] };
  const rawRows = currentSheet.rows;
  const rawColCount = rawRows.reduce((max, r) => Math.max(max, r.length), 0);
  const displayRowCount = Math.max(MIN_VISIBLE_ROWS + extraRows, rawRows.length + extraRows);
  const displayColCount = Math.max(MIN_VISIBLE_COLS + extraCols, rawColCount + extraCols);
  const bounds: SheetRangeBounds = { minR: Math.min(activeCell.r, rangeEnd.r), maxR: Math.max(activeCell.r, rangeEnd.r), minC: Math.min(activeCell.c, rangeEnd.c), maxC: Math.max(activeCell.c, rangeEnd.c) };
  const isMultiRange = bounds.minR !== bounds.maxR || bounds.minC !== bounds.maxC;
  const fmtKey = (r: number, c: number) => `${safeSheetIdx}:${r}:${c}`;
  const activeFormat = cellFormats[fmtKey(activeCell.r, activeCell.c)] ?? {};
  const activeRaw = rawRows[activeCell.r]?.[activeCell.c] ?? '';
  const activeCoord = `${colIndexToLabel(activeCell.c)}${activeCell.r + 1}`;
  const rangeCoord = isMultiRange ? `${colIndexToLabel(bounds.minC)}${bounds.minR + 1}:${colIndexToLabel(bounds.maxC)}${bounds.maxR + 1}` : activeCoord;
  const formulaRefs = extractFormulaCellRefs(activeRaw);
  const summary = computeSheetSummary(rawRows, bounds);
  const updateCurrentRows = (nextRows: string[][]) => onChange({ sheets: sheets.map((s, idx) => (idx === safeSheetIdx ? { ...s, rows: nextRows } : s)) });
  const setCellValue = (r: number, c: number, cellVal: string) => updateCurrentRows(expandAndSetRange(rawRows, { minR: r, maxR: r, minC: c, maxC: c }, cellVal));
  const patchRangeFormat = (patch: Partial<SheetCellFormat>) => setCellFormats((prev) => {
    const next = { ...prev };
    for (let r = bounds.minR; r <= bounds.maxR; r += 1)
      for (let c = bounds.minC; c <= bounds.maxC; c += 1) next[fmtKey(r, c)] = { ...next[fmtKey(r, c)], ...patch };
    return next;
  });
  const selectSingleCell = (r: number, c: number) => {
    const cr = Math.max(0, Math.min(displayRowCount - 1, r)), cc = Math.max(0, Math.min(displayColCount - 1, c));
    setActiveCell({ r: cr, c: cc }); setRangeEnd({ r: cr, c: cc }); setEditingCell(null); cellRefs.current[`${cr}:${cc}`]?.focus();
  };
  const extendRange = (dr: number, dc: number) => {
    setRangeEnd((p) => ({ r: Math.max(0, Math.min(displayRowCount - 1, p.r + dr)), c: Math.max(0, Math.min(displayColCount - 1, p.c + dc)) })); setEditingCell(null);
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
  const handleDragEnter = (rIdx: number, cIdx: number) => { if (isDraggingRef.current) { dragMovedRef.current = true; setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell(null); } };
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
        onFormatNumber={(mode: NumberFormatMode) => patchRangeFormat({ numFormat: activeFormat.numFormat === mode ? undefined : mode })}
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
      <div className="min-h-0 flex-1 overflow-auto bg-[#0D1117]">
        <table className="border-collapse font-mono text-xs">
          <thead>
            <tr className="h-7">
              <th className="sticky left-0 top-0 z-20 h-7 w-10 min-w-[40px] border border-[#30363D] bg-[#161B22] px-2 text-center text-[#8B949E]">#</th>
              {Array.from({ length: displayColCount }, (_, cIdx) => (
                <th key={cIdx} className={`sticky top-0 z-10 h-7 w-28 min-w-[112px] border border-[#30363D] px-2 text-center font-semibold ${cIdx >= bounds.minC && cIdx <= bounds.maxC ? 'bg-[#052E16] text-[#22C55E]' : 'bg-[#161B22] text-[#8B949E]'}`}>{colIndexToLabel(cIdx)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: displayRowCount }, (_, rIdx) => (
              <tr key={rIdx} className="h-7">
                <td className={`sticky left-0 z-10 h-7 w-10 min-w-[40px] border border-[#30363D] px-2 text-center font-semibold ${rIdx >= bounds.minR && rIdx <= bounds.maxR ? 'bg-[#052E16] text-[#22C55E]' : 'bg-[#161B22] text-[#8B949E]'}`}>{rIdx + 1}</td>
                {Array.from({ length: displayColCount }, (_, cIdx) => {
                  const raw = rawRows[rIdx]?.[cIdx] ?? '';
                  const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
                  const isSelected = activeCell.r === rIdx && activeCell.c === cIdx;
                  const inRange = rIdx >= bounds.minR && rIdx <= bounds.maxR && cIdx >= bounds.minC && cIdx <= bounds.maxC;
                  const isFormulaRef = !isSelected && formulaRefs.has(`${rIdx}:${cIdx}`);
                  const fmt = cellFormats[fmtKey(rIdx, cIdx)];
                  const evaluated = raw ? evaluateSheetCell(raw, rawRows, rIdx, cIdx) : '';
                  const display = !raw || isEditing || (isSelected && isFormulaExpectingRef(raw)) ? raw : formatCellDisplay(evaluated, fmt);
                  const effAlign: SheetAlign = fmt?.align ?? (isNumericValue(evaluated) ? 'right' : 'left');
                  const { tdCls, inputCls } = getSheetCellClasses(isSelected, isFormulaRef, inRange, effAlign, fmt);
                  return (
                    <td key={cIdx} onMouseEnter={() => handleDragEnter(rIdx, cIdx)} className={`relative h-7 w-28 min-w-[112px] border p-0 ${tdCls}`}>
                      <input
                        ref={(el) => { cellRefs.current[`${rIdx}:${cIdx}`] = el; }}
                        type="text" aria-label={`Cell ${colIndexToLabel(cIdx)}${rIdx + 1}`} readOnly={readOnly} value={display}
                        onMouseDown={(e) => handleCellMouseDown(e, rIdx, cIdx, isEditing)} onMouseEnter={() => handleDragEnter(rIdx, cIdx)}
                        onClick={(e) => handleCellClick(e, rIdx, cIdx, isEditing)} onDoubleClick={() => { if (!readOnly) setEditingCell({ r: rIdx, c: cIdx }); }}
                        onBlur={() => setEditingCell((p) => (p?.r === rIdx && p?.c === cIdx ? null : p))} onKeyDown={(e) => handleCellKeyDown(e, rIdx, cIdx)}
                        onChange={(e) => { justPickedRef.current = false; setActiveCell({ r: rIdx, c: cIdx }); setRangeEnd({ r: rIdx, c: cIdx }); setEditingCell({ r: rIdx, c: cIdx }); setCellValue(rIdx, cIdx, e.target.value); }}
                        className={inputCls}
                      />
                      {rIdx === bounds.maxR && cIdx === bounds.maxC && <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-1.5 bg-[#22C55E]" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OrbitSheetTabs
        sheets={sheets} activeIdx={safeSheetIdx} readOnly={readOnly} onSelect={setSheetIdx}
        selectionLabel={isMultiRange ? `Range ${rangeCoord}` : `Cell ${activeCoord}`} summary={summary}
        onAddSheet={() => { const next = [...sheets, { name: `Sheet${sheets.length + 1}`, rows: [['']] }]; onChange({ sheets: next }); setSheetIdx(next.length - 1); }}
        onRenameSheet={(idx, name) => onChange({ sheets: sheets.map((s, i) => (i === idx ? { ...s, name } : s)) })}
        onDeleteSheet={(idx) => { if (sheets.length > 1) { onChange({ sheets: sheets.filter((_, i) => i !== idx) }); setSheetIdx(Math.max(0, idx - 1)); } }}
      />
    </div>
  );
}
