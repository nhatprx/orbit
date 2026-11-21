import type { CSSProperties, KeyboardEvent, MouseEvent, MutableRefObject } from 'react';
import { OrbitSheetFormulaSuggest, type FormulaSuggestDropdownProps } from './OrbitSheetFormulaSuggest';
import {
  DEFAULT_SHEET_FONT_SIZE, formatCellDisplay, getSheetCellClasses,
  type SheetAlign, type SheetCellStyleDto, type SheetRangeBounds,
} from './sheetStyleHelpers';
import { columnLabel, evaluateSheetCell, isFormulaExpectingRef, isNumericValue } from './sheetFormulas';

export type SheetCellElement = HTMLInputElement | HTMLTextAreaElement;

interface OrbitSheetGridProps {
  rawRows: string[][];
  cellStyles: Record<string, SheetCellStyleDto>;
  displayRowCount: number;
  displayColCount: number;
  activeCell: { r: number; c: number };
  editingCell: { r: number; c: number } | null;
  bounds: SheetRangeBounds;
  formulaRefs: Set<string>;
  zoom: number;
  showGridlines: boolean;
  freezeHeader: boolean;
  readOnly: boolean;
  cellRefs: MutableRefObject<Record<string, SheetCellElement | null>>;
  cellSuggest?: FormulaSuggestDropdownProps;
  onGridKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown: (e: MouseEvent<SheetCellElement>, r: number, c: number, isEditing: boolean) => void;
  onDragEnter: (r: number, c: number) => void;
  onClick: (e: MouseEvent<SheetCellElement>, r: number, c: number, isEditing: boolean) => void;
  onDoubleClick: (r: number, c: number) => void;
  onBlur: (r: number, c: number) => void;
  onKeyDown: (e: KeyboardEvent<SheetCellElement>, r: number, c: number) => void;
  onChange: (r: number, c: number, value: string, selectionStart?: number | null) => void;
}

export function OrbitSheetGrid({
  rawRows, cellStyles, displayRowCount, displayColCount, activeCell, editingCell, bounds, formulaRefs,
  zoom, showGridlines, freezeHeader, readOnly, cellRefs, cellSuggest, onGridKeyDown,
  onMouseDown, onDragEnter, onClick, onDoubleClick, onBlur, onKeyDown, onChange,
}: OrbitSheetGridProps) {
  const scale = zoom / 100;
  const headerHeight = Math.round(28 * scale);
  const rowHeight = Math.round(28 * scale);
  const colWidth = Math.round(112 * scale);
  const rowNumWidth = Math.round(40 * scale);
  const headerFontPx = Math.round(12 * scale);

  return (
    <div
      tabIndex={0}
      aria-label="Spreadsheet grid"
      data-zoom={zoom}
      data-gridlines={showGridlines ? 'true' : 'false'}
      data-freeze-header={freezeHeader ? 'true' : 'false'}
      onKeyDown={onGridKeyDown}
      className="min-h-0 flex-1 overflow-auto bg-[#0D1117] focus:outline-none"
    >
      <table className="border-collapse font-mono text-xs">
        <thead>
          <tr style={{ height: `${headerHeight}px` }}>
            <th
              style={{ width: `${rowNumWidth}px`, minWidth: `${rowNumWidth}px`, height: `${headerHeight}px`, fontSize: `${headerFontPx}px` }}
              className="sticky left-0 top-0 z-30 border border-[#30363D] bg-[#161B22] px-2 text-center text-[#8B949E]"
            >
              #
            </th>
            {Array.from({ length: displayColCount }, (_, cIdx) => (
              <th
                key={cIdx}
                style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, height: `${headerHeight}px`, fontSize: `${headerFontPx}px` }}
                className={`sticky top-0 z-20 border border-[#30363D] px-2 text-center font-semibold ${
                  cIdx >= bounds.minC && cIdx <= bounds.maxC ? 'bg-[#052E16] text-[#22C55E]' : 'bg-[#161B22] text-[#8B949E]'
                }`}
              >
                {columnLabel(cIdx)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: displayRowCount }, (_, rIdx) => {
            const isFrozenRow = freezeHeader && rIdx === 0;
            const frozenStyle: CSSProperties | undefined = isFrozenRow ? { top: `${headerHeight}px` } : undefined;
            return (
              <tr key={rIdx} style={{ minHeight: `${rowHeight}px` }}>
                <td
                  style={{ ...frozenStyle, width: `${rowNumWidth}px`, minWidth: `${rowNumWidth}px`, height: `${rowHeight}px`, fontSize: `${headerFontPx}px` }}
                  className={`sticky left-0 border border-[#30363D] px-2 text-center font-semibold ${
                    isFrozenRow ? 'z-20 border-b-2 border-b-[#22C55E]/70' : 'z-10'
                  } ${rIdx >= bounds.minR && rIdx <= bounds.maxR ? 'bg-[#052E16] text-[#22C55E]' : 'bg-[#161B22] text-[#8B949E]'}`}
                >
                  {rIdx + 1}
                </td>
                {Array.from({ length: displayColCount }, (_, cIdx) => {
                  const raw = rawRows[rIdx]?.[cIdx] ?? '';
                  const isEditing = editingCell?.r === rIdx && editingCell?.c === cIdx;
                  const isSelected = activeCell.r === rIdx && activeCell.c === cIdx;
                  const showSuggest = isSelected && isEditing && Boolean(cellSuggest);
                  const inRange = rIdx >= bounds.minR && rIdx <= bounds.maxR && cIdx >= bounds.minC && cIdx <= bounds.maxC;
                  const isFormulaRef = !isSelected && formulaRefs.has(`${rIdx}:${cIdx}`);
                  const fmt = cellStyles[`${rIdx}:${cIdx}`];
                  const evaluated = raw ? evaluateSheetCell(raw, rawRows, rIdx, cIdx) : '';
                  const display = !raw || isEditing || (isSelected && isFormulaExpectingRef(raw)) ? raw : formatCellDisplay(evaluated, fmt);
                  const effAlign: SheetAlign = fmt?.align ?? (isNumericValue(evaluated) ? 'right' : 'left');
                  const effVAlign = fmt?.valign ?? 'middle';
                  const valignCls = effVAlign === 'top' ? 'align-top' : effVAlign === 'bottom' ? 'align-bottom' : 'align-middle';
                  const { tdCls, inputCls } = getSheetCellClasses(isSelected, isFormulaRef, inRange, effAlign, fmt, showGridlines);
                  const fontPx = Math.round((fmt?.fontSize ?? DEFAULT_SHEET_FONT_SIZE) * 1.2 * scale);
                  const tdStyle: CSSProperties = {
                    ...frozenStyle,
                    width: `${colWidth}px`,
                    minWidth: `${colWidth}px`,
                    height: fmt?.wrap ? undefined : `${rowHeight}px`,
                    backgroundColor: fmt?.bgColor ?? (isFrozenRow ? '#0D1117' : undefined),
                  };
                  const inputStyle: CSSProperties = {
                    fontSize: `${fontPx}px`,
                    color: fmt?.textColor,
                    minHeight: `${Math.max(rowHeight - 2, fontPx + 8)}px`,
                  };
                  const sharedProps = {
                    'aria-label': `Cell ${columnLabel(cIdx)}${rIdx + 1}`,
                    'data-valign': effVAlign,
                    'data-border': fmt?.border ?? 'none',
                    'data-wrap': fmt?.wrap ? 'true' : 'false',
                    readOnly,
                    value: display,
                    style: inputStyle,
                    onMouseDown: (e: MouseEvent<SheetCellElement>) => onMouseDown(e, rIdx, cIdx, isEditing),
                    onMouseEnter: () => onDragEnter(rIdx, cIdx),
                    onClick: (e: MouseEvent<SheetCellElement>) => onClick(e, rIdx, cIdx, isEditing),
                    onDoubleClick: () => onDoubleClick(rIdx, cIdx),
                    onBlur: () => onBlur(rIdx, cIdx),
                    onKeyDown: (e: KeyboardEvent<SheetCellElement>) => onKeyDown(e, rIdx, cIdx),
                    onChange: (e: { target: { value: string; selectionStart: number | null } }) =>
                      onChange(rIdx, cIdx, e.target.value, e.target.selectionStart),
                    className: inputCls,
                  };

                  return (
                    <td
                      key={cIdx}
                      style={tdStyle}
                      onMouseEnter={() => onDragEnter(rIdx, cIdx)}
                      className={`relative border p-0 ${valignCls} ${isFrozenRow ? 'sticky z-[15] border-b-2 border-b-[#22C55E]/70' : ''} ${tdCls} ${showSuggest ? 'z-30' : ''}`}
                    >
                      {fmt?.wrap ? (
                        <textarea
                          ref={(el) => { cellRefs.current[`${rIdx}:${cIdx}`] = el; }}
                          rows={2}
                          {...sharedProps}
                          className={`block ${inputCls} resize-none overflow-hidden py-1`}
                        />
                      ) : (
                        <input
                          ref={(el) => { cellRefs.current[`${rIdx}:${cIdx}`] = el; }}
                          type="text"
                          {...sharedProps}
                          className={`block ${inputCls}`}
                        />
                      )}
                      {showSuggest && cellSuggest && <OrbitSheetFormulaSuggest {...cellSuggest} />}
                      {rIdx === bounds.maxR && cIdx === bounds.maxC && (
                        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-1.5 bg-[#22C55E]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
